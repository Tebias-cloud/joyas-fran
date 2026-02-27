import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Truck, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';

export default function PoliticasPage() {
  return (
    <div className="bg-white min-h-screen flex flex-col">
      <Header />
      
      {/* HEADER DE SECCIÓN */}
      <div className="bg-gray-50 py-16 md:py-24 text-center px-6">
        <span className="text-xs font-bold uppercase tracking-[0.3em] text-gray-400 block mb-4">Información al Cliente</span>
        <h1 className="text-4xl md:text-5xl font-serif italic text-gray-900 mb-6">Políticas y Cuidados</h1>
        <p className="max-w-2xl mx-auto text-gray-500 font-light text-sm md:text-base leading-relaxed">
          Queremos que tu experiencia con Joyas Fran sea perfecta. Aquí encontrarás todo lo que necesitas saber sobre cómo trabajamos y cómo cuidar tus tesoros.
        </p>
      </div>

      <main className="flex-grow max-w-4xl mx-auto px-6 py-20 space-y-24">
        
        {/* --- SECCIÓN ENVÍOS --- */}
        <section id="envios" className="scroll-mt-32">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-900">
              <Truck className="w-6 h-6" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-xl font-serif italic text-gray-900">Envíos y Despachos</h2>
              <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Todo Chile</p>
            </div>
          </div>
          
          <div className="bg-gray-50/50 p-8 md:p-10 rounded-sm border border-gray-100 space-y-6 text-sm text-gray-600 leading-relaxed font-light">
            <p>
              Realizamos envíos a todo Chile a través de <strong>Starken</strong> y <strong>Chilexpress</strong>. Todos los pedidos son procesados y enviados desde nuestra central en Iquique.
            </p>
            <ul className="space-y-3 list-disc pl-5 marker:text-gray-300">
              <li><strong>Tiempo de preparación:</strong> 1 a 3 días hábiles tras confirmar el pago.</li>
              <li><strong>Envío Gratis:</strong> En todas las compras superiores a $100.000.</li>
              <li><strong>Seguimiento:</strong> Recibirás un correo con tu número de seguimiento apenas tu pedido sea despachado.</li>
            </ul>
            <p className="text-xs text-gray-400 italic pt-2">
              * Nota: Los tiempos de entrega de la empresa de transporte son externos a Joyas Fran y pueden variar según la contingencia.
            </p>
          </div>
        </section>

        {/* --- SECCIÓN CAMBIOS Y GARANTÍA --- */}
        <section id="garantia" className="scroll-mt-32">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-900">
              <RefreshCw className="w-6 h-6" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-xl font-serif italic text-gray-900">Cambios y Garantías</h2>
              <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Tu tranquilidad importa</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="p-8 border border-gray-100 rounded-sm hover:border-gray-200 transition-colors">
              <h3 className="flex items-center gap-2 font-bold text-xs uppercase tracking-widest mb-4">
                <ShieldCheck className="w-4 h-4" /> Garantía Legal (3 Meses)
              </h3>
              <p className="text-sm text-gray-600 font-light leading-relaxed">
                Todas nuestras joyas de Plata Ley 925 cuentan con garantía legal de 3 meses por fallas de fabricación (broches defectuosos, piedras sueltas, etc.). Esta garantía no cubre daños por uso indebido, golpes o desgaste natural.
              </p>
            </div>
            
            <div className="p-8 border border-gray-100 rounded-sm hover:border-gray-200 transition-colors">
              <h3 className="flex items-center gap-2 font-bold text-xs uppercase tracking-widest mb-4">
                <RefreshCw className="w-4 h-4" /> Cambios (10 Días)
              </h3>
              <p className="text-sm text-gray-600 font-light leading-relaxed">
                Si necesitas cambiar una talla o modelo, puedes hacerlo dentro de los primeros 10 días desde que recibes tu pedido. El producto debe estar sin uso y en su empaque original. El costo de envío corre por cuenta del cliente.
              </p>
            </div>
          </div>
        </section>

        {/* --- SECCIÓN CUIDADOS (NUEVA) --- */}
        <section id="cuidados" className="scroll-mt-32">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-900">
              <Sparkles className="w-6 h-6" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-xl font-serif italic text-gray-900">Cuidado de tus Joyas</h2>
              <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Mantén el brillo</p>
            </div>
          </div>

          <div className="bg-black text-white p-8 md:p-12 rounded-sm relative overflow-hidden">
            <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <h3 className="text-2xl font-serif italic">El arte de cuidar la plata</h3>
                <p className="text-white/80 text-sm font-light leading-relaxed">
                  La plata es un metal noble que puede oscurecerse naturalmente con el tiempo o el PH de la piel. Esto no es un defecto, sino una reacción natural que tiene solución simple.
                </p>
              </div>
              
              <ul className="space-y-4 text-sm font-light text-white/90">
                <li className="flex gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-white mt-2 shrink-0"></span>
                  Evita el contacto directo con perfumes, cremas y cloro.
                </li>
                <li className="flex gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-white mt-2 shrink-0"></span>
                  Guárdalas por separado en su bolsa de género o joyero.
                </li>
                <li className="flex gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-white mt-2 shrink-0"></span>
                  Limpia periódicamente con un paño suave de pulir plata.
                </li>
                <li className="flex gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-white mt-2 shrink-0"></span>
                  No duermas ni te bañes con tus joyas puestas.
                </li>
              </ul>
            </div>
            
            {/* Decoración de fondo */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2"></div>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}