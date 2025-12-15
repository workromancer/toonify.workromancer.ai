import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.INTERNAL_BACKEND_URL || 'http://localhost:8000';

async function proxyRequest(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const pathString = path.join('/');

  // Normalize BACKEND_URL
  const cleanBackendUrl = BACKEND_URL.replace(/\/api\/v1\/?$/, '').replace(/\/api\/?$/, '');
  const targetUrl = `${cleanBackendUrl}/api/${pathString}${request.nextUrl.search}`;

  console.log(`[Proxy] Forwarding ${request.method} request to: ${targetUrl}`);

  try {
    const requestHeaders = new Headers(request.headers);

    // Auto-attach Authorization from Cookie if header is missing
    if (!requestHeaders.has('Authorization')) {
      const cookieStore = await cookies();
      const token = cookieStore.get('access_token')?.value;
      if (token) {
        requestHeaders.set('Authorization', `Bearer ${token}`);
        console.log(`[Proxy] Attached token from cookie`);
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
