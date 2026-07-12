// XHTTP transport handler for Cloudflare Workers
// XHTTP is an HTTP-based transport with chunked encoding

export function isXHTTPRequest(request: Request): boolean {
  const referer = request.headers.get('Referer') || '';
  if (referer.includes('x_padding')) return true;

  const contentType = request.headers.get('Content-Type') || '';
  if (contentType.includes('application/octet-stream') && request.method === 'POST') {
    // Heuristic: XHTTP often uses octet-stream with specific path patterns
    return true;
  }

  return false;
}
