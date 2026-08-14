import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getSaleProducts } from '@/services/productService';
import ProductCard from './ProductCard';
import { Product } from '@/types/product';

export default async function OnSaleSection() {
  const supabase = await createSupabaseServerClient();
  let saleProducts: Product[] = [];
  try {
    const rawProducts = await getSaleProducts(supabase, 4);
    saleProducts = rawProducts.map(p => ({
      id: p.id,
      name: p.name,
      price: p.price,
      image_url: p.imageUrl,
      images: p.images,
      category: p.categoryName,
      slug: p.slug,
      stock: p.stock,
      created_at: p.createdAt,
      description: p.description,
      inventory: p.inventory,
      sizes: p.sizes,
      compare_at_price: p.compareAtPrice
    }));
  } catch (error) {
    console.error("Error loading sale products:", error);
  }

  if (!saleProducts || saleProducts.length === 0) return null;

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col items-center mb-16 text-center">
          <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-gray-400 mb-3">Promociones</span>
          <h2 className="text-3xl font-serif italic text-gray-900">Piezas Seleccionadas</h2>
          <div className="h-px w-12 bg-black mt-6"></div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-12">
          {saleProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}