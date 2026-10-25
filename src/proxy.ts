import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseClavePublica, supabaseUrl } from "@/lib/env";

/**
 * Refresca la sesión de Supabase en cada request del panel y redirige a
 * /login cuando no hay usuario. La verificación de rol se hace en los layouts.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl(), supabaseClavePublica(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const protegida = pathname.startsWith("/admin") || pathname.startsWith("/mesero");

  if (protegida && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("volver", pathname);
    return NextResponse.redirect(url);
  }

  if (pathname === "/login" && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/mesero/:path*", "/login"],
};
