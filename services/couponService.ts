import { SupabaseClient } from '@supabase/supabase-js';

export interface Coupon {
  id: number;
  code: string;
  type: 'percent' | 'fixed' | 'shipping';
  value: number;
  is_active: boolean;
  used_count: number;
  min_purchase: number;
}

/**
 * Obtiene un cupón por su código y estado activo.
 */
export async function getActiveCouponByCode(supabase: SupabaseClient, code: string): Promise<Coupon | null> {
  const cleanCode = code.toUpperCase().trim();
  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('code', cleanCode)
    .eq('is_active', true)
    .single();

  if (error) return null;
  return data as Coupon;
}

/**
 * Verifica si un usuario ya ha utilizado un cupón específico.
 */
export async function hasUserUsedCoupon(
  supabase: SupabaseClient, 
  userId: string, 
  couponId: number
): Promise<boolean> {
  const { data, error } = await supabase
    .from('coupon_usage')
    .select('id')
    .eq('coupon_id', couponId)
    .eq('user_id', userId)
    .limit(1);

  if (error || !data) return false;
  return data.length > 0;
}

/**
 * Registra el uso de un cupón e incrementa su contador de usos.
 */
export async function registerCouponUsage(
  supabase: SupabaseClient,
  params: {
    couponId: number;
    userId: string;
    orderId: string;
    currentUsedCount: number;
  }
): Promise<void> {
  // 1. Insertar el historial en coupon_usage
  const { error: usageError } = await supabase.from('coupon_usage').insert({
    coupon_id: params.couponId,
    user_id: params.userId,
    order_id: params.orderId
  });

  if (usageError) throw usageError;

  // 2. Incrementar el contador de usos en la tabla coupons
  const { error: updateError } = await supabase
    .from('coupons')
    .update({ used_count: params.currentUsedCount + 1 })
    .eq('id', params.couponId);

  if (updateError) throw updateError;
}

/**
 * Verifica si un cupón ya ha sido registrado para una orden específica (evitar duplicados).
 */
export async function isCouponRegisteredForOrder(
  supabase: SupabaseClient,
  orderId: string,
  couponId: number
): Promise<boolean> {
  const { data, error } = await supabase
    .from('coupon_usage')
    .select('id')
    .eq('order_id', orderId)
    .eq('coupon_id', couponId)
    .maybeSingle();

  if (error || !data) return false;
  return true;
}
