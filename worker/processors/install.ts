/**
 * Install processor — handles /install page.
 */
import type { Env, Intent } from '../intent';
import { handleInstall } from '../install';

export const installProcessor = async (
  intent: Intent,
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response | null> => {
  if (intent.type !== 'install') return null;

  return handleInstall(request, env, ctx, {});
};
