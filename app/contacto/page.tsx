'use client';

import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Mail, Instagram, MessageCircle, Clock, MapPin, ArrowUpRight, Copy } from 'lucide-react';
import { toast } from 'sonner';

export default function ContactPage() {
  
  const handleCopyEmail = () => {
    navigator.clipboard.writeText('joyasfran925@gmail.com');
    toast.success('¡Correo copiado al portapapeles!');
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <main className="animate-fade-in">
        
        {/* --- HEADER --- */}
        <div className="bg-gray-50 py-20 px-6 text-center border-b border-gray-100">
          <span className="text-xs uppercase tracking-[0.3em] text-gray-400 font-medium mb-3 block">Servicio al Cliente</span>
          <h1 className="text-4xl md:text-5xl font-serif italic text-gray-900 mb-6">Estamos aquí para ti</h1>
          <p className="max-w-lg mx-auto text-sm font-light text-gray-500 leading-relaxed">
            ¿Tienes dudas sobre una joya o el envío a tu región? <br/>
            Escríbenos y te asesoraremos personalmente desde el norte de Chile.
          </p>
        </div>

        {/* --- TARJETAS DE CONTACTO --- */}
        <div className="max-w-6xl mx-auto px-6 py-20 pb-28">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* WHATSAPP */}
            <a 
              // Aquí está el enlace modificado con el texto predeterminado
              href="https://wa.me/56976400158?text=Hola!%20Vengo%20de%20la%20tienda%20online%20y%20tengo%20una%20consulta." 
              target="_blank"
              rel="noopener noreferrer"
              className="group border border-gray-100 p-10 text-center hover:border-black transition-all duration-300 hover:shadow-xl bg-white block"
            >
              <div className="w-12 h-12 mx-auto bg-gray-50 rounded-full flex items-center justify-center mb-6 group-hover:bg-black group-hover:text-white transition-colors">
                <MessageCircle className="w-5 h-5" />
              </div>
              <h3 className="font-serif italic text-xl mb-2">WhatsApp</h3>
              <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">Respuesta Rápida</p>
              <p className="text-sm font-medium text-gray-600 mb-6">+56 9 7640 0158</p>
              <span className="text-sm font-bold border-b border-black pb-1 group-hover:text-gray-600 transition-colors flex items-center justify-center gap-2 w-fit mx-auto">
                Enviar Mensaje <ArrowUpRight className="w-3 h-3" />
              </span>
            </a>

            {/* INSTAGRAM */}
            <a 
              href="https://www.instagram.com/joyas_fran_cl/" 
              target="_blank"
              rel="noopener noreferrer"
              className="group border border-gray-100 p-10 text-center hover:border-black transition-all duration-300 hover:shadow-xl bg-white block"
            >
              <div className="w-12 h-12 mx-auto bg-gray-50 rounded-full flex items-center justify-center mb-6 group-hover:bg-black group-hover:text-white transition-colors">
                <Instagram className="w-5 h-5" />
              </div>
              <h3 className="font-serif italic text-xl mb-2">Instagram</h3>
              <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">Síguenos y Novedades</p>
              <p className="text-sm font-medium text-gray-600 mb-6">@joyas_fran_cl</p>
              <span className="text-sm font-bold border-b border-black pb-1 group-hover:text-gray-600 transition-colors flex items-center justify-center gap-2 w-fit mx-auto">
                Ver Perfil <ArrowUpRight className="w-3 h-3" />
              </span>
            </a>

            {/* EMAIL (Copia el texto) */}
            <button 
              onClick={handleCopyEmail}
              className="group border border-gray-100 p-10 text-center hover:border-black transition-all duration-300 hover:shadow-xl bg-white w-full block cursor-pointer"
            >
              <div className="w-12 h-12 mx-auto bg-gray-50 rounded-full flex items-center justify-center mb-6 group-hover:bg-black group-hover:text-white transition-colors">
                <Mail className="w-5 h-5" />
              </div>
              <h3 className="font-serif italic text-xl mb-2">Email</h3>
              <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">Consultas Detalladas</p>
              <p className="text-sm font-medium text-gray-600 mb-6">joyasfran925@gmail.com</p>
              <span className="text-sm font-bold border-b border-black pb-1 group-hover:text-gray-600 transition-colors flex items-center justify-center gap-2 w-fit mx-auto">
                Copiar Correo <Copy className="w-3 h-3" />
              </span>
            </button>

          </div>
        </div>

        {/* --- INFO ADICIONAL --- */}
        <div className="bg-[#f9f9f9] py-16 px-6">
           <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 text-center md:text-left">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-4">
                 <Clock className="w-5 h-5 text-gray-400 mt-1"/>
                 <div>
                    <h4 className="text-xs font-bold uppercase tracking-widest mb-2">Horario de Atención</h4>
                    <p className="text-sm text-gray-500 font-light">Lunes a Viernes: 09:00 - 19:00 hrs.</p>
                    <p className="text-sm text-gray-500 font-light">Sábados: 10:00 - 14:00 hrs.</p>
                 </div>
              </div>
              <div className="flex flex-col md:flex-row items-center md:items-start gap-4">
                 <MapPin className="w-5 h-5 text-gray-400 mt-1"/>
                 <div>
                    <h4 className="text-xs font-bold uppercase tracking-widest mb-2">Ubicación</h4>
                    <p className="text-sm text-gray-500 font-light">Base operativa en <strong className="text-gray-900 font-medium">Iquique, Chile</strong>.</p>
                    <p className="text-sm text-gray-500 font-light">Realizamos envíos rápidos a todo el país.</p>
                 </div>
              </div>
           </div>
        </div>

      </main>
      <Footer />
    </div>
  );
}