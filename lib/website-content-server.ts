import 'server-only';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { DEFAULT_WEBSITE_CONTENT, parseWebsiteContent } from '@/lib/website-content';

/** Only the public website key is returned, never the other store settings. */
export async function getWebsiteContent() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return structuredClone(DEFAULT_WEBSITE_CONTENT);
  const { data, error } = await supabaseAdmin.from('store_settings').select('value').eq('key', 'website').maybeSingle();
  if (error) console.error('No se pudo cargar el contenido de la página:', error.code);
  return parseWebsiteContent(data?.value);
}
