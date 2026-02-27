'use client';

import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useCart } from '@/context/CartContext';
import Image from 'next/image';
import Link from 'next/link';
import { Minus, Plus, Trash2, ArrowRight, ShoppingBag } from 'lucide-react';

export default function CartPage() {
  // 1. Extraemos 'updateQuantity' en lugar de las funciones viejas
  const { cart, removeFromCart, updateQuantity, cartTotal } = useCart();

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 flex flex-col">
      <Header />

      <main className="flex-grow max-w-7xl mx-auto w-full px-6 py-12 animate-fade-in">
        <h1 className="text-3xl font-serif italic mb-10 text-center md:text-left">Tu Bolsa de Compras</h1>

        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-6 border border-dashed border-gray-200 rounded-sm">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center">
                <ShoppingBag className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-medium text-gray-900">Tu bolsa está vacía</h2>
            <p className="text-gray-500 max-w-md">Parece que aún no has agregado nada. Explora nuestra colección y encuentra algo único.</p>
            <Link 
              href="/catalogo" 
              className="bg-black text-white px-8 py-4 text-xs font-bold uppercase tracking-[0.2em] hover:bg-zinc-800 transition-all mt-4"
            >
              Ir al Catálogo
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-24 items-start">
            
            {/* LISTA DE PRODUCTOS */}
            <div className="lg:col-span-7 space-y-8">
              {cart.map((item) => {
                // Cálculo de Stock para deshabilitar botón +
                const maxStock = item.inventory ? (item.inventory[item.selectedSize] || 0) : 99;
                const isMaxStockReached = item.quantity >= maxStock;

                return (
                  <div key={`${item.id}-${item.selectedSize}`} className="flex gap-6 py-6 border-b border-gray-100 last:border-0">
                    {/* Imagen */}
                    <div className="relative w-24 h-32 bg-gray-50 rounded-sm overflow-hidden flex-shrink-0 border border-gray-100">
                      <Image 
                        src={item.image_url} 
                        alt={item.name} 
                        fill 
                        className="object-cover"
                        unoptimized
                      />
                    </div>

                    {/* Detalles */}
                    <div className="flex-1 flex flex-col justify-between py-1">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-lg font-serif italic text-gray-900 line-clamp-2 pr-4">{item.name}</h3>
                          <p className="text-sm font-bold text-gray-900 whitespace-nowrap">
                            ${(item.price * item.quantity).toLocaleString('es-CL')}
                          </p>
                        </div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                          Talla: <span className="text-black font-medium">{item.selectedSize}</span>
                        </p>
                        <p className="text-xs text-gray-400">
                          Precio unitario: ${item.price.toLocaleString('es-CL')}
                        </p>
                      </div>

                      <div className="flex justify-between items-end mt-4">
                        {/* Selector de Cantidad */}
                        <div className="flex items-center border border-gray-200 h-9 w-32 rounded-sm bg-white">
                          {/* BOTÓN MENOS: Usa updateQuantity */}
                          <button 
                            onClick={() => updateQuantity(item.id, item.selectedSize, item.quantity - 1)} 
                            disabled={item.quantity <= 1}
                            className="w-10 h-full flex items-center justify-center text-gray-400 hover:text-black hover:bg-gray-50 transition-colors disabled:opacity-20"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          
                          <span className="flex-1 text-center text-xs font-medium">{item.quantity}</span>
                          
                          {/* BOTÓN MÁS: Usa updateQuantity */}
                          <button 
                            onClick={() => updateQuantity(item.id, item.selectedSize, item.quantity + 1)} 
                            disabled={isMaxStockReached}
                            className={`w-10 h-full flex items-center justify-center transition-colors disabled:opacity-20 disabled:cursor-not-allowed ${
                                isMaxStockReached ? 'text-gray-300' : 'text-gray-400 hover:text-black hover:bg-gray-50'
                            }`}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Botón Eliminar */}
                        <button 
                          onClick={() => removeFromCart(item.id, item.selectedSize)}
                          className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-red-400 hover:text-red-600 transition-colors group"
                        >
                          <Trash2 className="w-3 h-3 group-hover:scale-110 transition-transform"/> Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* RESUMEN DEL PEDIDO */}
            <div className="lg:col-span-5 sticky top-24">
              <div className="bg-gray-50 p-8 rounded-sm border border-gray-100">
                <h2 className="font-serif italic text-2xl mb-6">Resumen</h2>
                
                <div className="space-y-4 text-sm mb-8 border-b border-gray-200 pb-8">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>${cartTotal.toLocaleString('es-CL')}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Envío</span>
                    <span className="text-xs text-gray-400 uppercase">Calculado en el siguiente paso</span>
                  </div>
                </div>

                <div className="flex justify-between items-end mb-8">
                  <span className="text-sm font-bold uppercase tracking-widest">Total</span>
                  <span className="text-3xl font-serif italic">${cartTotal.toLocaleString('es-CL')}</span>
                </div>

                <Link 
                  href="/checkout" 
                  className="w-full bg-black text-white py-4 text-xs font-bold uppercase tracking-[0.2em] hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 group rounded-sm shadow-sm hover:shadow-md"
                >
                  Continuar Compra <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>

                <div className="mt-6 flex items-center justify-center gap-2 text-[10px] text-gray-400 uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span> Compra Segura y Encriptada
                </div>
              </div>
            </div>

          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}