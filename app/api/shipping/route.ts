import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getShippingRateByRegion } from '@/services/shippingService';
import { ValidateShippingRequestSchema } from '@/lib/validators';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = ValidateShippingRequestSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0]?.message || 'Parámetros inválidos' }, { status: 400 });
    }

    const { region, city, cartTotal } = result.data;

    const FREE_SHIPPING_THRESHOLD = 100000;
    const isFreeShipping = cartTotal >= FREE_SHIPPING_THRESHOLD;

    // Normalizamos el texto para evitar errores de mayúsculas
    // Esto captura lo que el usuario escribe en el campo "Comuna" que vimos en tu diseño
    const cityLower = city.toLowerCase().trim();
    
    // --- AQUÍ ESTÁ EL CAMBIO PARA IQUIQUE GRATIS ---
    if (cityLower.includes('iquique') || cityLower.includes('alto hospicio')) {
      return NextResponse.json({
        rate: {
          name: "Delivery Local Iquique", // Nombre más atractivo
          price: 0, // <--- FORZAMOS EL PRECIO A CERO SIEMPRE
          originalPrice: 2990, // Esto hará que salga tachado "$2.990" y al lado "GRATIS"
          days: "Entrega hoy o mañana",
          courier: "Reparto Propio Joyas Fran"
        }
      });
    }
    // ----------------------------------------------

    const supabase = await createSupabaseServerClient();
    const zone = await getShippingRateByRegion(supabase, region);

    if (!zone) {
      return NextResponse.json({
        rate: {
          name: "Envío Estándar",
          price: 6990,
          days: "3-7 días hábiles",
          courier: "Starken / BlueExpress"
        }
      });
    }

    return NextResponse.json({
      rate: {
        name: "Envío a Domicilio",
        price: isFreeShipping ? 0 : zone.price,
        originalPrice: isFreeShipping ? zone.price : null,
        days: zone.days,
        courier: "BlueExpress / Starken"
      }
    });

  } catch (error) {
    console.error("Error shipping route:", error);
    return NextResponse.json({ error: 'Error calculando envío' }, { status: 500 });
  }
}