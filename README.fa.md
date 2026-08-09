<p align="center">
  <img src="docs/assets/banner.svg" alt="XrayMOD" width="100%"/>
</p>

<p align="center">
  <b>پنل مخفی و مدرن مدیریت پروکسی روی Cloudflare Workers</b><br/>
  اوپن‌سورس · سرورلس · صفحه وضعیت کاربر · ساب هوشمند · نصب یک‌خطی
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge" alt="MIT"/></a>
  <a href="https://github.com/askarniroomand/XRayMOD/releases"><img src="https://img.shields.io/github/v/release/askarniroomand/XRayMOD?style=for-the-badge&color=38bdf8" alt="Release"/></a>
  <a href="https://github.com/askarniroomand/XRayMOD/stargazers"><img src="https://img.shields.io/github/stars/askarniroomand/XRayMOD?style=for-the-badge&color=eab308" alt="Stars"/></a>
  <a href="https://t.me/MRROBOT_DT"><img src="https://img.shields.io/badge/پشتیبانی-@MRROBOT__DT-26A5E4?style=for-the-badge&logo=telegram" alt="TG"/></a>
  <a href="README.md"><img src="https://img.shields.io/badge/English-README-0ea5e9?style=for-the-badge" alt="EN"/></a>
  <a href="https://github.com/askarniroomand"><img src="https://img.shields.io/badge/Author-askarniroomand-181717?style=for-the-badge&logo=github" alt="Author"/></a>
</p>

<p align="center">
  <a href="#xraymod-چیه"><b>معرفی</b></a> ·
  <a href="#ساخت-توکن-api-در-cloudflare"><b>ساخت توکن</b></a> ·
  <a href="#نصب-سریع-حدود-۵-دقیقه"><b>نصب سریع</b></a> ·
  <a href="#بعد-از-نصب"><b>بعد از نصب</b></a> ·
  <a href="SECURITY.md"><b>امنیت</b></a>
</p>

---

## XRayMOD چیه؟

**XRayMOD** یک پنل **self-hosted** و **serverless** برای ساخت و مدیریت کاربر و لینک سابسکرایبشن روی **Cloudflare Workers + D1** است.

به‌جای اجارهٔ دائمی VPS فقط برای پنل، کنترل‌پلن روی لبهٔ Cloudflare اجرا می‌شود؛ داشبورد ادمین، صفحه وضعیت کاربر، ساب هوشمند و پوسته‌های استیلث را یک‌جا دارید.

> **مسئولیت اپراتور:** رعایت قوانین Cloudflare، قوانین محلی و استفادهٔ مجاز بر عهدهٔ شماست. این نرم‌افزار زیرساخت است — نه مجوز حمله به شبکه‌هایی که مال شما نیستند.

---

## چرا به درد می‌خورد؟

| مشکل رایج | کاری که XRayMOD می‌کند |
|:----------|:------------------------|
| هزینه و نگهداری VPS برای پنل کوچک | اجرا روی Workers + D1 |
| اسکنر و حدس مسیر پنل | **SECURE PATH** اجباری (UUID تصادفی) — بدون آن همه چیز **۴۰۴** |
| سوال مداوم کاربر: «حجمم چقدر مونده؟» | صفحه `/{SECURE}/me/<uuid>` با QR و کپی |
| ساب ساده و ضعیف | بستهٔ هوشمند تا ۱۰ کانفیگ (IP تمیز، پورت CF، …) |
| شبکه‌های فیلترشده | پوسته‌های جعلی + مسیرهای طعمه (Canary) |

---

## قابلیت‌ها

