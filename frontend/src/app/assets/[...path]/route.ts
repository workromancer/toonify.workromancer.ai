import { NextRequest, NextResponse } from 'next/server';

/**
 * GCS Asset Proxy
 * 
 * This route proxies requests to Google Cloud Storage for serving images.
 * In production, this allows serving GCS assets through the frontend domain
 * without exposing the GCS bucket directly or requiring public access.
 * 
 * URL Pattern: /assets/schema/identifier/filename.png
 * GCS URL: https://storage.googleapis.com/BUCKET_NAME/schema/identifier/filename.png
 */

const GCS_BUCKET = process.env.MINIO_BUCKET || 'toonify-prod-assets';
const GCS_BASE_URL = `https://storage.googleapis.com/${GCS_BUCKET}`;

// For local development with MinIO
const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT || 'localhost:9000';
const MINIO_SECURE = process.env.MINIO_SECURE === 'True' || process.env.MINIO_SECURE === 'true';
const STORAGE_TYPE = process.env.STORAGE_TYPE || 'minio';

function getStorageUrl(path: string): string {
  if (STORAGE_TYPE === 'gcs') {
    return `${GCS_BASE_URL}/${path}`;
  }
  // MinIO (local development)
  const protocol = MINIO_SECURE ? 'https' : 'http';
  return `${protocol}://${MINIO_ENDPOINT}/${GCS_BUCKET}/${path}`;
}

async function proxyAsset(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const pathString = path.join('/');
  
  const targetUrl = getStorageUrl(pathString);
  
  console.log(`[Asset Proxy] Forwarding: ${request.nextUrl.pathname} -> ${targetUrl}`);

  try {
    const res = await fetch(targetUrl, {
      method: 'GET',
      cache: 'force-cache', // Cache images for performance
      next: {
        revalidate: 86400, // Revalidate once per day
      },
    });

    if (!res.ok) {
      console.error(`[Asset Proxy] Failed to fetch ${targetUrl}: ${res.status} ${res.statusText}`);
      return new NextResponse(null, { status: res.status });
    }

    const contentType = res.headers.get('content-type') || 'image/png';
    const body = await res.arrayBuffer();

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error(`[Asset Proxy] Error fetching ${targetUrl}:`, error);
    return new NextResponse(null, { status: 500 });
  }
}

export { proxyAsset as GET };
