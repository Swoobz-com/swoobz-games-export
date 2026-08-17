# AUTOMAT — deploy to Vercel

A demo build of **AUTOMAT**, a Swoobz Original. Vite + React, no backend, no
database, no API keys. Everything it needs is in this folder.

## Deploy (Vercel, ~2 minutes)

Vercel auto-detects the setup from `vercel.json`, so there is nothing to
configure by hand.

**Option 1 — Vercel CLI**

```bash
npm install -g vercel
cd automat
vercel            # preview URL
vercel --prod     # production URL
```

**Option 2 — Git import**

Push this folder to a repo, then on vercel.com: *Add New → Project → Import*.
Accept the detected settings and deploy.

| Setting | Value (auto-detected) |
|---|---|
| Framework | Vite |
| Install command | `npm install` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Node version | 18 or newer |

## Run it locally first (optional)

```bash
npm install
npm run dev       # http://localhost:5283
```

## What the demo is

A porcelain vending machine that vends **multiplier packs**. Pick a machine
(EASY / MEDIUM / HARD), set a pack price and a pack count, hit VEND. Each pack
resolves independently against one fixed public prize table; 1 in 20 packs
vends a GOLD pack.

- **No real money and no payment integration.** The balance is a hardcoded
  demo figure of 1000.00 USDC that resets on refresh.
- Nothing is stored and nothing is sent anywhere — it is entirely client-side.
- Runs on desktop and mobile browsers.

## Known notes for the demo

- Fonts load from Google Fonts, so the first paint needs a network connection.
- The build is asset-heavy (~47 MB, mostly machine art), which is well within
  Vercel's limits but makes the first load on a cold cache a moment slower.
