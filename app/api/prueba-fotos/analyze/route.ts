import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { GoogleGenAI } from '@google/genai';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { serverEnv } from '@/lib/server-env';
import { parseGeminiJson, scanResponseSchema } from '@/lib/product-ai';

export const runtime = 'nodejs';
export const maxDuration = 60;

const REGIONS = [
  { left: 0, top: 0, width: 320, height: 693 },
  { left: 320, top: 0, width: 320, height: 693 },
  { left: 0, top: 693, width: 320, height: 693 },
  { left: 320, top: 693, width: 320, height: 693 },
] as const;

interface DBCategory {
  id: number;
  name: string;
}

async function categoriesForCurrentStore(): Promise<DBCategory[]> {
  const { data } = await supabaseAdmin
    .from('categories')
    .select('id,name')
    .eq('is_active', true)
    .order('position', { ascending: true });

  return (data || []) as DBCategory[];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { id?: number };
    const id = Number(body.id);

    if (!Number.isInteger(id) || id < 0 || id >= REGIONS.length) {
      return NextResponse.json({ error: 'Foto inválida' }, { status: 400 });
    }

    const sheet = await readFile(join(process.cwd(), 'public', 'prueba-fotos', 'madre-contact.webp'));
    const analysisImage = await sharp(sheet)
      .extract(REGIONS[id])
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();

    const categories = await categoriesForCurrentStore();
    const categoryList = categories.length
      ? categories.map(category => category.name).join(' | ')
      : 'Anillos | Collares | Aros | Pulseras';

    const prompt = `Analiza la imagen de esta joya para una tienda chilena llamada "Joyas Fran".

Esta imagen se está procesando exactamente como una foto que la dueña subiría desde su teléfono. Puede incluir elementos de una captura de pantalla alrededor de la joya. Analiza la joya visible y no describas la interfaz del teléfono.

Responde ÚNICAMENTE con un objeto JSON válido. Sin texto adicional ni bloques markdown.

{
  "name": "string — nombre comercial descriptivo en español (máx 60 caracteres, capitalizado, no incluir Joyas Fran)",
  "description": "string — descripción de venta atractiva en español (2-3 oraciones, máx 250 caracteres). Describe diseño y posible ocasión de uso. No menciones material.",
  "category": "string — EXACTAMENTE una de estas opciones: ${categoryList}",
  "collection": "string o null — colección solo si se desprende razonablemente del diseño; si no, null",
  "meta_title": "string — [Nombre] | Joyas Fran (máx 70 chars)",
  "meta_description": "string — descripción SEO en español (máx 155 chars)"
}

Reglas estrictas:
- NO inventes material, pureza, metal, marca de piedra ni composición.
- NO inventes precio, costo, stock ni SKU.
- NO describas botones, nombres de contacto, hora, batería ni elementos de la captura.
- La categoría DEBE coincidir exactamente con una de las opciones.
- Si algo no se distingue con seguridad, usa una descripción visual prudente.`;

    const ai = new GoogleGenAI({ apiKey: serverEnv.geminiApiKey });
    const models = ['gemini-flash-lite-latest', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'];
    const contents = [{
      role: 'user' as const,
      parts: [
        { inlineData: { mimeType: 'image/webp', data: analysisImage.toString('base64') } },
        { text: prompt },
      ],
    }];

    let raw = '';
    let lastError: Error | null = null;

    outer: for (const model of models) {
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const result = await ai.models.generateContent({ model, contents });
          raw = result.text?.trim() || '';
          if (raw) break outer;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          const retryable = lastError.message.includes('503') || lastError.message.includes('UNAVAILABLE');
          const missing = lastError.message.includes('404') || lastError.message.includes('NOT_FOUND');
          if (missing) break;
          if (retryable && attempt < 3) {
            await new Promise(resolve => setTimeout(resolve, attempt * 1500));
            continue;
          }
          break;
        }
      }
    }

    if (!raw) throw lastError || new Error('La IA no respondió');

    const parsed = scanResponseSchema.parse(parseGeminiJson(raw));
    const matched = categories.find(category =>
      category.name.toLowerCase() === parsed.category.toLowerCase()
    );

    return NextResponse.json({
      name: parsed.name,
      description: parsed.description,
      category: matched?.name || parsed.category,
      category_id: matched?.id || null,
      collection: parsed.collection || null,
      meta_title: parsed.meta_title || `${parsed.name} | Joyas Fran`,
      meta_description: parsed.meta_description || parsed.description,
      material: 'Por confirmar',
    });
  } catch (error) {
    console.error('[prueba-fotos] análisis falló:', error);
    return NextResponse.json(
      { error: 'No se pudo analizar esta foto. Reintenta para ver si el flujo se recupera igual que en uso real.' },
      { status: 500 }
    );
  }
}
