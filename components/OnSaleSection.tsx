// components/OnSaleSection.tsx
import { supabase } from '@/lib/supabase';
import ProductCard from './ProductCard';

export default async function OnSaleSection() {
  const { data: saleProducts } = await supabase
    .from('products')
    .select('*')
    .gt('compare_at_price', 0) // Filtra solo los que tienen precio tachado
    .order('created_at', { ascending: false })
    .limit(4);

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