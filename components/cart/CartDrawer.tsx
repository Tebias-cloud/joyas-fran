'use client';

import { X, Minus, Plus, ShoppingBag, ArrowRight, Truck, ImageOff } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const FREE_SHIPPING_THRESHOLD = 100000;

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { cart, removeFromCart, updateQuantity, cartTotal } = useCart();
  const [shouldRender, setShouldRender] = useState(false);

  const progress = Math.min((cartTotal / FREE_SHIPPING_THRESHOLD) * 100, 100);
  const remaining = FREE_SHIPPING_THRESHOLD - cartTotal;

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(() => {
        setShouldRender(true);
      });
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!shouldRender && !isOpen) return null;

  const handleTransitionEnd = () => { if (!isOpen) setShouldRender(false); };

  return (
    <div 
        className={`fixed inset-0 z-[100] flex justify-end transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onTransitionEnd={handleTransitionEnd}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className={`relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col transition-transform duration-300 ease-out transform ${isOpen ? 'translate-x-0' : 'translate-x-full'}`} onTransitionEnd={(e) => e.stopPropagation()}>
        
        {/* HEADER */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-serif italic flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" /> Tu Bolsa ({cart.reduce((acc, item) => acc + item.quantity, 0)})
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* BARRA ENVÍO */}
        {cart.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
            {remaining > 0 ? (
              <p className="text-[10px] text-gray-500 mb-2 text-center">Faltan <span className="font-bold text-black">${remaining.toLocaleString('es-CL')}</span> para envío gratis</p>
            ) : (
              <p className="text-[10px] text-green-600 font-bold mb-2 text-center flex items-center justify-center gap-1 animate-pulse"><Truck className="w-3 h-3" /> ¡Tienes envío gratis!</p>
            )}
            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-black transition-all duration-1000 ease-out rounded-full" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {/* ITEMS */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 text-gray-500">
              <ShoppingBag className="w-12 h-12 opacity-20" />
              <p className="text-sm font-medium">Tu bolsa está vacía</p>
              <button onClick={onClose} className="text-xs uppercase font-bold underline hover:text-black">Seguir comprando</button>
            </div>
          ) : (
            cart.map((item) => {
              // --- LOGICA DE OFERTA ---
              const hasDiscount = item.compare_at_price && item.compare_at_price > item.price;
              
              return (
                <div key={`${item.id}-${item.selectedSize}`} className="flex gap-4 animate-fade-in group">
                  <div className="relative w-20 h-24 bg-gray-50 rounded-sm overflow-hidden flex-shrink-0 border border-gray-100">
                    {item.image_url ? (
                      <Image src={item.image_url} alt={item.name} fill className="object-cover transition-transform duration-700 group-hover:scale-105" unoptimized sizes="80px" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300"><ImageOff className="w-6 h-6" /></div>
                    )}
                  </div>

                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <h3 className="text-sm font-bold text-gray-900 line-clamp-2 uppercase tracking-wide pr-2">{item.name}</h3>
                        <div className="text-right flex flex-col items-end">
                          {/* Precio Final */}
                          <p className={`text-sm font-medium ${hasDiscount ? 'text-red-600' : 'text-gray-900'}`}>
                            ${(item.price * item.quantity).toLocaleString('es-CL')}
                          </p>
                          {/* Precio Tachado (Calculado por cantidad) */}
                          {hasDiscount && (
                            <p className="text-[10px] text-gray-400 line-through">
                              ${((item.compare_at_price || 0) * item.quantity).toLocaleString('es-CL')}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {item.selectedSize !== 'Talla Única' && (
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1 font-medium">Talla: {item.selectedSize}</p>
                      )}
                    </div>

                    <div className="flex items-end justify-between mt-2">
                      <div className="flex items-center border border-gray-200 rounded-sm bg-white h-8">
                        <button onClick={() => updateQuantity(item.id, item.selectedSize, item.quantity - 1)} disabled={item.quantity <= 1} className="w-8 h-full flex items-center justify-center text-gray-500 hover:text-black hover:bg-gray-50 transition-colors disabled:opacity-30"><Minus className="w-3 h-3"/></button>
                        <span className="w-8 text-center text-xs font-medium text-gray-900 select-none">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, item.selectedSize, item.quantity + 1)} className="w-8 h-full flex items-center justify-center text-gray-500 hover:text-black hover:bg-gray-50 transition-colors"><Plus className="w-3 h-3"/></button>
                      </div>
                      <button onClick={() => removeFromCart(item.id, item.selectedSize)} className="text-[10px] uppercase font-bold text-gray-400 hover:text-red-500 transition-colors border-b border-transparent hover:border-red-500 pb-0.5">Eliminar</button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* FOOTER */}
        {cart.length > 0 && (
          <div className="p-6 border-t border-gray-100 bg-gray-50/50">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs uppercase font-bold tracking-widest text-gray-500">Total</span>
              <div className="text-right">
                <span className="text-xl font-serif italic text-gray-900">${cartTotal.toLocaleString('es-CL')}</span>
                {/* MOSTRAR TOTAL AHORRADO */}
                {cart.some(i => i.compare_at_price && i.compare_at_price > i.price) && (
                  <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider mt-1">
                    Ahorras: ${cart.reduce((acc, item) => acc + ((item.compare_at_price || item.price) - item.price) * item.quantity, 0).toLocaleString('es-CL')}
                  </p>
                )}
              </div>
            </div>
            <Link href="/checkout" onClick={onClose} className="w-full bg-black text-white py-4 text-xs font-bold uppercase tracking-[0.2em] hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 group rounded-sm shadow-sm hover:shadow-md">
              Finalizar Compra <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}