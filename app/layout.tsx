import './globals.css';
import { Playfair_Display, Lato } from 'next/font/google';
import { Toaster } from 'sonner';
import { Metadata } from 'next';
import { CartProvider } from '@/context/CartContext'; 
import WhatsAppButton from '@/components/ui/WhatsAppButton';
import { SITE_URL } from '@/lib/config';
import SampleCatalogNotice from '@/components/ui/SampleCatalogNotice';

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
  metadataBase: new URL(SITE_URL), // Recuerda cambiar esto por tu dominio real si compras uno
  title: {
    template: '%s | Joyas Fran',
    default: 'Joyas Fran | Joyas en Iquique',
  },
  description: 'Descubre las joyas de Joyas Fran. Dijes, pulseras y atención cercana desde Iquique.',
  openGraph: {
    title: 'Joyas Fran | Joyas en Iquique',
    description: 'Descubre nuestra colección de joyas y consulta disponibilidad.',
    url: SITE_URL,
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
          <SampleCatalogNotice />
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
