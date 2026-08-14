/**
 * Skeleton loader para la grilla del catálogo.
 * Se muestra durante la fase de Suspense antes de que los productos
 * carguen desde el servidor.
 */
export default function CatalogSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row gap-12">
      {/* Sidebar skeleton */}
      <aside className="md:w-64 flex-shrink-0 hidden md:block">
        <div className="h-6 w-24 bg-gray-200 rounded animate-pulse mb-6" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: `${60 + i * 8}%` }} />
          ))}
        </div>
      </aside>

      {/* Grid skeleton */}
      <div className="flex-1">
        <div className="mb-8 pb-4 border-b border-gray-100 flex justify-between items-end">
          <div>
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
          </div>
          <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-12">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="block">
              {/* Imagen placeholder */}
              <div className="aspect-[3/4] bg-gray-100 rounded-sm mb-4 animate-pulse" />
              {/* Nombre placeholder */}
              <div className="text-center space-y-2">
                <div className="h-3 bg-gray-200 rounded animate-pulse mx-auto" style={{ width: '70%' }} />
                <div className="h-3 bg-gray-100 rounded animate-pulse mx-auto" style={{ width: '40%' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
