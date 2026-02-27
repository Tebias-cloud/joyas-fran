import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { createClient } from '@supabase/supabase-js';

// Usamos la Service Role Key para tener permisos de administrador en BD
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

// Inicializamos Mercado Pago
const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN! });

export async function POST(request: Request) {
  try {
    // Mercado Pago no usa "token_ws", usa "payment_id" y "status"
    const { payment_id, status, external_reference } = await request.json();
    console.log("🔵 Confirmando transacción MP:", { payment_id, status, external_reference });

    if (status !== 'approved') {
      return NextResponse.json({ success: false, message: 'Pago no aprobado o cancelado por el cliente.' });
    }

    // 1. Le preguntamos directamente a Mercado Pago si el pago es real y exitoso (Seguridad extra)
    const payment = new Payment(client);
    const paymentData = await payment.get({ id: payment_id });

    if (paymentData.status === 'approved') {
      
      // Rescatamos el ID de la orden que mandamos al principio
      const orderId = external_reference || paymentData.external_reference;

      // 2. Buscar la orden exacta en la base de datos
      const { data: order, error: searchError } = await supabaseAdmin
        .from('orders')
        .select('id, status')
        .eq('id', orderId)
        .single();

      if (searchError || !order) {
        console.error("⚠ Error admin buscando orden:", searchError);
        return NextResponse.json({ success: true, warning: 'Orden no encontrada en BD' });
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
        console.error("🔴 Error al descontar stock:", rpcError);
      } else {
        console.log("✅ Stock descontado y orden Pagada exitosamente.");
      }

      return NextResponse.json({ success: true, orderId: order.id });
    } 
    
    return NextResponse.json({ success: false, message: 'Transacción rechazada por el banco.' });

  } catch (error) {
    console.error('🔴 Error Commit MP:', error);
    return NextResponse.json({ success: false, message: 'Error interno al confirmar.' });
  }
}