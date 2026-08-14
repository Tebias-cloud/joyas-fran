import { Suspense } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import CatalogClient from './CatalogClient';
import CatalogSkeleton from '@/components/ui/CatalogSkeleton';

// --- CONFIGURACIÓN DE RENDIMIENTO ---
// Revalidar la caché cada 60 segundos (ISR).
// Esto hace que la página cargue instantáneamente como estática, pero se mantenga fresca.
export const revalidate = 60;

export const metadata = {
  title: 'Catálogo Completo | Joyas Fran',
  description: 'Explora nuestra colección exclusiva de joyas hechas a mano en Plata Ley 925.',
};

// --- DEFINICIÓN DE TIPOS ---
export interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string;
  images?: string[]; // Opcional, puede ser null en DB
  category: string;
  slug: string;
  stock: number;
  created_at: string;
  description?: string;
  inventory?: Record<string, number>;
  sizes?: string[];
  compare_at_price?: number | null;
}

import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getProducts, getActiveCategories } from '@/services/productService';
import { ProductDTO } from '@/types/product';

async function getCatalogData() {
  const supabase = await createSupabaseServerClient();
  
  // 1. Obtener productos mapeados a DTOs usando el servicio
  let products: ProductDTO[] = [];
  try {
    products = await getProducts(supabase);
  } catch (error) {
    console.error('Error fetching products via service:', error);
  }

  // 2. Obtener categorías dinámicas usando el servicio
  let categoriesList: string[] = [];
  try {
    const activeCategories = await getActiveCategories(supabase);
    categoriesList = activeCategories.map(c => c.name);
  } catch (error) {
    console.error('Error fetching categories via service:', error);
    categoriesList = ['Anillos', 'Collares', 'Aros', 'Pulseras']; // Fallback por seguridad
  }

  const categories = ['Todos', ...categoriesList];

  return { products, categories };
}

export default async function CatalogoPage() {
  const { products, categories } = await getCatalogData();

  const legacyProducts: Product[] = products.map(p => ({
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
        <Suspense fallback={<CatalogSkeleton />}>
          <CatalogClient initialProducts={legacyProducts} categories={categories} />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}