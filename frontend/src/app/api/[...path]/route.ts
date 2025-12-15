import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.INTERNAL_BACKEND_URL || 'http://localhost:8000';

async function proxyRequest(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const pathString = path.join('/');

  // Construct the target URL
  const targetUrl = `${BACKEND_URL}/${pathString}${request.nextUrl.search}`;

  console.log(`[Proxy] Forwarding ${request.method} request to: ${targetUrl}`);

  try {
    const res = await fetch(targetUrl, {
      method: request.method,
      headers: {
        'Content-Type': request.headers.get('Content-Type') || 'application/json',
        // Forward Authorization header if present
        ...(request.headers.get('Authorization') ? { 'Authorization': request.headers.get('Authorization')! } : {}),
      },
      // Forward body for non-GET/HEAD requests
      body: (request.method !== 'GET' && request.method !== 'HEAD') ? request.body : undefined,
      // Required for streaming bodies in Node.js fetch
      // @ts-ignore - duplex is not in the standard RequestInit type yet but required for Node.js
      duplex: 'half',
      // Prevent caching for API requests
      // Prevent caching for API requests
      cache: 'no-store',
      // Manual redirect handling to support streaming bodies (return 307 to client)
      redirect: 'manual',
    });

    // Handle Redirects or Empty Body safely
    if (res.status === 204 || res.status >= 300) {
      // If 307/304/204 etc, likely no body or we should just pass it through
      // Check content-length
      const contentLength = res.headers.get('content-length');
      if (!contentLength || contentLength === '0') {
        return new NextResponse(null, { status: res.status, headers: res.headers });
      }
    }

    // Try to parse JSON only if it looks like JSON
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    } else {
      // Fallback for non-JSON responses (e.g. text/html errors or blobs)
      const text = await res.text();
      return new NextResponse(text, { status: res.status, headers: res.headers });
    }
  } catch (error) {
    console.error(`[Proxy] Error forwarding request:`, error);
    return NextResponse.json({ error: 'Failed to proxy request' }, { status: 500 });
  }
}

export { proxyRequest as GET, proxyRequest as POST, proxyRequest as PUT, proxyRequest as DELETE, proxyRequest as PATCH };
