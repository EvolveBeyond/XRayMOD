import type { Env, DisguiseConfig } from './types';

const EMPTY_DISGUISE: DisguiseConfig = {
  on: false,
  adminPath: '',
  loginPath: '',
  subPath: '',
  pubAdmin: '/admin',
  pubLogin: '/login',
  fallbackPage: '1101',
};

function cleanPath(v: string | undefined): string {
  return String(v || '')
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, '')
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 40);
}

export async function getDisguiseConfig(env: Env, db: D1Database): Promise<DisguiseConfig> {
  try {
    if (env.PANEL_RECOVERY === '1' || env.PANEL_RECOVERY === 'true') {
      return { ...EMPTY_DISGUISE };
    }

    const rows = await db
      .prepare('SELECT k, v FROM kvstore WHERE k LIKE ?')
      .bind('disguise.%')
      .all<{ k: string; v: string }>();

    const settings: Record<string, string> = {};
    for (const row of rows.results) {
      settings[row.k] = row.v;
    }

    const enabled = settings['disguise.enabled'] === 'true';

    const adminPath =
      cleanPath(env.ADMIN_PATH) || cleanPath(settings['disguise.admin_path']);
    const loginPath =
      cleanPath(env.LOGIN_PATH) || cleanPath(settings['disguise.login_path']);
    const subPath =
      cleanPath(env.SUB_PATH) || cleanPath(settings['disguise.sub_path']);

    const on =
      (enabled || !!(env.ADMIN_PATH || env.LOGIN_PATH || env.SUB_PATH)) &&
      !!(adminPath || loginPath || subPath);

    if (!on) {
      return { ...EMPTY_DISGUISE, fallbackPage: settings['disguise.fallback_page'] || '1101' };
    }

    return {
      on: true,
      adminPath,
      loginPath,
      subPath,
      pubAdmin: adminPath ? '/' + adminPath : '/admin',
      pubLogin: loginPath ? '/' + loginPath : '/login',
      fallbackPage: env.DISGUISE_PAGE || settings['disguise.fallback_page'] || '1101',
    };
  } catch {
    return { ...EMPTY_DISGUISE };
  }
}

export function remapDisguisePath(
  pathname: string,
  config: DisguiseConfig
): { remapped: string; isDecoy: boolean } {
  if (!config.on) {
    return { remapped: pathname, isDecoy: false };
  }

  const clean = pathname.toLowerCase().replace(/\/+$/, '');

  if (config.adminPath && clean === '/' + config.adminPath) {
    return { remapped: '/admin', isDecoy: false };
  }
  if (config.adminPath && clean.startsWith('/' + config.adminPath + '/')) {
    return { remapped: '/admin' + clean.slice(config.adminPath.length + 1), isDecoy: false };
  }

  if (config.loginPath && clean === '/' + config.loginPath) {
    return { remapped: '/login', isDecoy: false };
  }

  if (config.subPath && clean === '/' + config.subPath) {
    return { remapped: '/sub', isDecoy: false };
  }
  if (config.subPath && clean.startsWith('/' + config.subPath + '/')) {
    return { remapped: '/sub' + clean.slice(config.subPath.length + 1), isDecoy: false };
  }

  // Real paths leaked — serve decoy
  if (clean === '/admin' || clean === '/login') {
    return { remapped: pathname, isDecoy: true };
  }

  return { remapped: pathname, isDecoy: false };
}

