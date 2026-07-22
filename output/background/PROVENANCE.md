# Background art — generation style export

Exported background/backdrop art CURRENTLY LIVE in three Swoobz Originals games, with the generation style each one uses. Source files copied alongside this doc:

| File in this folder | Game | Source (canonical, currently wired) |
|---|---|---|
| `rug-or-riches-backdrop-bluechips.png` | Rug or Riches (vault) | `originals/vault/used-assets/backdrop-bluechips.png` (md5-confirmed live-served, 2026-07-07) |
| `rug-or-riches-backdrop-altseason.png` | Rug or Riches (vault) | `originals/vault/used-assets/backdrop-altseason.png` (md5-confirmed live-served, 2026-07-07) |
| `rug-or-riches-backdrop-shitcoin.png` | Rug or Riches (vault) | `originals/vault/used-assets/backdrop-shitcoin.png` (md5-confirmed live-served, 2026-07-07) |
| `pulse-backdrop-terminal.png` | Pulse (candle-crash) | `input/asset pulse/art/pulse-bg-terminal.png` — confirmed wired at `pulse-run/src/candle/PulseCandle.tsx:12,386` |
| `abyss-line-backdrop.svg` | The Assay Line / Abyss Line (assay) | `originals/assay/assets/abyss-background.svg` — the CURRENT active skin's background |

Each game has gone through multiple backdrop pivots over the project's history — only the presently-wired asset per game is exported here, not superseded/legacy ones. See §3 below for how many backdrops Assay alone has discarded.

---

## 1. Rug or Riches — "flat-illustration vault interior" (3 world variants) — CORRECTED 2026-07-07

**Correction:** this section originally (2026-07-06) described the OLD `generated/rug-or-riches/backdrop-*.png` set (photoreal-ish trading-floor scenes, dated 2026-06-04). Those files are **no longer the live art** — the game's backdrop art was fully replaced at some point before 2026-07-07 with a new flat-vector-illustrated vault-interior set. Verified today by md5-diffing the file this doc exported against the actual currently-served asset (`originals/vault/used-assets/backdrop-*.png`, confirmed live-served via `vault-run/public/assets/generated/rug-or-riches/` + `VaultGridCanvas.tsx`'s `getModeBackdrop()`) — they did not match. The 3 PNGs in this folder have been replaced with the correct current ones; no generation provenance (prompt/model/seed) is on record for this newer set, unlike the superseded one.

**Current style (observed directly, all 3 worlds):** genuinely flat vector illustration — thick black ink outlines, flat color fills, no gradients/photoreal rendering (this actually HITS the style-lock the old set drifted away from). Portrait-oriented (~896×1200), dark uncluttered open center-bottom for the game grid to sit in, "camera" always looking straight into a vault chamber.

| World | Scene |
|---|---|
| Bluechips | calm bank-vault interior: intact gold spoked-wheel vault door dead-center-top (navy/gunmetal + gold + a little teal pipework), gold bullion bars + coin stacks flanking both side walls, dark open floor |
| Altseason | electric variant: a glowing cyan circular hatch/portal mechanism top-center with green lightning bolts arcing off it, dark steel panel walls, small gold sparkle accents scattered in the margins |
| Shitcoin | vault BREACH: a blown-open circuit-paneled vault door hanging ajar, cracked red-lit walls, overturned/collapsed ladders and scaffolding debris framing the dark center |

**Reconstructed prompt** (no original on record — written now for future reference if regenerating):
> `Flat 2D vector illustration of a vault-interior chamber seen head-on, thick black ink outlines, bold flat color fills, no gradients, no photoreal rendering, no 3D render. Portrait composition, dark open uncluttered floor/center-bottom so a game grid can sit on top. [World-specific hero]: {Bluechips: an intact ornate gold spoked-wheel vault door dead-center-top, navy-and-gunmetal wall panels, gold bullion bars and coin stacks stacked along both side walls} / {Altseason: a glowing cyan circular hatch mechanism top-center arcing green lightning bolts, dark steel panels, small gold sparkle accents} / {Shitcoin: a blown-open circuit-paneled vault door hanging ajar amid cracked red-lit walls with overturned ladders and scaffolding debris}. Hacksaw-Gaming-style flat vector game background, no humans, no characters, no legible text.`
>
> Negative: `photorealistic, 3D render, gradient mesh, glossy reflections, humans, characters, legible text/logos, busy center, clutter in the open floor area`

**Historical note (superseded art, kept for context, not exported here):** the OLD 2026-06-04 set (`generated/rug-or-riches/backdrop-*.png`, fal.ai flux-pro, full prompts/seeds in `generated/rug-or-riches/PROVENANCE.md`) was a photoreal-drifted crypto-trading-floor concept (desk + monitors + skyline) — abandoned in favor of the vault-interior concept above. That old set also had a stray hallucinated "cycasino" neon-sign text artifact on the altseason variant (flux text artifact) — QA confirmed 2026-07-07 this artifact **never reached the live game** (the garbled file was never wired/imported), so it required no fix. Two stale copies of that old, unused, artifact-bearing altseason file still sit on disk at `generated/rug-or-riches/backdrop-altseason.png` and (until this correction) in this very folder — worth deleting or moving to a clearly-marked graveyard folder so a future grep/QA pass doesn't mistake them for the live asset again.

---

## 2. Pulse — "cyan synthwave terminal void"

**No generation provenance exists for this asset** — unlike vault, there is no PROVENANCE.md, prompt, model, or seed on record for `pulse-bg-terminal.png`; it was sourced/placed directly as a pre-made art asset (see `input/asset pulse/README.md` step 4: "place the terminal background in the `.sw-bg-art` layer"). The description below is a **visual reverse-description of the delivered file**, written now for future reference — treat it as a reconstruction, not an original brief.

