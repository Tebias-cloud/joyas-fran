import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getOrderById } from '@/services/orderService';
import { getPaymentDetails, refundPayment } from '@/services/paymentService';

/**
 * Registra una entrada en la tabla webhook_logs.
 * Es un helper no-bloqueante: los errores aquí no afectan el flujo principal.
 */
async function logWebhookEvent(params: {
  paymentId: string;
  topic?: string;
  status?: string;
  orderId?: string;
  processed: boolean;
  errorMessage?: string;
  rawBody?: unknown;
}) {
  try {
    await supabaseAdmin.from('webhook_logs').insert({
      payment_id: params.paymentId,
      topic: params.topic || null,
      status: params.status || null,
      order_id: params.orderId || null,
      processed: params.processed,
      error_message: params.errorMessage || null,
      raw_body: params.rawBody ? (params.rawBody as object) : null,
    });
  } catch (logErr) {
    // El fallo del log nunca debe interrumpir el procesamiento del pago
    console.error('⚠️ Error al registrar webhook_log (no crítico):', logErr);
  }
}

export async function POST(request: Request) {
  let paymentId = '';
  let topic: string | undefined;
  let rawBody: unknown;

  try {
    const { searchParams } = new URL(request.url);

    // Intentar leer de los parámetros de búsqueda (IPN antiguo o webhook con query parameters)
    paymentId = searchParams.get('data.id') || searchParams.get('id') || '';
    topic = searchParams.get('type') || searchParams.get('topic') || undefined;

    // Intentar leer del cuerpo JSON (notificaciones modernas de Mercado Pago)
    try {
      const body = await request.json();
      rawBody = body;
      if (body) {
        if (body.data?.id) paymentId = body.data.id;
        if (body.type) topic = body.type;
        if (body.action === 'payment.created' || body.action === 'payment.updated') {
          topic = 'payment';
        }
      }
    } catch {
      // Ignorar si el cuerpo no es JSON
    }

    console.log('🔵 Mercado Pago Webhook recibido:', { paymentId, topic });

    // Mercado Pago envía notificaciones para otros temas (ej. planes, chargebacks).
    // Solo nos interesan los eventos de 'payment'
    if (topic !== 'payment' || !paymentId) {
      return NextResponse.json({ received: true });
    }

    // 1. Consultar a Mercado Pago por el estado real de la transacción para evitar suplantaciones
    const paymentData = await getPaymentDetails(paymentId);

    if (paymentData.status === 'approved') {
      const orderId = paymentData.external_reference;
      if (!orderId) {
        console.error('⚠ No se encontró external_reference en la respuesta de MP para el pago:', paymentId);
        await logWebhookEvent({
          paymentId,
          topic,
          status: paymentData.status,
          processed: false,
          errorMessage: 'No se encontró external_reference en la respuesta de MP',
          rawBody,
        });
        return NextResponse.json({ error: 'Falta external_reference' }, { status: 400 });
      }

      // 2. Buscar la orden correspondiente en la base de datos
      const order = await getOrderById(supabaseAdmin, orderId);
      if (!order) {
        console.error('⚠ Orden no encontrada en base de datos para ID:', orderId);
        await logWebhookEvent({
          paymentId,
          topic,
          status: paymentData.status,
          orderId,
          processed: false,
          errorMessage: `Orden no encontrada en BD: ${orderId}`,
          rawBody,
        });
        // Retornamos 200 para que Mercado Pago deje de reenviar la notificación por una orden inexistente
        return NextResponse.json({ error: 'Orden no encontrada' }, { status: 200 });
      }

      // 3. Verificación de seguridad: Validar que el monto total pagado coincida con el total del pedido
      const paidAmount = paymentData.transaction_amount;
      const orderAmount = order.totalAmount;

      if (Math.round(Number(paidAmount)) !== Math.round(Number(orderAmount))) {
        console.error(`🚨 ALERTA DE SEGURIDAD (Webhook): Monto pagado (${paidAmount}) no coincide con el total de la orden (${orderAmount})`);
        await logWebhookEvent({
          paymentId,
          topic,
          status: paymentData.status,
          orderId,
          processed: false,
          errorMessage: `Monto fraudulento: pagado=${paidAmount}, orden=${orderAmount}`,
          rawBody,
        });
        return NextResponse.json({ error: 'Monto de pago fraudulento' }, { status: 200 }); // 200 para mitigar spam de reintentos
      }

      // 4. Si la orden ya no está pendiente, significa que ya fue procesada por el commit normal
      if (order.status !== 'Pendiente Pago') {
        console.log(`✅ Orden ${order.id} ya se encuentra procesada con estado: ${order.status}`);
        await logWebhookEvent({
          paymentId,
          topic,
          status: paymentData.status,
          orderId,
          processed: true,
          errorMessage: `Orden ya procesada previamente con estado: ${order.status}`,
          rawBody,
        });
        return NextResponse.json({ success: true });
      }

      // 5. Ejecutar la función RPC para descontar inventario y cambiar estado a 'Pagado'
      const { error: rpcError } = await supabaseAdmin.rpc('confirm_payment_stock', {
        p_order_id: order.id
      });

      if (rpcError) {
        console.error('🔴 Error al confirmar pago/stock vía Webhook RPC (Sin stock disponible):', rpcError);
        try {
          await refundPayment(paymentId);
          await supabaseAdmin
            .from('orders')
            .update({ status: 'Cancelado (Sin Stock)' })
            .eq('id', order.id);
          console.log(`✅ Pago devuelto de forma segura para la orden ${order.id} vía Webhook por falta de stock.`);
          await logWebhookEvent({
            paymentId,
            topic,
            status: paymentData.status,
            orderId,
            processed: false,
            errorMessage: `Sin stock. Reembolso automático ejecutado. RPC error: ${rpcError.message}`,
            rawBody,
          });
          return NextResponse.json({ error: 'Sin stock, pago reembolsado' }, { status: 200 });
        } catch (refundErr) {
          const refundErrMsg = refundErr instanceof Error ? refundErr.message : String(refundErr);
          console.error('🚨 CRÍTICO (Webhook): No se pudo realizar reembolso automático para pago:', paymentId, refundErr);
          await logWebhookEvent({
            paymentId,
            topic,
            status: paymentData.status,
            orderId,
            processed: false,
            errorMessage: `Sin stock Y reembolso falló: ${refundErrMsg}. REQUIERE INTERVENCIÓN MANUAL.`,
            rawBody,
          });
          return NextResponse.json({ error: 'Error al descontar stock y falló reembolso' }, { status: 500 });
        }
      }

      console.log(`✅ Webhook MP completado con éxito: Orden ${order.id} marcada como Pagada.`);
      await logWebhookEvent({
        paymentId,
        topic,
        status: paymentData.status,
        orderId,
        processed: true,
        rawBody,
      });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('🔴 Error en el Webhook de Mercado Pago:', error);
    // Intentar registrar el error en logs aunque haya fallo general
    if (paymentId) {
      await logWebhookEvent({
        paymentId,
        topic,
        processed: false,
        errorMessage: `Error interno del servidor: ${errMsg}`,
        rawBody,
      });
    }
    // Retornamos 500 para indicarle a Mercado Pago que hubo un error temporal en el servidor y reintente el envío
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
