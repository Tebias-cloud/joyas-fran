import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mi Carrito de Compras | Joyas Fran',
  description: 'Revisa las piezas seleccionadas en tu bolsa de compras. Finaliza tu pedido de joyas exclusivas en Plata Italiana Ley 925.',
};

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children;
}
