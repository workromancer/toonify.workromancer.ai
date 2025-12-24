import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.INTERNAL_BACKEND_URL || 'http://localhost:8000';

async function proxyRequest(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const pathString = path.join('/');

  // Normalize BACKEND_URL
  const cleanBackendUrl = BACKEND_URL.replace(/\/api\/v1\/?$/, '').replace(/\/api\/?$/, '');
  const targetUrl = `${cleanBackendUrl}/api/${pathString}${request.nextUrl.search}`;



  try {
    const requestHeaders = new Headers(request.headers);
    const authHeader = requestHeaders.get('Authorization');



    // Check if Auth header is missing or invalid (null, undefined, empty)
    const isAuthMissingOrInvalid =
      !authHeader ||
      authHeader === 'Bearer undefined' ||
      authHeader === 'Bearer null' ||
      authHeader.trim() === 'Bearer';

    if (isAuthMissingOrInvalid) {
      const cookieStore = await cookies();
      const token = cookieStore.get('access_token')?.value;
      if (token) {
        requestHeaders.set('Authorization', `Bearer ${token}`);
      }
    }

    const res = await fetch(targetUrl, {
      method: request.method,
      headers: requestHeaders,
      // Forward body for non-GET/HEAD requests
      body: (request.method !== 'GET' && request.method !== 'HEAD') ? request.body : undefined,
      // @ts-ignore
      duplex: 'half',
      cache: 'no-store',
      redirect: 'manual',
    });

    // Handle Redirects or Empty Body safely
    if (res.status === 204 || res.status >= 300) {
      // Rewrite Location header if it points to backend (to keep client on proxy domain)
      if (res.status >= 300 && res.headers.has('location')) {
        const location = res.headers.get('location');
        if (location && (location.includes(BACKEND_URL) || location.includes('localhost:8000'))) {
          // Replace Backend Origin with Proxy Path
          // Backend returns: http://localhost:8000/api/v1/projects/
          // Client expects: /api/v1/projects/ (relative) or http://localhost:3000/api/v1/projects/

          // We can just make it relative path if it matches the pattern
          // Assumes backend path starts with /api/v1 or similar
          let newLocation = location;
          const backendOrigin = new URL(BACKEND_URL).origin;
          if (location.startsWith(backendOrigin)) {
            newLocation = location.replace(backendOrigin, ''); // e.g. /api/v1/projects/
            // Ensure it starts with /api/v1 if backend mounts it there
            // If we are at /api/v1 proxy, rewriting to /api/v1/... is correct.
          }

          // If the proxy is mounted at /api, and backend at /api/v1, we need to be careful.
          // But we mapped /api -> /api/v1 logic in config?
          // "Maps to frontend/src/app/api/[...path] -> backend/api/v1"
          // Our proxy code: pathString = path.join('/')
          // If Client asks /api/v1/projects, path is v1/projects.
          // Target is .../api/v1/projects.

          // So if redirect returns /api/v1/projects/, using that relative path is correct.
          // The Next.js router handles /api/v1/...


          const responseHeaders = new Headers(res.headers);
          responseHeaders.set('location', newLocation);

          const contentLength = res.headers.get('content-length');
          if (!contentLength || contentLength === '0') {
            return new NextResponse(null, { status: res.status, headers: responseHeaders });
          }

          // If body exists in redirect (unlikely but possible), let it fall through or handle here?
          // Usually 307 has no body or short body.
          // We return safely here for consistency if content-length 0

          // If there is content, we fall through to the text/json handling below? 
          // Better to return here if we modified headers.
          const text = await res.text();
          return new NextResponse(text, { status: res.status, headers: responseHeaders });
        }
      }

      const contentLength = res.headers.get('content-length');
      if (!contentLength || contentLength === '0') {
        return new NextResponse(null, { status: res.status, headers: res.headers });
      }
    }

    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    } else {
      const text = await res.text();
      return new NextResponse(text, { status: res.status, headers: res.headers });
    }
  } catch (error) {
    console.error(`[Proxy] Error forwarding request:`, error);
    return NextResponse.json({ error: 'Failed to proxy request' }, { status: 500 });
  }
}

export { proxyRequest as GET, proxyRequest as POST, proxyRequest as PUT, proxyRequest as DELETE, proxyRequest as PATCH };
