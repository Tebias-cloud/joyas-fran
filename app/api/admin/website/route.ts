import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { parseWebsiteContent, websiteContentSchema } from '@/lib/website-content';

export async function GET() {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const { data, error } = await supabaseAdmin.from('store_settings').select('value').eq('key', 'website').maybeSingle();
  if (error) return NextResponse.json({ error: 'No se pudo cargar el contenido de la página.' }, { status: 500 });
  return NextResponse.json(parseWebsiteContent(data?.value));
}
export async function PUT(request: NextRequest) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    const result = websiteContentSchema.safeParse(await request.json());
    if (!result.success) return NextResponse.json({ error: 'Revisa los textos, la portada y las joyas seleccionadas.' }, { status: 400 });
    const { error } = await supabaseAdmin.from('store_settings').upsert({ key: 'website', value: result.data }, { onConflict: 'key' });
    if (error) throw error;
    return NextResponse.json(result.data);
  } catch {
    return NextResponse.json({ error: 'No se pudieron guardar los cambios. Comprueba la conexión y vuelve a intentar.' }, { status: 500 });
  }
}