export function html1101(host: string): string {
  const now = new Date();
  const ts =
    now.getFullYear() +
    '-' +
    String(now.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(now.getDate()).padStart(2, '0') +
    ' ' +
    String(now.getHours()).padStart(2, '0') +
    ':' +
    String(now.getMinutes()).padStart(2, '0') +
    ':' +
    String(now.getSeconds()).padStart(2, '0');
  const rayId = Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return `<!DOCTYPE html>
<!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en-US"> <![endif]-->
<!--[if IE 7]>    <html class="no-js ie7 oldie" lang="en-US"> <![endif]-->
<!--[if IE 8]>    <html class="no-js ie8 oldie" lang="en-US"> <![endif]-->
<!--[if gt IE 8]><!--> <html class="no-js" lang="en-US"> <!--<![endif]-->
<head>
<title>Worker threw exception | ${host} | Cloudflare</title>
<meta charset="UTF-8" />
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta http-equiv="X-UA-Compatible" content="IE=Edge" />
<meta name="robots" content="noindex, nofollow" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<link rel="stylesheet" id="cf_styles-css" href="/cdn-cgi/styles/cf.errors.css" />
<!--[if lt IE 9]><link rel="stylesheet" id='cf_styles-ie.css' href="/cdn-cgi/styles/cf.errors.ie.css" /><![endif]-->
<style>body{margin:0;padding:0}</style>

<!--[if gte IE 10]><!-->
<script>
  if (!navigator.cookieEnabled) {
    window.addEventListener('DOMContentLoaded', function () {
      var cookieEl = document.getElementById('cookie-alert');
      cookieEl.style.display = 'block';
    })
  }
</script>
<!--<![endif]-->

</head>
<body>
    <div id="cf-wrapper">
        <div class="cf-alert cf-alert-error cf-cookie-error" id="cookie-alert" data-translate="enable_cookies">Please enable cookies.</div>
        <div id="cf-error-details" class="cf-error-details-wrapper">
            <div class="cf-wrapper cf-header cf-error-overview">
                <h1>
                    <span class="cf-error-type" data-translate="error">Error</span>
                    <span class="cf-error-code">1101</span>
                    <small class="heading-ray-id">Ray ID: ${rayId} &bull; ${ts} UTC</small>
                </h1>
                <h2 class="cf-subheadline" data-translate="error_desc">Worker threw exception</h2>
            </div>

            <section></section>

            <div class="cf-section cf-wrapper">
                <div class="cf-columns two">
                    <div class="cf-column">
                        <h2 data-translate="what_happened">What happened?</h2>
                        <p>You've requested a page on a website (${host}) that is on the <a href="https://www.cloudflare.com/5xx-error-landing?utm_source=error_100x" target="_blank">Cloudflare</a> network. An unknown error occurred while rendering the page.</p>
                    </div>

                    <div class="cf-column">
                        <h2 data-translate="what_can_i_do">What can I do?</h2>
                        <p><strong>If you are the owner of this website:</strong><br />refer to <a href="https://developers.cloudflare.com/workers/observability/errors/" target="_blank">Workers - Errors and Exceptions</a> and check Workers Logs for ${host}.</p>
                    </div>
                </div>
            </div>

            <div class="cf-section cf-wrapper">
                <h2 data-translate="more_info">More information</h2>
                <p>If you are the owner of this website, you can check <a href="https://developers.cloudflare.com/workers/observability/errors/" target="_blank">Workers Logs</a> for ${host} to learn more about this error.</p>
            </div>
        </div>
    </div>
</body>
</html>`;
}

export function nginxPage(): string {
  return `<!DOCTYPE html>
<html>
<head>
<title>Welcome to nginx!</title>
<style>
  body {
    width: 35em;
    margin: 0 auto;
    font-family: Tahoma, Verdana, Arial, sans-serif;
  }
</style>
</head>
<body>
<h1>Welcome to nginx!</h1>
<p>If you see this page, the nginx web server is successfully installed and
working. Further configuration is required.</p>

<p>For online documentation and support please refer to
<a href="http://nginx.org/">nginx.org</a>.<br/>
Commercial support is available at
<a href="http://nginx.com/">nginx.com</a>.</p>

<p><em>Thank you for using nginx.</em></p>
</body>
</html>`;
}

export function getDecoyResponse(host: string, pageType: string): Response {
  const html = pageType === '1101' ? html1101(host) : nginxPage();
  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=UTF-8' },
  });
}
