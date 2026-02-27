import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  // 1. Crear una respuesta inicial
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // 2. Configurar el cliente de Supabase para Middleware
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
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

  // 3. Verificar sesión del usuario
  // IMPORTANTE: Usamos getUser() para validar la sesión de forma segura
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

  // 5. Protección Admin (Opcional - Descomenta si quieres proteger /admin por email)
  /*
  const ADMIN_EMAIL = 'esteban.contacto14@gmail.com';
  if (request.nextUrl.pathname.startsWith('/admin') && user?.email !== ADMIN_EMAIL) {
     return NextResponse.redirect(new URL('/', request.url));
  }
  */

  return response;
}

export const config = {
  matcher: [
    /*
     * Coincide con todas las rutas excepto:
     * - api (rutas de backend) -> ¡ESTO ES LO QUE ARREGLA EL ERROR 404!
     * - _next/static (archivos estáticos)
     * - _next/image (optimización de imágenes)
     * - favicon.ico (icono)
     * - Imágenes públicas (svg, png, jpg, etc)
     */
    '/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};