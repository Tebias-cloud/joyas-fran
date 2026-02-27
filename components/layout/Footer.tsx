import Link from 'next/link';
import { Instagram, Mail, ShieldCheck, CreditCard, Truck, Star, MessageCircle } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100 text-sm">
      
      {/* --- 1. BARRA DE CONFIANZA --- */}
      <div className="border-b border-gray-100 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-gray-200">
            
            {/* Ítem 1: Envíos */}
            <div className="flex flex-col items-center gap-2 px-4">
               <Truck className="w-5 h-5 text-gray-400" strokeWidth={1.5} />
               <span className="text-[10px] uppercase font-bold tracking-widest text-gray-900">Envíos desde Iquique</span>
               <p className="text-xs text-gray-500 font-light">Despachos rápidos a todo Chile.</p>
            </div>

            {/* Ítem 2: Pago Seguro */}
            <div className="flex flex-col items-center gap-2 px-4 pt-8 md:pt-0">
               <ShieldCheck className="w-5 h-5 text-gray-400" strokeWidth={1.5} />
               <span className="text-[10px] uppercase font-bold tracking-widest text-gray-900">Compra 100% Segura</span>
               <div className="flex items-center gap-2 text-xs text-gray-500 font-light">
                  <CreditCard className="w-3 h-3" /> 
                  <span>WebPay Plus, Débito y Crédito</span>
               </div>
            </div>

            {/* Ítem 3: Calidad */}
            <div className="flex flex-col items-center gap-2 px-4 pt-8 md:pt-0">
               <Star className="w-5 h-5 text-gray-400" strokeWidth={1.5} />
               <span className="text-[10px] uppercase font-bold tracking-widest text-gray-900">Plata Ley 925</span>
               <p className="text-xs text-gray-500 font-light">Calidad y autenticidad garantizada.</p>
            </div>

          </div>
        </div>
      </div>

      {/* --- 2. CONTENIDO PRINCIPAL --- */}
      <div className="max-w-7xl mx-auto px-6 pt-16 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-16">
          
          {/* MARCA */}
          <div className="md:col-span-5 space-y-6">
            <Link href="/" className="font-serif italic text-2xl tracking-wider block">Joyas Fran</Link>
            <p className="text-gray-500 font-light leading-relaxed max-w-sm">
              Selección exclusiva de joyas en Plata Ley 925. Diseños importados pensados para resaltar tu elegancia en cada ocasión.
            </p>
            <div className="flex gap-4 pt-2">
              {/* Instagram */}
              <a 
                href="https://www.instagram.com/joyas_fran_cl/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 hover:bg-black hover:text-white transition-all"
              >
                <Instagram className="w-4 h-4"/>
              </a>
              {/* WhatsApp */}
              <a 
                href="https://wa.me/56976400158?text=Hola!%20Vengo%20de%20la%20tienda%20online%20y%20tengo%20una%20consulta." 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 hover:bg-black hover:text-white transition-all"
              >
                <MessageCircle className="w-4 h-4"/>
              </a>
              {/* Email */}
              <a 
                href="mailto:joyasfran925@gmail.com" 
                className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 hover:bg-black hover:text-white transition-all"
              >
                <Mail className="w-4 h-4"/>
              </a>
            </div>
          </div>

          <div className="hidden md:block md:col-span-1"></div>

          {/* BOUTIQUE */}
          <div className="md:col-span-3">
            <h4 className="font-bold uppercase tracking-[0.2em] text-[10px] mb-6 text-black">Boutique</h4>
            <ul className="space-y-4 text-gray-500 font-light text-xs uppercase tracking-wide">
              <li><Link href="/catalogo?category=Anillos" className="hover:text-black transition-colors">Anillos</Link></li>
              <li><Link href="/catalogo?category=Collares" className="hover:text-black transition-colors">Collares</Link></li>
              <li><Link href="/catalogo?category=Pulseras" className="hover:text-black transition-colors">Pulseras</Link></li>
              <li><Link href="/catalogo" className="hover:text-black transition-colors font-medium">Ver Todo</Link></li>
            </ul>
          </div>

          {/* ATENCIÓN */}
          <div className="md:col-span-3">
            <h4 className="font-bold uppercase tracking-[0.2em] text-[10px] mb-6 text-black">Atención</h4>
            <ul className="space-y-4 text-gray-500 font-light text-xs uppercase tracking-wide">
              <li><Link href="/nosotros" className="hover:text-black transition-colors">Nuestra Marca</Link></li>
              {/* Enlaces con anclas para ir directo a la sección */}
              <li><Link href="/politicas#envios" className="hover:text-black transition-colors">Envíos</Link></li>
              <li><Link href="/politicas#cuidados" className="hover:text-black transition-colors">Cuidados</Link></li>
              <li><Link href="/politicas#garantia" className="hover:text-black transition-colors">Garantía</Link></li>
              <li><Link href="/contacto" className="hover:text-black transition-colors">Contacto</Link></li>
            </ul>
          </div>

        </div>

        {/* COPYRIGHT */}
        <div className="pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] text-gray-400 font-medium uppercase tracking-wider">
          <p>© {new Date().getFullYear()} Joyas Fran. Iquique, Chile.</p>
          <p>Plata 925 & Diseño Exclusivo.</p>
        </div>
      </div>
    </footer>
  );
}