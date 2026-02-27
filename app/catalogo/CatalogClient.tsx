'use client';

import { useState, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { SlidersHorizontal, ChevronDown, X, ImageOff, Tag } from 'lucide-react';
import { Product } from './page';

type SortOption = 'newest' | 'price-asc' | 'price-desc' | 'name-asc' | 'best-deal';

const PRICE_RANGES = [
  { label: 'Hasta $15.000', min: '', max: '15000' },
  { label: '$15.000 - $35.000', min: '15000', max: '35000' },
  { label: '$35.000 - $60.000', min: '35000', max: '60000' },
  { label: 'Más de $60.000', min: '60000', max: '' },
];

const isValidUrl = (url: string | undefined | null): boolean => {
  return typeof url === 'string' && url.trim().length > 0 && url.startsWith('http');
};

export default function CatalogClient({ initialProducts, categories }: { initialProducts: Product[], categories: string[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const categoryParam = searchParams.get('category') || 'Todos';
  const queryParam = searchParams.get('q') || ''; 

  // Estados de Filtros
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [onlySales, setOnlySales] = useState(false); // <--- NUEVO FILTRO
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showSortMenu, setShowSortMenu] = useState(false);

  // Lógica de Filtrado y Ordenamiento
  const filteredProducts = useMemo(() => {
    let result = [...initialProducts];
    
    // 1. Filtros
    if (categoryParam !== 'Todos') {
      result = result.filter(p => p.category === categoryParam);
    }
    if (queryParam) {
      const term = queryParam.toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(term));
    }
    if (minPrice) {
      result = result.filter(p => p.price >= Number(minPrice));
    }
    if (maxPrice) {
      result = result.filter(p => p.price <= Number(maxPrice));
    }
    
    // Filtro "Solo Ofertas"
    if (onlySales) {
      result = result.filter(p => p.compare_at_price && p.compare_at_price > p.price);
    }

    // 2. Ordenamiento
    switch (sortBy) {
      case 'price-asc': result.sort((a, b) => a.price - b.price); break;
      case 'price-desc': result.sort((a, b) => b.price - a.price); break;
      case 'name-asc': result.sort((a, b) => a.name.localeCompare(b.name)); break;
      case 'best-deal': // Mayor porcentaje de descuento primero
        result.sort((a, b) => {
          const discountA = a.compare_at_price ? ((a.compare_at_price - a.price) / a.compare_at_price) : 0;
          const discountB = b.compare_at_price ? ((b.compare_at_price - b.price) / b.compare_at_price) : 0;
          return discountB - discountA;
        });
        break;
      case 'newest': default: result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); break;
    }
    return result;
  }, [initialProducts, categoryParam, queryParam, minPrice, maxPrice, sortBy, onlySales]);

  const clearFilters = () => { 
    setMinPrice(''); 
    setMaxPrice(''); 
    setOnlySales(false);
    router.push('/catalogo?category=Todos'); 
  };
  
  const hasActiveFilters = minPrice || maxPrice || queryParam || categoryParam !== 'Todos' || onlySales;

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row gap-12 animate-fade-in font-sans text-gray-900">
      
      {/* SIDEBAR (Escritorio) */}
      <aside className="md:w-64 flex-shrink-0 border-r border-gray-100 pr-8 hidden md:block sticky top-24 h-fit">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-serif italic text-xl">Filtrar</h3>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="text-[10px] uppercase text-red-500 font-bold hover:underline flex items-center gap-1">
              <X className="w-3 h-3"/> Limpiar
            </button>
          )}
        </div>
        
        {/* BOTÓN SOLO OFERTAS */}
        <div className="mb-8 pb-8 border-b border-gray-100">
          <button 
            onClick={() => setOnlySales(!onlySales)} 
            className={`flex items-center gap-2 w-full text-sm font-bold uppercase tracking-widest transition-all p-2 rounded-md ${onlySales ? 'bg-red-50 text-red-600' : 'text-gray-400 hover:text-black hover:bg-gray-50'}`}
          >
            <Tag className="w-4 h-4" /> Solo Ofertas
          </button>
        </div>

        {/* Categorías */}
        <div className="mb-8">
          <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-3">Colección</p>
          <ul className="space-y-1">
            {categories.map(cat => (
              <li key={cat}>
                <button 
                  onClick={() => router.push(`/catalogo?category=${cat}`)} 
                  className={`text-sm transition-all hover:text-black w-full text-left py-1 ${categoryParam === cat ? 'font-bold text-black border-l-2 border-black pl-2' : 'text-gray-500 border-l-2 border-transparent pl-2'}`}
                >
                  {cat}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Precios */}
        <div>
          <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-3">Precio (CLP)</p>
          <div className="flex flex-col gap-2 mb-4">
            {PRICE_RANGES.map((range, idx) => (
              <button 
                key={idx} 
                onClick={() => { setMinPrice(range.min); setMaxPrice(range.max); }} 
                className={`text-xs text-left px-3 py-2 rounded-md transition-colors ${minPrice === range.min && maxPrice === range.max ? 'bg-black text-white font-medium' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
              >
                {range.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 items-center">
            <input type="number" placeholder="Min" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded text-xs outline-none focus:border-black"/>
            <span className="text-gray-300">-</span>
            <input type="number" placeholder="Max" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded text-xs outline-none focus:border-black"/>
          </div>
        </div>
      </aside>

      {/* BARRA MÓVIL */}
      <div className="md:hidden mb-6 space-y-3">
        <select 
          value={categoryParam} 
          onChange={(e) => router.push(`/catalogo?category=${e.target.value}`)} 
          className="w-full p-3 border border-gray-200 text-sm bg-white uppercase font-bold rounded-lg"
        >
          {categories.map(cat => <option key={cat} value={cat}>{cat.toUpperCase()}</option>)}
        </select>
        <button 
          onClick={() => setOnlySales(!onlySales)} 
          className={`w-full p-3 border text-sm font-bold uppercase rounded-lg flex items-center justify-center gap-2 transition-colors ${onlySales ? 'bg-red-50 text-red-600 border-red-200' : 'bg-white border-gray-200 text-gray-500'}`}
        >
          <Tag className="w-4 h-4"/> {onlySales ? 'Mostrando Ofertas' : 'Ver Solo Ofertas'}
        </button>
      </div>

      {/* GRID DE PRODUCTOS */}
      <div className="flex-1">
        <div className="mb-8 flex justify-between items-end border-b border-gray-100 pb-4">
          <div>
            <h1 className="text-3xl font-serif italic capitalize mb-1">
              {onlySales ? 'Ofertas Especiales' : (queryParam ? `Resultados: "${queryParam}"` : categoryParam)}
            </h1>
            <p className="text-gray-400 text-[10px] uppercase tracking-widest">{filteredProducts.length} Joyas</p>
          </div>
          
          <div className="relative group">
            <button onClick={() => setShowSortMenu(!showSortMenu)} className="flex items-center gap-2 text-xs uppercase tracking-widest font-bold hover:text-gray-600 transition-colors">
              <SlidersHorizontal className="w-4 h-4"/> Ordenar <ChevronDown className="w-3 h-3"/>
            </button>
            <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-100 shadow-xl z-20 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all rounded-md overflow-hidden">
              <div className="flex flex-col text-xs text-gray-600">
                {/* CAMBIOS AQUÍ: "Más Reciente" en vez de "Novedades" y sin el emoji de diamante */}
                <button onClick={() => setSortBy('newest')} className={`p-3 text-left hover:bg-gray-50 ${sortBy === 'newest' ? 'font-bold text-black' : ''}`}>Más Reciente</button>
                <button onClick={() => setSortBy('best-deal')} className={`p-3 text-left hover:bg-gray-50 ${sortBy === 'best-deal' ? 'font-bold text-black' : ''}`}>Mejores Ofertas</button>
                <button onClick={() => setSortBy('price-asc')} className={`p-3 text-left hover:bg-gray-50 ${sortBy === 'price-asc' ? 'font-bold text-black' : ''}`}>Precio: Bajo a Alto</button>
                <button onClick={() => setSortBy('price-desc')} className={`p-3 text-left hover:bg-gray-50 ${sortBy === 'price-desc' ? 'font-bold text-black' : ''}`}>Precio: Alto a Bajo</button>
              </div>
            </div>
          </div>
        </div>
        
        {filteredProducts.length === 0 ? (
          <div className="text-center py-32 bg-gray-50 rounded-lg">
            <p className="text-gray-400 font-serif italic mb-4">No encontramos joyas con esos filtros.</p>
            <button onClick={clearFilters} className="text-xs uppercase font-bold border-b border-black pb-0.5 hover:text-gray-600 transition-colors">
              Ver Todo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-12">
            {filteredProducts.map((product) => {
              const hasMainImage = isValidUrl(product.image_url);
              const secondImageUrl = product.images?.[1];
              const hasSecondImage = hasMainImage && isValidUrl(secondImageUrl);
              const isSoldOut = product.stock === 0;
              
              // CÁLCULO DEL DESCUENTO
              const discountPercent = product.compare_at_price 
                ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100) 
                : 0;

              return (
                <Link href={`/producto/${product.slug}`} key={product.id} className="group block relative">
                  <div className="relative aspect-[3/4] bg-gray-100 overflow-hidden mb-4 rounded-sm">
                    
                    {/* ETIQUETA VISUAL DE OFERTA */}
                    {discountPercent > 0 && !isSoldOut && (
                      <div className="absolute top-2 left-2 z-10 bg-red-600 text-white px-2 py-1 text-[10px] font-bold uppercase tracking-widest shadow-sm">
                        -{discountPercent}%
                      </div>
                    )}

                    {/* Overlay Agotado */}
                    {isSoldOut && (
                      <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center backdrop-blur-[1px]">
                        <span className="bg-black text-white px-3 py-1 text-[10px] uppercase font-bold tracking-widest">Agotado</span>
                      </div>
                    )}

                    {/* Imagen con Fallback */}
                    {hasMainImage ? (
                      <Image 
                        src={product.image_url} 
                        alt={product.name} 
                        fill 
                        sizes="(max-width: 768px) 50vw, 33vw" 
                        className={`object-cover transition-all duration-[1500ms] ease-in-out ${isSoldOut ? 'grayscale opacity-70' : ''} ${hasSecondImage ? 'group-hover:opacity-0' : 'group-hover:scale-105'}`}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                        <ImageOff className="w-8 h-8 mb-2" />
                        <span className="text-[10px] uppercase tracking-widest">Sin Imagen</span>
                      </div>
                    )}

                    {/* Imagen Hover */}
                    {hasSecondImage && !isSoldOut && (
                      <Image 
                        src={secondImageUrl!} 
                        alt={`${product.name} vista 2`} 
                        fill 
                        sizes="(max-width: 768px) 50vw, 33vw" 
                        className="object-cover absolute top-0 left-0 opacity-0 transition-opacity duration-[1500ms] ease-in-out group-hover:opacity-100" 
                      />
                    )}
                  </div>

                  {/* INFO DEL PRODUCTO */}
                  <div className="text-center space-y-1">
                    <h3 className="text-xs font-bold text-gray-900 tracking-[0.1em] uppercase group-hover:underline underline-offset-4 decoration-black/20 truncate px-2">
                      {product.name}
                    </h3>
                    <div className="flex items-center justify-center gap-2">
                      {/* PRECIO ACTUAL (ROJO SI ES OFERTA) */}
                      <p className={`text-sm font-serif italic ${isSoldOut ? 'text-gray-300 line-through' : 'text-gray-600'} ${discountPercent > 0 ? 'text-red-600 font-bold' : ''}`}>
                        ${product.price.toLocaleString('es-CL')}
                      </p>
                      {/* PRECIO TACHADO */}
                      {product.compare_at_price && product.compare_at_price > product.price && (
                        <p className="text-xs text-gray-400 line-through font-serif italic">
                          ${product.compare_at_price.toLocaleString('es-CL')}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}