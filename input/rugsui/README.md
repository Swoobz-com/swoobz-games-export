# rugsui — fixing the Rug or Riches UI over the full-bleed background

The vault background was extended full-bleed (good call — the page no longer feels empty), but that broke the panels: they now float loose on busy art and each block looks slightly different. This folder is the fix. `mockups/ror-settled-win-fixed.html` is the target — open it in a browser and replicate 1:1.

> Parent framework: **Swoobz Original Games Framework** (root folder), `data-game="rug-or-riches"`. Panel dictionary: `rugs or riches/README.md` (Z1–Z6 zones, P1–P6 panels).

## What went wrong (current build)

1. **No scrim.** The gold-bar art runs at full contrast straight under the panels, so panel edges fight the background everywhere.
2. **Inconsistent panels.** Play Style / Next Bet / Session Pulse / Verified each have slightly different fills, paddings and widths; the column hugs the screen edge.
3. **Win banner floats top-left** as a half-width box over the wheel art instead of sitting in the HUD zone at board width.
4. **Two BET AGAIN buttons** — one floating under the board, one in the column.
5. **Board plate too weak** and unopened safes at full strength, so the win result doesn't read as one image.

## The fix (exact spec)

### 1. Scrim layer (between the background art and the UI)

One overlay div on top of the art, under everything else:

```css
/* horizontal: keep the middle bright for the board, darken under the column & edges */
background: linear-gradient(90deg,
  rgba(12,17,14,.55) 0%,   /* left edge */
  rgba(12,17,14,0) 18%,
  rgba(12,17,14,0) 60%,    /* middle stays clear — the board owns the light */
  rgba(12,17,14,.88) 78%,  /* under the control column */
  rgba(12,17,14,.95) 100%);
```

Plus a bottom fade (70px, transparent → 90%) under the statusbar zone. The art stays full-bleed and visible; the UI gets guaranteed contrast. Never blur the art — darken it.

### 2. One panel token, everywhere

Every column element uses exactly: `background: rgba(16,22,19,.92) · border: 1px solid #2a352f · border-radius: 10px · padding: 10–12px`, full column width (212–320px), vertical gap 8px, and the column keeps a margin from the screen edge (it lives inside the shell padding, not glued to the viewport). Outline buttons on top of art also get the panel bg so they don't go transparent against gold bars.

### 3. Win banner in the HUD zone

`SECURED THE BAG · 4.51x +3.51 USDC` becomes the board-width banner (328–544px, height = HUD zone) directly above the board — green tint bg `rgba(18,36,26,.95)`, 1px `#21d07a` border. It REPLACES the HUD content at the same size so the board never shifts. Delete the floating top-left box.

### 4. One CTA

Remove the BET AGAIN pill under the board. The primary CTA lives only in the column slot: `BET AGAIN →` (filled green) with `SAME TRAIL →` (outline) and the NEW SETUP / SHARE row under it.

### 5. Board reads as one image

Board plate: `rgba(16,22,19,.9)` + border + 14px padding behind the grid. After settlement, unopened safes dim to **45% opacity**; opened coins keep full strength with their pick-order number. Caption strip under the board (`11 SAFES OPENED · PAID OUT AT 4.51x`) on its own pill background so it stays readable over art.

### Column order (settled state, top → bottom)

MANUAL/TRAIL toggle → NEXT BET panel → **BET AGAIN →** (CTA) → SAME TRAIL → NEW SETUP · SHARE → SESSION PULSE (best / W-L / net) → VERIFIED · VIEW RECEIPT line.

## Claude Code instruction

> Read this README + open `mockups/ror-settled-win-fixed.html`. On the settled/win page: add the scrim gradient layer over the full-bleed background (spec §1), normalize every column panel to the single panel token (§2), move the win banner into the HUD zone at board width (§3), delete the BET AGAIN under the board (§4), restore the board plate and dim unopened safes to 45% (§5). Keep the extended background exactly as it is — only the layers on top change.
