import { Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import CatalogClient from './CatalogClient';

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

async function getCatalogData() {
  // 1. Obtener productos (OPTIMIZADO)
  // Solo seleccionamos los campos necesarios para la tarjeta del producto.
  // Esto reduce el tamaño del payload y acelera la carga inicial.
  const { data: productsData, error: productsError } = await supabase
    .from('products')
    .select('id, name, price, compare_at_price, image_url, images, category, slug, stock, created_at')
    .order('created_at', { ascending: false });

  if (productsError) {
    console.error('Error fetching products:', productsError);
  }

  // 2. Obtener categorías
  const { data: settingsData } = await supabase
    .from('store_settings')
    .select('value')
    .eq('key', 'categories')
    .single();

  // 3. Sanitización de datos
  const products = (productsData as Product[]) || [];
  
  // Aseguramos que categories sea un array de strings limpio
  const categoriesRaw = settingsData?.value;
  const categoriesList = Array.isArray(categoriesRaw) 
    ? categoriesRaw.map(String) 
    : ['Anillos', 'Collares', 'Aros', 'Pulseras']; // Fallback por seguridad

  const categories = ['Todos', ...categoriesList];

  return { products, categories };
}

export default async function CatalogoPage() {
  const { products, categories } = await getCatalogData();

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <main className="flex-grow">
        <Suspense fallback={
          <div className="h-96 flex items-center justify-center text-gray-400 font-serif italic animate-pulse">
            Cargando colección...
          </div>
        }>
          <CatalogClient initialProducts={products} categories={categories} />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}