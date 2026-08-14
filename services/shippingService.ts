import { SupabaseClient } from '@supabase/supabase-js';

export interface ShippingRate {
  region: string;
  price: number;
  days: string;
}

/**
 * Obtiene la tarifa de envío para una región específica de la base de datos.
 */
export async function getShippingRateByRegion(
  supabase: SupabaseClient, 
  region: string
): Promise<ShippingRate | null> {
  const { data, error } = await supabase
    .from('shipping_rates')
    .select('region, price, days')
    .eq('region', region)
    .single();

  if (error || !data) return null;
  return data as ShippingRate;
}
