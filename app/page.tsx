'use client';

import { useState, useEffect, useRef, ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { ArrowRight, Star } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { getActiveCategories } from '@/services/productService';
import { CategoryDTO } from '@/types/product';
import HomeHero from '@/components/home/HomeHero';
import { DEFAULT_WEBSITE_CONTENT, parseWebsiteContent, type FeaturedJewel } from '@/lib/website-content';

const HOME_FALLBACK_JEWELS = [
  { id: 'fallback-corazones', name: 'Dije Corazones', imageUrl: '/sample-catalog/dije-corazones.webp', price: 16900 },
  { id: 'fallback-cisnes', name: 'Dije Cisnes', imageUrl: '/sample-catalog/dije-cisnes.webp', price: 16900 },
  { id: 'fallback-pulsera', name: 'Pulsera de Cuentas Violetas', imageUrl: '/sample-catalog/pulsera-cuentas-violetas.webp', price: 22900 },
] as const;

// --- COMPONENTE UTILITARIO PARA ANIMAR AL SCROLLEAR ---
const RevealOnScroll = ({ children, delay = 0, className = "" }: { children: ReactNode, delay?: number, className?: string }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect(); 
        }
      },
      { threshold: 0.1 } 
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-1000 ease-out transform ${className} ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

// --- PÁGINA PRINCIPAL ---
export default function HomePage() {
  const [categories, setCategories] = useState<CategoryDTO[]>([
    { id: 1, name: 'Anillos', slug: 'anillos', description: '', imageUrl: '/img/cat-anillos.webp', position: 0, isActive: true },
    { id: 2, name: 'Collares', slug: 'collares', description: '', imageUrl: '/img/cat-collares.webp', position: 1, isActive: true },
    { id: 3, name: 'Aros', slug: 'aros', description: '', imageUrl: '/img/cat-aros.webp', position: 2, isActive: true }
  ]);
  const [content, setContent] = useState(DEFAULT_WEBSITE_CONTENT);
  const [featured, setFeatured] = useState<FeaturedJewel[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const data = await getActiveCategories(supabaseBrowser);
        if (data && data.length > 0) {
          setCategories(data);
        }
      } catch (err) {
        console.error("Error loading categories on homepage:", err);
      }
    }
    load();
    let active = true;
    fetch('/api/website', { cache: 'no-store' }).then(response => response.ok ? response.json() : null).then(data => {
      if (!active || !data) return;
      setContent(parseWebsiteContent(data.content));
      setFeatured(data.featured || []);
    }).catch(() => { /* The neutral default stays visible if the server is unavailable. */ });
    return () => { active = false; };
  }, []);

  return (
    <div className="min-h-screen bg-white selection:bg-black selection:text-white">
      <Header />
      
      <main>
        {/* --- HERO SECTION --- */}
        <HomeHero content={content} />

        <section className="py-20 md:py-24 px-6 max-w-7xl mx-auto">
          <RevealOnScroll className="text-center mb-12">
            <span className="text-[9px] uppercase tracking-[0.4em] text-gray-400 font-bold">Selección Joyas Fran</span>
            <h2 className="text-4xl md:text-5xl font-serif italic text-gray-900 mt-3">{content.featuredTitle}</h2>
          </RevealOnScroll>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-8">
            {(featured.length >= 3 ? featured.slice(0, 3) : HOME_FALLBACK_JEWELS).map((jewel, index) => {
              const isRealProduct = 'slug' in jewel;
              return (
                <RevealOnScroll key={jewel.id} delay={index * 120}>
                  <Link href={isRealProduct ? `/producto/${jewel.slug}` : '/catalogo'} className="group block">
                    <div className="relative aspect-[4/5] bg-[#f5f1e9] overflow-hidden">
                      <Image
                        src={jewel.imageUrl}
                        alt={jewel.name}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                        sizes="(max-width: 640px) 100vw, 33vw"
                        unoptimized
                      />
                      <div className="absolute inset-0 ring-1 ring-inset ring-black/5" />
                    </div>
                    <div className="pt-4 flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-serif text-lg text-zinc-900 group-hover:underline underline-offset-4">{jewel.name}</h3>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 mt-1">Ver colección</p>
                      </div>
                      <p className="text-sm font-medium text-zinc-700 whitespace-nowrap">${jewel.price.toLocaleString('es-CL')}</p>
                    </div>
                  </Link>
                </RevealOnScroll>
              );
            })}
          </div>
        </section>

        {/* --- CATEGORÍAS (Con animación al scrollear) --- */}
        <section className="py-24 px-6 max-w-7xl mx-auto">
          <RevealOnScroll className="flex flex-col items-center mb-20 space-y-4">
            <span className="text-[9px] uppercase tracking-[0.4em] text-gray-400 font-bold">Nuestras Piezas</span>
            <h2 className="text-4xl font-serif italic text-gray-900">{content.categoriesTitle}</h2>
            <div className="w-12 h-[1px] bg-gray-300" />
          </RevealOnScroll>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {categories.map((cat, i) => (
               <RevealOnScroll key={cat.id || i} delay={i * 150} className={i === 1 ? 'md:-mt-12' : ''}>
                 <Link 
                   href={`/catalogo?category=${encodeURIComponent(cat.name)}`}
                   className="group relative aspect-[3/4] overflow-hidden bg-[#121212] cursor-pointer block"
                 >
                    <Image
                      src={cat.imageUrl || featured[i % Math.max(featured.length, 1)]?.imageUrl || ['/img/cat-anillos.webp','/img/cat-collares.webp','/img/cat-aros.webp'][i % 3]}
                      alt={cat.name}
                      fill
                      className="object-cover opacity-90 transition-transform duration-[1.5s] ease-out group-hover:scale-110 group-hover:opacity-100"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500" />
                    
                    <div className="absolute inset-0 flex items-end p-8 md:p-10">
                      <div className="text-white transform transition-transform duration-500 group-hover:-translate-y-2 w-full">
                        <div className="flex justify-between items-end border-b border-white/0 group-hover:border-white/50 pb-2 transition-all duration-500">
                          <h3 className="text-2xl md:text-3xl font-serif italic tracking-wide">{cat.name}</h3>
                          <ArrowRight className="w-4 h-4 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500 text-white" />
                        </div>
                        <span className="text-[9px] uppercase tracking-[0.2em] font-light text-white/70 mt-2 block opacity-0 group-hover:opacity-100 transition-opacity duration-700 delay-100">
                          Ver Diseños
                        </span>
                      </div>
                    </div>
                 </Link>
               </RevealOnScroll>
            ))}
          </div>
        </section>

        {/* --- MANIFIESTO (Con animación al scrollear) --- */}
        <section className="bg-neutral-50 py-32 px-6 border-t border-gray-100">
           <div className="max-w-4xl mx-auto text-center space-y-12">
             <RevealOnScroll>
                <Star className="w-5 h-5 mx-auto text-gray-400" strokeWidth={1} />
             </RevealOnScroll>
             
             {/* --- TEXTO MANIFIESTO (AMIGABLE Y CÁLIDO) --- */}
             <RevealOnScroll delay={200}>
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif italic text-gray-800 leading-tight tracking-tight">
                  &quot;{content.story}&quot;
                </h2>
             </RevealOnScroll>
             
             <div className="grid grid-cols-1 md:grid-cols-3 gap-12 pt-16 border-t border-gray-200">
                 {content.benefits.map((item, idx) => (
                   <RevealOnScroll key={idx} delay={400 + (idx * 150)}>
                     <div className="space-y-3 group cursor-default">
                       <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-black group-hover:text-gray-600 transition-colors">
                         {item.title}
                       </h4>
                       <p className="text-sm text-gray-500 font-light leading-relaxed">
                         {item.description}
                       </p>
                     </div>
                   </RevealOnScroll>
                 ))}
             </div>
           </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
