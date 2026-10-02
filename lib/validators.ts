import { z } from 'zod';

// ==========================================
// 1. SCHEMAS DE CHECKOUT & ORDENES
// ==========================================

export const ShippingInfoSchema = z.object({
  firstName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  lastName: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
  phone: z.string().min(8, 'Teléfono inválido').regex(/^[0-9+ ]+$/, 'Formato de teléfono inválido'),
  address: z.string().min(5, 'La dirección debe ser detallada'),
  apartment: z.string().optional().nullable(),
  region: z.string().min(2, 'Debe ingresar la región'),
  city: z.string().min(2, 'Debe ingresar la comuna/ciudad'),
  rut: z.string().optional().nullable(),
  shipping_method: z.enum(['shipping', 'pickup']).default('shipping'),
  shipping_cost: z.number().nonnegative().optional()
});

export const DiscountInfoSchema = z.object({
  code: z.string().min(1),
  type: z.enum(['percent', 'fixed', 'shipping']),
  value: z.number().positive(),
  amount: z.number().nonnegative()
}).nullable().optional();

export const OrderItemSchema = z.object({
  id: z.string().uuid('ID de producto inválido'),
  name: z.string().min(1),
  price: z.number().positive('El precio debe ser mayor a cero'),
  quantity: z.number().int().positive('La cantidad debe ser mayor a cero'),
  image_url: z.string().url('Formato de imagen inválido').or(z.string().min(1)),
  selectedSize: z.string().min(1, 'Debe seleccionar una talla')
});

export const CheckoutRequestSchema = z.object({
  items: z.array(OrderItemSchema).min(1, 'El carro de compras no puede estar vacío'),
  shippingInfo: ShippingInfoSchema,
  discountInfo: DiscountInfoSchema
});

// ==========================================
// 2. SCHEMAS DE PRODUCTOS Y CATEGORÍAS (ADMIN)
// ==========================================

export const CategoryCreateSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  slug: z.string().min(2, 'El slug debe tener al menos 2 caracteres').regex(/^[a-z0-9-]+$/, 'El slug debe contener solo minúsculas, números y guiones'),
  description: z.string().optional().nullable(),
  image_url: z.string().url('URL de imagen inválida').or(z.string().min(1)).optional().nullable(),
  is_active: z.boolean().default(true),
  position: z.number().int().default(0)
});

export const ProductVariantCreateSchema = z.object({
  sku: z.string().min(3, 'SKU debe tener al menos 3 caracteres'),
  size: z.string().min(1, 'La talla es requerida'),
  stock: z.number().int().nonnegative('El stock no puede ser negativo'),
  price_override: z.number().positive('El precio debe ser positivo').optional().nullable(),
  cost_price: z.number().nonnegative('El costo no puede ser negativo').optional().nullable()
});

export const ProductCreateSchema = z.object({
  name: z.string().min(3, 'El nombre del producto debe tener al menos 3 caracteres'),
  price: z.number().positive('El precio debe ser positivo'),
  compare_at_price: z.number().positive('El precio comparativo debe ser positivo').optional().nullable(),
  image_url: z.string().url('URL de imagen inválida').or(z.string().min(1)),
  images: z.array(z.string()).optional().default([]),
  stock: z.number().int().nonnegative('El stock no puede ser negativo').default(0),
  slug: z.string().min(3, 'El slug debe tener al menos 3 caracteres').regex(/^[a-z0-9-]+$/, 'El slug debe contener solo minúsculas, números y guiones'),
  description: z.string().optional().nullable(),
  category_id: z.number().int().positive('Debe seleccionar una categoría').optional().nullable(),
  sku: z.string().min(3, 'SKU es requerido').optional().nullable(),
  supplier_code: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  brand: z.string().default('Joyas Fran'),
  collection: z.string().optional().nullable(),
  material: z.string().default('Por confirmar'),
  cost_price: z.number().nonnegative('El costo no puede ser negativo').default(0),
  is_featured: z.boolean().default(false),
  is_new: z.boolean().default(false),
  meta_title: z.string().optional().nullable(),
  meta_description: z.string().optional().nullable()
});

// ==========================================
// 3. SCHEMAS DE CUPONES Y DESCUENTOS
// ==========================================

export const ValidateCouponRequestSchema = z.object({
  code: z.string().min(1, 'El código de cupón es requerido'),
  cartTotal: z.number().nonnegative('El total del carro no puede ser negativo'),
  userId: z.string().optional().nullable()
});

export const ValidateShippingRequestSchema = z.object({
  region: z.string().min(1, 'La región es requerida'),
  city: z.string().min(1, 'La ciudad/comuna es requerida'),
  cartTotal: z.number().nonnegative('El total del carro no puede ser negativo')
});
