# راهنمای صفر تا صد انتشار روی GitHub (اوپن‌سورس)

این فایل برای **صاحب پروژه** است (تو) — نه برای کاربر نهایی.

---

## نتیجه نهایی برای عموم

کاربر فقط این را می‌زند:

```bash
# Linux / macOS / Git Bash / WSL
bash <(curl -fsSL https://raw.githubusercontent.com/askarniroomand/XRayMOD/main/install.sh)

# Windows CMD / PowerShell
irm https://raw.githubusercontent.com/askarniroomand/XRayMOD/main/install.ps1 | iex

```

و فقط وارد می‌کند:

1. Cloudflare API Token  
2. نام کاربری  
3. رمز عبور  

→ پنل ساخته می‌شود و لینک‌های **SECURE PATH** چاپ می‌شود (`/{UUID}/panel` ، `/{UUID}/sub/...`).

نسخه فعلی هدف: **1.9.12** — جزئیات در [CHANGELOG.md](CHANGELOG.md).

---

## پیش‌نیاز تو (ناشر)

- اکانت GitHub (ریپو: `askarniroomand/XRayMOD` یا فورک خودت)
- `git` روی سیستم
- دسترسی push به ریپو

---

## مرحله ۱ — تمیز کردن قبل از push

- هیچ توکن Cloudflare داخل فایل‌ها نباشد  
- `wrangler.toml` فقط placeholder داشته باشد (`REPLACE_WITH_YOUR_D1_ID`)  
- `frontend/out` و `node_modules` در `.gitignore` باشند  
- `LICENSE` و `README.md` و `install.sh` و `install.ps1` و `install.cmd` موجود باشند  

---

## مرحله ۲ — کامیت و پوش

```bash
cd /Users/niroomand/Desktop/XRayMOD

git status
git add -A
git status   # چک کن secret نباشد

git commit -m "release: open-source one-click installer + FA panel"

git push -u origin main
```

اگر ریپو جدید ساختی:

```bash
gh repo create askarniroomand/XRayMOD --public --source=. --remote=origin --push
# یا
git remote add origin https://github.com/YOUR_USER/XRayMOD.git
git push -u origin main
```

---

## مرحله ۳ — تست دستور عمومی

**مهم:** بعد از push حدود ۱۰–۳۰ ثانیه صبر کن تا raw.githubusercontent.com آپدیت شود.

```bash
# تست روی یک ماشین تمیز / ترمینال جدید:
# Linux / macOS / Git Bash / WSL
bash <(curl -fsSL https://raw.githubusercontent.com/askarniroomand/XRayMOD/main/install.sh)

# Windows CMD / PowerShell
irm https://raw.githubusercontent.com/askarniroomand/XRayMOD/main/install.ps1 | iex

```

اگر ریپو یا برنچت فرق دارد:

```bash
# مثال فورک شخصی:
export XRAYMOD_REPO=https://github.com/YOUR_USER/XRayMOD.git
export XRAYMOD_BRANCH=main
bash <(curl -fsSL https://cdn.jsdelivr.net/gh/YOUR_USER/XRayMOD@main/install.sh)
```

> `install.sh` داخلش `REPO_URL` را از `XRAYMOD_REPO` می‌خواند؛ پیش‌فرض `askarniroomand/XRayMOD` است.

---

## مرحله ۴ — تنظیمات صفحه گیت‌هاب (اختیاری ولی حرفه‌ای)

در Settings ریپو:

| مورد | پیشنهاد |
|------|---------|
| Description | Modular proxy panel on Cloudflare Workers |
| Website | https://t.me/MRROBOT_DT |
| Topics | `cloudflare-workers`, `proxy`, `vless`, `panel`, `opensource` |
| License | MIT (از فایل LICENSE) |

در About → تیک Issues / Discussions اگر می‌خواهی.

---

## مرحله ۵ — برند شخصی تو

| چیز | کجاست |
|-----|--------|
| پشتیبانی تلگرام | `https://t.me/MRROBOT_DT` — در `install.sh`, `install.ps1`, `installer/cli_deploy.py`, پنل `support` |
| آدرس نصب | README + `install.sh` (یونیکس) + `install.ps1` / `install.cmd` (ویندوز) |
| نام ریپو | `askarniroomand/XRayMOD` |

اگر یوزرنیم گیت‌هاب عوض شد، هر سه جای URL را عوض کن:

- `install.sh` / `install.ps1` → `REPO_URL` / `XRAYMOD_REPO`
- `README.md` / `README.fa.md`
- این فایل `PUBLISH.md`

---

## مرحله ۶ — به‌روزرسانی بعدی برای کاربران

هر بار که کد را push کنی روی `main`، کاربر با **همان یک دستور** آخرین نسخه را می‌گیرد (اسکریپت `git pull` / clone تازه می‌کند).

---

## چک‌لیست قبل از اعلام عمومی

- [ ] `git push origin main` موفق  
- [ ] `curl -fsSL .../install.sh` بدون 404  
- [ ] `install.ps1` و `install.cmd` بدون 404 (ویندوز)  
- [ ] تست کامل نصب با یک توکن تست  
- [ ] لینک تلگرام پشتیبانی درست است  
- [ ] توکن واقعی / پسورد واقعی داخل git نیست  

---

## عیب‌یابی رایج

| مشکل | راه حل |
|------|--------|
| `404` روی install.sh / install.ps1 | push نشده یا نام برنچ/ریپو اشتباه |
| Node error | Node 18+ نصب شود |
| Token invalid | قالب Edit Cloudflare Workers |
| workers.dev 1101 | اکانت CF / subdomain؛ پشتیبانی بده |
| Bootstrap fail | چند ثانیه صبر؛ دوباره install |

---

## پشتیبانی کاربران

هدایت همه به: **https://t.me/MRROBOT_DT**
