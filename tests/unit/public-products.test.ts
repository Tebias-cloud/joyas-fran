import test from 'node:test';
import assert from 'node:assert/strict';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getProducts, getProductBySlug, getSaleProducts, searchProducts, getProductSlugs } from '../../services/productService';

test('all storefront entry points constrain visibility and avoid requesting internal columns', async () => {
  for (const call of [getProducts, (client: SupabaseClient) => getProductBySlug(client, 'dije-cisnes'), getSaleProducts, (client: SupabaseClient) => searchProducts(client, 'dije'), getProductSlugs]) {
    const operations: unknown[][] = [];
    const query: Record<string, unknown> = {};
    for (const name of ['select', 'eq', 'not', 'gt', 'ilike', 'limit', 'order', 'in']) query[name] = (...args: unknown[]) => { operations.push([name, ...args]); return query; };
    query.single = async () => ({ data: null, error: null });
    query.then = (resolve: (value: unknown) => unknown) => resolve({ data: [], error: null });
    const client = { from: () => query } as unknown as SupabaseClient;
    await call(client);
    assert.ok(operations.some(operation => operation[0] === 'eq' && operation[1] === 'is_active' && operation[2] === true));
    assert.ok(operations.some(operation => operation[0] === 'not' && operation[1] === 'name' && operation[3] === '[TEST%'));
    const selection = operations.find(operation => operation[0] === 'select')?.[1];
    assert.doesNotMatch(String(selection), /\*|cost_price|supplier_code|barcode/);
  }
});
