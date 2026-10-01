import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import { getErrorMessage } from '@/lib/errors';
import { supabaseAdmin } from '@/lib/supabase-admin';

interface ProductVariantInput {
  sku: string;
  size: string;
  stock: number;
  price_override: number | null;
  cost_price: number | null;
}

export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { payload, variantsToUpsert = [] } = await request.json() as {
      payload: Record<string, unknown>;
      variantsToUpsert?: ProductVariantInput[];
    };
    const { data: saved, error } = await supabaseAdmin
      .from('products')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    if (saved && variantsToUpsert && variantsToUpsert.length > 0) {
      // Sincronizar product_id real
      const mappedVariants = variantsToUpsert.map(v => ({
        ...v,
        product_id: saved.id,
      }));
      const { error: vError } = await supabaseAdmin
        .from('product_variants')
        .upsert(mappedVariants, { onConflict: 'product_id, size' });
      
      if (vError) throw vError;
    }

    return NextResponse.json(saved);
  } catch (error: unknown) {
    console.error('Error inserting product:', error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID es requerido' }, { status: 400 });

    const { payload, variantsToUpsert = [] } = await request.json() as {
      payload: Record<string, unknown>;
      variantsToUpsert?: ProductVariantInput[];
    };
    const { data: saved, error } = await supabaseAdmin
      .from('products')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (saved && variantsToUpsert && variantsToUpsert.length > 0) {
      const mappedVariants = variantsToUpsert.map(v => ({
        ...v,
        product_id: saved.id,
      }));
      const { error: vError } = await supabaseAdmin
        .from('product_variants')
        .upsert(mappedVariants, { onConflict: 'product_id, size' });
      
      if (vError) throw vError;
    }

    return NextResponse.json(saved);
  } catch (error: unknown) {
    console.error('Error updating product:', error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!(await isAdminRequest())) {
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
  } catch (error: unknown) {
    console.error('Error deleting product:', error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
