import 'server-only';

import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ADMIN_EMAIL } from '@/lib/config';

export async function isAdminRequest(): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return false;

  return user.app_metadata?.role === 'admin' ||
    Boolean(ADMIN_EMAIL && user.email === ADMIN_EMAIL);
}
