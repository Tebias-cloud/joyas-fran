'use client';

import { usePathname } from 'next/navigation';
import { MessageCircle } from 'lucide-react';

export default function WhatsAppButton() {
  const pathname = usePathname();

  // 1. LÓGICA DE OCULTAMIENTO INTELIGENTE
  // Se oculta en el login y en el panel de admin
  if (pathname?.startsWith('/admin') || pathname === '/login') {
    return null;
  }

  // 2. FORMATO SEGURO (Solo dígitos)
  const phoneNumber = "56976400158"; 
  const message = "Hola Joyas Fran, tengo una duda...";

  return (
    <a
      href={`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 group transition-transform hover:scale-110 duration-300"
      aria-label="Contactar por WhatsApp"
    >
      {/* Tooltip (Aparece al pasar el mouse) */}
      <span className="absolute right-full mr-4 top-1/2 -translate-y-1/2 bg-white text-gray-800 text-xs font-bold px-3 py-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-md pointer-events-none border border-gray-100">
        ¿Te ayudo en algo?
      </span>

      {/* Botón Principal Limpio */}
      <div className="bg-[#25D366] text-white p-4 rounded-full shadow-lg hover:shadow-green-500/30 flex items-center justify-center">
        {/* Ícono Sólido */}
        <MessageCircle className="w-7 h-7 fill-white text-[#25D366]" /> 
      </div>
    </a>
  );
}