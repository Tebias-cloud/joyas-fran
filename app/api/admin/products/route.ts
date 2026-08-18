import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { ADMIN_EMAIL } from '@/lib/config';
import { createClient } from '@supabase/supabase-js';

// Cliente con service role para bypass de RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

async function checkAdmin() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  return (
    user.app_metadata?.role === 'admin' ||
    (!!ADMIN_EMAIL && user.email === ADMIN_EMAIL)
  );
}

export async function GET(request: NextRequest) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { payload, variantsToUpsert } = await request.json();
    const { data: saved, error } = await supabaseAdmin
      .from('products')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    if (saved && variantsToUpsert && variantsToUpsert.length > 0) {
      // Sincronizar product_id real
      const mappedVariants = variantsToUpsert.map((v: any) => ({
        ...v,
        product_id: saved.id,
      }));
      const { error: vError } = await supabaseAdmin
        .from('product_variants')
        .upsert(mappedVariants, { onConflict: 'product_id, size' });
      
      if (vError) throw vError;
    }

    return NextResponse.json(saved);
  } catch (error: any) {
    console.error('Error inserting product:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID es requerido' }, { status: 400 });

    const { payload, variantsToUpsert } = await request.json();
    const { data: saved, error } = await supabaseAdmin
      .from('products')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (saved && variantsToUpsert && variantsToUpsert.length > 0) {
      const mappedVariants = variantsToUpsert.map((v: any) => ({
        ...v,
        product_id: saved.id,
      }));
      const { error: vError } = await supabaseAdmin
        .from('product_variants')
        .upsert(mappedVariants, { onConflict: 'product_id, size' });
      
      if (vError) throw vError;
    }

    return NextResponse.json(saved);
  } catch (error: any) {
    console.error('Error updating product:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID es requerido' }, { status: 400 });

    const { error } = await supabaseAdmin
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting product:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
