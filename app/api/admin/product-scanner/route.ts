import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { isAdminRequest } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { serverEnv } from '@/lib/server-env';
import {
  downloadProductImage,
  parseGeminiJson,
  productImageRequestSchema,
  scanResponseSchema,
} from '@/lib/product-ai';

// ─── Interfaces ─────────────────────────────────────────────────────────────

interface DBCategory {
  id: number;
  name: string;
}

interface GeminiScanResponse {
  name: string;
  description: string;
  category: string;
  collection?: string | null;
  meta_title?: string;
  meta_description?: string;
}

// ─── Helper: obtener categorías desde Supabase ───────────────────────────────

async function getCategories(): Promise<DBCategory[]> {
  const { data, error } = await supabaseAdmin
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
    if (!(await isAdminRequest())) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // 2. Body
    const requestResult = productImageRequestSchema.safeParse(await request.json());
    if (!requestResult.success) {
      return NextResponse.json({ error: 'La imagen enviada no es válida' }, { status: 400 });
    }
    const { imageUrl } = requestResult.data;

    // 3. API Key
    const apiKey = serverEnv.geminiApiKey;

    // 4. Categorías
    const categories = await getCategories();
    const categoryList = categories.length > 0
      ? categories.map(c => c.name).join(' | ')
      : 'Anillos | Collares | Aros | Pulseras';

    // 5. Descargar imagen y convertir a base64
    const { base64, mimeType } = await downloadProductImage(imageUrl);

    // 6. Inicializar nuevo SDK @google/genai
    const ai = new GoogleGenAI({ apiKey });

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
    // Se prueban modelos alternativos ante cambios de disponibilidad del proveedor.
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
          const result = await ai.models.generateContent({ model: modelName, contents });
          rawText = result.text?.trim() ?? '';
          break outerLoop;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          const is503 = lastError.message.includes('503') || lastError.message.includes('UNAVAILABLE');
          const is404 = lastError.message.includes('404') || lastError.message.includes('NOT_FOUND');

          if (is404) {
            break; // pasar al siguiente modelo
          }
          if (is503 && attempt < MAX_RETRIES) {
            const waitMs = attempt * 2000;
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

    // 9. Parsear JSON
    let parsed: GeminiScanResponse;
    try {
      parsed = scanResponseSchema.parse(parseGeminiJson(rawText));
    } catch (parseErr) {
      console.error('[scanner] ERROR STEP 9: JSON parse falló:', parseErr instanceof Error ? parseErr.message : parseErr);
      return NextResponse.json(
        { error: 'La IA devolvió una respuesta inválida. Intenta de nuevo.' },
        { status: 422 }
      );
    }

    // 10. Validar campos
    if (!parsed.name || !parsed.description || !parsed.category) {
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

    // 12. Respuesta
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
    console.error('[scanner] Error al analizar producto:', error);
    return NextResponse.json(
      { error: 'Error inesperado al analizar la imagen. Intenta de nuevo.' },
      { status: 500 }
    );
  }
}
