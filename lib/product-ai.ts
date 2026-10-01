import { z } from 'zod';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const PRODUCT_STORAGE_PATH = '/storage/v1/object/public/products/';

export const productImageRequestSchema = z.object({
  imageUrl: z.string().url(),
});

export const productSuggestionRequestSchema = productImageRequestSchema.extend({
  category: z.string().max(80).optional().default(''),
  currentName: z.string().max(80).optional().default(''),
  description: z.string().max(500).optional().default(''),
  price: z.number().nonnegative().optional(),
  hasStock: z.boolean().optional(),
  mode: z.enum(['name', 'description', 'instagram']).optional().default('name'),
});

export const scanResponseSchema = z.object({
  name: z.string().trim().min(3).max(60),
  description: z.string().trim().min(10).max(250),
  category: z.string().trim().min(2).max(80),
  collection: z.string().trim().max(60).nullable().optional(),
  meta_title: z.string().trim().max(70).optional(),
  meta_description: z.string().trim().max(155).optional(),
});

export function parseGeminiJson(rawText: string): unknown {
  const jsonText = rawText
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  return JSON.parse(jsonText) as unknown;
}

export async function downloadProductImage(imageUrl: string) {
  const image = new URL(imageUrl);
  const supabaseUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co');

  if (
    image.protocol !== 'https:' ||
    image.origin !== supabaseUrl.origin ||
    !image.pathname.startsWith(PRODUCT_STORAGE_PATH)
  ) {
    throw new Error('La imagen debe pertenecer al almacenamiento de productos');
  }

  const response = await fetch(image, { redirect: 'error' });
  if (!response.ok) throw new Error(`No se pudo descargar la imagen (${response.status})`);

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.startsWith('image/')) throw new Error('El archivo recibido no es una imagen');

  const declaredSize = Number(response.headers.get('content-length') ?? 0);
  if (declaredSize > MAX_IMAGE_BYTES) throw new Error('La imagen supera el límite de 5 MB');

  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength > MAX_IMAGE_BYTES) throw new Error('La imagen supera el límite de 5 MB');

  return {
    base64: Buffer.from(arrayBuffer).toString('base64'),
    mimeType: contentType,
  };
}
