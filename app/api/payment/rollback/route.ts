import { NextResponse } from 'next/server';
import { WebpayPlus, Options, IntegrationApiKeys, Environment, IntegrationCommerceCodes } from 'transbank-sdk';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    // Consultar estado a Transbank para obtener el ID de la orden
    const tx = new WebpayPlus.Transaction(new Options(
      IntegrationCommerceCodes.WEBPAY_PLUS,
      IntegrationApiKeys.WEBPAY,
      Environment.Integration
    ));

    // Si hay token, preguntamos a Transbank qué orden era (incluso si falló)
    const status = await tx.status(token);
    const orderId = status.session_id; // Aquí guardamos el orderId originalmente

    if (orderId) {
        // Llamar a la función SQL que creamos para devolver stock
        const { error } = await supabase.rpc('restore_stock_for_order', { p_order_id: orderId });
        
        if (error) console.error("Error devolviendo stock:", error);
        else console.log("Stock restaurado para orden:", orderId);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error en rollback:', error);
    return NextResponse.json({ success: false });
  }
}