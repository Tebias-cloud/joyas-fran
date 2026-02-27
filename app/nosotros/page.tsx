import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Image from 'next/image';
import { MapPin, Globe, Sparkles } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <main className="animate-fade-in">
        
        {/* --- SECCIÓN HERO (IMAGEN PRINCIPAL) --- */}
        <div className="relative h-[60vh] w-full overflow-hidden">
           <Image 
             src="https://images.unsplash.com/photo-1573408301185-9146fe634ad0?q=80&w=2075&auto=format&fit=crop" 
             alt="Joyas Fran Iquique" 
             fill 
             className="object-cover"
             priority
           />
           <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
             <h1 className="text-5xl md:text-7xl font-serif italic text-white text-center drop-shadow-lg">
               Nuestra Esencia
             </h1>
           </div>
        </div>

        {/* --- HISTORIA & ORIGEN --- */}
        <section className="max-w-4xl mx-auto px-6 py-24 text-center">
          <span className="text-xs uppercase tracking-[0.3em] text-gray-400 font-medium mb-6 block">Desde el Norte de Chile</span>
          
          {/* CORRECCIÓN: Comillas escapadas (&quot;) */}
          <h2 className="text-3xl md:text-4xl font-serif italic text-gray-900 mb-8 leading-tight">
            &quot;Nacimos en Iquique con una misión clara: <br className="hidden md:block"/> democratizar el acceso al diseño internacional.&quot;
          </h2>
          
          <div className="prose prose-stone mx-auto text-gray-500 font-light leading-relaxed space-y-6">
            <p>
              Joyas Fran no es solo una joyería; es una curatoría de estilo. Estando ubicados en <strong>Iquique</strong>, un puerto estratégico de conexión con el mundo, tenemos el privilegio de acceder a tendencias globales de primera mano.
            </p>
            <p>
              Nos alejamos de lo tradicional para buscar piezas que brillen con luz propia. Seleccionamos personalmente cada anillo, collar y pulsera, asegurándonos de que cumplan con dos requisitos innegociables: ser de auténtica <strong>Plata Ley 925</strong> y tener un diseño que robe miradas.
            </p>
          </div>
        </section>

        {/* --- VALORES (GRID) --- */}
        <section className="bg-gray-50 py-24 px-6">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
            
            {/* VALOR 1 */}
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-2">
                <Globe className="w-6 h-6 text-black" strokeWidth={1} />
              </div>
              <h3 className="text-lg font-serif italic">Tendencia Global</h3>
              <p className="text-sm text-gray-500 font-light px-4">
                Viajamos (física o virtualmente) buscando lo que se lleva en las capitales de moda para traerlo directo a Chile.
              </p>
            </div>

            {/* VALOR 2 */}
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-2">
                <Sparkles className="w-6 h-6 text-black" strokeWidth={1} />
              </div>
              <h3 className="text-lg font-serif italic">Calidad Garantizada</h3>
              <p className="text-sm text-gray-500 font-light px-4">
                No trabajamos con baños ni enchapados simples. Solo Plata Ley 925 sólida que perdura en el tiempo.
              </p>
            </div>

            {/* VALOR 3 */}
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-2">
                <MapPin className="w-6 h-6 text-black" strokeWidth={1} />
              </div>
              <h3 className="text-lg font-serif italic">Corazón Iquiqueño</h3>
              <p className="text-sm text-gray-500 font-light px-4">
                Orgullosamente del norte. Aprovechamos nuestra logística para enviar rápido y seguro a todo el país.
              </p>
            </div>

          </div>
        </section>

        {/* --- MANIFIESTO FINAL --- */}
        <section className="py-24 px-6 text-center">
           <div className="max-w-2xl mx-auto border border-gray-100 p-12 md:p-16">
              <h4 className="text-xs font-bold uppercase tracking-widest mb-6">Nuestra Promesa</h4>
              
              {/* CORRECCIÓN: Comillas escapadas (&quot;) */}
              <p className="font-serif italic text-2xl text-gray-800 mb-8">
                &quot;Que cada vez que abras una de nuestras cajas, sientas la brisa de elegancia y el brillo que mereces.&quot;
              </p>
              
              <Image 
                src="/firma-placeholder.png" 
                width={120} 
                height={40} 
                alt="Firma Joyas Fran" 
                className="mx-auto opacity-50 hidden" 
              />
              <p className="text-xs text-gray-400 mt-4 uppercase tracking-widest">El Equipo de Joyas Fran</p>
           </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}