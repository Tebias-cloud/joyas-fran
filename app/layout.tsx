import './globals.css';
import { Playfair_Display, Lato } from 'next/font/google';
import { Toaster } from 'sonner';
import { Metadata } from 'next';
import { CartProvider } from '@/context/CartContext'; 
import WhatsAppButton from '@/components/ui/WhatsAppButton'; // <--- NUEVA IMPORTACIÓN

// Optimización de fuentes: 'swap' evita el texto invisible mientras carga
const playfair = Playfair_Display({ 
  subsets: ['latin'], 
  variable: '--font-serif',
  display: 'swap',
});

const lato = Lato({ 
  weight: ['300', '400', '700'],
  subsets: ['latin'], 
  variable: '--font-sans',
  display: 'swap' 
});

export const metadata: Metadata = {
  metadataBase: new URL('https://joyasfran.cl'), // Recuerda cambiar esto por tu dominio real si compras uno
  title: {
    template: '%s | Joyas Fran',
    default: 'Joyas Fran | Plata Ley 925 y Diseño Exclusivo',
  },
  description: 'Colección exclusiva de joyas en Plata Ley 925. Diseños importados seleccionados para resaltar tu estilo.',
  openGraph: {
    title: 'Joyas Fran | Plata Ley 925',
    description: 'Descubre nuestra colección exclusiva de joyas importadas.',
    url: 'https://joyasfran.cl',
    siteName: 'Joyas Fran',
    locale: 'es_CL',
    type: 'website',
  },
  icons: {
    icon: '/favicon.ico', 
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${playfair.variable} ${lato.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased text-gray-900 bg-white selection:bg-black selection:text-white">
        <CartProvider>
          {children}
          
          {/* Notificaciones Toast */}
          <Toaster 
            position="top-center" 
            richColors 
            closeButton 
            toastOptions={{
              style: { fontFamily: 'var(--font-sans)' },
              className: 'font-sans text-sm',
            }}
          />

          {/* Botón Flotante de WhatsApp */}
          <WhatsAppButton />
          
        </CartProvider>
      </body>
    </html>
  );
}