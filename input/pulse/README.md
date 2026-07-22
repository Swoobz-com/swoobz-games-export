# Pulse — panel guide (column redesign v2)

Panel-by-panel documentation for the Pulse control column, matching the redesign mockups in this folder. Every element has ONE name — use these in prompts, code, and design talk.

> **Parent framework (mandatory):** built on the **Swoobz Original Games Framework** (root folder), `data-game="pulse"`. Full price-behavior rules live in the Pulse spec (`pulse-candle-crash-spec.md`, incl. wick save §3.1 and FOMC §3.2 / `fomc/` folder).

## Folder

```
pulse/
├── README.md   ← this file: panel dictionary + redesign rules
└── mockups/    ← LAYOUT SOURCE OF TRUTH — open in a browser
    ├── pulse-bet-entry-cluster.html   (bet entry with the action cluster)
    └── pulse-spectator.html           (after cash-out, round continues)
```

---

## The key change: the ACTION CLUSTER

The primary CTA no longer floats at the bottom of the column. It is the **footer of one fused panel** (`sw-action-cluster`), directly under the config it belongs to — no gap, no separate box, shared border, the button is edge-to-edge inside the panel:

```
┌──────────────────────────────┐
│ AUTO CASH-OUT   [chips]      │  ← config
├──────────────────────────────┤  ← 1px divider
│ MIN 1.00 · RTP 95.5%  hash ✓ │  ← info row (bare, inside)
├──────────────────────────────┤
│         COMMIT →             │  ← CTA footer (filled, full width)
└──────────────────────────────┘
```

**The cluster is the fixed CTA slot for Pulse — in every phase.** Only the footer content changes:

| Phase | Cluster footer | Cluster body |
|---|---|---|
| Bet entry | `COMMIT →` (filled cyan) | auto cash-out chips + min/rtp/hash row |
| Live (holding) | `CASH OUT <amt> AT <x>` (filled cyan, pulses on red candles) | live cash-out value + peak line |
| Spectator (cashed) | `NEXT ROUND IN <n>s · BET AGAIN →` (outline cyan) | CASHED amount + live delta line |
| Settled (rugged) | `BET AGAIN →` (filled cyan) | loss summary |

## Panel dictionary

### Screen zones (shell)

| # | Name | Notes |
|---|---|---|
| Z1 | **Topbar** | brand · round · LIVE pill left / room + `<n> HOLDING` center / Balance right (gold, ONLY here). **TEST buttons (pump/dump/wick/spike) go behind a `?dev=1` flag — never in production topbar** |
| Z2 | **HUD zone** | live multiplier + last-candle delta left · `ATH <x>` (gold) + **Target ladder** right |
| Z3 | **Chart** | candles, gridlines, gold ATH dashed line, teal current-price line + pulse dot, **Exit flags** |
| Z4 | **Caption strip** | one line narrating the phase (`YOU CASHED AT 1.38x · PRICE KEEPS CLIMBING …`) |
| Z5 | **Control column** | 210–320px, panels below |
| Z6 | **Statusbar** | phase text left · `LAST ROUNDS` pills right |

### Control column panels

| # | Name | Behavior |
|---|---|---|
| P1 | **Wager panel** | stepper + quick chips (active chip = gold). Live/spectator: dimmed 50% with label `YOUR WAGER · LOCKED` |
| P2 | **Action cluster** | see above — config + info row + CTA footer, one fused panel. On spectator the CASHED content becomes the cluster body (player-cyan border = hero panel) |
| P3 | **Last round panel** *(bet entry only)* | ghost sparkline of the previous round + `RUGGED AT <x>` row. Also mirrored as a faint ghost line inside the empty chart (Z3) |
| P4 | **Round telemetry** *(live/spectator)* | three columns: ATH (gold) · DIPS (red) · NEXT target + % (cyan) |
| P5 | **Live feed** | system-generated rows (commits, cash-outs, aggregate rug counts, `<n> STILL HOLDING`). Flexes to fill remaining column height — this kills the empty gap |
| P6 | **Hash row** | bare centered line `HASH <short> ✓ · RECEIPT`, links to /verify |

### The target ladder (Z2 + P4)

Never show a reached target. The ladder always displays the next UNREACHED milestone with its live probability: at 1.0x → `2.00x · 50%`; once 2.00x prints → `3.00x · …`; at 3.62x → `4.00x · 38%`. A "chance 100%" on screen is a bug by definition.

### Exit flags (Z3)

Your cash-out: player-cyan flag `YOU 1.38x`, always on top, persists to settlement. Other players: faint gray flags (max 12, cluster into `+n` beyond). Flags render behind the price line.

## What was removed (do not re-add)

- The balance/min/rtp **box** above COMMIT (balance lives in Z1; min/rtp is the cluster info row).
- The standalone `CHANCE IT REACHES 2.00x` panel (replaced by the target ladder in Z2/P4).
- The CTA text duplicating the CASHED panel (`CASHED 13.83 · WATCHING` → countdown CTA).
- The dead vertical gap (P5 Live feed flexes to fill).
- TEST buttons in the topbar (dev flag only).

## Instruction to Claude Code

> Rebuild the Pulse control column per this README: P1 wager (locked-state on live), P2 action cluster as ONE fused panel whose footer is the phase CTA (see phase table), P3 last-round ghost on bet entry, P4 round telemetry with a target ladder that never shows reached targets, P5 live feed flexing to fill the column, P6 bare hash row. Add exit flags to the chart, move TEST buttons behind `?dev=1`. Replicate `mockups/*.html` 1:1 on the Swoobz Original Games Framework shell with `data-game="pulse"`.
