export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  position: number;
  meta_title: string | null;
  meta_description: string | null;
  created_at: string;
}

export interface CategoryDTO {
  id: number;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  position: number;
  isActive: boolean;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  sku: string;
  size: string;
  stock: number;
  price_override?: number | null;
  cost_price?: number | null;
  created_at: string;
}

export interface ProductVariantDTO {
  id: string;
  sku: string;
  size: string;
  stock: number;
  price: number;
  costPrice: number;
}

export interface ProductInventory {
  [size: string]: number;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  compare_at_price?: number | null;
  image_url: string;
  images?: string[];
  stock: number;
  slug: string;
  description?: string | null;
  category_id?: number | null;
  category?: string | null;
  sizes?: string[];
  inventory?: ProductInventory;
  sku?: string | null;
  supplier_code?: string | null;
  barcode?: string | null;
  brand?: string | null;
  collection?: string | null;
  material?: string | null;
  cost_price?: number | null;
  is_featured?: boolean | null;
  is_new?: boolean | null;
  is_active?: boolean | null;
  meta_title?: string | null;
  meta_description?: string | null;
  created_at: string;
}

export interface ProductDTO {
  id: string;
  name: string;
  price: number;
  compareAtPrice: number | null;
  imageUrl: string;
  images: string[];
  stock: number;
  slug: string;
  description: string;
  categoryId: number | null;
  categoryName: string;
  sizes: string[];
  inventory: ProductInventory;
  variants: ProductVariantDTO[];
  sku: string;
  supplierCode: string;
  barcode: string;
  brand: string;
  collection: string;
  material: string;
  costPrice: number;
  isFeatured: boolean;
  isNew: boolean;
  metaTitle: string;
  metaDescription: string;
  isLowStock: boolean;
  onSale: boolean;
  createdAt: string;
  isActive: boolean;
}
