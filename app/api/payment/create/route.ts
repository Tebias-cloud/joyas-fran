import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';

// Inicializamos Mercado Pago con tu Access Token
const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN! });

export async function POST(request: Request) {
  try {
    const { orderId, amount } = await request.json();

    // Aseguramos que el monto sea un entero positivo
    const safeAmount = Math.floor(Number(amount));

    console.log("🟢 Iniciando Mercado Pago para la orden:", orderId);

    const preference = new Preference(client);
    
    // 🔥 CAMBIO PARA PRODUCCIÓN: 
    // Usará NEXT_PUBLIC_SITE_URL cuando esté en Vercel, o localhost si estás en tu PC.
    // (Mañana agregaremos NEXT_PUBLIC_SITE_URL en las variables de Vercel)
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const urlSegura = `${baseUrl}/payment/result`;

    // Creamos la preferencia (la orden de cobro en Mercado Pago)
    const response = await preference.create({
      body: {
        items: [
          {
            id: orderId,
            title: 'Compra en Joyas Fran',
            quantity: 1,
            unit_price: safeAmount,
            currency_id: 'CLP',
          }
        ],
        external_reference: orderId, 
        
        back_urls: {
          success: urlSegura,
          failure: urlSegura,
          pending: urlSegura
        },
        
        // 🔥 CAMBIO PARA PRODUCCIÓN: 
        // Activamos el retorno automático. Como Vercel usa "https://", 
        // Mercado Pago devolverá al cliente a tu tienda en 3 segundos sin hacer clic.
        auto_return: 'approved',
      }
    });

    // Usamos el init_point normal para evitar el bug de redirecciones infinitas del Sandbox
    return NextResponse.json({
      url: response.init_point, 
      token: response.id 
    });

  } catch (error) {
    console.error('🔴 Error Create Mercado Pago:', error);
    return NextResponse.json({ error: 'Error al iniciar pago' }, { status: 500 });
  }
}