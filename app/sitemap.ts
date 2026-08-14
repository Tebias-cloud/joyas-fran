import { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/config';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getProductSlugs } from '@/services/productService';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE_URL;

  // 1. Obtenemos solo slugs y fechas de modificación para indexar eficientemente
  const supabase = await createSupabaseServerClient();
  let products: { slug: string; createdAt: string }[] = [];
  try {
    products = await getProductSlugs(supabase);
  } catch (error) {
    console.error("Error building sitemap product urls:", error);
  }

  const productUrls = products.map((product) => ({
    url: `${baseUrl}/producto/${product.slug}`,
    lastModified: product.createdAt ? new Date(product.createdAt) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/catalogo`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/nosotros`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    ...productUrls,
  ];
}