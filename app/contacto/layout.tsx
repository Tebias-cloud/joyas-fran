import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contacto - Escríbenos | Joyas Fran',
  description: '¿Tienes alguna consulta? Escríbenos vía WhatsApp, Instagram o Correo electrónico. Te responderemos personalmente desde Iquique, Chile.',
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
