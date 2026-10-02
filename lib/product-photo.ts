export const PHOTO_BACKGROUNDS = [
  { id: 'noir', name: 'Oscuro de la tienda', color: '#181818', imageUrl: '/img/backdrop-noir.webp' },
  { id: 'ivory', name: 'Marfil', color: '#f5f1e9' },
] as const;

export type PhotoCrop = { x: number; y: number; width: number; height: number };
export const FULL_PHOTO: PhotoCrop = { x: 0, y: 0, width: 100, height: 100 };
export const PHOTO_MODEL = 'onnx-community/BiRefNet_lite-ONNX';
export const PHOTO_MODEL_REVISION = 'de15b22ba131738a16dff04aab8bdf8dc32e3ac1';

export function cropPixels(crop: PhotoCrop, width: number, height: number) {
  if (!Object.values(crop).every(Number.isFinite) || width < 1 || height < 1) {
    throw new Error('Encuadre no válido');
  }
  const x = Math.min(width - 1, Math.round(Math.max(0, Math.min(99, crop.x)) * width / 100));
  const y = Math.min(height - 1, Math.round(Math.max(0, Math.min(99, crop.y)) * height / 100));
  return {
    x, y,
    width: Math.max(1, Math.min(width - x, Math.round(Math.max(1, crop.width) * width / 100))),
    height: Math.max(1, Math.min(height - y, Math.round(Math.max(1, crop.height) * height / 100))),
  };
}

/** Only alpha changes. RGB comes from the input, never from a generative model. */
export function applyPhotoMask(rgba: Uint8ClampedArray, mask: Uint8ClampedArray | Uint8Array) {
  if (rgba.length !== mask.length * 4) throw new Error('Máscara de tamaño incorrecto');
  const output = new Uint8ClampedArray(rgba);
  for (let i = 0; i < mask.length; i++) {
    output[i * 4 + 3] = Math.round(rgba[i * 4 + 3] * mask[i] / 255);
  }
  return output;
}

/** Includes faint edges; keeps the entire mask and scales without changing proportions. */
export function photoPlacement(mask: Uint8ClampedArray | Uint8Array, width: number, height: number, size = 1200) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || mask.length !== width * height || size < 1) throw new Error('Máscara no válida');
  let left = width, top = height, right = -1, bottom = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (mask[y * width + x] > 2) {
      left = Math.min(left, x); top = Math.min(top, y);
      right = Math.max(right, x); bottom = Math.max(bottom, y);
    }
  }
  if (right < 0) throw new Error('No se encontró una joya. Conserva la original o prueba otra foto.');
  const scale = size * 0.78 / Math.max(right - left + 1, bottom - top + 1);
  return { x: size / 2 - (left + right + 1) / 2 * scale, y: size / 2 - (top + bottom + 1) / 2 * scale, width: width * scale, height: height * scale };
}

export function validatePhoto(file: File) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Usa una foto JPG, PNG o WebP. Si es HEIC, expórtala como JPG.');
  }
  if (file.size > 15 * 1024 * 1024) throw new Error('La foto debe pesar menos de 15 MB.');
}

export function photoBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob(
    blob => blob ? resolve(blob) : reject(new Error('No se pudo preparar la foto')),
    'image/png',
  ));
}

export async function loadPhoto(url: string) {
  const image = new Image();
  image.crossOrigin = 'anonymous';
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('No se pudo abrir la foto. Descárgala y vuelve a subirla.'));
    image.src = url;
  });
  if (image.naturalWidth * image.naturalHeight > 40_000_000) {
    throw new Error('La foto es demasiado grande. Usa una versión de hasta 40 megapíxeles.');
  }
  return image;
}

export function cropPhoto(image: HTMLImageElement, crop: PhotoCrop) {
  const rect = cropPixels(crop, image.naturalWidth, image.naturalHeight);
  const scale = Math.min(1, 1600 / Math.max(rect.width, rect.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(rect.width * scale));
  canvas.height = Math.max(1, Math.round(rect.height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('El navegador no permite preparar imágenes');
  context.drawImage(image, rect.x, rect.y, rect.width, rect.height, 0, 0, canvas.width, canvas.height);
  return canvas;
}
