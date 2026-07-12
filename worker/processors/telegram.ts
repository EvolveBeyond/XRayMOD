/**
 * Telegram processor — handles bot webhook and login.
 */
import type { Env, Intent } from '../intent';
import { handleTelegramWebhook, handleTelegramLogin } from '../telegram';

export const telegramProcessor = async (
  intent: Intent,
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response | null> => {
  if (intent.type !== 'telegram') return null;

  if (intent.endpoint === 'webhook') {
    return handleTelegramWebhook(request, env, ctx, {});
  }
  return handleTelegramLogin(request, env, ctx, {});
};
