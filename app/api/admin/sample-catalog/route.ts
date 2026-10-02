import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { isAdminRequest } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { SAMPLE_CATALOG } from '@/lib/sample-catalog';
import { revalidatePath } from 'next/cache';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    const body = await request.json();
    if (body.confirm !== 'REEMPLAZAR CATALOGO' || body.exampleValues !== true) return NextResponse.json({ error: 'Confirma el reemplazo y los valores de ejemplo.' }, { status: 400 });
    // Preflight the migration before uploading: do not mutate existing catalog yet.
    const { error: preflight } = await supabaseAdmin.from('catalog_replacement_snapshots').select('id').limit(1);
    if (preflight) return NextResponse.json({ error: 'Primero aplica la migración 20261002_sample_catalog.sql en Supabase.' }, { status: 409 });
    const { data: installed, error: readError } = await supabaseAdmin.from('products').select('id').like('sku', 'FRAN-MUESTRA-%').limit(1);
    if (readError) throw readError;
    if (installed?.length) return NextResponse.json({ error: 'La muestra ya está instalada. Edita las joyas desde Productos.' }, { status: 409 });
    const namespace = `sample-catalog/${crypto.randomUUID()}`;
    const upload = async (filename: string) => {
      const bytes = await readFile(join(process.cwd(), 'public', 'sample-catalog', filename));
      const path = `${namespace}/${filename}`;
      const { error } = await supabaseAdmin.storage.from('products').upload(path, bytes, { contentType: 'image/webp', upsert: false });
      if (error) throw error;
      return supabaseAdmin.storage.from('products').getPublicUrl(path).data.publicUrl;
    };
    const rows = [];
    for (const item of SAMPLE_CATALOG) {
      const [image_url, original_url] = await Promise.all([upload(`${item.slug}.webp`), upload(`${item.slug}-original.webp`)]);
      rows.push({ name: item.name, slug: item.slug, description: item.description, category: item.category, price: item.price, stock: item.stock, sku: `FRAN-MUESTRA-${item.slug}`, image_url, original_url });
    }
    const hero = await upload('portada.webp');
    const { data, error } = await supabaseAdmin.rpc('install_photographed_catalog', { p_products: rows, p_hero: hero });
    if (error) throw error;
    revalidatePath('/'); revalidatePath('/catalogo'); revalidatePath('/ofertas');
    return NextResponse.json(data);
  } catch (error) {
    console.error('Catalog replacement failed:', error instanceof Error ? error.message : 'database/storage error');
    return NextResponse.json({ error: 'No se pudo instalar la muestra. La transacción de base de datos se revierte si falla. Comprueba Storage y la migración.' }, { status: 500 });
  }
}
