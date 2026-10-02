import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import { getErrorMessage } from '@/lib/errors';
import { supabaseAdmin } from '@/lib/supabase-admin';

const ALLOWED_TYPES = new Set(['sale', 'restock', 'count']);

function migrationMissing(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes('stock_movements') ||
    normalized.includes('apply_admin_stock_movement') ||
    normalized.includes('could not find the function');
}

export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabaseAdmin
      .from('stock_movements')
      .select('product_id,created_at')
      .eq('movement_type', 'count')
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const lastCountAtByProduct: Record<string, string> = {};
    for (const row of data || []) {
      if (!lastCountAtByProduct[row.product_id]) {
        lastCountAtByProduct[row.product_id] = row.created_at;
      }
    }

    return NextResponse.json({
      recentlyCountedProductIds: Object.keys(lastCountAtByProduct),
      lastCountAtByProduct,
      windowDays: 30,
    });
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    if (migrationMissing(message)) {
      return NextResponse.json(
        { error: 'Falta aplicar la migración 20261002_stock_operations.sql.', migrationRequired: true },
        { status: 409 }
      );
    }
    console.error('Error fetching stock summary:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json() as {
      productId?: string;
      movementType?: string;
      quantity?: number;
      size?: string | null;
      channel?: string | null;
      note?: string | null;
      idempotencyKey?: string;
      expectedStock?: number | null;
    };

    if (!body.productId || !body.movementType || !ALLOWED_TYPES.has(body.movementType)) {
      return NextResponse.json({ error: 'Movimiento inválido.' }, { status: 400 });
    }
    if (!Number.isInteger(body.quantity) || (body.quantity as number) < 0) {
      return NextResponse.json({ error: 'Cantidad inválida.' }, { status: 400 });
    }
    if (body.movementType !== 'count' && (body.quantity as number) === 0) {
      return NextResponse.json({ error: 'La cantidad debe ser mayor que cero.' }, { status: 400 });
    }
    if (!body.idempotencyKey) {
      return NextResponse.json({ error: 'Falta la clave de seguridad del movimiento.' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin.rpc('apply_admin_stock_movement', {
      p_product_id: body.productId,
      p_movement_type: body.movementType,
      p_quantity: body.quantity,
      p_size: body.size || null,
      p_channel: body.channel || null,
      p_note: body.note || null,
      p_idempotency_key: body.idempotencyKey,
      p_expected_stock: body.expectedStock ?? null,
    });

    if (error) throw error;

    const result = Array.isArray(data) ? data[0] : data;
    return NextResponse.json({ movement: result });
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    if (migrationMissing(message)) {
      return NextResponse.json(
        { error: 'Primero aplica la migración 20261002_stock_operations.sql en Supabase.', migrationRequired: true },
        { status: 409 }
      );
    }
    if (
      message.includes('stock cambió') ||
      message.includes('stock suficiente') ||
      message.includes('Selecciona la talla') ||
      message.includes('variante seleccionada')
    ) {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    console.error('Error applying stock movement:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
