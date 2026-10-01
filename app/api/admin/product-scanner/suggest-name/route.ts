import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { isAdminRequest } from '@/lib/admin-auth';
import { serverEnv } from '@/lib/server-env';
import {
  downloadProductImage,
  parseGeminiJson,
  productSuggestionRequestSchema,
} from '@/lib/product-ai';

const responseSchemas = {
  name: z.object({ name: z.string().trim().min(3).max(60) }),
  description: z.object({ description: z.string().trim().min(10).max(250) }),
  instagram: z.object({ caption: z.string().trim().min(20).max(900) }),
};

function buildPrompt(input: z.infer<typeof productSuggestionRequestSchema>) {
  if (input.mode === 'description') {
    return `Observa esta joya de Joyas Fran y redacta una descripción comercial natural en español de Chile.

Nombre: "${input.currentName || 'Joya sin nombre'}"
Categoría: "${input.category || 'Sin categoría'}"

Reglas:
- Máximo 250 caracteres y 2 oraciones.
- Describe únicamente rasgos visibles y posibles ocasiones de uso.
- No inventes piedras, medidas, técnicas, stock ni características.
- No uses frases exageradas ni un tono que parezca escrito por una IA.

Responde solo JSON válido: {"description":"..."}`;
  }

  if (input.mode === 'instagram') {
    const priceText = input.price ? `$${input.price.toLocaleString('es-CL')}` : 'consultar precio';
    return `Prepara un texto breve para una publicación de Instagram de Joyas Fran, una joyería de Iquique.

Producto: "${input.currentName}"
Categoría: "${input.category || 'Joya'}"
Descripción aprobada: "${input.description}"
Precio: ${priceText}
Disponibilidad actual: ${input.hasStock ? 'disponible' : 'sin stock'}

Reglas:
- Español chileno natural, cálido y sencillo; que no parezca texto genérico de IA.
- Entre 3 y 5 líneas cortas.
- Incluye el precio cuando esté informado.
- No indiques una cantidad exacta de stock: una publicación puede quedar antigua.
- Si no hay stock, indica que se puede consultar por reposición.
- Termina con una invitación breve a escribir por mensaje directo.
- Máximo 3 emojis y 4 hashtags relevantes.
- No inventes materiales ni características que no estén en los datos.

Responde solo JSON válido: {"caption":"..."}`;
  }

  const previousName = input.currentName
    ? `Evita repetir el nombre anterior: "${input.currentName}".`
    : '';

  return `Observa esta joya de Joyas Fran y sugiere un nombre comercial en español.

Categoría: "${input.category || 'Sin categoría'}". ${previousName}

Reglas:
- Entre 4 y 60 caracteres.
- Natural, descriptivo y fácil de recordar.
- No incluyas la marca, el material ni afirmaciones que no se vean.
- Devuelve un solo nombre.

Responde solo JSON válido: {"name":"..."}`;
}

export async function POST(request: NextRequest) {
  try {
    if (!(await isAdminRequest())) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const requestResult = productSuggestionRequestSchema.safeParse(await request.json());
    if (!requestResult.success) {
      return NextResponse.json({ error: 'Los datos enviados no son válidos' }, { status: 400 });
    }

    const input = requestResult.data;
    const { base64, mimeType } = await downloadProductImage(input.imageUrl);
    const ai = new GoogleGenAI({ apiKey: serverEnv.geminiApiKey });
    const result = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { mimeType, data: base64 } },
          { text: buildPrompt(input) },
        ],
      }],
    });

    const parsed = parseGeminiJson(result.text?.trim() ?? '');
    const validated = responseSchemas[input.mode].safeParse(parsed);

    if (!validated.success) {
      return NextResponse.json(
        { error: 'La IA devolvió una respuesta incompleta. Intenta nuevamente.' },
        { status: 422 }
      );
    }

    return NextResponse.json(validated.data);
  } catch (error) {
    console.error('[product-suggestion] Error:', error);
    return NextResponse.json(
      { error: 'No pudimos preparar la sugerencia. Intenta nuevamente.' },
      { status: 500 }
    );
  }
}
