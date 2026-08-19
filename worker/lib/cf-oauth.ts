/**
 * Cloudflare OAuth2 PKCE for wizard auth (optional — requires operator OAuth app).
 * Default wrangler public client only allows localhost redirects (installer path).
 */
const DEFAULT_CLIENT_ID = '54d11594-84e4-41aa-b438-e81b8fa78ee7';
const OAUTH_AUTH_URL = 'https://dash.cloudflare.com/oauth2/auth';
const OAUTH_TOKEN_URL = 'https://dash.cloudflare.com/oauth2/token';
const OAUTH_SCOPES = [
  'account:read',
  'user:read',
  'workers:write',
  'workers_scripts:write',
  'd1:write',
  'zone:read',
];

function b64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function genOAuthState(): string {
  return b64Url(crypto.getRandomValues(new Uint8Array(32)));
}

export function genCodeVerifier(): string {
  return b64Url(crypto.getRandomValues(new Uint8Array(32)));
}

export async function genCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return b64Url(new Uint8Array(hash));
}

export type OAuthConfig = {
  clientId: string;
  redirectUri: string;
};

export async function buildAuthorizeUrl(
  cfg: OAuthConfig,
  state: string,
  verifier: string
): Promise<string> {
  const challenge = await genCodeChallenge(verifier);
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    response_type: 'code',
    redirect_uri: cfg.redirectUri,
    scope: OAUTH_SCOPES.join(' '),
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });
  return `${OAUTH_AUTH_URL}?${params.toString()}`;
}

export async function exchangeOAuthCode(
  cfg: OAuthConfig,
  code: string,
  verifier: string
): Promise<{ access_token: string; refresh_token?: string }> {
  const body = new URLSearchParams({
    client_id: cfg.clientId,
    code,
    code_verifier: verifier,
    redirect_uri: cfg.redirectUri,
    grant_type: 'authorization_code',
  });
  const res = await fetch(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || `OAuth token HTTP ${res.status}`);
  }
  return { access_token: data.access_token, refresh_token: data.refresh_token };
}

export async function readOAuthClientId(db: D1Database): Promise<string> {
  const row = await db
    .prepare('SELECT v FROM kvstore WHERE k = ?')
    .bind('wizard.oauth_client_id')
    .first<{ v: string }>();
  return (row?.v || DEFAULT_CLIENT_ID).trim();
}
