import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';
import {
  downloadProductImage,
  parseGeminiJson,
  productSuggestionRequestSchema,
  scanResponseSchema,
} from '../../lib/product-ai';

test('acepta JSON de Gemini aunque venga dentro de un bloque markdown', () => {
  const parsed = scanResponseSchema.parse(parseGeminiJson(`\`\`\`json
    {
      "name": "Anillo Corazón",
      "description": "Diseño delicado para acompañar ocasiones especiales.",
      "category": "Anillos"
    }
  \`\`\``));

  assert.equal(parsed.name, 'Anillo Corazón');
});

test('optimiza una copia para IA y rechaza formatos no permitidos', async () => {
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalFetch = globalThis.fetch;
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://joyas-fran.supabase.co';
  try {
    const original = await sharp({ create: { width: 1400, height: 10, channels: 3, background: '#fff' } }).png().toBuffer();
    globalThis.fetch = async () => new Response(new Uint8Array(original), { headers: { 'content-type': 'image/png' } });
    const result = await downloadProductImage('https://joyas-fran.supabase.co/storage/v1/object/public/products/photo.png');
    const metadata = await sharp(Buffer.from(result.base64, 'base64')).metadata();
    assert.equal(result.mimeType, 'image/webp');
    assert.equal(metadata.width, 1200);
    globalThis.fetch = async () => new Response('<svg/>', { headers: { 'content-type': 'image/svg+xml' } });
    await assert.rejects(() => downloadProductImage('https://joyas-fran.supabase.co/storage/v1/object/public/products/photo.svg'), /JPG/);
  } finally {
    globalThis.fetch = originalFetch;
    if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
  }
});

test('normaliza el modo de sugerencia cuando no viene informado', () => {
  const parsed = productSuggestionRequestSchema.parse({
    imageUrl: 'https://example.com/image.webp',
  });

  assert.equal(parsed.mode, 'name');
  assert.equal(parsed.category, '');
});

test('rechaza imágenes ajenas al almacenamiento de productos', async () => {
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://joyas-fran.supabase.co';

  try {
    await assert.rejects(
      () => downloadProductImage('https://example.com/private-resource'),
      /almacenamiento de productos/
    );
  } finally {
    if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
  }
});
