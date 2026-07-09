# Pulse — new framework + candle crash

One **self-contained** React + Vite + TypeScript package that contains **both**:

1. **Candle crash** — the new rebuild (default game). Source: `src/candle/`.
2. **The full Pulse framework** (with our changes) — the real Original engine plus
   the shared Swoobz chassis. Source: `src/framework/` (`pulse/` + `_shared/`).

Everything each game needs lives inside this folder — nothing is imported from
outside it.

## What's inside

```
pulse-run/
├── index.html            # → runs CANDLE CRASH (default)
├── full-pulse.html       # → runs the FULL Pulse framework game
├── package.json
├── vite.config.ts        # 2 build entries + next/navigation shim alias
├── src/
│   ├── main.tsx          # mounts <PulseCandle/>      (candle crash)
│   ├── main-pulse.tsx    # mounts <PulseExperience/>  (framework game)
│   ├── tailwind-shim.css # the ~10 Tailwind utilities the games use
│   ├── shims/
│   │   └── next-navigation.ts    # local stub so no Next.js is required
│   ├── candle/           # ← CANDLE CRASH game
│   │   ├── PulseCandle.tsx, Chart.tsx, path.ts, sound.ts, theme.ts
│   │   └── assets/*.png
│   └── framework/        # ← THE FRAMEWORK (with our modifications)
│       ├── pulse/         # full original Pulse (37 files):
│       │   ├── PulseExperience.tsx (111 KB), PulseCurveCanvas.tsx,
│       │   ├── pulseProvider.ts, pulseMath.ts, pulseRank.ts, pulseRewards.ts …
│       │   └── *.test.ts(x)   # the framework's own test suite
│       └── _shared/       # shared chassis: audio/, onboarding/, BetConsole/
└── dist/                 # prebuilt output for BOTH pages (serve to view)
```

## Run it

```bash
npm install
npm run dev
```

Then in the browser:
- **candle crash** → http://localhost:5180/            (opens automatically)
- **framework game** → http://localhost:5180/full-pulse.html

## Build / preview

```bash
npm run build      # builds both pages into ./dist
npm run preview    # serves the built ./dist
```

`dist/` uses relative paths, so it can be served from anywhere:
`npx serve dist` → open `/` (candle) or `/full-pulse.html` (framework).

## Notes / known gaps

- **Candle crash** is fully self-contained (React + its own local assets).
- **Framework game visuals are fully procedural** (Canvas2D) — no image assets.
- **Framework audio is not included.** The Pulse engine references
  `/assets/music/pulse/*.ogg` and `/assets/raw/kenney/audio/pulse/*.ogg` at
  runtime; those `.ogg` files are not in this export, so the framework game runs
  **silently** (404s, no crash). To enable sound, drop the files under
  `public/assets/music/pulse/` and `public/assets/raw/kenney/audio/pulse/`.
- The only framework dependency, `next/navigation`, is stubbed by
  `src/shims/next-navigation.ts`.
- `node_modules/` and `dist/` are regenerable and can be omitted when sending.
- Build verified: `vite build` transforms 68 modules (both entries) with no errors.
