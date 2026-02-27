'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { SlidersHorizontal, ChevronDown, Tag, ImageOff } from 'lucide-react';
// Asegúrate de importar la interfaz Product correctamente desde tu archivo de tipos central o el catálogo
import { Product } from '@/app/catalogo/page'; 

type SortOption = 'best-deal' | 'price-asc' | 'price-desc' | 'newest';

// Definimos la interfaz de las props aquí mismo para exportarla si es necesario
interface OfertasClientProps {
  initialProducts: Product[];
}

export default function OfertasClient({ initialProducts }: OfertasClientProps) {
  const [sortBy, setSortBy] = useState<SortOption>('best-deal');
  const [showSortMenu, setShowSortMenu] = useState(false);

  const isValidUrl = (url: string | undefined | null): boolean => {
    return typeof url === 'string' && url.trim().length > 0 && url.startsWith('http');
  };

  const sortedProducts = useMemo(() => {
    const items = [...initialProducts];

    switch (sortBy) {
      case 'price-asc':
        return items.sort((a, b) => a.price - b.price);
      case 'price-desc':
        return items.sort((a, b) => b.price - a.price);
      case 'newest':
        return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case 'best-deal':
      default:
        return items.sort((a, b) => {
          const discountA = a.compare_at_price ? ((a.compare_at_price - a.price) / a.compare_at_price) : 0;
          const discountB = b.compare_at_price ? ((b.compare_at_price - b.price) / b.compare_at_price) : 0;
          return discountB - discountA;
        });
    }
  }, [initialProducts, sortBy]);

  return (
    <div className="max-w-7xl mx-auto px-6 pb-20">
      <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-4">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
          {sortedProducts.length} Joyas en Oferta
        </p>

        <div className="relative group">
          <button 
            onClick={() => setShowSortMenu(!showSortMenu)} 
            className="flex items-center gap-2 text-xs uppercase tracking-widest font-bold hover:text-gray-600 transition-colors"
          >
            <SlidersHorizontal className="w-4 h-4"/> Ordenar <ChevronDown className="w-3 h-3"/>
          </button>
          
          <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-100 shadow-xl z-20 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all rounded-md overflow-hidden">
            <div className="flex flex-col text-xs text-gray-600">
              <button onClick={() => setSortBy('best-deal')} className={`p-3 text-left hover:bg-gray-50 ${sortBy === 'best-deal' ? 'font-bold text-black' : ''}`}>💎 Mejores Ofertas</button>
              <button onClick={() => setSortBy('newest')} className={`p-3 text-left hover:bg-gray-50 ${sortBy === 'newest' ? 'font-bold text-black' : ''}`}>Más Nuevos</button>
              <button onClick={() => setSortBy('price-asc')} className={`p-3 text-left hover:bg-gray-50 ${sortBy === 'price-asc' ? 'font-bold text-black' : ''}`}>Precio: Bajo a Alto</button>
              <button onClick={() => setSortBy('price-desc')} className={`p-3 text-left hover:bg-gray-50 ${sortBy === 'price-desc' ? 'font-bold text-black' : ''}`}>Precio: Alto a Bajo</button>
            </div>
          </div>
        </div>
      </div>

      {sortedProducts.length === 0 ? (
        <div className="text-center py-20">
          <Tag className="w-12 h-12 mx-auto text-gray-300 mb-4"/>
          <p className="text-gray-500 font-serif italic">No hay ofertas activas en este momento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-10">
          {sortedProducts.map((product) => {
            const hasMainImage = isValidUrl(product.image_url);
            const secondImageUrl = product.images?.[1];
            const hasSecondImage = hasMainImage && isValidUrl(secondImageUrl);
            const isSoldOut = product.stock === 0;
            const discountPercent = product.compare_at_price 
              ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100) 
              : 0;

            return (
              <Link href={`/producto/${product.slug}`} key={product.id} className="group block relative">
                <div className="relative aspect-[3/4] bg-gray-100 overflow-hidden mb-3 rounded-sm">
                  {!isSoldOut && (
                    <div className="absolute top-2 left-2 z-10 bg-red-600 text-white px-2 py-1 text-[10px] font-bold uppercase tracking-widest shadow-sm">
                      -{discountPercent}%
                    </div>
                  )}
                  {hasMainImage ? (
                    <Image 
                      src={product.image_url} 
                      alt={product.name} 
                      fill 
                      sizes="(max-width: 768px) 50vw, 25vw" 
                      className={`object-cover transition-all duration-700 ease-in-out ${isSoldOut ? 'grayscale opacity-70' : ''} ${hasSecondImage ? 'group-hover:opacity-0' : 'group-hover:scale-105'}`}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                      <ImageOff className="w-8 h-8 mb-2" />
                      <span className="text-[9px] uppercase">Sin Imagen</span>
                    </div>
                  )}
                  {hasSecondImage && !isSoldOut && (
                    <Image 
                      src={secondImageUrl!} 
                      alt={`${product.name} vista 2`} 
                      fill 
                      sizes="(max-width: 768px) 50vw, 25vw" 
                      className="object-cover absolute top-0 left-0 opacity-0 transition-opacity duration-700 ease-in-out group-hover:opacity-100" 
                    />
                  )}
                  {isSoldOut && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-[1px]">
                      <span className="bg-black text-white px-3 py-1 text-[10px] uppercase font-bold tracking-widest">Agotado</span>
                    </div>
                  )}
                </div>
                <div className="space-y-1 px-1">
                  <h3 className="text-[11px] font-bold text-gray-900 uppercase tracking-wider truncate group-hover:underline underline-offset-4 decoration-gray-300">
                    {product.name}
                  </h3>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-red-600">
                      ${product.price.toLocaleString('es-CL')}
                    </span>
                    {product.compare_at_price && (
                      <span className="text-xs text-gray-400 line-through decoration-gray-300">
                        ${product.compare_at_price.toLocaleString('es-CL')}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}