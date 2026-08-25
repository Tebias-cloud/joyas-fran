/**
 * Tipos compartidos del Panel de Administración de Joyas Fran.
 * Todos los tabs del admin importan desde aquí.
 */

export type TabView = 'inicio' | 'pedidos' | 'productos' | 'categorias' | 'descuentos' | 'ajustes';
export type OrderStatus = 'Pagado' | 'Preparando' | 'Enviado' | 'Entregado';

export type SizeMap = Record<string, string[]>;
export type SettingValue = string[] | SizeMap;

export interface StoreSettingRow {
  key: string;
  value: SettingValue;
}

export interface Inventory { [size: string]: number; }

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  selectedSize: string;
  price: number;
  image_url: string;
}

export interface DBShippingInfo {
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  addressDetails?: string;
  apartment?: string;
  region: string;
  city: string;
  rut?: string;
  email?: string;
  shipping_method?: 'pickup' | 'shipping';
}

export interface DiscountInfo {
  code: string;
  type: string;
  value: number;
  amount: number;
}

export interface Order {
  id: string;
  created_at: string;
  user_id: string;
  total_amount: number;
  status: OrderStatus;
  items: OrderItem[];
  shipping_info: DBShippingInfo;
  discount_info?: DiscountInfo;
  email?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  compare_at_price: number | null;
  cost_price: number | null;
  category: string;
  category_id: number | null;
  image_url: string;
  images: string[];
  slug: string;
  inventory: Inventory;
  stock: number;
  sku: string;
  supplier_code: string;
  barcode: string;
  brand: string;
  collection: string;
  material: string;
  is_featured: boolean;
  is_new: boolean;
  is_active: boolean;
  meta_title: string;
  meta_description: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  is_active: boolean;
  position: number;
  meta_title: string;
  meta_description: string;
}

export interface Coupon {
  id: number;
  code: string;
  type: 'percent' | 'fixed' | 'shipping';
  value: number;
  min_purchase: number;
  is_active: boolean;
  used_count: number;
}

/** Estado del formulario de producto */
export interface ProductFormState {
  name: string;
  description: string;
  price: string;
  compare_at_price: string;
  cost_price: string;
  category_id: string;
  category: string;
  slug: string;
  sku: string;
  supplier_code: string;
  barcode: string;
  brand: string;
  collection: string;
  material: string;
  is_featured: boolean;
  is_new: boolean;
  is_active: boolean;
  meta_title: string;
  meta_description: string;
  images: string[];
  inventory: Inventory;
  variantPrices: Record<string, string>;
  variantCosts: Record<string, string>;
}

/** Resultado devuelto por la API del scanner de foto con IA */
export interface AIScanResult {
  name: string;
  description: string;
  category: string;
  category_id: number | null;
  material: string;
  collection: string | null;
  meta_title: string;
  meta_description: string;
}

/** Estado del formulario de categoría */
export interface CategoryFormState {
  name: string;
  slug: string;
  description: string;
  image_url: string;
  position: string;
  is_active: boolean;
  meta_title: string;
  meta_description: string;
}

/** Estado del formulario de cupón */
export interface CouponFormState {
  code: string;
  type: 'percent' | 'fixed' | 'shipping';
  value: string;
  min_purchase: string;
  is_active: boolean;
}
