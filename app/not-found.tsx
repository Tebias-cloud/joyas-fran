import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <main className="flex-grow flex flex-col items-center justify-center text-center px-6 py-20">
        <h1 className="text-9xl font-serif italic text-gray-100 select-none">404</h1>
        <div className="-mt-12 space-y-4">
          <h2 className="text-2xl font-serif text-gray-900">Esta joya no se encuentra</h2>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Lo sentimos, la página que buscas no existe o ha sido movida.
            Pero tenemos muchas otras piezas esperando por ti.
          </p>
          <div className="pt-4">
            <Link 
              href="/catalogo" 
              className="bg-black text-white px-8 py-3 text-xs font-bold uppercase tracking-[0.2em] hover:bg-gray-800 transition-colors inline-block"
            >
              Volver al Catálogo
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}