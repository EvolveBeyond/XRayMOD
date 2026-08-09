# Telegram Mini App UI (manager-scoped)

Bento + bottom-nav Mini App under `/twa/*`.

## Invite scoping

Open only with a manager ref:

- `/twa/user?ref=owner_demo`
- `/twa/user?ref=sponsor_demo`

Without `ref` / `startapp` → `/twa/invalid`.

`ManagerProvider` + `useManager()` filter protocols, proxies, servers, and wallet txs by `managerId`.

## Routes

| Path | Role |
|:-----|:-----|
| `/twa/user` | User bento dashboard |
| `/twa/user/proxies` | Scoped proxy list + sub combinator |
| `/twa/user/store` | Scoped store |
| `/twa/user/wallet` | Scoped wallet |
| `/twa/user/profile` | Language (FA/EN/RU/PT/TR/ZH) + admin toggle |
| `/twa/admin/owner` | Owner bento |
| `/twa/admin/sponsor` | Sponsor bento |
| `/twa/admin/protocols` | Protocol table + test dialog + pricing |

Translation keys: `frontend/locales/{fa,en,ru,pt,tr,zh}.json`
