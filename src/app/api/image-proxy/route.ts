import { NextRequest } from 'next/server';

const ALLOWED_HOSTS = new Set([
  // Provider image hosting observed in API responses.
  'api.xuancat.cn',
]);

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get('url');
  if (!rawUrl) {
    return new Response('Missing url', { status: 400 });
  }

  let upstream: URL;
  try {
    upstream = new URL(rawUrl);
  } catch {
    return new Response('Invalid url', { status: 400 });
  }

  if (upstream.protocol !== 'https:') {
    return new Response('Only https urls are allowed', { status: 400 });
  }

  if (!ALLOWED_HOSTS.has(upstream.hostname)) {
    return new Response('Host not allowed', { status: 403 });
  }

  try {
    const res = await fetch(upstream.toString(), {
      method: 'GET',
      // Avoid hanging connections from the upstream image host.
      signal: AbortSignal.timeout(15_000),
      redirect: 'follow',
      headers: {
        // Some hosts are picky about default user agents.
        'user-agent': 'petpoker-image-proxy/1.0',
      },
    });

    if (!res.ok) {
      return new Response(`Upstream error: ${res.status}`, { status: 502 });
    }

    const contentType = res.headers.get('content-type') || 'application/octet-stream';
    const cacheControl = res.headers.get('cache-control');

    const headers = new Headers();
    headers.set('content-type', contentType);
    headers.set('x-content-type-options', 'nosniff');

    // If upstream doesn't specify caching, cache for a short period to avoid refetching.
    headers.set('cache-control', cacheControl || 'public, max-age=3600');

    return new Response(res.body, { status: 200, headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Proxy fetch failed';
    return new Response(message, { status: 504 });
  }
}

