import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() valida el JWT contra Supabase — más seguro que getSession()
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Rutas públicas: siempre permitidas
  if (pathname === "/" || pathname.startsWith("/auth/")) {
    return response;
  }

  // Sin sesión → redirigir al login
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  const role: string = user.app_metadata?.role ?? "";
  const distSlug: string = user.app_metadata?.distributor_slug ?? "";

  // GERENTE: accede a /dashboard/*, bloqueado en /distribuidor/*
  if (role === "gerente") {
    if (pathname.startsWith("/distribuidor/")) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return response;
  }

  // DISTRIBUIDOR: accede a su propio /distribuidor/[slug]/*, bloqueado en /dashboard
  if (role === "distribuidor") {
    if (pathname.startsWith("/dashboard")) {
      return NextResponse.redirect(new URL(`/distribuidor/${distSlug}`, request.url));
    }
    if (pathname.startsWith("/distribuidor/")) {
      const urlSlug = pathname.split("/")[2] ?? "";
      if (urlSlug !== distSlug) {
        return NextResponse.redirect(new URL(`/distribuidor/${distSlug}`, request.url));
      }
    }
    return response;
  }

  // Rol desconocido → login
  return NextResponse.redirect(new URL("/", request.url));
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
