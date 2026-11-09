import {
  adminLoginPath,
  adminUnauthorizedPath,
  canAccessAdminApp,
  createSupabaseProxyClient,
  isAdminPublicPath,
  isAdminUnauthorizedPath,
  loadAccessContext,
} from "@eldersafe/shared";
import createIntlMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const handleI18n = createIntlMiddleware(routing);

function redirectWithCookies(url: URL, from: NextResponse) {
  const redirect = NextResponse.redirect(url);
  for (const cookie of from.cookies.getAll()) {
    redirect.cookies.set(cookie);
  }
  return redirect;
}

function pathnameWithoutLocale(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);
  if ((routing.locales as readonly string[]).includes(parts[0] ?? "")) {
    const rest = parts.slice(1).join("/");
    return rest ? `/${rest}` : "/";
  }
  return pathname || "/";
}

function localizedPath(request: NextRequest, path: string) {
  const url = request.nextUrl.clone();
  const parts = request.nextUrl.pathname.split("/").filter(Boolean);
  const maybeLocale = parts[0];
  const hasLocale = (routing.locales as readonly string[]).includes(
    maybeLocale ?? "",
  );
  url.pathname = hasLocale ? `/${maybeLocale}${path}` : path;
  url.search = "";
  return url;
}

function firstIsLogin(pathname: string): boolean {
  const parts = pathname.split("/").filter(Boolean);
  const segment = (routing.locales as readonly string[]).includes(parts[0] ?? "")
    ? parts[1]
    : parts[0];
  return segment === "login";
}

export default async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const intlResponse = handleI18n(request);

  const supabase = createSupabaseProxyClient(request, intlResponse);
  const {
    data: { user },
  } = supabase
    ? await supabase.auth.getUser()
    : { data: { user: null } };

  const access = supabase
    ? await loadAccessContext(supabase, user?.id)
    : { userId: null, role: null, approvalStatus: null };

  if (isAdminPublicPath(pathname)) {
    if (canAccessAdminApp(access) && firstIsLogin(pathname)) {
      return redirectWithCookies(localizedPath(request, "/"), intlResponse);
    }
    return intlResponse;
  }

  if (isAdminUnauthorizedPath(pathname)) {
    if (canAccessAdminApp(access)) {
      return redirectWithCookies(localizedPath(request, "/"), intlResponse);
    }
    if (!user) {
      return redirectWithCookies(
        localizedPath(request, adminLoginPath()),
        intlResponse,
      );
    }
    return intlResponse;
  }

  if (!supabase || !user) {
    const loginUrl = localizedPath(request, adminLoginPath());
    loginUrl.searchParams.set("next", pathnameWithoutLocale(pathname));
    return redirectWithCookies(loginUrl, intlResponse);
  }

  if (!canAccessAdminApp(access)) {
    return redirectWithCookies(
      localizedPath(request, adminUnauthorizedPath()),
      intlResponse,
    );
  }

  return intlResponse;
}

export const config = {
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
