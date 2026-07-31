# XGUNDAM POOL — PRE-KIT SCREEN (phase 111, 2026-07-31)

52 full-body plates in `input/MK FINAL/XGundam not sorted/`. 10 are already wired or kitted
(ir05 · ir21 · ir22 · ir37 · ir41 · ir48 · ir52 · ir56 · ir60 · lady-kurotachi), leaving **42
unscreened**. This screens all 42 **before** any acting line is written — which is the whole point:
IR-41 Kasa Oni's 13 lines were written IN FULL before anyone noticed its plate is unusable.

Two independent screens, in the order that saves the most work.

---

## SCREEN 1 — BAKED EMISSIVE (hue-agnostic)

A character with baked flame/lightning/neon is unusable (the "kitsune blocker"). Measured over every
subject pixel: **BRIGHT (max channel >= 215) AND SATURATED (max-min >= 70)**.

**Hue-agnostic on purpose.** The first version of this test looked for near-white and WARM only, and
it scored a violet flame at 0.00% and promoted a 5.26%-emissive character into a shortlist. XGundam
is a NEON-heavy design language — cyan, magenta, lime, violet — so a warm-biased test would have been
close to useless here. See the header of `qa-boss/check-plate-key.mjs`.

### REJECTED — >= 3%, baked emissive (12)
| plate | emis% | | plate | emis% |
|---|---|---|---|---|
| IR-39 Lime Kama | 10.27 | | Night Odachi | 3.46 |
| Black Queen | 8.62 | | IR-26 Naginata | 3.45 |
| IR-35 Violet Nodachi | 7.19 | | IR-30 Shogun Crown | 3.38 |
| Black Road Lady | 7.08 | | IR-53 Ember Raptor | 3.29 |
| Ivory Jutte | 6.28 | | IR-31 Kurokage Neon | 3.24 |
| IR-26 Naginata Gale | 4.06 | | Neon Shuriken | 3.65 |

### BORDERLINE — 1-3%, look before committing (15)
IR-04 Prism Unicorn 2.87 · Black Road Queen 2.80 · Void Oni Queen 2.76 · IR-07 Gale Striker 2.58 ·
IR-15 Magma Drill 2.51 · IR-06 Charscar Elite 2.41 · Dust Ronin 2.37 · IR-44 Seal Crown Oni 2.27 ·
IR-40 Void Shogun 2.26 · Lady Tachi 2.15 · IR-33 Acid 2.09 · Mecha_Raijin 1.52 · Yasha 1.31 ·
Acid Oni 1.28 · IR-02 Ashpike Raider 1.15

### CLEAN — < 1% (15)
Lady Hex 0.93 · IR-03 Umbra Wing 0.89 · IR-55 Storm Valk 0.57 · IR-57 Wolf-Raven 0.54 ·
IR-01 Solace Ace 0.52 · IR-42 Ofuda Shade 0.37 · IR-12 Rose Lance 0.25 · IR-46 Ofuda Storm 0.25 ·
IR-10 Night Howl 0.24 · IR-16 Crown Valiant 0.24 · IR-64 Rabbit Zodiac 0.20 ·
IR-25 Taisho Warlord 0.13 · IR-13 Junkyard King 0.11 · IR-28 Kabuto Ronin 0.03 ·
IR-08 Bonepipe Grunt 0.01

---

## SCREEN 2 — FACING, on the 15 clean

### ⚠ A THUMBNAIL CANNOT EVEN BE TRUSTED FOR THE *FRONTAL* CALL — corrected here, in this screen
The standing rule is "facing is a three-way verdict (side-profile / PARTLY OPEN / front-facing), and
a thumbnail only separates the first from the other two." **That is too generous.** From the contact
sheet I called **IR-13 Junkyard King FRONTAL and was about to reject it.** At full size he is
**PARTLY OPEN facing screen-right** — visor and head turned right, sawblade over the shoulder, torso
merely open to camera. Viable.
For contrast, IR-41 reads frontal at *both* sizes and genuinely is.
**So: view every candidate at FULL SIZE before any facing verdict, including a rejection.** The
thumbnail is a sorting aid, never a verdict — the same conclusion the plate-key screen reached about
top-green-bin share, and the emissive screen reached about hue.

### SHORTLIST — clean emissive, facing screen-right, archetype distinct from the wired roster
| plate | archetype | note |
|---|---|---|
| **IR-12 Rose Lance** | lance **+ SHIELD** | the shield archetype is entirely missing from the roster |
| **IR-13 Junkyard King** | industrial saw-cleaver | distinct silhouette; the false-frontal above |
| **IR-08 Bonepipe Grunt** | heavy armour + flail | heaviest silhouette of the set |
| **IR-57 Wolf-Raven** | beast + polearm | |
| **IR-10 Night Howl** | beast + dual blades | |
| **IR-16 Crown Valiant** | staff + cape | |
| **IR-55 Storm Valk** | winged dual-blade | wings widen the silhouette — check span |

### SET ASIDE
- **Faces screen-LEFT** — `IR-42 Ofuda Shade`, `IR-25 Taisho Warlord`. Not fatal: the roster convention
  is to hflip **at the FRAME level before the key**, never webm→webm, and to swap `--left`/`--right`
  in any feather. It is simply an extra step, so they rank below the seven above.
- **Duplicate archetype** — `Lady Hex` (a large war-fan; ir37-pink-tessen already owns that).
- `IR-01 Solace Ace`, `IR-46 Ofuda Storm`, `IR-64 Rabbit Zodiac`, `IR-28 Kabuto Ronin` are viable but
  rank lower: the first three read quite open, and Kabuto Ronin is a fourth katana in a roster that
  already has lady-kurotachi, eclipse-ofuda and satoshi-odachi.

---

## BEFORE WRITING ANY KIT FROM THIS LIST
1. `node qa-boss/pad-anchor-plate.mjs <raw> qa-boss/anchors/xg/<slug>-anchor-green.png --min-margin 200`
   — it REFUSES rather than silently shrinking margins. **If it demands a low `--fill`, that is a
   PROP-EXTENDED character and the fill is a RESOLUTION BUDGET, not a preference** (see
   `MK-FINAL-WAVE2-SCREEN.md`): fill is height on the plate and the engine upscales the clip back to
   the fighter box, so 0.50 fill on a 720p render leaves ~360px of actual character.
2. `node qa-boss/check-plate-key.mjs <padded>` — confirms the plate keys clean AND re-reports `emis%`
   on the keyed subject, which is the more correct denominator. **OPEN THE MASK.**
3. Full-size facing verdict, per the correction above.
