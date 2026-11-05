# MemberGate — first-page membership gate

Static web + optional Node mock. Oval (pill) top bar, logo left, three actions right. Login collects name · email · password. Protect layer: trim, honeypot, rate limit, session. Main page only after membership.

## Files

```
member-gate-web/
  index.html          # first page — checks member, CTA to login or main
  login.html          # name + email + password + honeypot
  main.html           # logo + name + description + link (member only)
  css/style.css       # oval topbar, dark mall-clean UI
  js/protect.js       # protection system + ProtectAPI
  js/app.js           # page wiring
  api/mock-api.js     # optional local server + /api/* endpoints
  protect/README.md   # protect notes
  README.md           # this file
```

## Run (no install) — static

From this folder:

```bash
# Python 3
python3 -m http.server 8080

# or Node (if npx available)
npx --yes serve -l 8080
```

Open:

- http://127.0.0.1:8080/index.html

Flow:

1. Index checks `localStorage` session.
2. Not member → Login.
3. Submit name / email / password (honeypot empty, ≥6 char password).
4. Session written → Main.
5. Logout clears session → Index.

## Run with mock API (Node)

```bash
node api/mock-api.js
```

Open http://127.0.0.1:8787/

Static pages are served; JSON API is under `/api/*`. Client still uses localStorage by default. To wire the real mock login, change `ProtectAPI.loginAttempt` in `js/protect.js` to `fetch` the Node route and store the returned `token`.

## Customize

- Brand: edit `.brand-name`, `.brand-logo`, titles in HTML.
- Main outbound link: `main.html` → `.main-link` `href`.
- Colors: CSS variables in `css/style.css` (`--accent`, `--bg`, …).
- Rate limit: `MAX_ATTEMPTS` / `WINDOW_MS` in `js/protect.js`.

## Production note

Client-only session is for UI demo. Real membership needs server sessions (or JWT), hashed passwords, HTTPS, and server-side rate limits. Keep the protect guards as a first line; they are not the only line.
