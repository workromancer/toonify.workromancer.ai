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
        cache: 'no-store',
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error(`[Proxy] Error forwarding request:`, error);
    return NextResponse.json({ error: 'Failed to proxy request' }, { status: 500 });
  }
}

export { proxyRequest as GET, proxyRequest as POST, proxyRequest as PUT, proxyRequest as DELETE, proxyRequest as PATCH };
