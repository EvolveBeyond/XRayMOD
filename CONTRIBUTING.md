# Contributing to XRayMOD

Thank you for investing time in this project. This guide keeps contributions safe, reviewable, and aligned with the architecture.

## Code of conduct

Participation is governed by [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).  
Violations can be reported privately via Telegram [@MRROBOT_DT](https://t.me/MRROBOT_DT).

## What we accept

| Welcome | Not welcome |
|:--------|:------------|
| Bug fixes with reproduction steps | Secrets, tokens, real `database_id`, production configs |
| Tests for worker routes | Drive-by refactors with no problem statement |
| Docs / translations improvements | Feature PRs with no issue discussion (for large changes) |
| UX polish on panel | Malware, credential stuffing, or abuse tooling |
| Performance and security hardening | Broken install scripts without platform notes |

## Development setup

### Prerequisites
- Node.js 20+
- npm 10+
- Wrangler CLI (`npm i -g wrangler`)
- Cloudflare account (free tier is enough)
- Git

### Clone and install
```bash
git clone https://github.com/askarniroomand/XRayMOD.git
cd XRayMOD
npm install
```

### Local worker (recommended path)
```bash
npm run setup          # root + frontend deps
npm run build:ui
npm run dev            # build UI + wrangler dev --local
# or:
npm run dev:worker
```

After first `POST /install`, all APIs live under `/{SECURE_PATH}/api/…` (Gen 1.9.12).
Bare `/api/*` returns 404 once the panel is configured.

### Tests
```bash
npm test               # offline smoke
npm run test:e2e       # local wrangler E2E (SECURE PATH aware)
```

Follow [README.md](./README.md) and [DEPLOY.md](./DEPLOY.md) for full panel bootstrap.  
Never commit a real `.env` or production `wrangler.toml` bindings.

## Project map (canonical)

```text
worker/          Cloudflare Worker runtime (source of truth)
frontend/        Admin UI (Next.js)
installer/       install.sh / install.ps1 helpers
docs/            Architecture, assets, guides
scripts/         Build and smoke tests
```

If you find a `backend/` Python tree, treat it as **legacy / optional** unless docs say otherwise. Prefer Worker TypeScript for new features.

## Branching

```bash
git checkout -b fix/short-description
# or
git checkout -b feat/short-description
```

- `main` is protected intent: only merge via PR
- One concern per PR
- Rebase on `main` before final review when possible

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```text
feat: add clash meta subscription flag
fix: prevent panel path leak on unknown host
docs: document /me query parameters
test: cover subscription base64 encoding
chore: bump wrangler
security: harden rate limit headers
```

Author identity must be your real name or consistent handle + valid email.  
Do not commit as generic names like `engineer` / `مهندس`.

## Coding standards

### TypeScript (Worker + UI)
- Prefer explicit types on exported functions
- No `any` unless justified in a comment
- Do not return raw internal exception strings to clients in production paths
- Keep stealth/disguise behavior behind clear modules (`disguise.ts`, processors)

### Security
- Never log API tokens, passwords, or full UUIDs in plain text
- Assume all external input is hostile
- Rate-limit auth endpoints
- Document threat model changes in PR body

### UI
- Preserve RTL / Persian support
- Keep contrast accessible
- No PII in screenshots

## Tests

Add or update tests when changing:
- Subscription generation
- Auth / session
- Routing / disguise
- Install bootstrap

```bash
npm test
# or project-specific:
npm run test:worker
npm run smoke
```

If a harness does not exist yet for your area, include a manual test plan in the PR.

## Pull request checklist

- [ ] Linked issue (or clear problem statement)
- [ ] Description of user-visible change
- [ ] Security impact notes
- [ ] Tests or manual verification steps
- [ ] Docs updated (README / CHANGELOG)
- [ ] No secrets in diff
- [ ] `npm test` / smoke passes locally

## Reporting bugs

Use the **Bug report** issue template. Include:
- OS + install method
- Worker URL pattern (redact UUID)
- Expected vs actual
- Logs with secrets stripped

## Security vulnerabilities

**Do not open a public issue.**  
Follow [SECURITY.md](./SECURITY.md).

## License

By contributing, you agree that your contributions are licensed under the MIT License covering this repository.
