'use client';

import { useState, useEffect, useRef, ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { ArrowRight, Star } from 'lucide-react';

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
  return (
    <div className="min-h-screen bg-white selection:bg-black selection:text-white">
      <Header />
      
      <main>
        {/* --- HERO SECTION --- */}
        <section className="relative h-[90vh] w-full bg-[#121212] overflow-hidden">
          {/* Imagen con Zoom Lento */}
          <div className="absolute inset-0 overflow-hidden">
             <div className="relative h-full w-full animate-zoom-out-slow">
               <Image 
                 src="/img/banner-home.webp" 
                 alt="Colección Exclusiva Joyas Fran" 
                 fill 
                 className="object-cover opacity-80" 
                 priority 
                 sizes="100vw"
                 quality={95}
               />
             </div>
             <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/80" /> 
          </div>

          {/* Contenido Hero */}
          <div className="relative z-10 h-full flex flex-col items-center justify-center text-center text-white px-6">
            
            <div className="animate-fade-in-up opacity-0 delay-300 flex items-center gap-3 mb-6">
                <div className="h-[1px] w-8 bg-white/40" /> 
                <span className="text-[10px] md:text-xs uppercase tracking-[0.4em] font-medium text-white/90">
                    Plata Italiana Ley 925
                </span>
                <div className="h-[1px] w-8 bg-white/40" />
            </div>

            <h1 className="animate-fade-in-up opacity-0 delay-500 text-5xl md:text-7xl lg:text-8xl font-serif italic mb-6 leading-none drop-shadow-2xl">
              Esencia & <br/> Distinción
            </h1>

            {/* --- TEXTO BANNER (CERCANO Y NATURAL) --- */}
            <p className="animate-fade-in-up opacity-0 delay-700 max-w-xl text-base md:text-xl font-normal mb-12 text-white drop-shadow-md leading-relaxed tracking-wide">
              Joyas en Plata Ley 925. Diseños pensados para destacar tu estilo en cada ocasión.
            </p>

            {/* BOTÓN SIMPLIFICADO Y ELEGANTE */}
            <div className="animate-fade-in-up opacity-0 delay-1000">
                <Link 
                  href="/catalogo" 
                  className="bg-white text-black px-12 py-4 text-[11px] font-bold uppercase tracking-[0.3em] transition-all duration-300 border border-white hover:bg-black hover:text-white hover:border-white shadow-xl"
                >
                  Explorar Colección
                </Link>
            </div>
          </div>
        </section>

        {/* --- CATEGORÍAS (Con animación al scrollear) --- */}
        <section className="py-24 px-6 max-w-7xl mx-auto">
          <RevealOnScroll className="flex flex-col items-center mb-20 space-y-4">
            <span className="text-[9px] uppercase tracking-[0.4em] text-gray-400 font-bold">Nuestras Piezas</span>
            <h2 className="text-4xl font-serif italic text-gray-900">Favoritos del Mes</h2>
            <div className="w-12 h-[1px] bg-gray-300" />
          </RevealOnScroll>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { label: 'Anillos', img: '/img/cat-anillos.webp', link: '/catalogo?category=Anillos', mt: false },
              { label: 'Collares', img: '/img/cat-collares.webp', link: '/catalogo?category=Collares', mt: true },
              { label: 'Aros', img: '/img/cat-aros.webp', link: '/catalogo?category=Aros', mt: false }
            ].map((cat, i) => (
               <RevealOnScroll key={i} delay={i * 150} className={cat.mt ? 'md:-mt-12' : ''}>
                 <Link 
                   href={cat.link} 
                   className="group relative aspect-[3/4] overflow-hidden bg-[#121212] cursor-pointer block"
                 >
                    <Image 
                      src={cat.img} 
                      alt={cat.label} 
                      fill 
                      className="object-cover opacity-90 transition-transform duration-[1.5s] ease-out group-hover:scale-110 group-hover:opacity-100" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500" />
                    
                    <div className="absolute inset-0 flex items-end p-8 md:p-10">
                      <div className="text-white transform transition-transform duration-500 group-hover:-translate-y-2 w-full">
                        <div className="flex justify-between items-end border-b border-white/0 group-hover:border-white/50 pb-2 transition-all duration-500">
                          <h3 className="text-2xl md:text-3xl font-serif italic tracking-wide">{cat.label}</h3>
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
                  &quot;Piezas atemporales y de calidad, elegidas cuidadosamente para darle un brillo especial a tu día a día.&quot;
                </h2>
             </RevealOnScroll>
             
             <div className="grid grid-cols-1 md:grid-cols-3 gap-12 pt-16 border-t border-gray-200">
                 {[
                   { title: "Calidad Italiana", desc: "Plata Ley 925 auténtica." },
                   { title: "Empaque Premium", desc: "La experiencia perfecta de regalo." },
                   { title: "Envíos Seguros", desc: "A todo Chile, rápido y protegido." }
                 ].map((item, idx) => (
                   <RevealOnScroll key={idx} delay={400 + (idx * 150)}>
                     <div className="space-y-3 group cursor-default">
                       <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-black group-hover:text-gray-600 transition-colors">
                         {item.title}
                       </h4>
                       <p className="text-sm text-gray-500 font-light leading-relaxed">
                         {item.desc}
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