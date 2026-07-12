/**
 * Subscription processor — handles /sub/:token links.
 */
import type { Env, Intent } from '../intent';
import { handleSubscription } from '../subscription';

export const subscriptionProcessor = async (
  intent: Intent,
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response | null> => {
  if (intent.type !== 'subscription') return null;

  return handleSubscription(request, env, ctx, { token: intent.token });
};
