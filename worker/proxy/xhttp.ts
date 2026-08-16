// XHTTP transport detection for Cloudflare Workers.
// Keep this narrow — broad Content-Type matching would steal normal API POSTs.

export function isXHTTPRequest(request: Request): boolean {
  if (request.method !== 'POST') return false;

  const path = new URL(request.url).pathname.toLowerCase();
  // Only treat as XHTTP when path looks like a proxy tunnel, not /api/*
  if (path.startsWith('/api/') || path.startsWith('/install')) {
    return false;
  }

  const xhttpHeader = request.headers.get('X-Session-Id') || request.headers.get('X-Padding');
  if (xhttpHeader) return true;

  const referer = request.headers.get('Referer') || '';
  if (referer.includes('x_padding')) return true;

  return false;
}
