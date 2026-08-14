import { SupabaseClient } from '@supabase/supabase-js';
import { Order, OrderDTO, OrderItem, ShippingInfo, DiscountInfo } from '@/types/order';

/**
 * Mapea una entidad de orden de base de datos a un DTO desacoplado para el frontend.
 */
export function mapOrderToDTO(order: Order): OrderDTO {
  return {
    id: order.id,
    userId: order.user_id,
    createdAt: order.created_at,
    totalAmount: order.total_amount,
    status: order.status,
    items: order.items || [],
    shippingInfo: order.shipping_info || {},
    discountInfo: order.discount_info || null,
    paymentId: order.payment_id || null
  };
}

/**
 * Obtiene una orden específica por su ID.
 */
export async function getOrderById(supabase: SupabaseClient, orderId: string): Promise<OrderDTO | null> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (error) return null;
  return data ? mapOrderToDTO(data) : null;
}

/**
 * Obtiene todas las órdenes asociadas a un ID de usuario específico.
 */
export async function getOrdersByUser(supabase: SupabaseClient, userId: string): Promise<OrderDTO[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapOrderToDTO);
}

/**
 * Llama al procedimiento almacenado para procesar la creación de una orden (Checkout).
 */
export async function processCheckout(
  supabase: SupabaseClient,
  params: {
    userId: string;
    items: OrderItem[];
    total: number;
    shippingInfo: ShippingInfo;
    discountInfo: DiscountInfo | null;
  }
): Promise<string> {
  const { data: orderId, error } = await supabase.rpc('process_checkout', {
    p_user_id: params.userId,
    p_items: params.items,
    p_total: params.total,
    p_shipping_info: params.shippingInfo,
    p_discount_info: params.discountInfo
  });

  if (error) throw new Error(error.message);
  return orderId;
}

/**
 * Obtiene la lista completa de órdenes (Vista de Administrador).
 */
export async function getOrders(supabase: SupabaseClient): Promise<OrderDTO[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapOrderToDTO);
}
