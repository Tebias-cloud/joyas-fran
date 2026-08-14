import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Iniciar Sesión | Joyas Fran',
  description: 'Inicia sesión en tu cuenta para ver el estado de tus compras y agilizar tu proceso de checkout.',
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
