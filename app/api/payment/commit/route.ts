import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getOrderById } from '@/services/orderService';
import { getPaymentDetails, refundPayment } from '@/services/paymentService';

export async function POST(request: Request) {
  try {
    const { payment_id, status, external_reference } = await request.json();
    console.log("🔵 Confirmando transacción MP:", { payment_id, status, external_reference });

    if (status !== 'approved') {
      return NextResponse.json({ success: false, message: 'Pago no aprobado o cancelado por el cliente.' });
    }

    // 1. Preguntarle directamente a Mercado Pago si el pago es real y exitoso (Seguridad extra)
    const paymentData = await getPaymentDetails(payment_id);

    if (paymentData.status === 'approved') {
      // Rescatamos el ID de la orden que mandamos al principio
      const orderId = external_reference || paymentData.external_reference;

      // 2. Buscar la orden exacta en la base de datos
      const order = await getOrderById(supabaseAdmin, orderId);

      if (!order) {
        console.error("⚠ Orden no encontrada para ID:", orderId);
        return NextResponse.json({ success: true, warning: 'Orden no encontrada en BD' });
      }

      // Validar que el monto pagado coincida con el total de la orden
      const paidAmount = paymentData.transaction_amount;
      const orderAmount = order.totalAmount;

      if (Math.round(Number(paidAmount)) !== Math.round(Number(orderAmount))) {
        console.error(`🚨 ALERTA DE SEGURIDAD: Monto pagado (${paidAmount}) no coincide con el total de la orden (${orderAmount})`);
        return NextResponse.json({ success: false, message: 'El monto del pago no coincide con el total del pedido.' });
      }

      // Si por error el cliente recarga la página de éxito, evitamos descontar stock 2 veces
      if (order.status !== 'Pendiente Pago') {
         return NextResponse.json({ success: true, orderId: order.id });
      }

      console.log("✅ Orden encontrada en BD:", order.id);

      // 3. Descontar stock y marcar como Pagado
      const { error: rpcError } = await supabaseAdmin.rpc('confirm_payment_stock', { 
        p_order_id: order.id 
      });

      if (rpcError) {
        console.error("🔴 Error al descontar stock (Sin stock disponible):", rpcError);
        try {
          await refundPayment(payment_id);
          await supabaseAdmin
            .from('orders')
            .update({ status: 'Cancelado (Sin Stock)' })
            .eq('id', order.id);
          console.log(`✅ Pago devuelto de forma segura para la orden ${order.id} por falta de stock.`);
          return NextResponse.json({ success: false, message: 'Disculpa, el stock de los productos se agotó antes de confirmar tu pago. Tu dinero ha sido devuelto automáticamente.' });
        } catch (refundErr) {
          console.error("🚨 CRÍTICO: No se pudo realizar reembolso automático para pago:", payment_id, refundErr);
          return NextResponse.json({ success: false, message: 'Disculpa, el stock se agotó. Por favor contáctanos para procesar tu reembolso manual.' });
        }
      }

      console.log("✅ Stock descontado y orden Pagada exitosamente.");
      return NextResponse.json({ success: true, orderId: order.id });
    } 
    
    return NextResponse.json({ success: false, message: 'Transacción rechazada por el banco.' });

  } catch (error) {
    console.error('🔴 Error Commit MP:', error);
    return NextResponse.json({ success: false, message: 'Error interno al confirmar.' });
  }
}