import { z } from 'zod';

const text = (max: number) => z.string().trim().min(1).max(max);
const imagePath = z.string().max(2048).refine(value => {
  if (value === '') return true;
  try {
    const url = new URL(value);
    const storage = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co');
    return url.protocol === 'https:' && url.origin === storage.origin && url.pathname.startsWith('/storage/v1/object/public/products/');
  } catch { return false; }
}, 'Selecciona una foto del catálogo o sube una portada.');

export const websiteContentSchema = z.object({
  heroTitle: text(80), heroBadge: text(60), heroDescription: text(240), heroButton: text(40),
  heroImage: imagePath, heroPosition: z.number().int().min(0).max(100),
  categoriesTitle: text(80), featuredTitle: text(80),
  featuredProductIds: z.array(z.string().uuid()).max(6).refine(ids => new Set(ids).size === ids.length),
  story: text(320), benefits: z.array(z.object({ title: text(60), description: text(160) })).length(3),
  catalogTitle: text(80), catalogDescription: text(240),
}).strict();
export type WebsiteContent = z.infer<typeof websiteContentSchema>;
export type FeaturedJewel = { id: string; name: string; slug: string; imageUrl: string; price: number; stock: number; isActive: boolean };

export const DEFAULT_WEBSITE_CONTENT: WebsiteContent = {
  heroTitle: 'Esencia & Distinción', heroBadge: 'Joyas Fran · Iquique',
  heroDescription: 'Joyas elegidas para acompañarte en cada ocasión.', heroButton: 'Explorar colección',
  heroImage: '', heroPosition: 50, categoriesTitle: 'Encuentra tu estilo',
  featuredTitle: 'Favoritos del mes', featuredProductIds: [],
  story: 'Piezas elegidas cuidadosamente para darle un brillo especial a tu día a día.',
  benefits: [
    { title: 'Elegidas para ti', description: 'Diseños para cada ocasión.' },
    { title: 'Para regalar', description: 'Encuentra un detalle especial.' },
    { title: 'Desde Iquique', description: 'Consulta las opciones de entrega.' },
  ],
  catalogTitle: 'Nuestra colección', catalogDescription: 'Explora nuestras joyas y encuentra tu próxima favorita.',
};

export function parseWebsiteContent(value: unknown): WebsiteContent {
  const result = websiteContentSchema.safeParse(value);
  return result.success ? result.data : structuredClone(DEFAULT_WEBSITE_CONTENT);
}
export function selectFeaturedJewels(products: FeaturedJewel[], ids: string[]) {
  return ids.flatMap(id => {
    const jewel = products.find(product => product.id === id && product.isActive && product.stock > 0);
    return jewel ? [jewel] : [];
  });
}
export const WEBSITE_SEASONS = [
  { name: 'Clásica', title: 'Esencia & Distinción', description: 'Joyas elegidas para acompañarte en cada ocasión.' },
  { name: 'Regalos', title: 'Un detalle especial', description: 'Elige una joya para esa persona que quieres sorprender.' },
  { name: 'Navidad', title: 'Regala un brillo especial', description: 'Encuentra un detalle para compartir esta Navidad.' },
] as const;
