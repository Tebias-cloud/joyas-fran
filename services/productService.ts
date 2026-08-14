import { SupabaseClient } from '@supabase/supabase-js';
import { Product, ProductDTO, Category, CategoryDTO, ProductVariant, ProductVariantDTO } from '@/types/product';

// ==========================================
// 1. MAPPERS
// ==========================================

export function mapCategoryToDTO(category: Category): CategoryDTO {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description || '',
    imageUrl: category.image_url || '',
    position: category.position || 0,
    isActive: category.is_active ?? true
  };
}

export function mapVariantToDTO(variant: ProductVariant, basePrice: number, baseCost: number): ProductVariantDTO {
  return {
    id: variant.id,
    sku: variant.sku,
    size: variant.size,
    stock: variant.stock,
    price: variant.price_override ? Number(variant.price_override) : basePrice,
    costPrice: variant.cost_price ? Number(variant.cost_price) : baseCost
  };
}

interface DBProduct extends Product {
  categories?: { name: string } | null;
}

export function mapProductToDTO(product: DBProduct, rawVariants: ProductVariant[] = []): ProductDTO {
  const isLowStock = product.stock > 0 && product.stock <= 5;
  const onSale = !!(product.compare_at_price && product.compare_at_price > product.price);

  // Mapear variantes
  const variants = rawVariants.map(v => mapVariantToDTO(v, product.price, product.cost_price || 0));

  // Reconstruir sizes e inventory dinámicamente si hay variantes físicas
  let sizes: string[] = product.sizes || [];
  let inventory: Record<string, number> = product.inventory || {};

  if (variants.length > 0) {
    sizes = variants.map(v => v.size);
    inventory = variants.reduce((acc, v) => {
      acc[v.size] = v.stock;
      return acc;
    }, {} as Record<string, number>);
  }

  return {
    id: product.id,
    name: product.name,
    price: Number(product.price),
    compareAtPrice: product.compare_at_price ? Number(product.compare_at_price) : null,
    imageUrl: product.image_url,
    images: product.images || [],
    stock: variants.length > 0 ? variants.reduce((acc, v) => acc + v.stock, 0) : (product.stock || 0),
    slug: product.slug,
    description: product.description || '',
    categoryId: product.category_id || null,
    categoryName: product.categories?.name || product.category || '', // Fallback a la antigua columna
    sizes,
    inventory,
    variants,
    sku: product.sku || product.slug || '',
    supplierCode: product.supplier_code || '',
    barcode: product.barcode || '',
    brand: product.brand || 'Joyas Fran',
    collection: product.collection || '',
    material: product.material || 'Plata Ley 925',
    costPrice: product.cost_price ? Number(product.cost_price) : 0,
    isFeatured: product.is_featured ?? false,
    isNew: product.is_new ?? false,
    metaTitle: product.meta_title || '',
    metaDescription: product.meta_description || '',
    isLowStock,
    onSale,
    createdAt: product.created_at,
    isActive: product.is_active ?? true
  };
}

// ==========================================
// 2. CATEGORIES SERVICES
// ==========================================

/**
 * Obtiene todas las categorías ordenadas por posición.
 */
export async function getCategories(supabase: SupabaseClient): Promise<CategoryDTO[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('position', { ascending: true });

  if (error) throw error;
  return (data || []).map(mapCategoryToDTO);
}

/**
 * Obtiene solo las categorías activas.
 */
export async function getActiveCategories(supabase: SupabaseClient): Promise<CategoryDTO[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('position', { ascending: true });

  if (error) throw error;
  return (data || []).map(mapCategoryToDTO);
}

/**
 * Crea una nueva categoría.
 */
export async function createCategory(supabase: SupabaseClient, category: Omit<Category, 'id' | 'created_at'>): Promise<CategoryDTO> {
  const { data, error } = await supabase
    .from('categories')
    .insert(category)
    .select('*')
    .single();

  if (error) throw error;
  return mapCategoryToDTO(data);
}

