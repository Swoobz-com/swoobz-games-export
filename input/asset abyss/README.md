# Abyss Line — complete asset & build package

Rebuild "The Assay Line" as **Abyss Line** (sunken treasure theme). Everything Claude Code needs is in this folder. Start here, follow top to bottom.

## Folder structure

```
asset abyss/
├── README.md                  ← this file (single source of truth)
├── mockups/                   ← LAYOUT SOURCE OF TRUTH — open in a browser
│   ├── abyss-line-example-entry.html
│   └── abyss-line-example-setup.html
├── vector/                    ← flat-vector placeholders (usable day 1)
│   ├── abyss-line-background.svg
│   └── abyss-line-assets.svg
├── spec/
│   ├── abyss-line-asset-map.md        ← asset naming, states, sizes, icons
│   └── rug-or-riches-layout-spec.md   ← shared layout system (grid, zones)
└── art/                       ← generated art lands here
    ├── get-assets.sh          ← RUN THIS FIRST (downloads all PNGs)
    ├── bg/  sprites/  reference/
```

## Step 0 — download the art

```bash
cd "asset abyss/art" && bash get-assets.sh
```

## The assembled result — what you are building

These two renders show the finished screens with background, board, and UI assembled together. Study them before writing any code (they download into `art/reference/`, also embedded here):

**Entry screen, assembled:**

