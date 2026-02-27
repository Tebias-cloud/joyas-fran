// components/ProductCard.tsx
import Image from 'next/image';
import Link from 'next/link';

interface Product {
  id: string;
  name: string;
  price: number;
  compare_at_price?: number;
  image_url: string;
  stock: number;
  slug: string;
}

export default function ProductCard({ product }: { product: Product }) {
  // Lógica de Stock Bajo: sutil y elegante
  const isLowStock = product.stock > 0 && product.stock <= 5;

  return (
    <Link href={`/producto/${product.slug}`} className="group block">
      <div className="relative aspect-[3/4] overflow-hidden bg-[#fafafa] rounded-sm mb-4">
        {/* Etiqueta Sale Sutil */}
        {product.compare_at_price && product.compare_at_price > product.price && (
          <span className="absolute top-3 left-3 z-10 bg-black text-white px-2 py-1 text-[9px] font-black uppercase tracking-tighter">
            Sale
          </span>
        )}
        
        <Image 
          src={product.image_url} 
          alt={product.name}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
      </div>

      <div className="space-y-1 px-1">
        <h3 className="text-[12px] font-medium text-gray-900 uppercase tracking-tight truncate">
          {product.name}
        </h3>
        
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-900">
            ${product.price.toLocaleString('es-CL')}
          </span>
          {product.compare_at_price && product.compare_at_price > product.price && (
            <span className="text-xs text-gray-400 line-through decoration-gray-300 font-light italic">
              ${product.compare_at_price.toLocaleString('es-CL')}
            </span>
          )}
        </div>

        {/* Contador de Stock Bajo */}
        {isLowStock ? (
          <p className="text-[10px] text-amber-600 font-semibold italic">
            Últimas {product.stock} unidades
          </p>
        ) : product.stock === 0 ? (
          <p className="text-[10px] text-gray-400 uppercase tracking-widest font-medium">Agotado</p>
        ) : (
          <p className="text-[10px] text-gray-300 uppercase tracking-widest font-medium">Disponible</p>
        )}
      </div>
    </Link>
  );
}