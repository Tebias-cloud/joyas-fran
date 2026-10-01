/**
 * Utilidades compartidas del Panel de Administración de Joyas Fran.
 */

/**
 * Material fijo de todos los productos de Joyas Fran.
 * Cambiar aquí actualiza el valor en todo el sistema.
 */
export const DEFAULT_MATERIAL = 'Plata Ley 925';

/**
 * Componente reutilizable para el encabezado de cada tab del admin.
 */
export const TabHeader = ({ title, description }: { title: string; description: string }) => (
  <div className="mb-6 animate-fade-in border-b border-gray-100 pb-4">
    <h2 className="text-2xl font-serif italic text-gray-900 mb-1">{title}</h2>
    <p className="text-sm text-gray-500 font-light">{description}</p>
  </div>
);
