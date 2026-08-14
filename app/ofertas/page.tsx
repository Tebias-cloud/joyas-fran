import { Suspense } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import OfertasClient from './OfertasClient'; // Importación local directa

export const metadata = {
  title: 'Ofertas Exclusivas | Joyas Fran',
  description: 'Aprovecha nuestros descuentos especiales en joyas seleccionadas.',
};

import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getSaleProducts } from '@/services/productService';
import { Product } from '@/app/catalogo/page';

async function fetchSaleProducts() {
  const supabase = await createSupabaseServerClient();
  try {
    return await getSaleProducts(supabase, 50); // Límite de 50 productos en oferta
  } catch (error) {
    console.error("Error loading sale products for ofertas page:", error);
    return [];
  }
}

export default async function OfertasPage() {
  const saleProducts = await fetchSaleProducts();

  const legacyProducts: Product[] = saleProducts.map(p => ({
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

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <main className="flex-grow">
        <div className="bg-zinc-900 text-white py-12 text-center mb-8">
          <h1 className="text-4xl font-serif italic mb-2">Sale</h1>
          <p className="text-xs uppercase tracking-[0.3em] opacity-80">Descuentos por tiempo limitado</p>
        </div>
        
        <Suspense fallback={<div className="py-20 text-center text-gray-400">Cargando ofertas...</div>}>
          <OfertasClient initialProducts={legacyProducts} />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}