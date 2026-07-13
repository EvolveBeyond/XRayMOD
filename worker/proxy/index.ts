/**
 * پروکسی ترافیک — مدیریت اتصال WebSocket
 *
 * از request.fetcher.connect() استفاده می‌کنه (نه import از cloudflare:sockets)
 * این روش از Error 1101 جلوگیری می‌کنه.
 */
import type { Env } from '../types';
import { parseVlessHeader, buildVlessResponse } from './vless';
import { parseTrojanHeader, buildTrojanResponse } from './trojan';

// ── دریافت اتصال TCP امن ───────────────────────────────────
// به جای import { connect } from 'cloudflare:sockets'
// که باعث Error 1101 میشه
function getConnection(request: Request): Function {
  const fetcher = (request as any)?.fetcher;
  if (!fetcher?.connect) {
    throw new Error('fetcher.connect unavailable');
  }
  return fetcher.connect;
}

// ── نقطه ورود پروکسی ──────────────────────────────────────
export async function handleProxyTraffic(
  request: Request,
  env: Env,
  _ctx: ExecutionContext
): Promise<Response> {
  const url = new URL(request.url);
  const مسیر = url.pathname;

  // جستجوی کانفیگ بر اساس مسیر
  const کانفیگ = await env.DB.prepare(
    'SELECT c.*, p.id as proto_id, p.template_json FROM configs c LEFT JOIN protocols p ON c.protocol_id = p.id WHERE c.path = ?'
  )
    .bind(مسیر)
    .first<any>();

  if (!کانفیگ) {
    return new Response('Not found', { status: 404 });
  }

  // دریافت اطلاعات کاربر
  const کاربر = await env.DB.prepare(
    'SELECT id, uuid, traffic_limit, traffic_used, status, expiry_date FROM users WHERE id = ?'
  )
    .bind(کانفیگ.user_id)
    .first<any>();

  if (!کاربر || کاربر.status !== 'active') {
    return new Response('Forbidden', { status: 403 });
  }

  // بررسی سقف ترافیک
  if (کاربر.traffic_limit > 0 && کاربر.traffic_used >= کاربر.traffic_limit) {
    return new Response('Quota exceeded', { status: 403 });
  }

  // بررسی انقضا
  if (کاربر.expiry_date && new Date(کاربر.expiry_date) < new Date()) {
    return new Response('Subscription expired', { status: 403 });
  }

  // بررسی WebSocket upgrade
  const هدر_ارتقا = request.headers.get('Upgrade');
  if (هدر_ارتقا !== 'websocket') {
    return new Response('Expected WebSocket upgrade', { status: 426 });
  }

  // ایجاد جفت WebSocket
  const [کلاینت_وی‌اس, سرور_وی‌اس] = Object.values(new WebSocketPair());

  سرور_وی‌اس.accept();
  پردازش_اتصال(
    سرور_وی‌اس,
    request,
    کانفیگ.protocol_id,
    کانفیگ,
    کاربر,
    env.DB
  ).catch((err: any) => {
    console.error('WebSocket error:', err);
    try {
      سرور_وی‌اس.close(1011, 'Internal error');
    } catch {}
  });

  return new Response(null, {
    status: 101,
    webSocket: کلاینت_وی‌اس,
  });
}

