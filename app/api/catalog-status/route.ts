import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
export const dynamic = 'force-dynamic';
export async function GET() {
  const { data, error } = await supabaseAdmin.from('products').select('id').eq('is_active', true).like('sku', 'FRAN-MUESTRA-%').limit(1);
  return NextResponse.json({ exampleValues: Boolean(!error && data?.length) }, { headers: { 'Cache-Control': 'no-store' } });
}
