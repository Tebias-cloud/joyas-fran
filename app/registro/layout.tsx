import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Crear Cuenta - Registrarse | Joyas Fran',
  description: 'Regístrate en Joyas Fran para guardar tus direcciones, administrar tus compras y acceder a ofertas exclusivas.',
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