// ── پردازش اتصال WebSocket ─────────────────────────────────
async function پردازش_اتصال(
  وی‌اس: WebSocket,
  درخواست: Request,
  پروتکل: string,
  کانفیگ: any,
  کاربر: any,
  پایگاه: D1Database
): Promise<void> {
  let حجم_آپلود = 0;
  let حجم_دانلود = 0;

  // دریافت اولین پیام برای تجزیه هدر پروتکل
  const اولین_پیام = await new Promise<ArrayBuffer>((resolve, reject) => {
    const تایمر = setTimeout(() => reject(new Error('Timeout')), 10000);
    وی‌اس.addEventListener(
      'message',
      (event) => {
        clearTimeout(تایمر);
        if (event.data instanceof ArrayBuffer) {
          resolve(event.data);
        } else if (event.data instanceof Blob) {
          event.data.arrayBuffer().then(resolve);
        } else {
          resolve(new TextEncoder().encode(String(event.data)).buffer);
        }
      },
      { once: true }
    );
    وی‌اس.addEventListener('close', () => {
      clearTimeout(تایمر);
      reject(new Error('Closed'));
    });
  });

  حجم_آپلود += اولین_پیام.byteLength;

  // تجزیه بر اساس پروتکل
  let میزبان_مقصد = '';
  let پورت_مقصد = 0;

  if (پروتکل === 'vless-reality' || پروتکل === 'vless-ws') {
    const نتیجه = parseVlessHeader(اولین_پیام);
    if (!نتیجه) {
      وی‌اس.close(1008, 'Invalid VLESS header');
      return;
    }
    میزبان_مقصد = نتیجه.address;
    پورت_مقصد = نتیجه.port;
    وی‌اس.send(buildVlessResponse());
  } else if (پروتکل === 'trojan-ws') {
    const نتیجه = parseTrojanHeader(اولین_پیام);
    if (!نتیجه) {
      وی‌اس.close(1008, 'Invalid Trojan header');
      return;
    }
    میزبان_مقصد = نتیجه.address;
    پورت_مقصد = نتیجه.port;
    وی‌اس.send(buildTrojanResponse());
  } else {
    const تنظیمات = JSON.parse(کانفیگ.settings_json || '{}');
    میزبان_مقصد = تنظیمات.host || تنظیمات.sni || 'example.com';
    پورت_مقصد = تنظیمات.port || 443;
  }

  // اتصال به مقصد با استفاده از fetcher.connect()
  try {
    const اتصال = getConnection(درخواست);
    const سوکت_مقصد = await اتصال({
      hostname: میزبان_مقصد,
      port: پورت_مقصد,
    });

    // خواندن داده از سوکت مقصد
    const خواننده = سوکت_مقصد.readable?.getReader();
    const نویسنده = سوکت_مقصد.writable?.getWriter();

    if (!خواننده || !نویسنده) {
      throw new Error('Invalid socket streams');
    }

    // ارسال اولین پیام به مقصد
    await نویسنده.write(اولین_پیام);

    // ارسال پیام‌های بعدی از وی‌اس به مقصد
    وی‌اس.addEventListener('message', async (event) => {
      const داده =
        event.data instanceof ArrayBuffer
          ? event.data
          : event.data instanceof Blob
            ? await event.data.arrayBuffer()
            : new TextEncoder().encode(String(event.data)).buffer;

      حجم_آپلود += داده.byteLength;
      try {
        await نویسنده.write(داده);
      } catch {}
    });

    // ارسال پاسخ‌ها از مقصد به وی‌اس
    const خواندن_پاسخ = async () => {
      try {
        while (true) {
          const { value, done } = await خواننده.read();
          if (done) break;
          if (value) {
            حجم_دانلود += value.byteLength;
            وی‌اس.send(value);
          }
        }
      } catch {}
    };
    خواندن_پاسخ();

    // پاکسازی هنگام بسته شدن
    وی‌اس.addEventListener('close', async () => {
      try { await نویسنده.close(); } catch {}
      try { await سوکت_مقصد.close?.(); } catch {}
    });

    سوکت_مقصد.closed?.then?.(() => {
      try { وی‌اس.close(); } catch {}
    });
  } catch (err) {
    console.log(`اتصال به ${میزبان_مقصد}:${پورت_مقصد} ناموفق بود`);
    // اگه اتصال مستقیم نشد، ترافیک رو رد کن
    // (این بخش بعداً با ProxyIP پیاده‌سازی میشه)
  }

  // ردیابی ترافیک هنگام بسته شدن
  وی‌اس.addEventListener('close', async () => {
    try {
      await پایگاه
        .prepare(
          'UPDATE users SET traffic_used = traffic_used + ? WHERE id = ?'
        )
        .bind(حجم_آپلود + حجم_دانلود, کاربر.id)
        .run();
    } catch (err) {
      console.error('خطا در بروزرسانی ترافیک:', err);
    }
  });
}
