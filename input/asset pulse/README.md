# Pulse — candle crash: complete build package

Rebuild of the crash game **Pulse** with a unique twist: the multiplier moves like a market chart — candles, dips, fake-outs, a rare fake rug ("wick save") — and the round visibly continues after you cash out. Everything Claude Code needs is in this folder.

> **Parent framework (mandatory):** this game is built on the **Swoobz Original Games Framework** — see the `Swoobz Original Games Framework/` folder in the root. Use its `framework/tokens.css` + `shell.css` (theme block `[data-game="pulse"]` is already registered) instead of hand-rolling layout. Its `specs/` apply in full to this game: **sound-spec** (Pulse event table included: candle ticks, rug.start identical for real/fake rugs, wicksave.reverse), **motion-spec** (candle print, rug candle, wick save freeze-and-reverse), **social-layer-spec** (Pulse is the flagship: presence, exit flags, feed, share cards) and **fair-verifier-spec** (full candle path regeneration).

## Folder structure

```
asset pulse/
├── README.md                    ← this file (single source of truth)
├── mockups/                     ← LAYOUT SOURCE OF TRUTH — open in a browser
│   ├── pulse-example-live.html    (live round, dip in progress, cash-out decision)
│   └── pulse-example-crash.html   (settled round, rug candle, result state)
├── spec/
│   └── pulse-candle-crash-spec.md ← FULL price-behavior spec: candle generation,
│                                     fake-out vocabulary, wick save, spectator mode,
│                                     fairness constraints, tuning knobs. READ IN FULL.
└── art/
    └── get-assets.sh            ← downloads the generated art below
```

Note: the mockup HTMLs render the chart with a small JS candle renderer using the exact math the game should use (`y = 220 − (value − 1.0) × 160`, open = previous close). Reuse that renderer logic.

## Generated art

**Background (terminal room)** — sits behind the whole app, chart panel semi-transparent on top:

![Pulse background](https://d8j0ntlcm91z4.cloudfront.net/user_3FLbEdg3frPqTTQKyUf3xpB0P8k/hf_20260706_001102_490824ed-3141-422e-b920-9a96b29fb2b6.png)

**Wick save key visual** — art direction for the fake-rug moment (§3.1 of the spec) and marketing/share material:

![Wick save key visual](https://d8j0ntlcm91z4.cloudfront.net/user_3FLbEdg3frPqTTQKyUf3xpB0P8k/hf_20260706_001105_9d96b542-c62f-4e9f-a171-eab4ddf315de.png)

## Layout skeleton (same framework as the other Swoobz games)

```
rows:    56px (topbar) / 1fr (main) / 40px (statusbar)
columns: 1fr (chart) / 320px (control column)
```

- Topbar: `SWOOBZ · PULSE · R#### · SLOT ###` + LIVE pill | room info (`COHERENCE-1 · ## RDS`) | `BALANCE` (gold, ONLY here).
- HUD zone above the chart, exactly chart-width: big live multiplier (34–48px, cyan) + last-candle delta (`▼ −0.06` red / `▲ +0.09` teal) left; `ATH <x>` (gold) + `HOLDS TO 2.00x <p>%` right. The result banner replaces this zone at settlement (same height — layout never shifts).
- Chart panel: candlesticks, gridlines at 1.00/1.50/2.00/3.00x, gold dashed ATH line, teal dashed current-price line with pulse dot on the live candle. Caption strip under the chart narrates the state (`DIP −0.06 · RECOVERY POSSIBLE · OR THE REAL RUG`).
- Control column, top→bottom: YOUR WAGER → CASH OUT AT (live value + muted `PEAK WAS <x>`) → HOLDS TO 2.00x → AUTO CASH-OUT chips (off/1.2/1.5/2/3x) → hash/verified line → CTA (fixed bottom slot).
- CTA per phase: bet entry `COMMIT →` · live `CASH OUT <amount> AT <x>` (cyan, two-line) · after cashing `CASHED <amount> · WATCHING` (outline) · settled `BET AGAIN →`.
- Statusbar: phase narration left, recent crash-point pills right (teal = decent, red = early rug).
- The old wager modal becomes the control column on the bet-entry screen (no modal): wager stepper + quick chips 5/10/25/50/100, auto cash-out row, balance/min/RTP line, COMMIT CTA. Same skeleton, nothing floats.

## Theme tokens

```css
--bg:#060b12; --bg-deep:#03070d;
--panel:rgba(13,20,30,.93); --panel-border:#1e3346;
--text:#dcecf2; --text-muted:#7b93a6; --text-faint:#4d6478;
--up:#35e0d2; --up-deep:#0d3c38; --up-text:#8ff2e8;
--down:#ff5d5d; --down-bg:#2a1414;
--value:#f0b542;  /* balance, ATH, peaks */
```

Semantics: **cyan = up / player action** (green candles, cash out, commit), **red = down / danger** (red candles, rug, losses), **gold = value markers** (balance, ATH, crash line). Grid `#12202e`.

## The mechanics in one paragraph (full detail in spec/)

The crash point AND the entire candle path are derived from a committed seed before the round starts (provably fair — dips can never be steered against open positions). Candles tick every ~500ms with upward drift and noise; scripted pullbacks retrace 20–60% of recent gains but never below `max(1.00, ATH × 0.55)`. You cash out at the CURRENT candle price, not your peak — so every dip is a decision. Rarely (1–2% of rounds) a fake rug pierces the floor looking exactly like the real rug, then reverses into a god candle; cashing out stays open all the way down during it (the true rug candle is atomic and uncashable). After cashing out you stay in spectator mode: your exit is flagged on the chart, candles keep printing, and a live delta shows `LEFT ON THE TABLE +<x>` (amber) or `YOU DODGED THE RUG AT <x>` (teal) until settlement.

## Build order for Claude Code

1. Read the root `Swoobz Original Games Framework/` (README, COMPONENTS, all four specs) — the shell and quality bars come from there.
2. Read `spec/pulse-candle-crash-spec.md` in full.
3. Open both mockups in a browser; replicate layout and states 1:1 on top of `framework/shell.css` with `data-game="pulse"`.
4. Run `bash art/get-assets.sh`; place the terminal background in the `.sw-bg-art` layer.
5. Implement the seeded path generator (spec §2–3) + register its regeneration on the verifier page before any UI polish.
6. Implement cash-out at tick price + spectator mode (spec §6) — the retention core, not optional.
7. Map every event to the framework sound + motion vocabularies (Pulse rows already exist in both specs); wire social primitives (exit flags, presence, share cards).
