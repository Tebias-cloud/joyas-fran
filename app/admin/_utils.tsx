/**
 * Utilidades compartidas del Panel de Administración de Joyas Fran.
 */

/**
 * Convierte un archivo de imagen a formato WebP con resolución máxima de 1200x1200
 * y calidad de compresión del 80% antes de subirlo al storage.
 */
export const convertToWebp = (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new window.Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
        } else {
          if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Canvas to Blob failed'));
        }, 'image/webp', 0.8);
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Componente reutilizable para el encabezado de cada tab del admin.
 */
export const TabHeader = ({ title, description }: { title: string; description: string }) => (
  <div className="mb-6 animate-fade-in border-b border-gray-100 pb-4">
    <h2 className="text-2xl font-serif italic text-gray-900 mb-1">{title}</h2>
    <p className="text-sm text-gray-500 font-light">{description}</p>
  </div>
);
