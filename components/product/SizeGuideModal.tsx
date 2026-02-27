'use client';

import { X, Ruler, Circle,  StretchHorizontal } from 'lucide-react';

interface SizeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: string; // Recibimos la categoría para decidir qué mostrar
}

export default function SizeGuideModal({ isOpen, onClose, category = '' }: SizeGuideModalProps) {
  if (!isOpen) return null;

  // Normalizamos la categoría para evitar errores de mayúsculas/tildes
  const cat = category.toLowerCase();

  // CONTENIDO DINÁMICO
  const renderContent = () => {
    // CASO 1: ANILLOS
    if (cat.includes('anillo') || cat.includes('ring')) {
      return (
        <>
          <div className="mx-auto w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
            <Circle className="w-6 h-6 text-black" />
          </div>
          <h3 className="text-xl font-serif italic mb-2">Tallas de Anillos</h3>
          <p className="text-xs text-gray-500 mb-6">Mide el diámetro interno (en mm) de un anillo que te quede bien.</p>
          <div className="border border-gray-100 rounded-lg overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-[10px] font-bold uppercase text-gray-500">
                <tr><th className="px-4 py-3">Talla</th><th className="px-4 py-3 text-right">Diámetro</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-xs">
                <tr><td className="px-4 py-3 font-medium">5</td><td className="px-4 py-3 text-right">15.7 mm</td></tr>
                <tr><td className="px-4 py-3 font-medium">6</td><td className="px-4 py-3 text-right">16.5 mm</td></tr>
                <tr><td className="px-4 py-3 font-medium">7</td><td className="px-4 py-3 text-right">17.3 mm</td></tr>
                <tr><td className="px-4 py-3 font-medium">8</td><td className="px-4 py-3 text-right">18.1 mm</td></tr>
                <tr><td className="px-4 py-3 font-medium">9</td><td className="px-4 py-3 text-right">18.9 mm</td></tr>
              </tbody>
            </table>
          </div>
        </>
      );
    }

    // CASO 2: COLLARES / CADENAS
    if (cat.includes('collar') || cat.includes('cadena')) {
      return (
        <>
          <div className="mx-auto w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
            <StretchHorizontal className="w-6 h-6 text-black" />
          </div>
          <h3 className="text-xl font-serif italic mb-2">Largo de Cadenas</h3>
          <p className="text-xs text-gray-500 mb-6">Referencia visual de cómo cae cada largo.</p>
          <div className="space-y-3 text-left">
            <div className="flex items-center justify-between border-b border-gray-50 pb-2">
              <span className="text-xs font-bold">40 cm</span>
              <span className="text-xs text-gray-500">Gargantilla (Choker), base del cuello.</span>
            </div>
            <div className="flex items-center justify-between border-b border-gray-50 pb-2">
              <span className="text-xs font-bold">45 cm</span>
              <span className="text-xs text-gray-500">Princesa, a la altura de la clavícula.</span>
            </div>
            <div className="flex items-center justify-between border-b border-gray-50 pb-2">
              <span className="text-xs font-bold">50 cm</span>
              <span className="text-xs text-gray-500">Matinee, cae bajo la clavícula.</span>
            </div>
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-bold">60 cm</span>
              <span className="text-xs text-gray-500">Opera, sobre el escote.</span>
            </div>
          </div>
        </>
      );
    }

    // CASO 3: PULSERAS
    if (cat.includes('pulsera') || cat.includes('brazalete')) {
      return (
        <>
          <div className="mx-auto w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
            <Ruler className="w-6 h-6 text-black" />
          </div>
          <h3 className="text-xl font-serif italic mb-2">Tallas de Pulseras</h3>
          <p className="text-xs text-gray-500 mb-6">Mide la circunferencia de tu muñeca con una cinta.</p>
          <div className="bg-gray-50 p-4 rounded-lg text-left text-xs space-y-2">
            <p><strong>XS (15 cm):</strong> Muñeca muy delgada.</p>
            <p><strong>S (16-17 cm):</strong> Talla estándar mujer.</p>
            <p><strong>M (18-19 cm):</strong> Muñeca ancha o talla hombre S.</p>
            <p><strong>L (20-21 cm):</strong> Talla estándar hombre.</p>
          </div>
        </>
      );
    }

    // CASO DEFAULT (GENÉRICO)
    return (
      <>
        <div className="mx-auto w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
          <Ruler className="w-6 h-6 text-black" />
        </div>
        <h3 className="text-xl font-serif italic mb-2">Guía de Medidas</h3>
        <p className="text-xs text-gray-500 mb-4">Para este producto, te recomendamos leer la descripción detallada o contactarnos para asesoría personalizada.</p>
      </>
    );
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors z-10"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
        
        <div className="p-8 text-center">
          {renderContent()}
          <button onClick={onClose} className="w-full mt-8 bg-black text-white py-3 text-xs font-bold uppercase rounded-sm hover:bg-zinc-800 transition-colors">
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}