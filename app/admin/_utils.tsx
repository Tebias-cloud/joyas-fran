/**
 * Utilidades compartidas del Panel de Administración de Joyas Fran.
 */

/**
 * New products require confirmation from the owner or supplier.
 */
export const DEFAULT_MATERIAL = 'Por confirmar';

/**
 * Componente reutilizable para el encabezado de cada tab del admin.
 */
export const TabHeader = ({ title, description }: { title: string; description: string }) => (
  <div className="mb-6 animate-fade-in border-b border-gray-100 pb-4">
    <h2 className="text-2xl font-serif italic text-gray-900 mb-1">{title}</h2>
    <p className="text-sm text-gray-500 font-light">{description}</p>
  </div>
);