| | قابلیت | توضیح کوتاه |
|:--:|:-------|:------------|
| 🥷 | **SECURE PATH اجباری** | پنل / API / ساب / پورتال فقط زیر UUID |
| 🛡 | **داشبورد ادمین** | کاربر، آپدیت، دامنه سفارشی، kill switch، ایمیل CF |
| 🧪 | **لَب پیشرفته** | سرعت، ساب هوشمند، وایت‌لیبل، استیلث، اپس در یک UI |
| 🌙 | **Auto Clean-IP شبانه** | کرون Top-N برای هر ISP (ایرانسل/همراه/…) |
| ❤️ | **Health-check لبه** | حذف آی‌پی‌های مرده از ساب |
| 🎮 | **پروفایل سرعت** | گیمینگ / یوتیوب / پایدار |
| 🎟 | **ساب مهمان ۲۴ساعته + QR** | لینک موقت با انقضا |
| 🇮🇷 | **Split Routing** | ایران DIRECT در Clash Meta / sing-box |
| 🔁 | **Failover** | تگ اولویت `[P1]` `[P2]` روی کانفیگ‌ها |
| 🎨 | **وایت‌لیبل** | برند، رنگ، دامنه، بنر ساب |
| 🕳 | **Canary حرفه‌ای** | لاگ ASN/IP اسکنر + بلاک یک‌کلیکی |
| 🧩 | **پریست Fragment / Reality** | ضد فیلتر یک‌کلیک |
| 💾 | **بکاپ / ریستور + Rollback** | یک فایل JSON · برگشت نسخه Worker |
| 🕸 | **دامنه وزنی + Multi-node** | چرخش دامنه · چند Worker |
| 📡 | **پرچم کشور روی کانفیگ** | 🇩🇪 🇳🇱 🇹🇷 کنار اسم هر نود |
| 🔐 | **سخت‌سازی ادمین** | ایمیل CF · 2FA · rate limit |
| ⚡ | **نصب یک‌خطی** | ویندوز / لینوکس / مک / WSL |
| 📱 | **کلاینت‌ها** | v2rayNG ≥۲.۲.۳ · sing-box ≥۱.۱۲ · Hiddify · Streisand · Clash |

---

## پیش‌نیازها

### سیستم شما
- ویندوز ۱۰+، macOS ۱۲+، یا لینوکس جدید
- اینترنت به `api.cloudflare.com` و GitHub
- امکان اجرای **PowerShell** یا **Bash**

### اکانت Cloudflare
- اکانت Cloudflare (پلن رایگان برای بسیاری از استفاده‌های شخصی کافی است)
- اجازه ساخت **Workers** و دیتابیس **D1**
- یک **API Token** با دسترسی ویرایش Workers (بخش بعد)

### اختیاری (نصب دستی / توسعه)
- Node.js ۲۰+
- npm ۱۰+
- Wrangler ۳+

---

## ساخت توکن API در Cloudflare

توکن **به این ریپوی گیت‌هاب آپلود نمی‌شود**. فقط روی سیستم خودتان می‌ماند و برای APIهای Cloudflare استفاده می‌شود. ترجیحاً **توکن محدود (scoped)** بسازید، نه Global API Key.

### مرحله‌به‌مرحله

