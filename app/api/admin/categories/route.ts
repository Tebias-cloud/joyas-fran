import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import { getErrorMessage } from '@/lib/errors';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('categories')
      .select('*')
      .order('position', { ascending: true });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const payload = await request.json();
    const { data, error } = await supabaseAdmin
      .from('categories')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error('Error inserting category:', error);
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

    const payload = await request.json();
    const { data, error } = await supabaseAdmin
      .from('categories')
      .update(payload)
      .eq('id', Number(id))
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error('Error updating category:', error);
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
      .from('categories')
      .delete()
      .eq('id', Number(id));

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error deleting category:', error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
