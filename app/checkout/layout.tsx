import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Finalizar Compra - Pago Seguro | Joyas Fran',
  description: 'Ingresa tus datos de despacho y realiza tu pago de forma 100% segura con Mercado Pago. Envíos garantizados a todo Chile.',
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
