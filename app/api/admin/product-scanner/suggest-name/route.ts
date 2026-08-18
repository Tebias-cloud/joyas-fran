import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { ADMIN_EMAIL } from '@/lib/config';

// ─── POST /api/admin/product-scanner/suggest-name ────────────────────────────
// Recibe: imageUrl, category, currentName (para evitar repetirlo)
// Devuelve: { name: string }
// NO re-analiza la imagen desde cero — usa el contexto ya conocido de la joya.

export async function POST(request: NextRequest) {
  try {
    // 1. Auth
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );
    const { data: { user } } = await supabase.auth.getUser();
    const isUserAdmin =
      user?.app_metadata?.role === 'admin' ||
      (!!ADMIN_EMAIL && user?.email === ADMIN_EMAIL);

    if (!user || !isUserAdmin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // 2. Parsear body
    const body = await request.json();
    const { imageUrl, category, currentName, mode } = body as {
      imageUrl: string;
      category: string;
      currentName: string;
      mode?: 'name' | 'description';
    };

    if (!imageUrl) {
      return NextResponse.json({ error: 'imageUrl es requerido' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY no configurada en el servidor' },
        { status: 500 }
      );
    }

    // 3. Inicializar nuevo SDK @google/genai
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // 4. Descargar imagen para base64
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error(`Error al descargar imagen: HTTP ${response.status}`);
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = response.headers.get('content-type') || 'image/webp';

    // 5. Prompt enfocado según el modo
    let prompt = '';
    if (mode === 'description') {
      prompt = `Mira esta imagen de una joya de Plata Ley 925 para una tienda chilena llamada "Joyas Fran". El nombre de la joya es "${currentName || 'Joya sin nombre'}".
      
Sugerir una descripción comercial breve (máximo 250 caracteres) en español, atractiva y elegante, apropiada para una tienda online de joyas.
Responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional ni bloques de código:
{"description": "la descripción aquí del producto"}`;
    } else {
      const categoryCtx = category ? ` Esta joya es de la categoría "${category}".` : '';
      const avoidCtx = currentName
        ? ` El nombre anterior fue "${currentName}", por favor sugiere algo diferente pero coherente con la misma joya.`
        : '';

      prompt = `Mira esta imagen de una joya de Plata Ley 925 para una tienda chilena llamada "Joyas Fran".${categoryCtx}${avoidCtx}
 
Sugiere UN SOLO nombre comercial en español para esta joya. El nombre debe:
- Ser descriptivo y atractivo para una tienda de joyería
- Tener entre 4 y 60 caracteres
- Estar capitalizado correctamente
- NO incluir la marca "Joyas Fran"
- NO mencionar el material ni la pureza
- Ser diferente al nombre anterior si se indicó uno
 
Responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional ni bloques de código:
{"name": "el nombre aquí"}`;
    }

    // 6. Llamar a Gemini con nuevo SDK
    const result = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType, data: base64 } },
            { text: prompt },
          ],
        },
      ],
    });

    const rawText = result.text?.trim() ?? '';

    // 7. Parsear respuesta
    let parsed: any;
    try {
      const jsonText = rawText
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();
      parsed = JSON.parse(jsonText);
    } catch {
      console.error('[suggest-name] JSON parse error. Raw:', rawText);
      return NextResponse.json(
        { error: 'La IA devolvió una respuesta inválida. Intenta de nuevo.' },
        { status: 422 }
      );
    }

    if (mode === 'description') {
      if (!parsed.description || typeof parsed.description !== 'string' || parsed.description.trim().length < 5) {
        return NextResponse.json(
          { error: 'No se pudo generar una descripción. Intenta de nuevo.' },
          { status: 422 }
        );
      }
      return NextResponse.json({ description: parsed.description.trim() });
    } else {
      if (!parsed.name || typeof parsed.name !== 'string' || parsed.name.trim().length < 3) {
        return NextResponse.json(
          { error: 'No se pudo generar un nombre alternativo. Intenta de nuevo.' },
          { status: 422 }
        );
      }
      return NextResponse.json({ name: parsed.name.trim() });
    }

  } catch (error) {
    console.error('[suggest-name] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Error inesperado al generar el nombre. Intenta de nuevo.' },
      { status: 500 }
    );
  }
}
