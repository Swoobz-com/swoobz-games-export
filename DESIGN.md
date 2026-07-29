---
name: STANDOFF
description: Rock-paper-scissors rebuilt as an arcade fighter — a lit cabinet in an unlit room.
colors:
  ink: "#07080c"
  coal: "#0d0f15"
  cyan-text: "#00d0de"
  cyan-glow: "#29e6ff"
  cyan-fill: "#0ea5e9"
  bone: "#f2f3ef"
  fog: "#98a1b3"
  fog-deep: "#4a5261"
  gold: "#ffc83d"
  gold-deep: "#b8860b"
  gold-hairline: "rgba(191, 138, 26, 0.5)"
  blood: "#ff4135"
  glass: "rgba(13, 15, 21, 0.72)"
  plate-cover: "#0d0f15"
  plate-edge: "rgba(255, 255, 255, 0.08)"
typography:
  display:
    fontFamily: "Anton, sans-serif"
    fontWeight: 900
    letterSpacing: "0.06em"
    lineHeight: 1
  title:
    fontFamily: "Space Grotesk, system-ui, sans-serif"
    fontSize: "calc(var(--sw) * 1.35)"
    fontWeight: 900
    letterSpacing: "0.08em"
  label:
    fontFamily: "Space Grotesk, system-ui, sans-serif"
    fontWeight: 800
    letterSpacing: "0.08em"
  body:
    fontFamily: "Space Grotesk, system-ui, sans-serif"
    fontWeight: 600
    letterSpacing: "0.08em"
  mono:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "calc(var(--sw) * 0.95)"
    fontWeight: 600
    letterSpacing: "0.08em"
rounded:
  hairline: "calc(var(--sw) * 0.18)"
  plate: "calc(var(--sw) * 0.25)"
  control: "calc(var(--sw) * 0.3)"
  button: "calc(var(--sw) * 0.35)"
  card: "calc(var(--sw) * 0.6)"
  disc: "50%"
spacing:
  hair: "calc(var(--sw) * 0.06)"
  xs: "calc(var(--sw) * 0.25)"
  sm: "calc(var(--sw) * 0.5)"
  md: "calc(var(--sw) * 0.9)"
  lg: "calc(var(--sw) * 1.2)"
components:
  button-primary:
    backgroundColor: "{colors.coal}"
    textColor: "{colors.bone}"
    typography: "{typography.label}"
    rounded: "{rounded.button}"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.coal}"
    textColor: "{colors.bone}"
  input-stake:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.bone}"
    typography: "{typography.mono}"
    rounded: "{rounded.control}"
    height: "44px"
  card-surface:
    backgroundColor: "{colors.coal}"
    textColor: "{colors.bone}"
    rounded: "{rounded.card}"
    padding: "calc(var(--sh) * 1.6) calc(var(--sw) * 1.4)"
  pick-button:
    backgroundColor: "{colors.glass}"
    textColor: "{colors.bone}"
    typography: "{typography.title}"
    height: "44px"
---

# Design System: STANDOFF

## Overview

**Creative North Star: "Arcade Cabinet in a Dark Room"**

Everything is lit against near-black. The stage is a single aspect-locked box with a heavy inset
vignette (`0 0 120px rgba(0,0,0,0.7) inset`) that binds arena art, fighters and HUD into one
illuminated volume, the way a cabinet bezel binds a CRT. Nothing floats on a page; there is no
page. There is a lit box, and the room around it is dark.

The material vocabulary inside that box is armour: near-black lacquer backings, steel faces cut
into angled parallelograms that lean toward screen centre, and a gold hairline marking every
authoritative edge. This is stated in the source itself as the *RONIN ZERO lacquer-blade
language*. Health is not a bar that shrinks — it is a row of plates that get covered. Type is
skewed, gradient-clipped Anton for callouts and disciplined Space Grotesk for anything you
operate.

The system's defining technical decision is that **it has no breakpoints at all**. Every
dimension, radius, gap and type size is expressed in `--sw` / `--sh` — hundredths of the stage
box, set by a ResizeObserver — and the box itself is aspect-locked to the arena artwork. The
layout therefore cannot break between phone and desktop, because there is only one layout,
scaled. This is how STANDOFF holds both surfaces as equally primary rather than treating one as
a degraded version of the other.