1. وارد [داشبورد Cloudflare](https://dash.cloudflare.com) شوید.
2. از گوشه بالا راست روی آواتار → **My Profile** → **API Tokens**.  
   لینک مستقیم: [https://dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens)
3. روی **Create Token** بزنید.
4. در بخش قالب‌ها، **Edit Cloudflare Workers** را انتخاب کنید → **Use template**.  
   این قالب پیشنهادی رسمی برای شروع با XRayMOD است.
5. تنظیمات را مرور کنید (در صورت تمایل محدودتر کنید):
   - **Account resources** → فقط همان اکانتی که می‌خواهید پنل را روی آن بسازید  
   - **Zone resources** → فقط اگر دامنه سفارشی می‌بندید؛ وگرنه می‌توانید مطابق قالب پیش بروید
6. **Continue to summary** → **Create Token**.
7. توکن را **یک‌بار** کپی کنید و در پسوردمنجر ذخیره کنید. Cloudflare دوباره نشانش نمی‌دهد.
8. وقتی نصب‌کننده پرسید، همان توکن را وارد کنید.

### توکن برای چه کارهایی مصرف می‌شود؟

| کار | چرا |
|:----|:----|
| ساخت / آپدیت Worker | میزبانی پنل و لبه پروکسی |
| ساخت / اتصال D1 | ذخیره کاربر و تنظیمات |
| دامنه سفارشی (اختیاری) | وصل کردن دامنه به Worker |

### چک‌لیست ایمنی

- [ ] توکن را در Issue، PR، گروه تلگرام یا دیسکورد نفرستید  
- [ ] داخل گیت یا اسکرین‌شات عمومی نگذارید  
- [ ] اگر لو رفت، فوراً Rotate / Revoke کنید  
- [ ] بعد از نصب روی سیستم یک‌بارمصرف، توکن قدیمی را باطل کنید  

> اگر اکانت Cloudflare مشکل پرداخت / تعلیق داشته باشد، نصب شکست می‌خورد تا وضعیت اکانت درست شود.

---

## نصب سریع (حدود ۵ دقیقه)

### ۱) یک دستور را اجرا کنید

#### ویندوز — PowerShell (اعلان با `PS` شروع می‌شود)

```powershell
irm https://raw.githubusercontent.com/askarniroomand/XRayMOD/main/install.ps1 | iex
```

#### ویندوز — CMD (بدون `PS`)

```cmd
powershell -NoProfile -ExecutionPolicy Bypass -Command "iex (iwr -UseBasicParsing 'https://raw.githubusercontent.com/askarniroomand/XRayMOD/main/install.ps1').Content"
```

#### لینوکس / مک / WSL

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/askarniroomand/XRayMOD/main/install.sh)
```

اسکریپت خودش ابزارها را آماده می‌کند، سورس را می‌گیرد و پنل را می‌سازد. برای مسیر یک‌خطی **نصب git اجباری نیست**.

### ۲) فقط سه ورودی بدهید

| مرحله | ورودی | نکته |
|:-----:|:------|:-----|
| ۱ | 🔑 توکن Cloudflare | طبق بخش بالا |
| ۲ | 👤 نام کاربری ادمین | بعداً بهتر است ایمیل CF را در پنل ببندید |
| ۳ | 🔒 رمز عبور | رمز قوی و یکتا |

بقیه خودکار است: D1 · ساخت UI · دیپلوی Worker · bootstrap · چاپ لینک‌ها

### ۳) لینک‌هایی که نصب‌کننده چاپ می‌کند را ذخیره کنید

| لینک | کاربرد |
|:-----|:-------|
| `/<SECURE_PATH>/login` | ورود ادمین (خصوصی نگه دارید) |
| `/<SECURE_PATH>/panel` | داشبورد |
| `/<SECURE_PATH>/sub/<UUID_کاربر>` | ساب اپ‌ها (پیش‌فرض Base64) |
| `/<SECURE_PATH>/me/<UUID_کاربر>` | صفحه وضعیت کاربر |
| `…/sub/<UUID>?format=clash` | خروجی Clash / Mihomo |
| `…/sub/<UUID>?format=singbox` | خروجی sing-box |

> ⚠️ از نسل ۵.۱.۱ به بعد، مسیرهای برهنه مثل `/panel` یا `/sub/...` **بدون** SECURE PATH همه **۴۰۴** هستند. همیشه UUID مسیر را در لینک داشته باشید. جزئیات: [CHANGELOG-5.1.1.md](CHANGELOG-5.1.1.md)

---

## بعد از نصب

1. بروید به `/<SECURE_PATH>/login` و با یوزر/رمزی که ساختید وارد شوید.
2. یک کاربر آزمایشی با حجم و تاریخ انقضا بسازید.
3. لینک **ساب** را در Hiddify / v2rayNG / Clash / sing-box ایمپورت کنید.
4. `/{SECURE}/me/<uuid>` را در مرورگر باز کنید و وضعیت را چک کنید.
5. در تنظیمات ادمین، پوسته‌ٔ **استیلث** را انتخاب کنید و (پیشنهادی) ورود با **ایمیل Cloudflare** را فعال کنید.
6. `SECURE_PATH`، آدرس Worker و رمز ادمین را در پسوردمنجر ذخیره کنید.

**کلاینت‌های پیشنهادی:** v2rayNG ≥ ۲.۲.۳ (Hev TUN) · sing-box ≥ ۱.۱۲ · Streisand · Hiddify · Clash

---

## نصب دستی (برای توسعه‌دهنده)

<details>
<summary><b>گام‌به‌گام: کلون → D1 → بیلد → دیپلوی</b></summary>

<br/>

```bash
git clone https://github.com/askarniroomand/XRayMOD.git
cd XRayMOD
npm install
npm install --prefix frontend
npm run build:ui
npx wrangler login
npx wrangler d1 create xraymod-db
# database_id را در wrangler.toml بگذارید
npx wrangler deploy
```

راه‌اندازی اولیه ادمین:

```bash
curl -X POST "https://WORKER.workers.dev/install" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"YourStrongPass123"}'
```

ورود:

```text
https://WORKER.workers.dev/<SECURE_PATH>/login
https://WORKER.workers.dev/<SECURE_PATH>/panel
```

ساب و وضعیت:

```text
https://WORKER.workers.dev/<SECURE_PATH>/sub/<USER_UUID>
https://WORKER.workers.dev/<SECURE_PATH>/me/<USER_UUID>
```

جزئیات بیشتر: [DEPLOY.md](./DEPLOY.md)

</details>

---

## معماری خلاصه

```text
اینترنت → لبه Cloudflare (Worker)
              ├─ دروازه SECURE PATH (۴۰۴ خاموش)
              ├─ پوسته‌های جعلی / استاتیک
              ├─ API ادمین + داشبورد
              ├─ اندپوینت سابسکرایبشن
              ├─ پورتال /{SECURE}/me
              └─ D1 (کاربر، تنظیمات، audit)
