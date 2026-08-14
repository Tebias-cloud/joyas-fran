import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mi Cuenta - Historial y Envío | Joyas Fran',
  description: 'Administra tus datos personales, direcciones de despacho y revisa el historial de tus pedidos de Joyas Fran.',
};

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return children;
}
