import type { Env } from './types';
import { handleRequest } from './router';
import { runScheduledEdgeOps } from './lib/edge-ops';
import { ensureSchema } from './schema';

function goneForever(): Response {
  return new Response('Not Found', {
    status: 404,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      Pragma: 'no-cache',
      Expires: '0',
      'Clear-Site-Data': '"cache"',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

/** Paths permanently removed from the product (Mini App / Telegram / store). */
function isPermanentlyRemoved(url: URL): boolean {
  const raw = url.pathname.toLowerCase();
  // Match both /twa/... and /{uuid}/twa/...
  const parts = raw.split('/').filter(Boolean);
  const idx = parts.findIndex((p) => p === 'twa' || p === 'bot' || p === 'commerce');
  if (idx === -1) return false;
  if (parts[idx] === 'commerce') {
    return idx > 0 && parts[idx - 1] === 'api';
  }
  return true;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      const url = new URL(request.url);
      if (isPermanentlyRemoved(url)) {
        return goneForever();
      }
      return await handleRequest(request, env, ctx);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('Uncaught worker error:', msg, e);
      // Never throw — CF 1101 is worse than a controlled 500
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Worker error',
          message: msg,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  },

  /** Nightly Auto Clean-IP + health-check (UTC 01:15) */
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(
      (async () => {
        try {
          await ensureSchema(env.DB);
          await runScheduledEdgeOps(env.DB);
        } catch (e) {
          console.error('scheduled edge ops failed', e);
        }
      })()
    );
  },
};
