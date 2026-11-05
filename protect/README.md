# Protection system (client + optional mock API)

## What this layer does

| Guard | Where | Behavior |
|--------|--------|----------|
| Trim + sanitize | `ProtectAPI.trim` / `sanitize` | Collapse whitespace, strip `<>` and control chars before use |
| Honeypot | login form field `website` | Hidden; if filled → robot reject |
| Timing | form `data-loaded-at` | Submit < 800ms after load → reject |
| Rate limit | localStorage `mg_rate_v1` | Max 6 attempts / 60s window |
| Session | localStorage `mg_session_v1` | Soft 7-day expiry; main page redirects if missing |
| Require member | `ProtectAPI.requireMember` | Hard bounce to login on main |

This is **demo hardening**. It stops casual scripted abuse and empty form spam in the browser. It does **not** stop a determined attacker with DevTools, nor replace server-side auth, CSRF tokens, password hashing, or TLS.

## "Hack API" division

Client surface lives on `window.ProtectAPI`:

- `loginAttempt({ name, email, password })`
- `getSession()` / `setSession` / `clearSession`
- `requireMember(redirect)`
- `validateLoginFields`
- `rateCheck` / `isRobot` / `markFormLoad`

Optional Node mock (`api/mock-api.js`) exposes the same idea as HTTP:

- `POST /api/login`
- `GET /api/me` (header `X-Session`)
- `POST /api/logout`
- `GET /api/health`

Swap the client `loginAttempt` body to `fetch('/api/login', …)` when you attach a real backend.

## Anti-patterns this does not fix

- XSS if you inject untrusted HTML without escaping (we avoid `innerHTML` on user data)
- Credential stuffing without server rate limits + captcha
- Session fixation / stolen localStorage tokens — use httpOnly cookies on real servers
- CSRF on state-changing server routes — use tokens

Ship server auth before production.
