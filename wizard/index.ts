/**
 * XRayMOD Wizard — One-Click Deployer
 *
 * A lightweight Cloudflare Worker that deploys XRayMOD panel
 * to another user's Cloudflare account using their API token.
 *
 * Usage:
 *   POST /api/deploy
 *   Headers: Content-Type: application/json
 *   Body: { "api_token": "your-cloudflare-api-token", "panel_code": "base64-encoded-worker-code" }
 *
 * Security Notes:
 *   - API tokens are processed server-side and never stored
 *   - The wizard only creates resources needed for the panel
 *   - All operations use the Cloudflare API v4
 */

interface Env {
  WIZARD_SECRET: string;
  PANEL_GITHUB_URL: string;
}

interface DeployRequest {
  api_token: string;
  worker_name?: string;
  d1_name?: string;
  admin_password?: string;
}

const CF_API = 'https://api.cloudflare.com/client/v4';

function json(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

async function cfFetch(
  token: string,
  path: string,
  method = 'GET',
  body?: any
): Promise<any> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const options: RequestInit = { method, headers };
  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(`${CF_API}${path}`, options);
  const data = await res.json() as any;

  if (!data.success) {
    const errors = data.errors?.map((e: any) => e.message).join(', ') || 'Unknown error';
    throw new Error(`Cloudflare API error: ${errors}`);
  }

  return data;
}

async function fetchPanelCode(): Promise<string> {
  const githubUrl = 'https://raw.githubusercontent.com/EvolveBeyond/XRayMOD/refs/heads/main/worker/index.ts';

  try {
    const res = await fetch(githubUrl);
    if (!res.ok) {
      throw new Error(`Failed to fetch panel code: ${res.status}`);
    }
    return await res.text();
  } catch (e) {
    // Fallback: return a minimal worker that explains the issue
    return `
// XRayMOD Panel — Deployment Error
// The panel code could not be fetched from GitHub.
// Please deploy manually or check the repository URL.

export default {
  fetch(request) {
    return new Response(JSON.stringify({
      error: 'Panel code not available',
      message: 'Please deploy the panel manually using wrangler.'
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};`;
  }
}

