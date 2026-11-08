import {
  canAccessVolunteerApp,
  createSupabaseProxyClient,
  isVolunteerPublicPath,
  loadAccessContext,
  volunteerLoginPath,
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

export default async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const intlResponse = handleI18n(request);

  if (isVolunteerPublicPath(pathname)) {
    return intlResponse;
  }

  const supabase = createSupabaseProxyClient(request, intlResponse);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const access = await loadAccessContext(supabase, user?.id);
  if (!canAccessVolunteerApp(access)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = volunteerLoginPath();
    loginUrl.searchParams.set("next", pathname);
    return redirectWithCookies(loginUrl, intlResponse);
  }

  return intlResponse;
}

export const config = {
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
