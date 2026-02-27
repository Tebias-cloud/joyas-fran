import { Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import OfertasClient from './OfertasClient'; // Importación local directa
import { Product } from '@/app/catalogo/page'; // Importación de tipos centralizada

export const metadata = {
  title: 'Ofertas Exclusivas | Joyas Fran',
  description: 'Aprovecha nuestros descuentos especiales en joyas seleccionadas.',
};

async function getSaleProducts() {
  // 1. Traemos productos que tengan algo en la columna compare_at_price
  const { data } = await supabase
    .from('products')
    .select('*')
    .not('compare_at_price', 'is', null)
    .order('created_at', { ascending: false });

  // Casting seguro: si data es null, usamos array vacío
  const products = (data as Product[]) || [];

  // 2. Filtro de seguridad: Aseguramos que sea una oferta real
  // (El precio tachado debe ser MAYOR al precio de venta)
  const validSales = products.filter(p => 
    p.compare_at_price !== null && 
    p.compare_at_price !== undefined && 
    p.compare_at_price > p.price
  );

  return validSales;
}

export default async function OfertasPage() {
  const saleProducts = await getSaleProducts();

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <main className="flex-grow">
        <div className="bg-zinc-900 text-white py-12 text-center mb-8">
          <h1 className="text-4xl font-serif italic mb-2">Sale</h1>
          <p className="text-xs uppercase tracking-[0.3em] opacity-80">Descuentos por tiempo limitado</p>
        </div>
        
        <Suspense fallback={<div className="py-20 text-center text-gray-400">Cargando ofertas...</div>}>
          <OfertasClient initialProducts={saleProducts} />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}