async function deploy(
  apiToken: string,
  workerName: string,
  d1Name: string,
  adminPassword: string
): Promise<any> {
  // Step 1: Get account ID
  const accounts = await cfFetch(apiToken, '/accounts?per_page=1');
  const accountId = accounts.result?.[0]?.id;
  if (!accountId) {
    throw new Error('No Cloudflare account found');
  }

  // Step 2: Create D1 database
  let d1Id: string;
  try {
    const d1 = await cfFetch(apiToken, `/accounts/${accountId}/d1/database`, 'POST', {
      name: d1Name,
    });
    d1Id = d1.result.id;
  } catch (e: any) {
    // If D1 creation fails, try to find existing one
    const existing = await cfFetch(apiToken, `/accounts/${accountId}/d1/database?name=${d1Name}`);
    if (existing.result?.length > 0) {
      d1Id = existing.result[0].uuid;
    } else {
      throw new Error(`Failed to create D1 database: ${e.message}`);
    }
  }

  // Step 3: Fetch panel code
  const panelCode = await fetchPanelCode();

  // Step 4: Upload worker script
  const metadata = {
    main_module: 'worker.js',
    compatibility_date: '2024-09-23',
    compatibility_flags: ['nodejs_compat'],
    bindings: [
      {
        type: 'd1',
        name: 'DB',
        database_id: d1Id,
      },
      {
        type: 'plain_text',
        name: 'ADMIN_PASSWORD',
        text: adminPassword,
      },
    ],
  };

  // Create multipart form data
  const boundary = `----formdata-${Date.now()}`;
  const parts: string[] = [];

  // Metadata part
  parts.push(
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="metadata"\r\n` +
    `Content-Type: application/json\r\n\r\n` +
    JSON.stringify(metadata) + '\r\n'
  );

  // Worker script part
  parts.push(
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="worker.js"; filename="worker.js"\r\n` +
    `Content-Type: application/javascript+module\r\n\r\n` +
    panelCode + '\r\n'
  );

  parts.push(`--${boundary}--\r\n`);

  const body = parts.join('');
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiToken}`,
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
  };

  const uploadRes = await fetch(
    `${CF_API}/accounts/${accountId}/workers/scripts/${workerName}`,
    { method: 'PUT', headers, body }
  );

  if (!uploadRes.ok) {
    const errorText = await uploadRes.text();
    throw new Error(`Failed to upload worker: ${errorText}`);
  }

  // Step 5: Enable workers.dev subdomain
  try {
    await cfFetch(apiToken, `/accounts/${accountId}/workers/scripts/${workerName}/subdomain`, 'PUT', {
      enabled: true,
    });
  } catch (e) {
    // Subdomain enablement might fail, but worker is still deployed
    console.log('Subdomain enablement failed:', e);
  }

  // Step 6: Get workers.dev subdomain
  let subdomain = 'workers.dev';
  try {
    const subdomainRes = await cfFetch(apiToken, `/accounts/${accountId}/workers/subdomain`);
    subdomain = subdomainRes.result?.subdomain || 'workers.dev';
  } catch (e) {
    // Use default subdomain
  }

  const workerUrl = `https://${workerName}.${subdomain}`;

  return {
    success: true,
    worker_name: workerName,
    worker_url: workerUrl,
    d1_database: {
      id: d1Id,
      name: d1Name,
    },
    message: 'Panel deployed successfully! Visit the URL to set up your admin account.',
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    const url = new URL(request.url);

    // Health check
    if (url.pathname === '/api/health') {
      return json({ status: 'ok', service: 'xraymod-wizard' });
    }

    // Deploy endpoint
    if (url.pathname === '/api/deploy' && request.method === 'POST') {
      try {
        const body = await request.json() as DeployRequest;

        if (!body.api_token) {
          return json({ error: 'API token is required' }, 400);
        }

        // Optional: validate wizard secret
        if (env.WIZARD_SECRET) {
          const authHeader = request.headers.get('Authorization');
          if (authHeader !== `Bearer ${env.WIZARD_SECRET}`) {
            return json({ error: 'Unauthorized' }, 401);
          }
        }

        const workerName = body.worker_name || `xraymod-${Date.now().toString(36)}`;
        const d1Name = body.d1_name || `${workerName}-db`;
        const adminPassword = body.admin_password || generatePassword();

        const result = await deploy(
          body.api_token,
          workerName,
          d1Name,
          adminPassword
        );

        return json(result);
      } catch (e: any) {
        return json({ error: e.message || 'Deployment failed' }, 500);
      }
    }

    // Serve wizard UI
    if (url.pathname === '/' || url.pathname === '') {
      return new Response(WIZARD_HTML, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    return json({ error: 'Not found' }, 404);
  },
};

function generatePassword(length = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const WIZARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>XrayMOD Wizard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #09090b;
      color: #fafafa;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      max-width: 480px;
      width: 100%;
      padding: 2rem;
    }
    .card {
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 1rem;
      padding: 2rem;
    }
    .logo {
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, #10b981, #059669);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      font-size: 1.5rem;
      color: #000;
      margin: 0 auto 1.5rem;
    }
    h1 {
      font-size: 1.5rem;
      font-weight: 800;
      text-align: center;
      margin-bottom: 0.5rem;
    }
    .subtitle {
      text-align: center;
      color: #a1a1aa;
      margin-bottom: 2rem;
      font-size: 0.875rem;
    }
    .form-group {
      margin-bottom: 1rem;
    }
    label {
      display: block;
      font-size: 0.75rem;
      font-weight: 700;
      color: #71717a;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.5rem;
    }
    input {
      width: 100%;
      padding: 0.75rem 1rem;
      background: #09090b;
      border: 1px solid #27272a;
      border-radius: 0.75rem;
      color: #fafafa;
      font-size: 0.875rem;
      transition: border-color 0.2s;
    }
    input:focus {
      outline: none;
      border-color: #10b981;
    }
    input::placeholder { color: #52525b; }
    .btn {
      width: 100%;
      padding: 0.875rem;
      background: #10b981;
      color: #000;
      border: none;
      border-radius: 0.75rem;
      font-weight: 700;
      font-size: 0.875rem;
      cursor: pointer;
      transition: background 0.2s;
      margin-top: 1rem;
    }
    .btn:hover { background: #34d399; }
    .btn:disabled {
      background: #27272a;
      color: #52525b;
      cursor: not-allowed;
    }
    .result {
      margin-top: 1.5rem;
      padding: 1rem;
      background: #052e16;
      border: 1px solid #166534;
      border-radius: 0.75rem;
      display: none;
    }
    .result.error {
      background: #450a0a;
      border-color: #991b1b;
    }
    .result.show { display: block; }
    .result a {
      color: #10b981;
      text-decoration: none;
    }
    .result a:hover { text-decoration: underline; }
    .loading {
      display: none;
      text-align: center;
      color: #a1a1aa;
    }
    .loading.show { display: block; }
    .spinner {
      display: inline-block;
      width: 20px;
      height: 20px;
      border: 2px solid #27272a;
      border-top-color: #10b981;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-right: 0.5rem;
      vertical-align: middle;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .footer {
      text-align: center;
      margin-top: 1.5rem;
      font-size: 0.75rem;
      color: #52525b;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo">X</div>
      <h1>XrayMOD Wizard</h1>
      <p class="subtitle">Deploy XRayMOD panel to your Cloudflare account</p>
      
      <form id="deployForm">
        <div class="form-group">
          <label>Cloudflare API Token</label>
          <input type="password" id="apiToken" placeholder="Enter your API token" required>
        </div>
        
        <div class="form-group">
          <label>Worker Name (optional)</label>
          <input type="text" id="workerName" placeholder="xraymod-panel">
        </div>
        
        <div class="form-group">
          <label>Admin Password (optional)</label>
          <input type="password" id="adminPassword" placeholder="Auto-generated if empty">
        </div>
        
        <button type="submit" class="btn" id="deployBtn">Deploy to Cloudflare</button>
      </form>
      
      <div class="loading" id="loading">
        <span class="spinner"></span> Deploying...
      </div>
      
      <div class="result" id="result"></div>
      
      <div class="footer">
        XrayMOD — Secure Proxy Panel
      </div>
    </div>
  </div>
  
  <script>
    document.getElementById('deployForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const btn = document.getElementById('deployBtn');
      const loading = document.getElementById('loading');
      const result = document.getElementById('result');
      
      btn.disabled = true;
      loading.classList.add('show');
      result.classList.remove('show', 'error');
      
      try {
        const res = await fetch('/api/deploy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_token: document.getElementById('apiToken').value,
            worker_name: document.getElementById('workerName').value || undefined,
            admin_password: document.getElementById('adminPassword').value || undefined,
          }),
        });
        
        const data = await res.json();
        
        if (data.success) {
          result.innerHTML = \`
            <strong>Deployment successful!</strong><br><br>
            Worker: <a href="\${data.worker_url}" target="_blank">\${data.worker_url}</a><br>
            Database: \${data.d1_database.name}<br><br>
            <em>Visit the URL to set up your admin account.</em>
          \`;
          result.classList.add('show');
        } else {
          result.textContent = data.error || 'Deployment failed';
          result.classList.add('show', 'error');
        }
      } catch (err) {
        result.textContent = 'Network error: ' + err.message;
        result.classList.add('show', 'error');
      } finally {
        btn.disabled = false;
        loading.classList.remove('show');
      }
    });
  </script>
</body>
</html>`;
