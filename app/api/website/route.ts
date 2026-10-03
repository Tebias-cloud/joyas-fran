import { NextResponse } from 'next/server';
import { getWebsiteContent } from '@/lib/website-content-server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { selectFeaturedJewels } from '@/lib/website-content';
import { getProducts } from '@/services/productService';

export const dynamic = 'force-dynamic';

export async function GET() {
  const content = await getWebsiteContent();
  const products = await getProducts(supabaseAdmin).catch(() => []);

  const jewels = products.map(({ id, name, slug, imageUrl, price, stock, isActive, isFeatured }) => ({
    id, name, slug, imageUrl, price, stock, isActive, isFeatured,
  }));

  const manuallySelected = selectFeaturedJewels(jewels, content.featuredProductIds);
  const selectedIds = new Set(manuallySelected.map(item => item.id));
  const automatic = jewels
    .filter(item => item.isActive && item.stock > 0 && item.imageUrl && !selectedIds.has(item.id))
    .sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured));

  return NextResponse.json(
    { content, featured: [...manuallySelected, ...automatic].slice(0, 3) },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
