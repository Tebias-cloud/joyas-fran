import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_EMAIL } from '@/lib/config';

export async function proxy(request: NextRequest) {
  // 1. Crear una respuesta inicial
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // 2. Configurar el cliente de Supabase para Middleware/Proxy
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 3. Verificar sesión del usuario de forma segura
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 4. Proteger Rutas Privadas
  const protectedRoutes = ['/checkout', '/cuenta', '/admin'];
  const isProtectedRoute = protectedRoutes.some((route) => 
    request.nextUrl.pathname.startsWith(route)
  );

  if (isProtectedRoute && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/login';
    redirectUrl.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // 5. Protección Admin por Rol en Supabase
  // Si el usuario tiene el rol 'admin' en su metadata de Supabase, se le permite el acceso.
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const isUserAdmin = user?.app_metadata?.role === 'admin';

    console.log("🔍 [DEBUG PROXY] Intentando entrar a /admin:");
    console.log("   - User Email:", user?.email);
    console.log("   - Rol en Supabase:", user?.app_metadata?.role);
    console.log("   - ¿Es Administrador?:", isUserAdmin);

    if (!isUserAdmin) {
      console.log("   - [ACCESO DENEGADO] Redirigiendo a /");
      return NextResponse.redirect(new URL('/', request.url));
    }
    console.log("   - [ACCESO PERMITIDO] Entrando a /admin");
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Coincide con todas las rutas excepto:
     * - api (rutas de backend)
     * - _next/static (archivos estáticos)
     * - _next/image (optimización de imágenes)
     * - favicon.ico (icono)
     * - Imágenes públicas (svg, png, jpg, etc)
     */
    '/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
