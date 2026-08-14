import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { ADMIN_EMAIL } from '@/lib/config';

// ─── Interfaces ─────────────────────────────────────────────────────────────

interface DBCategory {
  id: number;
  name: string;
}

interface GeminiScanResponse {
  name: string;
  description: string;
  category: string;
  collection: string | null;
  meta_title: string;
  meta_description: string;
}

// ─── Helper: imagen URL → base64 ─────────────────────────────────────────────

async function getImageBase64(imageUrl: string): Promise<{ base64: string; mimeType: string }> {
  const response = await fetch(imageUrl);
  if (!response.ok) throw new Error(`Error al descargar la imagen: HTTP ${response.status}`);
  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  const mimeType = response.headers.get('content-type') || 'image/webp';
  return { base64, mimeType };
}

// ─── Helper: auth admin ───────────────────────────────────────────────────────

async function getAdminUser() {
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
  return user;
}

// ─── Helper: obtener categorías desde Supabase ───────────────────────────────

async function getCategories(): Promise<DBCategory[]> {
  // Usa service role si está disponible; si no, anon key (las categorías son públicas en RLS)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );
  const { data, error } = await supabase
    .from('categories')
    .select('id, name')
    .eq('is_active', true)
    .order('position', { ascending: true });

  if (error || !data) return [];
  return data as DBCategory[];
}

// ─── POST /api/admin/product-scanner ─────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // 1. Auth — solo admin puede acceder
    const user = await getAdminUser();
    if (!user || !ADMIN_EMAIL || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // 2. Parsear body
    const body = await request.json();
    const { imageUrl } = body as { imageUrl: string };

    if (!imageUrl) {
      return NextResponse.json({ error: 'imageUrl es requerido' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY no configurada en el servidor' },
        { status: 500 }
      );
    }

    // 3. Obtener categorías desde Supabase (fuente de verdad en servidor)
    const categories = await getCategories();
    const categoryList = categories.length > 0
      ? categories.map(c => c.name).join(' | ')
      : 'Anillos | Collares | Aros | Pulseras';  // Fallback si BD vacía

    // 4. Inicializar Gemini 2.5 Flash
    //    → Modelo estable de Google (no preview, no deprecated).
    //    → Mejor price-performance para tareas multimodal de baja latencia.
    //    → Documentación oficial: https://ai.google.dev/gemini-api/docs/models
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // 5. Descargar imagen desde Supabase CDN y convertir a base64
    const { base64, mimeType } = await getImageBase64(imageUrl);

    // 6. Prompt estructurado
    //    — El material está fijo como "Plata Ley 925" (no se pide a Gemini que lo detecte)
    //    — La categoría debe ser exactamente una de las opciones de la BD
    const prompt = `Analiza la imagen de esta joya para una tienda chilena de plata llamada "Joyas Fran".

Responde ÚNICAMENTE con un objeto JSON válido. Sin texto adicional, sin bloques de código markdown. Solo el JSON puro.

El JSON debe seguir EXACTAMENTE este esquema:

{
  "name": "string — nombre comercial descriptivo en español (máx 60 caracteres, capitalizado, no incluir la marca Joyas Fran)",
  "description": "string — descripción de venta atractiva en español (2-3 oraciones, máx 250 caracteres). Menciona el diseño y la ocasión de uso. No menciones el material.",
  "category": "string — EXACTAMENTE una de estas opciones, sin variaciones: ${categoryList}",
  "collection": "string o null — nombre de colección si puedes inferirlo del diseño (ej: 'Colección Romántica'), sino null",
  "meta_title": "string — título SEO (máx 70 chars): [Nombre] | Joyas Fran",
  "meta_description": "string — descripción SEO en español (máx 155 chars) para Google"
}

Reglas estrictas:
- NO menciones el material, la pureza ni el metal en ningún campo. Ese dato lo gestiona la tienda.
- NO inventes ni sugieras precios, costos, stock ni SKU.
- La categoría DEBE ser exactamente una de las opciones listadas, con la misma capitalización.
- Si la imagen no muestra una joya claramente, devuelve valores genéricos apropiados.
- Usa el género gramatical correcto en español (ej: "anillo" vs "collar").`;

    // 7. Llamar a Gemini (imagen inline + prompt de texto)
    const result = await model.generateContent([
      { inlineData: { mimeType, data: base64 } },
      prompt,
    ]);

    const rawText = result.response.text().trim();

    // 8. Parsear JSON — strip de posibles bloques markdown defensivo
    let parsed: GeminiScanResponse;
    try {
      const jsonText = rawText
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();
      parsed = JSON.parse(jsonText);
    } catch {
      console.error('[product-scanner] JSON parse error. Raw:', rawText);
      return NextResponse.json(
        { error: 'La IA devolvió una respuesta inválida. Intenta de nuevo.' },
        { status: 422 }
      );
    }

    // 9. Validación de campos requeridos
    if (!parsed.name || !parsed.description || !parsed.category) {
      return NextResponse.json(
        { error: 'La IA no pudo identificar la joya correctamente. Intenta con otra foto.' },
        { status: 422 }
      );
    }

    // 10. Resolver category_id desde categorías de la BD (case-insensitive)
    const matchedCategory = categories.find(
      c => c.name.toLowerCase() === parsed.category.toLowerCase()
    );

    // 11. Validar que la categoría devuelta existe en BD
    //     Si no hay match, dejamos category_id null para que la usuaria la seleccione.
    const validCategory = matchedCategory?.name ?? parsed.category;
    const validCategoryId = matchedCategory?.id ?? null;

    // 12. Respuesta enriquecida (material siempre fijo en "Plata Ley 925")
    return NextResponse.json({
      name: parsed.name.trim(),
      description: parsed.description.trim(),
      category: validCategory,
      category_id: validCategoryId,
      material: 'Plata Ley 925',   // ← siempre fijo, Gemini no decide el material
      collection: parsed.collection?.trim() || null,
      meta_title: parsed.meta_title?.trim() || `${parsed.name} | Joyas Fran`,
      meta_description: parsed.meta_description?.trim() || parsed.description,
    });

  } catch (error) {
    console.error('[product-scanner] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Error inesperado al analizar la imagen. Intenta de nuevo.' },
      { status: 500 }
    );
  }
}
