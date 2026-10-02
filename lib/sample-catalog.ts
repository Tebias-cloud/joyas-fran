/** Real photographed designs; prices and quantities are examples pending owner review. */
export const SAMPLE_CATALOG = [
  { slug: 'dije-corazones', name: 'Dije Corazones', description: 'Dije con silueta de corazón, pequeños corazones calados y detalles brillantes.', category: 'Dijes', price: 16900, stock: 3, source: 'IMG_6308(1).jpeg', top: 295, bottom: 1241 },
  { slug: 'dije-elefante-corazon', name: 'Dije Elefante Corazón', description: 'Dije de elefante con detalle de corazón y pequeños brillos.', category: 'Dijes', price: 14900, stock: 2, source: 'IMG_6309(1).jpeg', top: 253, bottom: 1283 },
  { slug: 'dije-elefante-piedra-oscura', name: 'Dije Elefante con Piedra Oscura', description: 'Dije de elefante con trompa levantada, detalles brillantes y una piedra de tono oscuro.', category: 'Dijes', price: 16900, stock: 2, source: 'IMG_6310(1).jpeg', top: 295, bottom: 1241 },
  { slug: 'dije-arbol-de-la-vida', name: 'Dije Árbol de la Vida', description: 'Diseño circular calado con ramas y tronco de árbol. Se vende como dije, sin cadena.', category: 'Dijes', price: 12900, stock: 4, source: 'IMG_6311(1).png', top: 494, bottom: 1298 },
  { slug: 'dije-flor-piedra-verde', name: 'Dije Flor con Piedra Verde', description: 'Dije de cuatro pétalos calados con detalles en espiral y una piedra central de tono verde.', category: 'Dijes', price: 18900, stock: 1, source: 'IMG_6312(1).png', top: 461, bottom: 1331 },
  { slug: 'dije-gato', name: 'Dije Gato', description: 'Dije con silueta de gato, ojos oscuros, cuerpo brillante y cola curva.', category: 'Dijes', price: 14900, stock: 3, source: 'IMG_6313(1).jpeg', top: 225, bottom: 1311 },
  { slug: 'dije-mano-ojo-verde', name: 'Dije Mano con Ojo Verde', description: 'Dije con forma de mano, detalles brillantes y un ojo central de tono verde.', category: 'Dijes', price: 17900, stock: 2, source: 'IMG_6314(1).jpeg', top: 311, bottom: 1225 },
  { slug: 'dije-ala-colores', name: 'Dije Ala de Colores', description: 'Dije calado con forma de ala y una hilera de piedras de distintos colores.', category: 'Dijes', price: 19900, stock: 3, source: 'IMG_6315(1).jpeg', top: 295, bottom: 1241 },
  { slug: 'dije-cisnes', name: 'Dije Cisnes', description: 'Dos cisnes de cuellos curvos con detalles brillantes en las alas.', category: 'Dijes', price: 16900, stock: 2, source: 'IMG_6316.png', top: 375, bottom: 1417 },
  { slug: 'pulsera-cuentas-violetas', name: 'Pulsera de Cuentas Violetas', description: 'Pulsera de cuentas violetas, detalles de tono plateado y cierre con cadena de extensión.', category: 'Pulseras', price: 22900, stock: 4, source: 'IMG_6317.png', top: 344, bottom: 1448 },
] as const;

export function isSampleSku(sku: string | null | undefined) { return Boolean(sku?.startsWith('FRAN-MUESTRA-')); }
