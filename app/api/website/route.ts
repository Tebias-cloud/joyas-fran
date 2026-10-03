import { NextResponse } from 'next/server';
import { getWebsiteContent } from '@/lib/website-content-server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { selectFeaturedJewels } from '@/lib/website-content';
import { getProducts } from '@/services/productService';

export const dynamic = 'force-dynamic';

export async function GET() {
  const content = await getWebsiteContent();
  const products = content.featuredProductIds.length
    ? await getProducts(supabaseAdmin).catch(() => [])
    : [];

  // Only explicitly selected real products are linked from the home.
  // Until the owner chooses them in Admin → Web, the home uses local photographed examples.
  const jewels = products.map(({ id, name, slug, imageUrl, price, stock, isActive }) => ({
    id, name, slug, imageUrl, price, stock, isActive,
  }));

  return NextResponse.json(
    { content, featured: selectFeaturedJewels(jewels, content.featuredProductIds) },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
