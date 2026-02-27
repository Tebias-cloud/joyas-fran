'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ShoppingBag, Search, Menu, User as UserIcon, X, MessageCircle, Tag } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

// --- INTERFACES & TIPOS ---
interface SearchResult {
  id: string;
  name: string;
  slug: string;
  price: number;
  image_url: string;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function Header() {
  const { cartCount } = useCart();
  const router = useRouter();
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);

  // Estados de UI
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Estados de Búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce<string>(searchTerm, 500);
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  
  // Estado de Usuario
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    checkUser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (isMenuOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isMenuOpen]);

  useEffect(() => {
    if (isSearchOpen && inputRef.current) inputRef.current.focus();
  }, [isSearchOpen]);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (debouncedSearchTerm.length < 2) {
        setSuggestions([]);
        return;
      }
      setLoadingSearch(true);
      try {
        const { data } = await supabase
          .from('products')
          .select('id, name, slug, price, image_url')
          .ilike('name', `%${debouncedSearchTerm}%`)
          .limit(5);

        if (data) setSuggestions(data as SearchResult[]);
      } catch (error) {
        console.error("Error buscando:", error);
      } finally {
        setLoadingSearch(false);
      }
    };
    fetchSuggestions();
  }, [debouncedSearchTerm]);

  const handleSearchSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchTerm.trim()) {
      closeAndNavigate(`/catalogo?q=${encodeURIComponent(searchTerm)}`);
    }
  };

  const closeAndNavigate = (path: string) => {
    setIsSearchOpen(false);
    setIsMenuOpen(false);
    setSearchTerm('');
    setSuggestions([]);
    router.push(path);
  };

  const handleLogoClick = (e: React.MouseEvent) => {
    if (pathname === '/') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between relative">
          
          {isSearchOpen ? (
            <div className="absolute inset-0 bg-white z-10 flex items-center px-6 animate-fade-in">
              <Search className="w-5 h-5 text-gray-400 mr-4 shrink-0" />
              <div className="flex-1 relative">
                <input 
                  ref={inputRef}
                  type="text" 
                  placeholder="Busca 'Anillo', 'Collar'..." 
                  className="w-full bg-transparent border-none outline-none text-lg font-serif italic placeholder:not-italic placeholder:text-gray-300 text-gray-900"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleSearchSubmit}
                />
                
                {searchTerm.length >= 2 && (
                  <div className="absolute top-14 left-0 w-full md:w-[500px] bg-white shadow-2xl border border-gray-100 rounded-sm overflow-hidden animate-fade-in-up">
                    {loadingSearch ? (
                      <div className="p-6 text-xs text-gray-400 text-center flex items-center justify-center gap-2">
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"/> Buscando...
                      </div>
                    ) : suggestions.length > 0 ? (
                      <ul>
                        <li className="text-[10px] uppercase text-gray-400 font-bold px-4 py-2 bg-gray-50 tracking-widest border-b border-gray-100">Sugerencias</li>
                        {suggestions.map((item) => (
                          <li key={item.id}>
                            <button 
                              onClick={() => closeAndNavigate(`/producto/${item.slug}`)} 
                              className="w-full flex items-center gap-4 p-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-0 group"
                            >
                              <div className="relative w-12 h-12 rounded-sm overflow-hidden flex-shrink-0 bg-gray-100">
                                <Image src={item.image_url} alt={item.name} fill className="object-cover group-hover:scale-110 transition-transform duration-500" sizes="48px" />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-serif italic text-gray-900 group-hover:underline">{item.name}</p>
                                <p className="text-[10px] text-gray-500 font-bold tracking-wide">${item.price.toLocaleString('es-CL')}</p>
                              </div>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="p-8 text-sm text-gray-500 text-center font-serif italic">
                          No encontramos resultados para &quot;{searchTerm}&quot;.
                      </div>
                    )}
                  </div>
                )}
              </div>
              <button onClick={() => setIsSearchOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors ml-4"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
          ) : (
            <>
              {/* IZQUIERDA: Menú Móvil y Buscar */}
              <div className="flex gap-4 items-center flex-1">
                <button onClick={() => setIsMenuOpen(true)} className="lg:hidden p-1 hover:bg-gray-100 rounded-full transition-colors">
                  <Menu className="w-6 h-6 text-black" strokeWidth={1} />
                </button>
                <button onClick={() => setIsSearchOpen(true)} className="hidden lg:flex items-center gap-2 text-gray-500 hover:text-black transition-colors group">
                  <Search className="w-4 h-4 group-hover:scale-110 transition-transform" strokeWidth={1.5} />
                  <span className="text-[10px] uppercase tracking-widest font-medium">Buscar</span>
                </button>
              </div>

              {/* CENTRO: Logo con Scroll-to-Top */}
              <div className="flex-1 text-center">
                <Link 
                  href="/" 
                  onClick={handleLogoClick}
                  className="text-2xl md:text-3xl font-serif italic tracking-wider uppercase hover:opacity-70 transition-opacity cursor-pointer block"
                >
                  Joyas Fran
                </Link>
              </div>

              {/* DERECHA: Navegación e Iconos UNIFICADOS */}
              <div className="flex gap-5 items-center justify-end flex-1">
                
                {/* Enlaces de Texto */}
                <nav className="hidden lg:flex gap-6 border-r border-gray-200 pr-6 mr-1 items-center">
                  <Link href="/catalogo" className="text-[10px] uppercase tracking-widest text-gray-500 hover:text-black font-medium transition-colors">Colección</Link>
                  <Link href="/ofertas" className="text-[10px] uppercase tracking-widest text-red-600 hover:text-red-800 font-bold transition-colors">Sale</Link>
                </nav>
                
                {/* 1. ICONO CONTACTO */}
                <Link 
                  href="/contacto" 
                  className="hidden lg:block text-gray-400 hover:text-black transition-colors group p-1"
                  title="Contacto"
                >
                  <MessageCircle className="w-5 h-5 group-hover:scale-110 transition-transform" strokeWidth={1.5} />
                </Link>
                
                {/* 2. ICONO USUARIO (Ahora IDÉNTICO a los otros) */}
                <Link 
                  href={user ? "/cuenta" : "/login"} 
                  // AQUÍ ESTABA LA DIFERENCIA: Eliminamos la condición de color. Ahora siempre es gris y hover negro.
                  className={`hidden lg:block p-1 transition-colors group ${mounted ? 'opacity-100' : 'opacity-0'} text-gray-400 hover:text-black`}
                  title={user ? "Mi Cuenta" : "Iniciar Sesión"}
                >
                  <UserIcon className="w-5 h-5 group-hover:scale-110 transition-transform" strokeWidth={1.5} />
                </Link>
                
                {/* 3. ICONO CARRITO */}
                <Link 
                  href="/carrito" 
                  className="relative group p-1 text-gray-400 hover:text-black transition-colors"
                  title="Ver Carrito"
                >
                  <ShoppingBag className="w-5 h-5 group-hover:scale-110 transition-transform" strokeWidth={1.5} />
                  {mounted && cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-black text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full animate-bounce shadow-md ring-2 ring-white">
                      {cartCount}
                    </span>
                  )}
                </Link>
              </div>
            </>
          )}
        </div>
      </header>

      {/* MENÚ MÓVIL (Drawer) */}
      <div className={`fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm transition-opacity duration-500 lg:hidden ${isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className={`bg-white w-[85%] max-w-sm h-full p-8 shadow-2xl transition-transform duration-500 ease-out flex flex-col ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex justify-between items-center mb-12">
            <h2 className="text-2xl font-serif italic">Menú</h2>
            <button onClick={() => setIsMenuOpen(false)} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-6 h-6" strokeWidth={1} /></button>
          </div>
          
          <nav className="flex flex-col gap-6 text-sm uppercase tracking-widest font-medium flex-1">
            <Link href="/" onClick={() => setIsMenuOpen(false)} className="border-b border-gray-50 pb-4 hover:pl-2 transition-all">Inicio</Link>
            <Link href="/catalogo" onClick={() => setIsMenuOpen(false)} className="border-b border-gray-50 pb-4 hover:pl-2 transition-all">Colección</Link>
            <Link href="/ofertas" onClick={() => setIsMenuOpen(false)} className="border-b border-gray-50 pb-4 hover:pl-2 transition-all text-red-600 font-bold flex items-center gap-2">
              <Tag className="w-4 h-4" /> Sale
            </Link>
            <Link href="/contacto" onClick={() => setIsMenuOpen(false)} className="border-b border-gray-50 pb-4 hover:pl-2 transition-all flex items-center gap-2">Contacto</Link>
            
            <Link href={user ? "/cuenta" : "/login"} onClick={() => setIsMenuOpen(false)} className="border-b border-gray-50 pb-4 flex items-center gap-2 hover:pl-2 transition-all text-gray-500">
              <UserIcon className="w-4 h-4" /> {user ? "Mi Cuenta" : "Iniciar Sesión"}
            </Link>

            <Link href="/carrito" onClick={() => setIsMenuOpen(false)} className="flex justify-between items-center mt-auto bg-black text-white p-4 text-xs font-bold uppercase tracking-[0.2em] shadow-lg">
              <span>Mi Bolsa</span>
              <span className="bg-white text-black w-6 h-6 rounded-full flex items-center justify-center text-[10px]">{cartCount}</span>
            </Link>
          </nav>
        </div>
        <div className="absolute inset-0 -z-10" onClick={() => setIsMenuOpen(false)} />
      </div>
    </>
  );
}