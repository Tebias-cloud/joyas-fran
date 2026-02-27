'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Loader2, Minus, Plus, ArrowLeft, Ruler, ImageOff } from 'lucide-react';
import { toast } from 'sonner';
import CartDrawer from '@/components/cart/CartDrawer';
import { useCart } from '@/context/CartContext';
import SizeGuideModal from '@/components/product/SizeGuideModal';
import ProductAccordion from '@/components/product/ProductAccordion';
import { Product } from './page';

export default function ClientProductContent({ product }: { product: Product }) {
  const { addToCart } = useCart();

  // Estados
  const [activeImage, setActiveImage] = useState<string>(product.images?.[0] || product.image_url);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
  
  // Estados de Imagen (Carga y Error)
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false); 
  
  // Estado para bloqueo de botón
  const [isAddingVisual, setIsAddingVisual] = useState(false);
  const lastClickTimeRef = useRef<number>(0);

  // --- LÓGICA DE TALLAS MEJORADA (Ordenamiento Inteligente) ---
  const availableSizes = useMemo(() => {
    // 1. Prioridad: Si hay una lista ordenada en "sizes", ÚSALA.
    if (product.sizes && product.sizes.length > 0) {
      return product.sizes;
    }

    // 2. Fallback: Si no, usamos las llaves del inventario y ordenamos
    if (product.inventory && Object.keys(product.inventory).length > 0) {
      const rawSizes = Object.keys(product.inventory);

      return rawSizes.sort((a, b) => {
        const numA = parseFloat(a);
        const numB = parseFloat(b);
        const isNumA = !isNaN(numA);
        const isNumB = !isNaN(numB);

        // Si ambos son números (ej: "6" y "10"), orden numérico real
        if (isNumA && isNumB) return numA - numB;

        // Si uno es número y otro texto (ej: "6" y "Ajustable"), número primero
        if (isNumA && !isNumB) return -1;
        if (!isNumA && isNumB) return 1;

        // Si ambos son texto, orden alfabético
        return a.localeCompare(b);
      });
    }

    // 3. Si no hay inventario detallado pero hay stock global
    if ((product.stock || 0) > 0) {
      return ['Talla Única'];
    }

    return [];
  }, [product]);

  useEffect(() => {
    if (availableSizes.length === 1 && availableSizes[0] === 'Talla Única') {
      setSelectedSize('Talla Única');
    }
  }, [availableSizes]);

  const currentStock = useMemo(() => {
    if (selectedSize === 'Talla Única') return product.stock || 0;
    return product.inventory && selectedSize ? (product.inventory[selectedSize] || 0) : 0;
  }, [product, selectedSize]);

  const showThumbnails = product.images && product.images.length > 1;

  // --- HANDLERS ---
  const handleSizeSelect = (size: string) => {
    setSelectedSize(size);
    setQuantity(1);
  };

  const handleDecrease = () => setQuantity(prev => Math.max(1, prev - 1));
  const handleIncrease = () => {
    if (!selectedSize) return toast.error('Selecciona una talla primero');
    setQuantity(prev => Math.min(currentStock, prev + 1));
  };

  const handleImageChange = (img: string) => {
    if (activeImage !== img) {
      setIsImageLoading(true);
      setImageError(false);
      setActiveImage(img);
    }
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const now = Date.now();
    if (now - lastClickTimeRef.current < 1000) return;
    lastClickTimeRef.current = now;

    if (!selectedSize) {
      toast.error('Por favor, selecciona una talla.');
      return;
    }

    if (quantity > currentStock) {
      toast.error(`Solo quedan ${currentStock} unidades.`);
      setQuantity(currentStock);
      return;
    }

    setIsAddingVisual(true);

    try {
      addToCart({
        id: product.id,
        name: product.name,
        price: product.price,
        compare_at_price: product.compare_at_price, 
        image_url: activeImage,
        inventory: product.inventory,
        slug: product.slug
      }, selectedSize, quantity);

      setIsDrawerOpen(true);
    } catch (error) {
      console.error(error);
      toast.error("Error al agregar");
    } finally {
      setTimeout(() => setIsAddingVisual(false), 1000);
    }
  };

  // Botón estado
  let buttonText = isAddingVisual ? "AGREGANDO..." : "AGREGAR A LA BOLSA";
  let isButtonDisabled = isAddingVisual;

  if (!selectedSize) {
    buttonText = "SELECCIONAR TALLA";
    isButtonDisabled = true;
  } else if (currentStock <= 0) {
    buttonText = "AGOTADO";
    isButtonDisabled = true;
  }

  // Calculo porcentaje descuento
  const discountPercent = product.compare_at_price 
    ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100) 
    : 0;

  return (
    <>
      <CartDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
      <SizeGuideModal isOpen={isSizeGuideOpen} onClose={() => setIsSizeGuideOpen(false)} category={product.category || ''} />

      <div className="max-w-6xl mx-auto px-6 py-12 animate-fade-in">
        <Link href="/catalogo" className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-gray-400 hover:text-black mb-10 transition-colors duration-300">
          <ArrowLeft className="w-3 h-3"/> Volver
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-24 items-start">
          
          {/* GALERÍA - CORRECCIÓN AQUÍ: md:sticky md:top-24 */}
          <div className="space-y-6 md:sticky md:top-24">
            <div className={`relative aspect-[3/4] bg-[#fafafa] overflow-hidden group rounded-sm ${isImageLoading ? 'animate-pulse bg-gray-200' : ''}`}>
              
              {/* ETIQUETA DE OFERTA EN IMAGEN */}
              {discountPercent > 0 && currentStock > 0 && (
                <div className="absolute top-4 left-4 z-10 bg-red-600 text-white px-3 py-1 text-xs font-bold uppercase tracking-widest shadow-sm">
                  -{discountPercent}% OFF
                </div>
              )}

              <div className="absolute inset-0 animate-[fade-in_0.7s_ease-in-out]">
                {imageError ? (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 bg-gray-50">
                    <ImageOff className="w-12 h-12 mb-3 opacity-50" />
                    <span className="text-[10px] uppercase tracking-widest font-medium">Imagen no disponible</span>
                  </div>
                ) : (
                  <Image 
                    key={activeImage}
                    src={activeImage} 
                    alt={product.name} 
                    fill 
                    priority
                    sizes="(max-width: 768px) 100vw, 50vw" 
                    className={`object-cover transition-transform duration-[2000ms] ease-out group-hover:scale-105 ${isImageLoading ? 'opacity-0' : 'opacity-100'}`} 
                    unoptimized 
                    onLoad={() => setIsImageLoading(false)}
                    onError={() => {
                      setIsImageLoading(false);
                      setImageError(true);
                    }}
                  />
                )}
              </div>
            </div>

            {showThumbnails && (
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide justify-center md:justify-start">
                {product.images!.map((img, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => handleImageChange(img)} 
                    className={`relative w-16 h-20 flex-shrink-0 transition-all duration-300 overflow-hidden rounded-sm border ${activeImage === img ? 'border-black opacity-100' : 'border-transparent opacity-50 hover:opacity-100'}`}
                  >
                    <Image 
                      src={img} 
                      alt={`Thumbnail ${idx}`} 
                      fill
                      className="object-cover"
                      unoptimized
                      sizes="64px"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* INFO */}
          <div className="flex flex-col pt-2">
            <div className="mb-8 text-center md:text-left">
              <span className="text-[10px] tracking-[0.3em] text-gray-400 uppercase mb-3 block">{product.category || 'Joyería Fina'}</span>
              <h1 className="text-3xl font-serif italic mb-3 text-gray-900 font-normal">{product.name}</h1>
              
              <div className="flex items-center justify-center md:justify-start gap-4 mb-2">
                <p className={`text-xl font-light tracking-wide ${discountPercent > 0 ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
                  ${product.price.toLocaleString('es-CL')}
                </p>
                {/* PRECIO TACHADO SI HAY OFERTA */}
                {product.compare_at_price && product.compare_at_price > product.price && (
                  <p className="text-sm text-gray-400 line-through decoration-gray-300 font-serif italic">
                    ${product.compare_at_price.toLocaleString('es-CL')}
                  </p>
                )}
              </div>
            </div>

            <div className="text-xs leading-relaxed text-gray-500 font-light mb-10 text-center md:text-left">
              <p>{product.description || "Diseño atemporal elaborado a mano."}</p>
            </div>
            
            <div className="mb-10">
              <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-2">
                <span className="text-[10px] uppercase tracking-[0.2em] font-medium text-gray-900">
                  {selectedSize === 'Talla Única' ? 'Versión' : 'Talla'}
                </span>
                {selectedSize !== 'Talla Única' && (
                  <button onClick={() => setIsSizeGuideOpen(true)} className="text-[10px] text-gray-400 hover:text-black transition-colors flex items-center gap-1.5 tracking-wide">
                    <Ruler className="w-3 h-3" /> Guía de Medidas
                  </button>
                )}
              </div>
              
              <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                {availableSizes.map(size => {
                  // Verificamos stock en INVENTARIO
                  const stock = product.inventory && product.inventory[size] !== undefined ? product.inventory[size] : (product.stock || 0);
                  const isAgotado = stock <= 0;
                  const isSelected = selectedSize === size;
                  
                  return (
                    <button 
                      key={size} 
                      onClick={() => !isAgotado && handleSizeSelect(size)} 
                      disabled={isAgotado}
                      className={`min-w-[2.5rem] h-9 px-3 text-[11px] transition-all duration-300 flex items-center justify-center uppercase tracking-widest border rounded-sm ${isSelected ? 'bg-black text-white border-black' : isAgotado ? 'bg-gray-50 text-gray-300 border-transparent cursor-not-allowed line-through' : 'bg-white text-gray-500 border-gray-200 hover:border-black hover:text-black'}`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>

              {selectedSize && (
                <p className={`text-[10px] mt-3 text-center md:text-left tracking-wide fade-in ${currentStock > 0 ? 'text-gray-500' : 'text-red-400'}`}>
                  {currentStock > 0 ? `${currentStock} unidades disponibles` : 'Sin stock disponible'}
                </p>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex gap-4">
                {selectedSize && currentStock > 0 && (
                  <div className="flex items-center w-24 border border-gray-200 h-11 shrink-0 transition-colors hover:border-gray-400 rounded-sm">
                    <button onClick={handleDecrease} disabled={quantity <= 1 || isAddingVisual} className="w-8 h-full flex items-center justify-center text-gray-400 hover:text-black transition-colors disabled:opacity-20"><Minus className="w-3 h-3"/></button>
                    <div className="flex-1 text-center text-xs font-light">{quantity}</div>
                    <button onClick={handleIncrease} disabled={quantity >= currentStock || isAddingVisual} className="w-8 h-full flex items-center justify-center text-gray-400 hover:text-black transition-colors disabled:opacity-20"><Plus className="w-3 h-3"/></button>
                  </div>
                )}

                <button 
                  onClick={handleAddToCart} 
                  disabled={isButtonDisabled} 
                  className={`flex-1 h-11 text-[10px] uppercase tracking-[0.25em] font-medium transition-all duration-300 rounded-sm flex items-center justify-center gap-2 ${isButtonDisabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-transparent' : 'bg-black text-white hover:bg-white hover:text-black border border-black'}`}
                >
                  {isAddingVisual && <Loader2 className="w-3 h-3 animate-spin"/>}
                  {buttonText}
                </button>
              </div>
            </div>
            
            <div className="mt-8">
              <ProductAccordion />
            </div>

          </div>
        </div>
      </div>
    </>
  );
}