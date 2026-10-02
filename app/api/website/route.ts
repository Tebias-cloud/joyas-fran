import { NextResponse } from 'next/server';
import { getWebsiteContent } from '@/lib/website-content-server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { selectFeaturedJewels } from '@/lib/website-content';
import { getProducts } from '@/services/productService';

export const dynamic = 'force-dynamic';

export async function GET() {
  const content = await getWebsiteContent();
  const products = content.featuredProductIds.length ? await getProducts(supabaseAdmin).catch(() => []) : [];
  // Never send internal SKU/cost/supplier data to the public client.
  const jewels = products.map(({ id, name, slug, imageUrl, price, stock, isActive }) => ({ id, name, slug, imageUrl, price, stock, isActive }));
  return NextResponse.json({ content, featured: selectFeaturedJewels(jewels, content.featuredProductIds) }, { headers: { 'Cache-Control': 'no-store' } });
}
