import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getActiveCouponByCode, hasUserUsedCoupon } from '@/services/couponService';
import { ValidateCouponRequestSchema } from '@/lib/validators';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = ValidateCouponRequestSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0]?.message || 'Parámetros inválidos' }, { status: 400 });
    }

    const { code, cartTotal, userId } = result.data;

    const supabase = await createSupabaseServerClient();

    // 1. Buscar cupón activo
    const coupon = await getActiveCouponByCode(supabase, code);

    if (!coupon) {
      return NextResponse.json({ error: 'Cupón inválido o no existe' }, { status: 404 });
    }

    // 1.5 Validar si el usuario ya usó este cupón
    if (userId) {
      const used = await hasUserUsedCoupon(supabase, userId, coupon.id);
      if (used) {
        return NextResponse.json({ error: 'Ya has utilizado este cupón' }, { status: 400 });
      }
    }

    // 2. Validar compra mínima
    if (cartTotal < coupon.min_purchase) {
      return NextResponse.json({ error: `Mínimo de compra: $${coupon.min_purchase}` }, { status: 400 });
    }

    // 3. Calcular descuento
    let discountAmount = 0;
    if (coupon.type === 'percent') {
      discountAmount = Math.round((cartTotal * coupon.value) / 100);
    } else if (coupon.type === 'fixed') {
      discountAmount = coupon.value;
    }

    return NextResponse.json({
      success: true,
      discount: {
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        amount: discountAmount
      }
    });

  } catch (err) {
    console.error('Error validating coupon:', err);
    return NextResponse.json({ error: 'Error en el servidor' }, { status: 500 });
  }
}