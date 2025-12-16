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

  // 1. Run i18n middleware first to handle locale detection (cookies/headers)
  const response = intlMiddleware(req);

  // 2. Check for Auth Token
  const token = req.cookies.get('access_token')?.value;

  const isPublicPage = publicPages.includes(pathname);

  // 3. Auth Logic
  if (token) {
    // If authenticated and trying to access login/signup, redirect to dashboard
    if (pathname === '/login' || pathname === '/signup') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  } else {
    // If not authenticated and trying to access protected page
    if (!isPublicPage) {
      return NextResponse.redirect(new URL('/login', req.url));
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
