import type { Env } from './types';

// --- Telegram Bot API Helpers ---

async function tgApi(botToken: string, method: string, payload?: any): Promise<any> {
  try {
    const url = `https://api.telegram.org/bot${botToken}/${method}`;
    const opts: RequestInit = { method: 'POST', headers: { 'Content-Type': 'application/json' } };
    if (payload) opts.body = JSON.stringify(payload);
    const r = await fetch(url, opts);
    return r.ok ? await r.json() : null;
  } catch (e) {
    console.error('[TG] API error:', method, e);
    return null;
  }
}

async function sendBotMessage(botToken: string, chatId: string, text: string, replyMarkup?: any): Promise<void> {
  await tgApi(botToken, 'sendMessage', {
    chat_id: chatId,
    parse_mode: 'HTML',
    text,
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  });
}

// --- Login Token System ---

async function generateLoginToken(chatId: string, key: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(`tg-login|${chatId}|${Math.floor(Date.now() / 300000)}`);
  const mac = await crypto.subtle.importKey('raw', enc.encode(String(key)), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', mac, data);
  const hex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
  return hex.slice(0, 32);
}

export async function verifyTelegramLogin(chatId: string, token: string, key: string): Promise<boolean> {
  const nowBucket = Math.floor(Date.now() / 300000);
  for (const b of [nowBucket, nowBucket - 1]) {
    const enc = new TextEncoder();
    const data = enc.encode(`tg-login|${chatId}|${b}`);
    const mac = await crypto.subtle.importKey('raw', enc.encode(String(key)), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sig = await crypto.subtle.sign('HMAC', mac, data);
    const hex = Array.from(new Uint8Array(sig)).map(b2 => b2.toString(16).padStart(2, '0')).join('');
    if (hex.slice(0, 32) === token) return true;
  }
  return false;
}

// --- Keyboard Builders ---

function mainKeyboard(panelUrl: string, subUrl: string) {
  return {
    inline_keyboard: [
      [{ text: '📊 وضعیت', callback_data: 'm:status' }, { text: '🔗 اشتراک', callback_data: 'm:sub' }],
      [{ text: '⚙️ کانفیگ', callback_data: 'm:config' }, { text: '👥 کاربران', callback_data: 'm:users' }],
      [{ text: '🖥 پنل مدیریت', web_app: { url: panelUrl } }, { text: '🔄 منو', callback_data: 'm:menu' }],
    ],
  };
}

// --- Message Builders ---

function welcomeText(): string {
  return `<b>🛰 به ربات XrayMOD خوش آمدید</b>

<blockquote>مدیریت پنل از تلگرام:
دریافت لینک اشتراک، وضعیت، مصرف و تنظیمات</blockquote>

از دکمه‌های زیر استفاده کنید 👇`;
}

function helpText(): string {
  return `<b>╔═══❰✨ راهنما ❱═══╗</b>

<blockquote><b>📋 دستورات</b>
━━━━━━━━━━━━━━━━━━━━
<code>/start</code>     ─── منوی اصلی
<code>/sub</code>       ─── لینک اشتراک
<code>/status</code>    ─── وضعیت سرور
<code>/config</code>    ─── تنظیمات پروتکل
<code>/users</code>     ─── لیست کاربران
<code>/help</code>      ─── این راهنما</blockquote>

<b>╚════════════════════╝</b>`;
}

function statusText(cfg: any, host: string, userCount: number): string {
  const uptime = Date.now() - (globalThis as any).__workerStart || 0;
  const uptimeStr = `${Math.floor(uptime / 3600000)}h ${Math.floor((uptime % 3600000) / 60000)}m`;
  return `<b>╔═══❰📊 وضعیت سرور ❱═══╗</b>

<blockquote>⏱ <b>آپتایم:</b> <code>${uptimeStr}</code>
🌐 <b>Host:</b> <code>${host}</code>
👥 <b>کاربران:</b> <code>${userCount}</code>
📡 <b>پروتکل:</b> <code>${cfg?.protocol || 'vless'}</code>
🔐 <b>Transport:</b> <code>${cfg?.transport || 'ws'}</code></blockquote>

<b>╚══════════════════════╝</b>`;
}

function configText(cfg: any): string {
  const status = (v: any) => v ? '🟢 فعال' : '🔴 غیرفعال';
  return `<b>╔═══❰⚙️ تنظیمات ❱═══╗</b>

<blockquote><b>📡 شبکه</b>
━━━━━━━━━━━━━━━━━━━━
<b>پروتکل:</b> <code>${cfg?.protocol || 'vless'}</code>
<b>Transport:</b> <code>${cfg?.transport || 'ws'}</code>
<b>Host:</b> <code>${cfg?.host || '-'}</code></blockquote>

<blockquote><b>🔐 امنیت</b>
━━━━━━━━━━━━━━━━━━━━
<b>ECH:</b> ${status(cfg?.ech)}
<b>TLS Fragment:</b> ${status(cfg?.tlsFragment)}</blockquote>

<b>╚════════════════════╝</b>`;
}

function usersText(users: any[]): string {
  if (!users.length) return '<b>هیچ کاربری یافت نشد.</b>';
  const lines = users.slice(0, 10).map((u: any, i: number) =>
    `${i + 1}. <code>${u.username}</code> — ${u.status === 'active' ? '🟢' : '🔴'} ${u.traffic_used || 0}MB`
  ).join('\n');
  return `<b>👥 لیست کاربران</b>\n\n${lines}`;
}

// --- Main Webhook Handler ---

export async function handleTelegramWebhook(
  request: Request,
  env: Env,
  _ctx: ExecutionContext
): Promise<Response> {
  try {
    const tgConfig = await env.DB.prepare('SELECT v FROM kvstore WHERE k = ?').bind('tg.bot_token').first<{ v: string }>();
    const tgChatRow = await env.DB.prepare('SELECT v FROM kvstore WHERE k = ?').bind('tg.chat_id').first<{ v: string }>();

    if (!tgConfig?.v) {
      return new Response('Bot not configured', { status: 200 });
    }

    const botToken = tgConfig.v;
    const allowedChatId = tgChatRow?.v || '';
    const update = await request.json<any>();

    const url = new URL(request.url);
    const host = url.host;
    const protocol = url.protocol;

    // --- Callback Query ---
    if (update.callback_query) {
      const cq = update.callback_query;
      const cbChat = String(cq.message?.chat?.id || '').trim();
      const cbUser = String(cq.from?.id || '').trim();

      if (allowedChatId && cbChat !== allowedChatId && cbUser !== allowedChatId) {
        return new Response('Unauthorized', { status: 200 });
      }

      // Answer callback query
      await tgApi(botToken, 'answerCallbackQuery', { callback_query_id: cq.id });

      const data = cq.data || '';
      let sendText: string | null = null;
      let showKeyboard = false;

      // Get user UUID from DB
      const userRow = await env.DB.prepare('SELECT uuid FROM users WHERE role = ?').bind('admin').first<{ uuid: string }>();
      const userUUID = userRow?.uuid || '';

      const subUrl = `${protocol}//${host}/sub/${userUUID}`;
      const panelUrl = `${protocol}//${host}`;
      const kb = mainKeyboard(panelUrl, subUrl);

      if (data === 'm:status') {
        const users = await env.DB.prepare('SELECT COUNT(*) as count FROM users').first<{ count: number }>();
        sendText = statusText({ protocol: 'vless', transport: 'ws' }, host, users?.count || 0);
      } else if (data === 'm:config') {
        const echRow = await env.DB.prepare('SELECT v FROM kvstore WHERE k = ?').bind('ech.enabled').first<{ v: string }>();
        const fragRow = await env.DB.prepare('SELECT v FROM kvstore WHERE k = ?').bind('tls_fragment.enabled').first<{ v: string }>();
        sendText = configText({ protocol: 'vless', transport: 'ws', host, ech: echRow?.v === 'true', tlsFragment: fragRow?.v === 'true' });
      } else if (data === 'm:sub') {
        sendText = `<b>╔═══❰🔗 اشتراک ❱═══╗</b>\n\n<blockquote><b>📎 لینک اشتراک شما:</b>\n<code>${subUrl}</code></blockquote>\n\n<b>📥 <a href="${subUrl}">باز کردن مستقیم</a></a></b>\n\n<b>╚══════════════════╝</b>`;
      } else if (data === 'm:users') {
        const users = await env.DB.prepare('SELECT username, status, traffic_used FROM users LIMIT 10').all<any>();
        sendText = usersText(users.results);
      } else if (data === 'm:menu') {
        sendText = welcomeText();
        showKeyboard = true;
      }

      if (sendText) {
        await sendBotMessage(botToken, cbChat, sendText, showKeyboard ? kb : undefined);
      }

      return new Response('OK', { status: 200 });
    }

    // --- Message ---
    if (!update.message?.text) return new Response('OK', { status: 200 });

    const chatId = String(update.message.chat.id).trim();
    if (allowedChatId && chatId !== allowedChatId) {
      return new Response('Unauthorized', { status: 200 });
    }

    const text = update.message.text.trim();
    const cmd = text.split(' ')[0].toLowerCase();

    // Get user UUID
    const userRow = await env.DB.prepare('SELECT uuid FROM users WHERE role = ?').bind('admin').first<{ uuid: string }>();
    const userUUID = userRow?.uuid || '';
    const subUrl = `${protocol}//${host}/sub/${userUUID}`;
    const panelUrl = `${protocol}//${host}`;
    const kb = mainKeyboard(panelUrl, subUrl);

    switch (cmd) {
      case '/start':
      case '/menu':
        await sendBotMessage(botToken, chatId, welcomeText(), kb);
        break;

      case '/help':
        await sendBotMessage(botToken, chatId, helpText(), kb);
        break;

      case '/sub':
        await sendBotMessage(botToken, chatId,
          `<b>🔗 لینک اشتراک:</b>\n<code>${subUrl}</code>\n\n📥 <a href="${subUrl}">باز کردن</a>`,
          kb
        );
        break;

      case '/status': {
        const users = await env.DB.prepare('SELECT COUNT(*) as count FROM users').first<{ count: number }>();
        await sendBotMessage(botToken, chatId, statusText({ protocol: 'vless', transport: 'ws' }, host, users?.count || 0), kb);
        break;
      }

      case '/config': {
        const echRow = await env.DB.prepare('SELECT v FROM kvstore WHERE k = ?').bind('ech.enabled').first<{ v: string }>();
        const fragRow = await env.DB.prepare('SELECT v FROM kvstore WHERE k = ?').bind('tls_fragment.enabled').first<{ v: string }>();
        await sendBotMessage(botToken, chatId, configText({ protocol: 'vless', transport: 'ws', host, ech: echRow?.v === 'true', tlsFragment: fragRow?.v === 'true' }), kb);
        break;
      }

      case '/users': {
        const users = await env.DB.prepare('SELECT username, status, traffic_used FROM users LIMIT 10').all<any>();
        await sendBotMessage(botToken, chatId, usersText(users.results), kb);
        break;
      }

      default:
        await sendBotMessage(botToken, chatId, 'دستور ناشناخته. از /help استفاده کنید.', kb);
    }

    return new Response('OK', { status: 200 });
  } catch (e) {
    console.error('[TG] Webhook error:', e);
    return new Response('OK', { status: 200 });
  }
}

// --- Telegram Login Endpoint ---

export async function handleTelegramLogin(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  const chatId = new URL(request.url).searchParams.get('chat_id') || '';
  const token = new URL(request.url).searchParams.get('token') || '';

  if (!chatId || !token) {
    return new Response('Invalid login link', { status: 400 });
  }

  const keyRow = await env.DB.prepare('SELECT v FROM kvstore WHERE k = ?').bind('panel.secret_key').first<{ v: string }>();
  const key = keyRow?.v || 'default-secret';

  if (!await verifyTelegramLogin(chatId, token, key)) {
    return new Response('Invalid or expired login token', { status: 401 });
  }

  // Set admin session
  const adminRow = await env.DB.prepare('SELECT id, role FROM users WHERE role = ?').bind('admin').first<{ id: number; role: string }>();
  if (!adminRow) {
    return new Response('Admin user not found', { status: 500 });
  }

  // Create session
  const sessionToken = crypto.randomUUID();
  await env.DB.prepare('INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)')
    .bind(`session:${sessionToken}`, JSON.stringify({ userId: adminRow.id, role: adminRow.role, created: Date.now() }), Date.now())
    .run();

  return new Response(null, {
    status: 302,
    headers: {
      Location: '/',
      'Set-Cookie': `session=${sessionToken}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=604800`,
    },
  });
}
