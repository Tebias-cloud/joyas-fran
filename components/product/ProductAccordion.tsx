'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const SECTIONS = [
  {
    title: "Detalles y Materiales",
    content: "Fabricado en metales nobles (Plata 925 o Baño de Oro 18k). Libre de níquel para evitar alergias. Acabado pulido de alta durabilidad."
  },
  {
    title: "Envíos y Entregas",
    content: "Despachamos a todo Chile. Santiago: 24-48 hrs hábiles. Regiones: 2-5 días hábiles vía Starken/BlueExpress. Envío gratis sobre $100.000."
  },
  {
    title: "Garantía y Cuidados",
    content: "Garantía legal de 6 meses por fallas de fabricación. Para mantener el brillo, evita el contacto directo con perfumes, cremas y agua salada."
  }
];

export default function ProductAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="border-t border-gray-200 mt-10">
      {SECTIONS.map((section, index) => (
        <div key={index} className="border-b border-gray-200">
          <button
            onClick={() => toggle(index)}
            className="w-full py-4 flex justify-between items-center text-left hover:bg-gray-50 transition-colors group"
          >
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-900 group-hover:text-black">
              {section.title}
            </span>
            {openIndex === index ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>
          
          <div 
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              openIndex === index ? 'max-h-48 opacity-100 pb-4' : 'max-h-0 opacity-0'
            }`}
          >
            <p className="text-xs text-gray-500 leading-relaxed pr-4">
              {section.content}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}