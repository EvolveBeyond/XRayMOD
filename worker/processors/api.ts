/**
 * API processor — routes API requests to handlers by resource.
 * Independent processor — add new resources without touching router.
 */
import type { Env, Intent } from '../intent';
import { handleLogin } from '../api/login';
import { handleLogout } from '../api/logout';
import { handleHealth } from '../api/health';
import { handleNodes } from '../api/nodes';
import { handleUsers } from '../api/users';
import { handleProtocols } from '../api/protocols';
import { handleConfigs } from '../api/configs';
import { handleSettings } from '../api/settings';
import { handleCleanIP } from '../api/cleanip';
import { handleBackends } from '../api/backends';
import { handleWizard } from '../api/wizard';

type Handler = (
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  params: Record<string, string>
) => Promise<Response>;

const apiHandlers: Record<string, Handler> = {
  login: handleLogin,
  logout: handleLogout,
  health: handleHealth,
  nodes: handleNodes,
  users: handleUsers,
  protocols: handleProtocols,
  configs: handleConfigs,
  settings: handleSettings,
  cleanip: handleCleanIP,
  backends: handleBackends,
  wizard: handleWizard,
};

export const apiProcessor = async (
  intent: Intent,
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response | null> => {
  if (intent.type !== 'api') return null;

  const handler = apiHandlers[intent.resource];
  if (!handler) return null;

  const params: Record<string, string> = {};
  if (intent.action) params.id = intent.action;

  return handler(request, env, ctx, params);
};
