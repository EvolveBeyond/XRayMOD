// gRPC transport handler for Cloudflare Workers
// Handles gRPC over HTTP/2 POST with Content-Type: application/grpc

export function isGrpcRequest(request: Request): boolean {
  const contentType = request.headers.get('Content-Type') || '';
  return contentType.startsWith('application/grpc');
}

export interface GrpcFrame {
  compressed: boolean;
  length: number;
  payload: Uint8Array;
}

export function parseGrpcFrame(buffer: ArrayBuffer): GrpcFrame | null {
  const view = new Uint8Array(buffer);
  if (view.length < 5) return null;

  const compressed = (view[0] & 0x01) === 1;
  const length = (view[1] << 24) | (view[2] << 16) | (view[3] << 8) | view[4];

  if (view.length < 5 + length) return null;

  return {
    compressed,
    length,
    payload: view.slice(5, 5 + length),
  };
}

export function buildGrpcFrame(payload: Uint8Array, compressed = false): Uint8Array {
  const frame = new Uint8Array(5 + payload.byteLength);
  frame[0] = compressed ? 1 : 0;
  frame[1] = (payload.byteLength >>> 24) & 0xFF;
  frame[2] = (payload.byteLength >>> 16) & 0xFF;
  frame[3] = (payload.byteLength >>> 8) & 0xFF;
  frame[4] = payload.byteLength & 0xFF;
  frame.set(payload, 5);
  return frame;
}

export function buildGrpcResponseHeaders(): Headers {
  return new Headers({
    'Content-Type': 'application/grpc',
    'grpc-status': '0',
  });
}
