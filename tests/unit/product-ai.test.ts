import assert from 'node:assert/strict';
import test from 'node:test';
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
