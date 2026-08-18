import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  // 1. Crear respuesta mutable que se pasará al siguiente handler
  //    y que también se usará para propagar las cookies renovadas al cliente.
  let supabaseResponse = NextResponse.next({
    request,
  });

  // 2. Configurar cliente Supabase SSR según patrón oficial
  //    https://supabase.com/docs/guides/auth/server-side/nextjs
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Propagar cookies a la request (para Server Components en la misma petición)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // Recrear la response con la request actualizada para que las cookies
          // lleguen también al cliente (refresco de sesión)
          supabaseResponse = NextResponse.next({ request });
          // Escribir cookies en la response final
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 3. IMPORTANTE: getUser() refresca el token si expiró.
  //    No usar getSession() aquí — es inseguro en proxy porque
  //    no valida el JWT contra el servidor de Supabase.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 4. Proteger rutas privadas
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

  // 5. Protección adicional de /admin — verificar rol de administrador
  //    ADMIN_EMAIL se lee exclusivamente desde el entorno del servidor.
  //    NO se expone al cliente.
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const adminEmail = process.env.ADMIN_EMAIL;
    const isUserAdmin =
      user?.app_metadata?.role === 'admin' ||
      (!!adminEmail && user?.email === adminEmail);

    if (!isUserAdmin) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // 6. Devolver la response con las cookies de sesión actualizadas
  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Coincide con todas las rutas excepto:
     * - api (rutas de backend — tienen su propio cliente SSR)
     * - _next/static (archivos estáticos)
     * - _next/image (optimización de imágenes)
     * - favicon.ico
     * - Imágenes públicas (svg, png, jpg, jpeg, gif, webp)
     */
    '/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
