import { createBrowserClient } from '@supabase/ssr';

// Creamos un cliente "singleton" para usar en toda la app
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);