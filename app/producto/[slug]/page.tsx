import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getProductBySlug } from '@/services/productService';
import ClientProductContent from './ClientProductContent';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { notFound } from 'next/navigation';
import { Product } from '@/types/product';

export const dynamic = 'force-dynamic';

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const supabase = await createSupabaseServerClient();
  const product = await getProductBySlug(supabase, slug);

  if (!product) {
    return notFound();
  }

  // Normalizamos imágenes para compatibilidad con la vista
  const images = (product.images && product.images.length > 0) 
    ? product.images 
    : [product.imageUrl];

  const legacyProduct: Product = {
    id: product.id,
    name: product.name,
    price: product.price,
    image_url: product.imageUrl,
    images: images,
    stock: product.stock,
    slug: product.slug,
    description: product.description,
    category_id: product.categoryId,
    category: product.categoryName,
    sizes: product.sizes,
    inventory: product.inventory,
    sku: product.sku,
    brand: product.brand,
    collection: product.collection,
    material: product.material,
    is_featured: product.isFeatured,
    is_new: product.isNew,
    is_active: product.isActive,
    meta_title: product.metaTitle,
    meta_description: product.metaDescription,
    created_at: product.createdAt,
    compare_at_price: product.compareAtPrice
  };

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 selection:bg-gray-100 flex flex-col">
      <Header />
      <main className="flex-grow">
        <ClientProductContent product={legacyProduct} />
      </main>
      <Footer />
    </div>
  );
}
