import type { Env } from './types';
import { handleRequest } from './router';
import { runScheduledEdgeOps } from './lib/edge-ops';
import { runAlertChecks } from './lib/alerts';
import { ensureSchema } from './schema';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
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
          await runAlertChecks(env);
        } catch (e) {
          console.error('scheduled edge ops failed', e);
        }
      })()
    );
  },
};