![Entry screen assembled](https://d8j0ntlcm91z4.cloudfront.net/user_3FLbEdg3frPqTTQKyUf3xpB0P8k/hf_20260705_234318_9f2e9513-fab3-447e-9d98-82a76948cadc.png)

**Plot-your-line screen, assembled (route seals, depth cards, haul gauge, bet, run button):**

![Plot screen assembled](https://d8j0ntlcm91z4.cloudfront.net/user_3FLbEdg3frPqTTQKyUf3xpB0P8k/hf_20260705_234324_8c1007ac-569a-4a23-8599-a5f0edc521f3.png)

These renders are ART DIRECTION references: colors, mood, assembly. For exact spacing, sizes and copy, the `mockups/*.html` files win — open them in a browser and replicate them 1:1.

## The raw ingredients

**Background (midnight zone, 4K available via script):**

![Background](https://d8j0ntlcm91z4.cloudfront.net/user_3FLbEdg3frPqTTQKyUf3xpB0P8k/hf_20260705_233345_41a22624-6ff4-49af-b08c-37ee99e60013.png)

**Token sheet** — slice from the transparent version (`sprites/abyss-tokens-transparent.png`), left→right: ducat idle · ducat selected (cyan ring + numbered teal wax seal) · ducat revealed-gold · ducat cracked (red glow) · naval mine · submarine. Export 192×192 each, trim:

![Tokens](https://d8j0ntlcm91z4.cloudfront.net/user_3FLbEdg3frPqTTQKyUf3xpB0P8k/hf_20260705_233346_6dd2461d-9c31-48bb-9ab4-bd6dabba7e32.png)

**UI kit** — brass haul gauge (draw the needle in code so it can animate), 9-slice panel frame, gold + cyan buttons, toggle, bet chips, haul net:

![UI kit](https://d8j0ntlcm91z4.cloudfront.net/user_3FLbEdg3frPqTTQKyUf3xpB0P8k/hf_20260705_233350_2d308329-3b2d-4e52-b127-4131db64cb20.png)

**Depth variants** — swap the background per depth, UI unchanged:

![Reef Shelf](https://d8j0ntlcm91z4.cloudfront.net/user_3FLbEdg3frPqTTQKyUf3xpB0P8k/hf_20260705_234256_0b5df7ba-db63-4ff6-8363-eb811a8c4799.png)

![Hadal Trench](https://d8j0ntlcm91z4.cloudfront.net/user_3FLbEdg3frPqTTQKyUf3xpB0P8k/hf_20260705_234257_46798f3a-cff0-49ee-ac3d-9c16a9400c01.png)

---

## Layout skeleton (identical on every screen)

CSS grid app shell, full viewport:

```
rows:    56px (topbar) / 1fr (main) / 40px (statusbar)
columns: 1fr (playfield) / 320px (control column)
```

- Topbar and statusbar span both columns. Outer margin 24px, gutter 24px, panel gap 12px, panel padding 16px.
- Playfield: HUD zone (64px, exactly board-width) above a centered board panel; board = grid + 24px symmetric padding; centered horizontally AND vertically. Caption line under the board.
- Control column: fixed 320px, all panels full width on one vertical axis. Primary CTA always in the same bottom slot; only its label changes per phase.
- Background: cover, centered; the submarine light cone points at the board. Background never moves between screens.
- Spacing scale 8/12/16/24. Panel radius 10–12px. Buttons 44px primary / 36px secondary. Labels 11px caps above values, values 16–20px, hero numbers 40–48px, monospace throughout.

## Theme tokens

```css
--bg-deep:#03090f; --bg-water:#081b28; --bg-water-light:#103042;
--panel:rgba(16,26,36,.93); --panel-border:#2c4356;
--text:#e6f1f5; --text-muted:#87a6b5;
--player:#35e0d2; --player-deep:#0d3c38; --player-text:#8ff2e8;
--gold:#f0b542; --gold-mid:#d9a94f; --gold-dark:#8a6a26; --gold-light:#f5d98a;
--danger:#ff5d5d; --wood:#6e4526;
```

Strict semantics: **cyan = player** (claim line, toggles, primary CTA, selection) · **gold = value** (balance, multipliers, haul, chips) · **red = danger** (mine, cracked, bust). Panels semi-transparent so the scene shows through.

## Screens

### Entry
Topbar `SWOOBZ · ABYSS LINE` | `RTP 96.50%` | `BALANCE <n>` (gold, ONLY here). HUD: `ABYSS LINE` left, `SONAR ACTIVE` (cyan) right. Board: full grid of `ducat_idle`. Caption: `TRACE 8–60 DUCATS · ONE CRACKED DUCAT BUSTS THE DIVE`. Column: THE DIVE (4 steps) → DIVE DEPTH (3 rows, max in gold) → CTA `ENTER THE DIVE →` (cyan). Statusbar: `THE WRECK OF THE GOLDEN SLEDGE · DEPTH 3,800M` | `PLAY SAFE ↗`.

### Plot your line
HUD: depth name + `<n> CRACKED DUCATS ON THE FLOOR` left; `UP TO <max>x` (gold) + `LINE HOLDS → <n>x` (cyan) right. Board: `ducat_selected` with route numbers, dashed cyan connector. Caption: `SELECT <n> MORE DUCATS · MIN 8 · POTENTIAL <n>`. Column top→bottom: 3 depth cards (selected = cyan glow; `NAME · <cracked>` + max) → CLAIM LINE (`<n> / 8 MIN`, CLEAR, pace toggle DISC-BY-DISC / INSTANT) → HAUL (brass gauge, cyan arc, gold needle, `UP TO <n>x IF THE LINE HOLDS`; needle overshoots on every claimed ducat) → YOUR BET (−/+ and chips 1/5/10/25/50, active chip gold) → CTA. Disabled CTA carries the reason: `RUN THE LINE · 3 MORE`; enabled: cyan `RUN THE LINE →`.

### Run + result (same skeleton)
Sub sprite travels the route; each ducat flips to `ducat_gold`; gauge ticks up; bet panel dims (`LOCKED`). Mine: flip to `ducat_cracked`, red shockwave, screen shake, red banner. Result banner replaces the HUD zone (same height, board never shifts): win = teal `SECURED THE HAUL · <mult>x +<amount>`, bust = red `RUGGED BY THE DEEP · −<bet>`. CTA becomes `DIVE AGAIN →`, secondary `SAME LINE`; unopened ducats dim to 40%.

## Polish backlog (priority order)
1. Per-depth ducat emblem (coral / crescent / skull) on the coin stamp.
2. Wax-seal stamp-down animation + water ripple on selection.
3. Caustic light pattern over the board, 6–8% opacity, slow drift.
4. Idle shine sweep across 2–3 random ducats every few seconds.
5. Parallax: walls/props/particles at 3 depths follow cursor; bubbles rise; kelp sways.
6. Cash-out: sub blows ballast and rises with the haul net.

## Mechanics (unchanged)
Trace a claim line of 8–60 ducats → run it ducat-to-ducat → each safe ducat multiplies the haul → one cracked ducat busts → cash out anytime the line holds. Depths: Reef Shelf 6 cracked / 8.95x · Midnight Zone 8 / 19.16x · Hadal Trench 16 / 446.12x. RTP 96.50%.
