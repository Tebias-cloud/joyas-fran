'use client';

import { Truck, ShieldCheck, Diamond, CreditCard } from 'lucide-react';

// --- ✏️ EDITA EL TEXTO AQUÍ ---
const FEATURES = [
  {
    icon: Truck,
    title: "Envíos a todo Chile",
    description: "Despachos rápidos y asegurados"
  },
  {
    icon: ShieldCheck,
    title: "Garantía de 6 Meses",
    description: "Cobertura ante fallas de fábrica"
  },
  {
    icon: Diamond,
    title: "Joyas Certificadas",
    description: "Autenticidad garantizada en cada pieza"
  },
  {
    icon: CreditCard,
    title: "Pago Seguro",
    description: "Transacciones encriptadas con WebPay"
  }
];
// -----------------------------

export default function TrustBar() {
  return (
    <div className="bg-gray-50 border-y border-gray-100 py-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {FEATURES.map((feature, index) => (
            <div key={index} className="flex flex-col items-center text-center space-y-3 group">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border border-gray-200 shadow-sm group-hover:scale-110 transition-transform duration-300">
                <feature.icon className="w-5 h-5 text-black" />
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wide text-gray-900">{feature.title}</h3>
                <p className="text-xs text-gray-500 mt-1">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}