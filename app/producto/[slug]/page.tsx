import { supabase } from '@/lib/supabase';
import ClientProductContent from './ClientProductContent';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { notFound } from 'next/navigation';

// Definimos la interfaz del Producto
export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  image_url: string;
  images?: string[];
  sizes?: string[];
  inventory?: Record<string, number>;
  category?: string;
  slug: string;
  stock?: number;
  compare_at_price?: number | null;
}

export const dynamic = 'force-dynamic';

// CORRECCIÓN NEXT.JS 15: params es ahora una Promise
export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  
  // 1. Desempaquetamos el slug esperando la promesa
  const { slug } = await params;

  // 2. Buscamos el producto en el servidor
  const { data: productData } = await supabase
    .from('products')
    .select('*')
    .eq('slug', slug)
    .single();

  if (!productData) {
    return notFound();
  }

  const product = productData as Product;

  // 3. Normalizamos imágenes
  if (!product.images || product.images.length === 0) {
    product.images = [product.image_url];
  }

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 selection:bg-gray-100 flex flex-col">
      <Header />
      <main className="flex-grow">
        <ClientProductContent product={product} />
      </main>
      <Footer />
    </div>
  );
}