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

## ✅ SHORTLIST PLATE PASS — all 7 padded and key-tested (phase 276, 2026-08-06)

Tim: *"start with them all."* All seven now have padded plates in `qa-boss/anchors/xg/`.

| plate | fill | subject px | plate green sampled | opaque% | emis% | white% | p99 | verdict |
|---|---|---|---|---|---|---|---|---|
| ir08-bonepipe-grunt | 0.68 | — | — | 17.87 | 0.29 | 0.01 | 7.9 | keys with margin ✅ |
| ir13-junkyard-king | 0.68 | — | — | 9.74 | 0.45 | 0.02 | 7.3 | keys with margin ✅ |
| ir12-rose-lance | 0.68 | — | — | 8.42 | 0.82 | 0.00 | 5.2 | keys with margin ✅ |
| ir10-night-howl | 0.68 | 886x1044 | rgb(36,245,18) | 12.74 | 0.42 | 0.01 | 7.3 | keys with margin ✅ |
| ir16-crown-valiant | 0.68 | 586x1044 | rgb(25,242,17) | 11.19 | 1.02 | 0.01 | 5.5 | keys, **emissive feature — LOOKED**: the glow ring at the staff head. Small, localized, solid in the mask. ✅ |
| ir57-wolf-raven | **0.43** | 1114x660 | **rgb(68,184,74)** | 8.58 | 0.41 | 0.00 | **24.5** | keys with margin, but see ⚠ below |
| ir55-storm-valk | **0.53** | 1113x814 | rgb(1,207,3) | 11.74 | **1.29** | **0.39** | **21.4** | ⛔ **BLOCKED — see below** |

### ⛔ ir55-storm-valk is BLOCKED. The emissive screen passed it on the wrong denominator.
SCREEN 1 scored it **0.57% → "CLEAN"**. On the keyed-subject denominator (`check-plate-key`, which
§step-2 already calls *"the more correct denominator"*) it is **1.29% and trips `emissive feature —
LOOK`** — 2.3x worse, and across the CLEAN/BORDERLINE line. It also carries the highest `white%` in
the set at 0.39.

**AND THE MASK CONFIRMS IT.** Its baked yellow-white energy blade-trails key into **detached islands
of alpha** — isolated speckle clusters trailing off the wing and blade edges, visible at 2x on
`qa-boss/frames/platekey/ir55-storm-valk-anchor-green-alpha.png`. The body and helmet edges are clean
and solid, so this is not the keyer: it is the baked glow specifically. Those islands render in-game
as floating white specks around the fighter. This is the kitsune-blocker class the screen exists to
catch, and only opening the mask caught it — exactly what §step-2 says ("**OPEN THE MASK**") and what
the number alone said was fine.

Its kit therefore carries a `BLOCKED:` line so `build-prompt.mjs` REFUSES (exit 3) and it cannot fire
by accident — the phase-108 IR-41 law: *"a warning a tool cannot read is a warning that gets fired
anyway."* **To override: delete that one line.** No re-plate can fix it; the glow is baked into the
source art.

### ⚠ ir57-wolf-raven — usable, but the two weakest numbers in the set, for two separate reasons
1. **Its plate green is DESATURATED — `rgb(68,184,74)`** — against ir10's `rgb(36,245,18)` and ir16's
   `rgb(25,242,17)`. Less distance between plate and subject, which is what the **p99 of 24.5** (vs
   ir10's 7.3) is measuring. Its mask shows mild speckling along the polearm blade. Key one clip and
   LOOK before batching. Do NOT assume the green constant from a sibling — this plate is its own colour.
2. **It is WIDE-and-SHORT: 1114x660 at fill 0.43.** Per the resolution-budget rule below, 0.43 fill on
   a 960x960 render leaves roughly **410px of actual character height**. That is under the ~1.8x
   headroom the project wants over the on-screen figure, so its linework will ship softer than its
   peers. Not a blocker, a known cost.

ir55 needed the same lowered fill (0.53) for the same wide-subject reason; both refused at the default
0.68, which is `pad-anchor-plate` behaving correctly rather than silently shrinking the margins.

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
