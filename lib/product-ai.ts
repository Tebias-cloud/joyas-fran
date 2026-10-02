import { z } from 'zod';
import sharp from 'sharp';

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
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

  const response = await fetch(image, { redirect: 'error', signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`No se pudo descargar la imagen (${response.status})`);

  const contentType = response.headers.get('content-type') ?? '';
  if (!/^image\/(jpeg|png|webp)(;|$)/i.test(contentType)) throw new Error('Usa una imagen JPG, PNG o WebP');

  const declaredSize = Number(response.headers.get('content-length') ?? 0);
  if (declaredSize > MAX_IMAGE_BYTES) throw new Error('La imagen supera el límite de 15 MB');

  if (!response.body) throw new Error('La imagen recibida está vacía');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > MAX_IMAGE_BYTES) {
        await reader.cancel();
        throw new Error('La imagen supera el límite de 15 MB');
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }

  // A small analysis copy avoids rejecting camera originals or modifying storage.
  const optimized = await sharp(Buffer.concat(chunks), { limitInputPixels: 40_000_000 })
    .rotate().resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 85 }).toBuffer();

  return {
    base64: optimized.toString('base64'),
    mimeType: 'image/webp',
  };
}