/**
 * Actualiza una categoría.
 */
export async function updateCategory(supabase: SupabaseClient, id: number, category: Partial<Category>): Promise<CategoryDTO> {
  const { data, error } = await supabase
    .from('categories')
    .update(category)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return mapCategoryToDTO(data);
}

/**
 * Elimina una categoría.
 */
export async function deleteCategory(supabase: SupabaseClient, id: number): Promise<void> {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ==========================================
// 3. PRODUCTS SERVICES
// ==========================================

/**
 * Obtiene la lista completa de productos junto con sus categorías y variantes.
 */
export async function getProducts(supabase: SupabaseClient): Promise<ProductDTO[]> {
  // 1. Obtener productos con relación a la categoría
  const { data: rawProducts, error: pError } = await supabase
    .from('products')
    .select('*, categories(*)')
    .order('created_at', { ascending: false });

  if (pError) throw pError;
  if (!rawProducts || rawProducts.length === 0) return [];

  // 2. Obtener todas las variantes de una sola vez
  const productIds = rawProducts.map(p => p.id);
  const { data: rawVariants, error: vError } = await supabase
    .from('product_variants')
    .select('*')
    .in('product_id', productIds);

  if (vError) throw vError;

  // 3. Mapear cada producto vinculando sus variantes
  return rawProducts.map(p => {
    const productVariants = (rawVariants || []).filter(v => v.product_id === p.id);
    return mapProductToDTO(p, productVariants);
  });
}

/**
 * Obtiene un producto por su slug único con su categoría y variantes.
 */
export async function getProductBySlug(supabase: SupabaseClient, slug: string): Promise<ProductDTO | null> {
  // 1. Obtener producto
  const { data: product, error: pError } = await supabase
    .from('products')
    .select('*, categories(*)')
    .eq('slug', slug)
    .single();

  if (pError || !product) return null;

  // 2. Obtener variantes del producto
  const { data: rawVariants, error: vError } = await supabase
    .from('product_variants')
    .select('*')
    .eq('product_id', product.id);

  if (vError) throw vError;

  return mapProductToDTO(product, rawVariants || []);
}

/**
 * Obtiene productos en oferta.
 */
export async function getSaleProducts(supabase: SupabaseClient, limitNumber: number = 4): Promise<ProductDTO[]> {
  const { data: rawProducts, error: pError } = await supabase
    .from('products')
    .select('*, categories(*)')
    .gt('compare_at_price', 0)
    .order('created_at', { ascending: false })
    .limit(limitNumber);

  if (pError) throw pError;
  if (!rawProducts || rawProducts.length === 0) return [];

  const productIds = rawProducts.map(p => p.id);
  const { data: rawVariants, error: vError } = await supabase
    .from('product_variants')
    .select('*')
    .in('product_id', productIds);

  if (vError) throw vError;

  return rawProducts.map(p => {
    const productVariants = (rawVariants || []).filter(v => v.product_id === p.id);
    return mapProductToDTO(p, productVariants);
  });
}

/**
 * Obtiene productos por el slug de su categoría.
 */
export async function getProductsByCategory(supabase: SupabaseClient, categorySlug: string): Promise<ProductDTO[]> {
  // 1. Obtener la categoría primero
  const { data: category, error: cError } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', categorySlug)
    .eq('is_active', true)
    .single();

  if (cError || !category) return [];

  // 2. Obtener productos de esa categoría
  const { data: rawProducts, error: pError } = await supabase
    .from('products')
    .select('*, categories(*)')
    .eq('category_id', category.id)
    .order('created_at', { ascending: false });

  if (pError) throw pError;
  if (!rawProducts || rawProducts.length === 0) return [];

  const productIds = rawProducts.map(p => p.id);
  const { data: rawVariants, error: vError } = await supabase
    .from('product_variants')
    .select('*')
    .in('product_id', productIds);

  if (vError) throw vError;

  return rawProducts.map(p => {
    const productVariants = (rawVariants || []).filter(v => v.product_id === p.id);
    return mapProductToDTO(p, productVariants);
  });
}

/**
 * Crea un nuevo producto.
 */
export async function createProduct(supabase: SupabaseClient, product: Omit<Product, 'id' | 'created_at'>): Promise<ProductDTO> {
  const { data, error } = await supabase
    .from('products')
    .insert(product)
    .select('*, categories(*)')
    .single();

  if (error) throw error;
  return mapProductToDTO(data, []);
}

/**
 * Actualiza un producto existente.
 */
export async function updateProduct(supabase: SupabaseClient, id: string, product: Partial<Product>): Promise<ProductDTO> {
  const { data, error } = await supabase
    .from('products')
    .update(product)
    .eq('id', id)
    .select('*, categories(*)')
    .single();

  if (error) throw error;

  const { data: rawVariants } = await supabase
    .from('product_variants')
    .select('*')
    .eq('product_id', id);

  return mapProductToDTO(data, rawVariants || []);
}

/**
 * Elimina un producto.
 */
export async function deleteProduct(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ==========================================
// 4. PRODUCT VARIANTS SERVICES
// ==========================================

/**
 * Obtiene todas las variantes de un producto por su ID.
 */
export async function getProductVariants(supabase: SupabaseClient, productId: string): Promise<ProductVariantDTO[]> {
  const { data, error } = await supabase
    .from('product_variants')
    .select('*')
    .eq('product_id', productId);

  if (error) throw error;

  // Requerimos los precios del producto base para mapear los fallbacks si no hay overrides
  const { data: product } = await supabase
    .from('products')
    .select('price, cost_price')
    .eq('id', productId)
    .single();

  const basePrice = product?.price ? Number(product.price) : 0;
  const baseCost = product?.cost_price ? Number(product.cost_price) : 0;

  return (data || []).map(v => mapVariantToDTO(v, basePrice, baseCost));
}

/**
 * Inserta o actualiza una variante de producto.
 */
export async function upsertProductVariant(
  supabase: SupabaseClient,
  variant: Omit<ProductVariant, 'id' | 'created_at'>
): Promise<ProductVariantDTO> {
  const { data, error } = await supabase
    .from('product_variants')
    .upsert(variant, { onConflict: 'product_id, size' })
    .select('*')
    .single();

  if (error) throw error;

  const { data: product } = await supabase
    .from('products')
    .select('price, cost_price')
    .eq('id', variant.product_id)
    .single();

  const basePrice = product?.price ? Number(product.price) : 0;
  const baseCost = product?.cost_price ? Number(product.cost_price) : 0;

  return mapVariantToDTO(data, basePrice, baseCost);
}

/**
 * Elimina una variante de producto.
 */
export async function deleteProductVariant(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase
    .from('product_variants')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Busca productos por nombre (búsqueda predictiva/sugerencias).
 */
export async function searchProducts(supabase: SupabaseClient, query: string, limitNumber: number = 5): Promise<ProductDTO[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*, categories(*)')
    .ilike('name', `%${query}%`)
    .limit(limitNumber);

  if (error) throw error;
  if (!data) return [];

  const productIds = data.map(p => p.id);
  const { data: rawVariants } = await supabase
    .from('product_variants')
    .select('*')
    .in('product_id', productIds);

  return data.map(p => {
    const productVariants = (rawVariants || []).filter(v => v.product_id === p.id);
    return mapProductToDTO(p, productVariants);
  });
}

/**
 * Obtiene solo los slugs y fechas de creación de los productos para la generación eficiente del sitemap.
 */
export async function getProductSlugs(supabase: SupabaseClient): Promise<{ slug: string; createdAt: string }[]> {
  const { data, error } = await supabase
    .from('products')
    .select('slug, created_at')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(p => ({
    slug: p.slug,
    createdAt: p.created_at
  }));
}