```

| مسیر | نقش |
|:-----|:----|
| `worker/` | **منبع حقیقت تولید** — روتینگ، احراز هویت، ساب، پورتال |
| `frontend/` | UI پنل ادمین |
| `installer/` + `install.*` | نصب روی اکانت Cloudflare |
| `backend/` | آزمایش‌های قدیمی پایتون — برای دیپلوی Workers لازم نیست |

---

## سوالات پرتکرار

<details>
<summary><b>آیا VPS لازم است؟</b></summary>

برای خود پنل خیر. کنترل‌پلن روی Workers + D1 است. نود/بک‌اند پروکسی موضوع جداگانه‌ای است.
</details>

<details>
<summary><b>پلن رایگان Cloudflare کافی است؟</b></summary>

برای خیلی از استفاده‌های شخصی بله. با رشد ترافیک، سقف Workers و D1 را زیر نظر بگیرید.
</details>

<details>
<summary><b>توکن کجا ذخیره می‌شود؟</b></summary>

فقط روی ماشین شما هنگام نصب و فقط به API کلودفلر فرستاده می‌شود. داخل ریپو نرود. ببینید [SECURITY.md](./SECURITY.md).
</details>

<details>
<summary><b>چرا روی /panel خطای ۴۰۴ می‌گیرم؟</b></summary>

نسل ۵.۱.۱ پیشوند UUID (SECURE PATH) را اجباری کرده. لینک کامل چاپ‌شده توسط نصب‌کننده را استفاده کنید.
</details>

<details>
<summary><b>Hiddify / v2rayNG پشتیبانی می‌شود؟</b></summary>

بله. لینک ساب را ایمپورت کنید. فرمت Clash و sing-box با پارامتر `format` در دسترس است.
</details>

<details>
<summary><b>باگ امنیتی را کجا گزارش کنم؟</b></summary>

خصوصی به تلگرام [@MRROBOT_DT](https://t.me/MRROBOT_DT) — Issue عمومی با توکن/رمز نسازید.
</details>

---

## پشتیبانی

<p align="center">
  <a href="https://t.me/MRROBOT_DT"><img src="https://img.shields.io/badge/تلگرام-@MRROBOT__DT-26A5E4?style=for-the-badge&logo=telegram" alt="Telegram"/></a>
</p>

سوال، باگ یا پیشنهاد را در تلگرام بفرستید.  
**لینک پنل، رمز و توکن را عمومی نفرستید.**

نسخه انگلیسی و جزئیات بیشتر: [README.md](README.md)

---

## مشارکت

بخوانید: [CONTRIBUTING.md](./CONTRIBUTING.md) و [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)

```bash
git clone https://github.com/askarniroomand/XRayMOD.git
cd XRayMOD
npm install
# برنچ بسازید، تغییر دهید، PR به main بزنید
```

PRهای مستندات و تست‌ها عالی‌اند برای شروع.

---

## نویسنده‌ها

| | گیت‌هاب |
|:--|:--------|
| عسکر نیرومند | [@askarniroomand](https://github.com/askarniroomand) |
| Pakrohk | [@Pakrohk](https://github.com/Pakrohk) |

---

## لایسنس

[MIT](LICENSE) © Askar Niroomand & Pakrohk
