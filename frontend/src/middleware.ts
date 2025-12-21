import { clerkMiddleware } from '@clerk/nextjs/server';
import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import { localePrefix, locales } from './navigation';

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale: 'en',
  localePrefix
});

const publicPages = ['/', '/login', '/signup'];

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;

  // 1. Run i18n middleware first to handle locale detection (cookies/headers)
  // intlMiddleware returns a response with the locale header/cookie set.
  // We will return this response at the end, unless we redirect.
  const response = intlMiddleware(req);

  // 2. Check for Legacy Auth Token
  const legacyToken = req.cookies.get('access_token')?.value;

  // 3. Check for Clerk Auth
  const { userId } = await auth();

  const isPublicPage = publicPages.includes(pathname);

  // 4. Combined Auth Logic
  const isAuthenticated = !!legacyToken || !!userId;

  if (isAuthenticated) {
    // If authenticated and trying to access login/signup, redirect to dashboard
    if (pathname === '/login' || pathname === '/signup') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  } else {
    // If not authenticated and trying to access protected page
    if (!isPublicPage) {
      // If we are strictly Clerk-only, we might want to redirect to Clerk?
      // But for now, ensuring redirection to our /login page covers both cases (UI handles choice)
      // NOTE: If using Clerk Protected Components, they might handle redirect themselves inside the page,
      // but blocking at middleware is safer.
      const loginUrl = new URL('/login', req.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return response;
});

export const config = {
  matcher: [
    // Match all pathnames except for
    // - … if they start with `/api`, `/_next` or `/_vercel`
    // - … the ones containing a dot (e.g. `favicon.ico`)
    '/((?!api|_next|_vercel|.*\\..*).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ]
};
