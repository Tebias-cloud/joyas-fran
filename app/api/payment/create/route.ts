import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getOrderById } from '@/services/orderService';
import { getActiveCouponByCode, isCouponRegisteredForOrder, registerCouponUsage } from '@/services/couponService';
import { createPaymentPreference } from '@/services/paymentService';
import { SITE_URL } from '@/lib/config';

export async function POST(request: Request) {
  try {
    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json({ error: 'Falta orderId' }, { status: 400 });
    }

    console.log(" 🟢 Iniciando cobro seguro para la orden:", orderId);

    // 1. Obtener el monto real de la orden desde la base de datos
    const order = await getOrderById(supabaseAdmin, orderId);

    if (!order) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
    }

    // 2. Actualizar el estado de la orden a "Pendiente Pago" (Acción segura en servidor)
    const { error: updateStatusError } = await supabaseAdmin
      .from('orders')
      .update({ status: 'Pendiente Pago' })
      .eq('id', orderId);

    if (updateStatusError) {
      console.error("🔴 Error al actualizar estado de orden a Pendiente Pago:", updateStatusError);
    }

    // 3. Registrar el uso del cupón de forma segura si no está registrado aún
    const discount = order.discountInfo;
    if (discount && discount.code) {
      try {
        const coupon = await getActiveCouponByCode(supabaseAdmin, discount.code);
        if (coupon) {
          // Verificar si ya se registró el uso del cupón para esta orden (evitar duplicar si hay reintento de pago)
          const alreadyRegistered = await isCouponRegisteredForOrder(supabaseAdmin, orderId, coupon.id);
          
          if (!alreadyRegistered) {
            await registerCouponUsage(supabaseAdmin, {
              couponId: coupon.id,
              userId: order.userId || 'anonymous',
              orderId: orderId,
              currentUsedCount: coupon.used_count
            });
            console.log(`✅ Cupón ${discount.code} registrado e incrementado para la orden ${orderId}`);
          }
        }
      } catch (err) {
        console.error("🔴 Error procesando cupón en servidor:", err);
      }
    }

    const safeAmount = Math.floor(Number(order.totalAmount));
    if (isNaN(safeAmount) || safeAmount <= 0) {
      return NextResponse.json({ error: 'Monto de orden inválido' }, { status: 400 });
    }

    // 4. Crear la preferencia de pago en Mercado Pago usando el servicio
    const preference = await createPaymentPreference({
      orderId,
      amount: safeAmount,
      baseUrl: SITE_URL
    });

    return NextResponse.json({
      url: preference.initPoint, 
      token: preference.id 
    });

  } catch (error) {
    console.error('🔴 Error Create Mercado Pago:', error);
    return NextResponse.json({ error: 'Error al iniciar pago' }, { status: 500 });
  }
}