import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const { code, cartTotal, userId } = await request.json();
    const cleanCode = code.toUpperCase().trim();

    // 1. Buscar cupón activo
    const { data: coupon, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', cleanCode)
      .eq('is_active', true)
      .single();

    if (error || !coupon) {
      return NextResponse.json({ error: 'Cupón inválido o no existe' }, { status: 404 });
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
    return NextResponse.json({ error: 'Error en el servidor' }, { status: 500 });
  }
}