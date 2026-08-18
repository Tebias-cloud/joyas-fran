import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
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
    // 1. Auth
    console.log('[scanner] STEP 1: verificando autenticación...');
    const user = await getAdminUser();
    const isUserAdmin =
      user?.app_metadata?.role === 'admin' ||
      (!!ADMIN_EMAIL && user?.email === ADMIN_EMAIL);

    console.log('[scanner] auth: user presente:', !!user, '| es admin:', isUserAdmin);

    if (!user || !isUserAdmin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    console.log('[scanner] STEP 1 OK');

    // 2. Body
    console.log('[scanner] STEP 2: parseando body...');
    const body = await request.json();
    const { imageUrl } = body as { imageUrl: string };

    if (!imageUrl) {
      return NextResponse.json({ error: 'imageUrl es requerido' }, { status: 400 });
    }
    console.log('[scanner] STEP 2 OK: imageUrl longitud:', imageUrl.length);

    // 3. API Key
    console.log('[scanner] STEP 3: verificando GEMINI_API_KEY...');
    if (!process.env.GEMINI_API_KEY) {
      console.log('[scanner] ERROR: GEMINI_API_KEY no definida');
      return NextResponse.json({ error: 'GEMINI_API_KEY no configurada' }, { status: 500 });
    }
    console.log('[scanner] STEP 3 OK: key presente');

    // 4. Categorías
    console.log('[scanner] STEP 4: obteniendo categorías...');
    const categories = await getCategories();
    const categoryList = categories.length > 0
      ? categories.map(c => c.name).join(' | ')
      : 'Anillos | Collares | Aros | Pulseras';
    console.log('[scanner] STEP 4 OK:', categories.length, 'categorías →', categoryList);

    // 5. Descargar imagen y convertir a base64
    console.log('[scanner] STEP 5: descargando imagen...');
    const imgResponse = await fetch(imageUrl);
    if (!imgResponse.ok) {
      throw new Error(`Error al descargar imagen: HTTP ${imgResponse.status}`);
    }
    const arrayBuffer = await imgResponse.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = imgResponse.headers.get('content-type') || 'image/webp';
    const sizeKB = Math.round((base64.length * 3) / 4 / 1024);
    console.log('[scanner] STEP 5 OK:', mimeType, '-', sizeKB, 'KB');

    // 6. Inicializar nuevo SDK @google/genai
    console.log('[scanner] STEP 6: inicializando @google/genai...');
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    console.log('[scanner] STEP 6 OK');

    // 7. Prompt
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
- NO menciones el material, la pureza ni el metal en ningún campo.
- NO inventes precios, costos, stock ni SKU.
- La categoría DEBE ser exactamente una de las opciones listadas.
- Si la imagen no muestra una joya claramente, devuelve valores genéricos apropiados.
- Usa el género gramatical correcto en español.`;

    // 8. Llamar a Gemini — retry automático ante 503 (sobrecarga temporal)
    // Modelos en orden de preferencia, todos confirmados funcionales con esta key.
    const MODELS = ['gemini-flash-lite-latest', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'];
    const MAX_RETRIES = 3;
    const contents = [
      {
        role: 'user' as const,
        parts: [
          { inlineData: { mimeType, data: base64 } },
          { text: prompt },
        ],
      },
    ];

    let rawText = '';
    let lastError: Error | null = null;

    outerLoop: for (const modelName of MODELS) {
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          console.log(`[scanner] STEP 8: intento ${attempt}/${MAX_RETRIES} con ${modelName}...`);
          const result = await ai.models.generateContent({ model: modelName, contents });
          rawText = result.text?.trim() ?? '';
          console.log(`[scanner] STEP 8 OK: ${modelName} respondió (${rawText.length} chars)`);
          break outerLoop;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          const is503 = lastError.message.includes('503') || lastError.message.includes('UNAVAILABLE');
          const is404 = lastError.message.includes('404') || lastError.message.includes('NOT_FOUND');

          if (is404) {
            console.log(`[scanner] ${modelName} no disponible (404), probando siguiente modelo...`);
            break; // pasar al siguiente modelo
          }
          if (is503 && attempt < MAX_RETRIES) {
            const waitMs = attempt * 2000;
            console.log(`[scanner] ${modelName} sobrecargado (503), reintentando en ${waitMs}ms...`);
            await new Promise(r => setTimeout(r, waitMs));
            continue;
          }
          // Otro error o se agotaron reintentos
          console.error(`[scanner] ${modelName} falló definitivamente:`, lastError.message.substring(0, 120));
          break; // probar siguiente modelo
        }
      }
    }

    if (!rawText) {
      console.error('[scanner] ERROR STEP 8: todos los modelos fallaron. Último error:', lastError?.message?.substring(0, 200));
      throw lastError ?? new Error('Gemini no respondió');
    }

    console.log('[scanner] Gemini raw (primeros 200 chars):', rawText.substring(0, 200));

    // 9. Parsear JSON
    console.log('[scanner] STEP 9: parseando JSON...');
    let parsed: GeminiScanResponse;
    try {
      const jsonText = rawText
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();
      parsed = JSON.parse(jsonText);
      console.log('[scanner] STEP 9 OK');
    } catch (parseErr) {
      console.error('[scanner] ERROR STEP 9: JSON parse falló:', parseErr instanceof Error ? parseErr.message : parseErr);
      console.error('[scanner] raw text completo:', rawText);
      return NextResponse.json(
        { error: 'La IA devolvió una respuesta inválida. Intenta de nuevo.' },
        { status: 422 }
      );
    }

    // 10. Validar campos
    console.log('[scanner] STEP 10: validando campos...');
    if (!parsed.name || !parsed.description || !parsed.category) {
      console.log('[scanner] ERROR STEP 10: campos faltantes');
      return NextResponse.json(
        { error: 'La IA no pudo identificar la joya. Intenta con otra foto.' },
        { status: 422 }
      );
    }

    // 11. Resolver category_id
    const matchedCategory = categories.find(
      c => c.name.toLowerCase() === parsed.category.toLowerCase()
    );
    const validCategory = matchedCategory?.name ?? parsed.category;
    const validCategoryId = matchedCategory?.id ?? null;
    console.log('[scanner] STEP 11 OK: category_id =', validCategoryId, '| category =', validCategory);

    // 12. Respuesta
    console.log('[scanner] STEP 12: enviando respuesta al cliente ✓');
    return NextResponse.json({
      name: parsed.name.trim(),
      description: parsed.description.trim(),
      category: validCategory,
      category_id: validCategoryId,
      material: 'Plata Ley 925',
      collection: parsed.collection?.trim() || null,
      meta_title: parsed.meta_title?.trim() || `${parsed.name} | Joyas Fran`,
      meta_description: parsed.meta_description?.trim() || parsed.description,
    });

  } catch (error) {
    console.error('[scanner] ERROR INESPERADO (catch global):');
    console.error('[scanner] tipo:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('[scanner] mensaje:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error('[scanner] stack (5 líneas):', error.stack.split('\n').slice(0, 5).join('\n'));
    }
    return NextResponse.json(
      { error: 'Error inesperado al analizar la imagen. Intenta de nuevo.' },
      { status: 500 }
    );
  }
}
