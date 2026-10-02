import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

interface CartItemStock {
  productId: string;
  size: string;
  quantity: number;
  name?: string;
}

interface StockValidationResult {
  productId: string;
  size: string;
  name: string;
  requested: number;
  available: number;
  isValid: boolean;
}

/**
 * POST /api/cart/validate-stock
 * Verifica el stock real en la BD para cada ítem del carrito.
 * Recibe un array de { productId, size, quantity, name? }
 * Devuelve los ítems con stock insuficiente.
 */
export async function POST(request: Request) {
  try {
    const { items }: { items: CartItemStock[] } = await request.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Items requeridos' }, { status: 400 });
    }

    const results: StockValidationResult[] = [];

    // Consultar stock real por cada producto+talla
    // Agrupamos los productIds para reducir queries
    const productIds = [...new Set(items.map(i => i.productId))];
    if (items.some(item => !Number.isInteger(item.quantity) || item.quantity < 1 || typeof item.size !== 'string' || !item.size.trim())) {
      return NextResponse.json({ error: 'Cantidad o talla no válida' }, { status: 400 });
    }
    const { data: activeProducts, error: activeError } = await supabaseAdmin.from('products').select('id, stock').in('id', productIds).eq('is_active', true);
    if (activeError) throw activeError;
    const activeIds = new Set((activeProducts || []).map(product => product.id));

    const { data: variants, error } = await supabaseAdmin
      .from('product_variants')
      .select('product_id, size, stock')
      .in('product_id', productIds);

    if (error) {
      console.error('Error validando stock:', error);
      return NextResponse.json({ error: 'Error al verificar stock' }, { status: 500 });
    }

    // Construir mapa de stock disponible por product_id + size
    const stockMap = new Map<string, number>();
    for (const v of variants || []) {
      stockMap.set(`${v.product_id}:${v.size}`, v.stock);
    }

    // Para productos sin variantes (Talla Única en tabla products directamente)
    // buscamos el stock en la tabla products si no encontramos la variante
    const itemsWithoutVariant = items.filter(i => {
      const key = `${i.productId}:${i.size}`;
      return !stockMap.has(key);
    });

    if (itemsWithoutVariant.length > 0) {
      const missingProductIds = [...new Set(itemsWithoutVariant.map(i => i.productId))];
      const products = (activeProducts || []).filter(product => missingProductIds.includes(product.id));

      for (const p of products || []) {
        // Asignamos el stock total del producto como fallback para cada size de ese producto
        const relatedItems = itemsWithoutVariant.filter(i => i.productId === p.id);
        for (const item of relatedItems) {
          stockMap.set(`${p.id}:${item.size}`, p.stock);
        }
      }
    }

    // Evaluar cada ítem
    for (const item of items) {
      const key = `${item.productId}:${item.size}`;
      const available = activeIds.has(item.productId) ? stockMap.get(key) ?? 0 : 0;
      const isValid = available >= item.quantity;

      results.push({
        productId: item.productId,
        size: item.size,
        name: item.name || item.productId,
        requested: item.quantity,
        available,
        isValid,
      });
    }

    const invalidItems = results.filter(r => !r.isValid);

    return NextResponse.json({
      allValid: invalidItems.length === 0,
      invalidItems,
      results,
    });

  } catch (error) {
    console.error('Error en validate-stock:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
