'use client';

import { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from 'react';

// 1. INTERFAZ ACTUALIZADA (Soporte para ofertas)
export interface CartItem {
  id: string;
  name: string;
  price: number;
  compare_at_price?: number | null; // <--- NUEVO CAMPO IMPORTANTE
  image_url: string;
  quantity: number;
  selectedSize: string;
  inventory?: Record<string, number>;
  slug: string;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Omit<CartItem, 'quantity' | 'selectedSize'>, size: string, quantity: number) => void;
  removeFromCart: (id: string, size: string) => void;
  updateQuantity: (id: string, size: string, quantity: number) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [mounted, setMounted] = useState(false);

  // REF DE SEGURIDAD ANTIDUPLICADOS
  const lastOpRef = useRef<{ id: string; size: string; time: number } | null>(null);

  // 2. CARGA INICIAL OPTIMIZADA (Sin errores de consola)
  useEffect(() => {
    const timer = setTimeout(() => {
      const savedCart = localStorage.getItem('joyas-cart');
      if (savedCart) {
        try {
          setCart(JSON.parse(savedCart));
        } catch (e) {
          console.error("Error al leer el carrito", e);
        }
      }
      setMounted(true);
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  // 3. PERSISTENCIA
  useEffect(() => {
    if (mounted) {
      localStorage.setItem('joyas-cart', JSON.stringify(cart));
    }
  }, [cart, mounted]);

  // --- AGREGAR AL CARRITO ---
  const addToCart = useCallback((product: Omit<CartItem, 'quantity' | 'selectedSize'>, size: string, quantityToAdd: number) => {
    const now = Date.now();

    // Bloqueo de seguridad (500ms)
    if (
      lastOpRef.current &&
      lastOpRef.current.id === product.id &&
      lastOpRef.current.size === size &&
      now - lastOpRef.current.time < 500
    ) {
      return; 
    }

    lastOpRef.current = { id: product.id, size, time: now };

    setCart((currentCart) => {
      const existingItemIndex = currentCart.findIndex(
        (item) => item.id === product.id && item.selectedSize === size
      );

      // CASO A: Actualizar cantidad existente
      if (existingItemIndex >= 0) {
        const updatedCart = [...currentCart];
        const currentItem = updatedCart[existingItemIndex];
        const maxStock = product.inventory ? (product.inventory[size] || 0) : 99;
        
        // Si ya tenemos el stock máximo, no sumamos nada
        if (currentItem.quantity >= maxStock) {
             return currentCart; 
        }

        updatedCart[existingItemIndex] = {
          ...currentItem,
          quantity: Math.min(currentItem.quantity + quantityToAdd, maxStock)
        };
        return updatedCart;
      }

      // CASO B: Nuevo item (Aquí se guarda el compare_at_price si viene en 'product')
      return [
        ...currentCart,
        { ...product, selectedSize: size, quantity: quantityToAdd }
      ];
    });
  }, []); 

  const removeFromCart = useCallback((id: string, size: string) => {
    setCart((currentCart) => currentCart.filter((item) => !(item.id === id && item.selectedSize === size)));
  }, []);

  const updateQuantity = useCallback((id: string, size: string, quantity: number) => {
    setCart((currentCart) => 
      currentCart.map((item) => {
        if (item.id === id && item.selectedSize === size) {
            const maxStock = item.inventory ? (item.inventory[size] || 0) : 99;
            return { ...item, quantity: quantity > maxStock ? maxStock : Math.max(1, quantity) };
        }
        return item;
      })
    );
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const cartTotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  const cartCount = cart.reduce((count, item) => count + item.quantity, 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, cartTotal, cartCount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}