**Visual style (observed):**
- Near-black navy void base (not pure black — a very dark desaturated blue-teal).
- A single glowing **cyan neon rounded-rectangle frame** traces the full canvas border (rounded corners, uniform stroke, soft outer glow).
- A **perspective floor grid** (cyan hairlines, vanishing toward center) occupies the bottom third — classic synthwave/outrun horizon-grid.
- A soft **glowing ring/portal** hovers centered above the horizon, faint and diffuse (looks like a halo or event-horizon, not a hard-edged object).
- Fine **horizontal scanline texture** washes the whole background at low opacity — CRT/terminal read.
- Sparse tiny **star/particle specks** scattered at random, very low density.
- Single accent hue throughout: cyan only (no secondary color, no warm accents) — reads as a calm, empty "waiting for data" terminal/void rather than a populated environment (no desk, no screens, no characters — unlike vault's populated trading-floor scenes).

**Reconstructed prompt** (for regenerating a variant or a same-style companion asset, e.g. a second Pulse world):
> `Empty futuristic digital terminal void, near-black navy background, a single glowing cyan neon rounded-rectangle border frame tracing the canvas edge, a faint glowing cyan ring/portal centered above the horizon, a cyan perspective grid floor receding to a vanishing point in the lower third, fine horizontal cyan scanline texture across the whole scene, sparse tiny star particles, single-hue cyan neon accent only, no characters, no furniture, no screens, calm empty synthwave/outrun aesthetic, wide landscape composition, uncluttered center so a game UI can sit on top.`
>
> Negative: `humans, characters, text, multiple colors, warm tones, clutter, busy center, photorealistic, 3D render, particles overload`

---

## 3. The Assay Line / Abyss Line — "abstract vector underwater scene"

**Currently active asset: `originals/assay/assets/abyss-background.svg`** — a hand-authored SVG (not AI-generated), supplied by Tim directly (`input/asset abyss/vector/abyss-line-background.svg`), copied in as part of the 2026-07-06 "ABYSS LINE — Sunken Treasure" re-skin (full provenance: `originals/assay/assets/PROVENANCE.md`, "RE-SKIN BASE — supersedes everything below").

**This is genuinely abstract-art-like by construction** — unlike vault (photoreal-ish rendered scene) or Pulse (a single reconstructed neon-void image), the Abyss background is built entirely from flat SVG primitives: gradients + paths + circles, no raster/photographic texture at all. Reading the source directly (1600×900 viewBox):
- A radial `water` gradient fills the canvas (near-black navy center-top fading to near-black edges — `#0e2233 → #081521 → #040a10`).
- Sparse bioluminescent **particle dots** (teal `#2bd9c9`, a couple of violet `#7f5de0`) scattered top-left/top-right, opacity 0.5 — plankton.
- Jagged **trench-wall silhouettes** flanking both sides (dark layered polygon shapes, `#0d1c27`/`#0a161f`), each with **kelp strands** (bezier paths) swaying up from the base and small **bubble trails** (stroked circles).
- A **submarine** rendered top-center as simple shape-stack (ellipse hull, fin, hatch, porthole) with a cyan porthole light (`#35e0d2`) and an amber running light (`#f0b542`), casting a **light cone** downward (a semi-transparent teal polygon, `url(#cone)` gradient) — this is the single most "hero" element, the rest is scene-setting.
- A **seafloor** silhouette band across the bottom (two layered dark-teal shapes).
- A **wreck treasure chest** (brown rect + gold-glow radial + gold ingot rectangles) and a scatter of loose **gold bars** sitting on the seafloor, off-center.
- A **naval mine** (dark sphere with radiating spike lines + a red core dot) sitting alone on the seafloor — a danger/hazard prop.
- A flat **12%-opacity black overlay rect** across the whole canvas as a final unifying scrim.

**Reconstructed prompt** (if this were to be regenerated as a raster image instead of hand-authored SVG, or a companion depth-variant produced):
> `Abstract flat vector illustration of a deep-sea underwater scene, near-black navy radial gradient water (light center-top fading to dark edges), a small submarine silhouette top-center with a cyan porthole glow and a downward light cone, jagged dark trench-wall silhouettes on both left and right edges with swaying kelp strands and rising bubble trails, a sunken treasure chest with loose gold bars scattered on a dark seafloor silhouette off-center, a single spiked naval mine as a hazard prop, sparse teal and violet bioluminescent particle dots, flat geometric shapes only — no photographic texture, no 3D render, no gradients beyond simple radial/linear fills, poster-flat color fields, wide 16:9 landscape composition, dark uncluttered open center so a game board can sit on top.`

Note the three prior Assay skins (Deep-Current refinery `backdrop.png`, bullion-vault `backdrop-vault.png`, Round-D hall `backdrop-hall-v2.png`) were all AI-generated (Higgsfield, `soul_location` model) and are now fully superseded/unused — kept on disk for history but not wired. If a future re-skin needs an AI-generated replacement for the current SVG, `originals/assay/assets/PROVENANCE.md` has their full job-id/seed records as a reference for that generation pipeline (Higgsfield, not fal.ai flux — different tool than vault used).

---

## Cross-game note

All three games deliberately use **unrelated background registers** — vault is a populated, illustrated (if drifted-photoreal) physical trading-floor scene per world/mood; Pulse is an empty, single-hue neon-void terminal; Assay/Abyss is a flat-vector abstract underwater tableau. Don't cross-pollinate prompt language between them without a deliberate reason; they're doing different jobs (vault: a "place" per risk-world; Pulse: an abstract instrument backdrop; Abyss: an illustrated environment frame supplied whole, not prompted per-element).
