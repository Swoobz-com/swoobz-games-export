# Rug or Riches — panel guide & bet-entry redesign

Panel-by-panel documentation for the Rug or Riches UI. Every element has ONE name — use these names in prompts, code, and design talk so there is never confusion about "which block".

> **Parent framework (mandatory):** built on the **Swoobz Original Games Framework** (root folder). Theme block `[data-game="rug-or-riches"]` is registered in `framework/tokens.css`. Layout skeleton, CTA rules, sound/motion/social/verifier specs all come from there.

## Folder

```
rugs or riches/
├── README.md        ← this file: the panel dictionary + redesign rules
├── mockups/
│   └── ror-bet-entry-picker.html   ← bet entry with the redesigned world picker (open in browser)
└── spec/
    └── rug-or-riches-layout-spec.md ← original per-screen layout spec (Ready / Live / Result)
```

---

## Panel dictionary — every element by name

### Screen zones (the shell — same on every screen)

| # | Name | Where | Contents |
|---|------|-------|----------|
| Z1 | **Topbar** | top, full width, 56px | game + round + phase left · context stat center · **Balance** right (gold; balance lives ONLY here) |
| Z2 | **HUD zone** | above the board, exactly board-width, 64px | pre-round: chosen world + rug config · live: pump multiplier + rug risk · settled: replaced by the **Result banner** (same box, board never moves) |
| Z3 | **Board** | centered in the playfield | the 5×5 (or 7×7) grid of safes inside the board plate (grid + 24px symmetric padding) |
| Z4 | **Caption strip** | one line under the board | phase narration (`PICK YOUR WORLD AND BET · THEN SEND IT`) |
| Z5 | **Control column** | right, 320px fixed | all panels below (P1–P6), one vertical axis |
| Z6 | **Statusbar** | bottom, full width, 40px | phase text left · **Recents pills** right (recents live ONLY here) |

### Control column panels — bet entry screen (top → bottom)

| # | Name | What it is | Key rules |
|---|------|-----------|-----------|
| P1 | **World picker** | column label (`PICK YOUR WORLD` + `1/3` counter) followed by three **World cards** | NO wrapper box around the cards — they are flat siblings in the column. Counter shows `CUSTOM` when the rugs slider (P2) is moved off a preset |
| P1a | **World card** (×3) | one selectable option: Bluechips / Altseason / Shitcoin | identical anatomy for all three (see below). Selection = player-green border + tint + colored icon. Exactly one selected at all times |
| P2 | **Rugs slider** | rug-count control, linked to the picker | selecting a world sets the slider to its preset; moving the slider flips P1's counter to `CUSTOM`. Header row: `RUGS` left, `22 SAFE` right |
| P3 | **Bet panel** | `YOUR BET` stepper + quick chips 1/5/10/25/50 | active chip = gold border/text (money = gold, always) |
| P4 | **To-win row** | single bare row: `TO WIN` left, `UP TO <x> · MAX <amt>` right in green | NOT a boxed panel — just a row. Updates live with P1/P2/P3 |
| P5 | **Primary CTA** | `SEND IT →` | bare `sw-cta` at the column bottom. NO surrounding box, NO balance line above it (balance is in Z1). Label changes per phase (`SEND IT` / `GO` / `TAKE PROFIT` / `BET AGAIN`) but the slot never moves |
| P6 | **Session panel** *(live/result screens)* | net / best / W-L in three equal columns | appears from the first round onward; zeroed-but-present on Ready so nothing jumps |

### World card anatomy (P1a) — left to right

```
[ icon tile ] [ TITLE + tier pill ]        [ 8.95x ]
              [ meta: 3/25 · 5×5 ]         [  MAX  ]
[ risk bar ————————————————————————————————————————]
```

1. **Icon tile** — 34–38px rounded square, tinted bg; icon per world: ◆ diamond (Bluechips) · rocket (Altseason) · skull (Shitcoin). Colored only when selected.
2. **Title** + **Tier pill** (`NORMAL` green / `HARD` neutral / `CRAZY` red-tinted).
3. **Meta line** — `rugs/tiles · grid` (+ `BEST <x>` badge in gold if the player has one).
4. **Max multiplier anchor** — the big number, right-aligned, same x-position on every card, `MAX` label under it. This is what players compare; make it scannable in one vertical sweep.
5. **Risk bar** — 3px bar along the card bottom; fill width = rugs ÷ tiles (12% / 20% / 49%), danger red. Risk is seen, not read.

**States:** default (panel bg, hairline border) · hover (border-strong) · selected (player tint + player border + colored icon) · disabled (40% opacity, e.g. insufficient balance for a room minimum).

### What was removed in the redesign (do not re-add)

- The outer wrapper/border around the picker (panel-in-panel = double borders).
- The tagline `more rugs · bigger pumps` (the risk bar tells that story).
- The `BALANCE` box above SEND IT (duplicate of Z1).
- Text-only unselected options (every option is always a full card).

## Live & Result screens

Same shell; the column swaps content, positions never change: P3 dims to `LOCKED` during a round; CTA label cycles; the HUD zone (Z2) shows pump multiplier + rug risk live and becomes the Result banner at settlement; P6 updates. See `spec/rug-or-riches-layout-spec.md` for the full per-screen breakdown.

## Instruction to Claude Code

> Rebuild the bet-entry control column per this README: flat world cards (P1a anatomy incl. max-anchor and risk bar), preset-linked rugs slider (P2), bare to-win row (P4), bare SEND IT CTA (P5). Remove the wrapper, tagline, and balance box. Replicate `mockups/ror-bet-entry-picker.html` 1:1 on the Swoobz Original Games Framework shell with `data-game="rug-or-riches"`.
