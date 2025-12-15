import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { localePrefix, locales } from './navigation';

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale: 'en',
  localePrefix
});

const publicPages = ['/', '/login', '/signup'];

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Run i18n middleware first to handle locale prefixes
  const response = intlMiddleware(req);

  // 2. Check for Auth Token
  const token = req.cookies.get('access_token')?.value;

  // Remove locale prefix to check against publicPages
  // e.g. /en/login -> /login
  const pathnameWithoutLocale = pathname.replace(/^\/(en|ko)/, '') || '/';

  const isPublicPage = publicPages.includes(pathnameWithoutLocale);

  // 3. Auth Logic
  if (token) {
    // If authenticated and trying to access login/signup, redirect to dashboard
    if (pathnameWithoutLocale === '/login' || pathnameWithoutLocale === '/signup') {
      const dashboardUrl = new URL('/dashboard', req.url);
      // Keep locale if present
      const locale = pathname.match(/^\/(en|ko)/)?.[1];
      if (locale) {
        dashboardUrl.pathname = `/${locale}/dashboard`;
      }
      return NextResponse.redirect(dashboardUrl);
    }
  } else {
    // If not authenticated and trying to access protected page
    if (!isPublicPage) {
      const loginUrl = new URL('/login', req.url);
      // Keep locale if present
      const locale = pathname.match(/^\/(en|ko)/)?.[1];
      if (locale) {
        loginUrl.pathname = `/${locale}/login`;
      }
      return NextResponse.redirect(loginUrl);
    }
  }

  return response;
}

export const config = {
  // Match all pathnames except for
  // - … if they start with `/api`, `/_next` or `/_vercel`
  // - … the ones containing a dot (e.g. `favicon.ico`)
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