**Key Characteristics:**
- Lit box on black; the vignette is structural, not decorative
- Lacquer plate + angled blade cut + gold hairline as the recurring form
- Stage-relative units everywhere; zero media queries
- Sub-100ms controls, 220–260ms consequences, 600ms scene changes
- Cyan rationed and brightness-laddered for OLED safety

## Colors

A cold, near-black palette where one accent hue does the talking and two signal colours are held
in reserve for meaning.

### Primary
- **Signal Cyan** — the Swoobz brand accent, deliberately rationed. It appears as three values
  that are an **OLED-bloom safety ladder, not three separate roles**: the dimmer `cyan-text`
  (#00d0de) for small text under 32px where the brighter value blooms, `cyan-glow` (#29e6ff) for
  large text and glows, and `cyan-fill` (#0ea5e9) for solid fills and bar bodies. Used for
  interactive focus, HP plate faces, and emphasis — never as a general surface tint.

### Secondary
- **Season Gold** (#ffc83d, deep #b8860b): authority and framing. Its most important form is
  `gold-hairline` — a half-opacity gold stroke that marks the edge of every plate that owns
  something (nameplates, health bars). Also carries reward and victory callouts.

### Tertiary
- **Blood** (#ff4135): damage and danger only. Lost health, danger banners, critical states. It
  never appears decoratively.

### Neutral
- **Ink** (#07080c): the base. The room, the unlit space, the stage backstop.
- **Coal** (#0d0f15): panel and plate bodies.
- **Bone** (#f2f3ef): primary text and specular top edges on plates.
- **Fog** (#98a1b3) and **Fog Deep** (#4a5261): secondary text and the lower steps of blade-face
  gradients.
- **Glass** (`rgba(13,15,21,0.72)`): translucent panels that sit over the arena.
- **Plate Cover** (#0d0f15, fully opaque) and **Plate Edge** (`rgba(255,255,255,0.08)`).

### Named Rules

**The OLED Bloom Rule.** Cyan has three values and the choice is driven by *size*, not meaning:
below 32px use `cyan-text`; for large text and glows use `cyan-glow`; for fills use `cyan-fill`.
Using the bright value on small text blooms on OLED and is a defect.

**The Cover-Plate Law.** Any HUD element that sits over baked background artwork must be a
**fully opaque** backing across its whole footprint. Translucency here is not a style choice —
at alpha 0.94 the baked "PLAYER 1" text ghosted through. Opaque backing first, decorative face
on top.

**The One Job Rule.** Cyan means live and interactive. Gold means authority and reward. Blood
means damage. A colour used for a second job weakens the first.

## Typography

**Display Font:** Anton (with sans-serif fallback)
**Body / UI Font:** Space Grotesk (with system-ui, sans-serif)
**Numeric / Mono Font:** JetBrains Mono (with monospace)

**Character:** Anton is the shout — condensed, heavy, skewed −6° and gradient-clipped from bone
through fog to fog-deep, so callouts read as stamped metal rather than coloured text. Space
Grotesk is the operator's voice: geometric, wide-tracked, uppercase, unglamorous. JetBrains Mono
carries anything a player counts or verifies — stakes, multipliers, timers, the triangle legend
— where digit alignment matters more than personality.

### Hierarchy
- **Display / Banner** (Anton, 900, `letter-spacing: 0.06em`, skew −6°): ROUND 1, FIGHT!, K.O.,
  FLAWLESS. Gradient-clipped, outlined with tight stacked drop-shadows.
- **Title / Pick Label** (Space Grotesk, 900, `calc(var(--sw) * 1.35)`, `0.08em`): STRIKE /
  THROW / BLOCK on the pick controls — the most important words on the screen.
- **Label / Button** (Space Grotesk, 800, `0.08em`, uppercase): every actionable control.
- **Body** (Space Grotesk, 600, `0.08em`): supporting UI copy.
- **Mono** (JetBrains Mono, 600, `calc(var(--sw) * 0.95)`, `0.08em`): stakes, multipliers,
  counters, the permanent triangle legend.

### Named Rules

**The No-Stroke Rule.** Never apply `-webkit-text-stroke` to gradient-clipped display text.
Chrome sprays miter-spike artifacts at sharp glyph corners. Fake the outline with tight stacked
`drop-shadow()` filters instead.

**The Countable Numbers Rule.** Anything the player counts, verifies or stakes money on is set
in JetBrains Mono. Money and mono are the same decision.

## Layout

The stage is a single aspect-locked box: `width: min(100vw, calc(100vh * var(--stage-ar)))`,
`height: min(100vh, calc(100vw / var(--stage-ar)))`, with `--stage-ar` set inline per arena from
the artwork's own ratio (1.83333 for the 2816×1536 cathedral, 2752/1536 for the clean arenas).
Because the box takes the art's aspect, `cover` and `contain` coincide and the arena never crops.

`--sw` and `--sh` are the stage's width and height divided by 100, written by a ResizeObserver.
**Every size in the system is a multiple of these**, so the entire interface scales as one piece.

**There are no media queries.** Responsiveness is achieved by the unit system, not by
breakpoints — which is precisely why phone and desktop can both be primary. A layout that needs
a breakpoint to survive is a layout that has left the system.

Spacing rhythm runs in `--sw` multiples, most commonly `0.5` (the workhorse gap), with `0.25`,
`0.3`, `0.6`, `0.9` and `1.2` for progressively looser separation and `0.06` reserved for
hairline borders.

### Named Rules

**The Stage-Unit Rule.** No raw `px` for anything that should scale. The only sanctioned `px`
values are accessibility floors — notably `min-height: 44px` on every interactive control, which
must survive at any stage size.

**The Aspect-Follows-Art Rule.** `--stage-ar` comes from the arena artwork, never a fixed
guess. New artwork with a new ratio sets a new `--stage-ar`; it is not cropped to fit.

## Elevation & Depth

**Flat plates; light does the depth.** There is no drop-shadow elevation ladder in this system —
nothing is "raised 4dp". Surfaces are flat lacquer, and depth is produced two ways: a **bevel**
baked into each plate as an inset specular top edge (`inset 0 Ysh rgba(242,243,239,0.5)`) and a
honed dark bottom edge (`inset 0 -Ysh rgba(4,10,16,0.55)`), and an **outer glow** used purely as
emphasis and state.

Glow is never height. A cyan glow on a control means *focused*; a gold glow means *significant*;
a red glow means *damage*. None of them mean "closer to the viewer".

### Shadow Vocabulary
- **Stage vignette** (`0 0 120px rgba(0,0,0,0.7) inset`): binds the whole box into one lit
  volume. Structural — the cabinet bezel.
- **Plate bevel** (`inset 0 ±Y 0` bone / near-black pair): the component-level depth mechanism.
- **Focus glow** (`0 0 calc(var(--sw) * 0.6) rgba(41,230,255,0.4)`): interactive focus and hover.
- **Reward glow** (`0 0 calc(var(--sw) * 0.35–0.6) rgba(255,200,61,0.5–0.65)`, often with an
  inset companion): gold significance.
- **Damage glow** (`0 0 calc(var(--sw) * 0.5–0.7) rgba(255,65,53,0.7)`): impact and critical HP.
- **Cast shadow** (`0 calc(var(--sh)*0.3) calc(var(--sh)*0.6) rgba(0,0,0,0.7)`): grounds
  fighters and floating elements against the arena, not an elevation step.

### Named Rules

**The Glow-Is-State Rule.** Outer glow communicates state, never elevation. If an element glows
at rest with no state behind it, remove the glow.

## Shapes

The form language is **cut armour**. The recurring silhouette is a parallelogram: health
segments and nameplate faces are clipped to angled cuts
(`polygon(14% 0, 100% 0, 86% 100%, 0 100%)`), **mirrored per side so both players' plates lean
toward screen centre**. The lean is directional information, not decoration — it points at the
fight.

Radii are small relative to element size and expressed in stage units: hairline `0.18sw` on
health bars, `0.25sw` on nameplates, `0.3sw` on inputs, `0.35sw` on buttons, `0.6sw` on cards.
Full `50%` is reserved for map nodes and discs. Borders are thin and deliberate: `0.06sw`
hairlines, gold at half opacity where a plate carries authority, white at 8% where it merely
contains.

### Named Rules

**The Mirrored Lean Rule.** Every angled cut leans toward screen centre, mirrored between p1 and
p2. An unmirrored cut reads as a mistake because it points the wrong fighter's authority
outward.

**The Rectangular Backing Rule.** Angle the *inner face*, never the outer cover plate. The outer
rect must stay rectangular and opaque because it is what masks the baked artwork beneath.

## Components

### Buttons
- **Shape:** softly cut corners (`calc(var(--sw) * 0.35)`), hairline border in plate-edge white.
- **Primary:** vertical coal gradient (`#1a1d26` → `#0d0f15`), bone text, Space Grotesk 800
  uppercase at `0.08em`, `min-height: 44px`.
- **Hover / Focus:** lifts `translateY(-2px)`, border turns Signal Cyan, cyan focus glow. All in
  **90ms** — the control layer must feel mechanical.
- **Gold variant** (`fr-btn-gold`): reserved for the committing action (entering a node, staking).

### Pick Controls (signature component)
The three STRIKE / THROW / BLOCK buttons are the core of the game and the most important control
surface. Transparent-bodied, flex-equal, capped at `15sw` wide, with a drop-shadow that grounds
them against the arena. Label is Space Grotesk 900 at `1.35sw`. They respond in 90ms with a
transform lift and filter change. The permanent triangle legend sits beside them in JetBrains
Mono so a new player learns the rules by looking rather than reading.

### Cards / Containers
- **Corner Style:** `calc(var(--sw) * 0.6)` — the loosest radius in the system.
- **Background:** translucent coal-to-ink vertical gradient (0.92 → 0.94 alpha).
- **Border:** `0.08sw` plate-edge hairline.
- **Padding:** `calc(var(--sh) * 1.6) calc(var(--sw) * 1.4)`.
- **Width:** flexes between `24sw` and `34sw`.
- **Shadow Strategy:** none at rest — see Elevation & Depth.

### Inputs / Fields
- **Style:** centred JetBrains Mono 600 at `0.2em` tracking, uppercase, on `rgba(7,8,12,0.8)`
  with a `0.06sw` plate-edge border and `0.3sw` radius. Full width, `min-height: 44px`.
- Wide tracking and centring make a stake read as a displayed value rather than a text field.

### Health Bar (signature component)
A row of lacquered armour plates in an opaque rectangular backing with a gold hairline. Each
segment is a blade-cut parallelogram with a steel-to-glacial gradient
(`#d9f6ff → #29e6ff → #0ea5e9 → #085e86`), a bone specular top edge and a honed dark bottom edge.
Losing HP does not shrink the bar: an opaque lacquer **cover** with a faint ember undertone
scales across the lost segment over 260ms on `cubic-bezier(0.22, 1, 0.36, 1)`, preceded by a
single 240ms eased white flash. The plate count stays constant; what changes is how many are
still lit.

### Name Plates
Opaque lacquer backing (masking the baked art beneath), carrying an angled steel face with a
gold hairline showing as a 0.1sw rim. Face gradient runs `#232d3a → #131c28 → #0a0e16` — dark
enough that the bone name text holds full contrast. Mirrored lean per side.

### Banners (arcade callouts)
Anton 900, uppercase, `letter-spacing: 0.06em`, skewed −6°, background-clipped to a
bone → fog → fog-deep vertical gradient with transparent fill. Outlined by three stacked
`drop-shadow()` filters rather than a text stroke. Gold and danger variants swap the gradient.

## Do's and Don'ts

### Do:
- **Do** express every dimension in `--sw` / `--sh` stage units so the interface scales as one
  piece across phone and desktop.
- **Do** keep `min-height: 44px` on every interactive control — the one sanctioned raw-px value.
- **Do** pick the cyan value by text size, not by meaning (the OLED Bloom Rule).
- **Do** make any HUD element that overlays baked artwork a fully opaque backing, then decorate
  the inner face.
- **Do** mirror every angled cut toward screen centre.
- **Do** answer input in ≤90ms; reserve 220–260ms for consequence beats and 600ms for scene
  transitions.
- **Do** set anything countable or stakeable in JetBrains Mono.

### Don't:
- **Don't** add a media query. If a layout needs one, the layout has left the system.
- **Don't** use outer glow for elevation — glow is state only.
- **Don't** apply `-webkit-text-stroke` to gradient-clipped display type (Chrome miter spikes).
- **Don't** let the presentation imply a changed outcome: settle and celebration treatments are
  identical regardless of stake or streak (RG-C5), and callouts like FLAWLESS are
  value-independent.
- **Don't** make this look like a slot machine or casino skin — no coin showers, jackpot chrome,
  spinning reels, flashing win-meters or gilt casino furniture. It is a fighting game that
  happens to carry a stake.
- **Don't** crop arena artwork to fit a fixed aspect; set `--stage-ar` from the art.
- **Don't** use blood red decoratively. It means damage.
