# MK FINAL — WAVE 2 SCREENING (phase 107, 2026-07-31)

Wave 1 was the six playables (oni · minotaur · skullrend · pale-choir · jin · raiju), all six now
written. This is the screen of everything left in `input/MK FINAL/mythic` and `/legendary` — 23
candidates after excluding the 11 already wired or already picked.

**Nothing here was chosen from a filename.** The brief's rule is "viewed at size AND measured", and
this session proved why twice over: a name that promises fire sometimes has none baked in, and a name
that promises nothing sometimes has a lit weapon.

---

## THE THREE SCREENS, IN THE ORDER THAT SAVES THE MOST WORK

1. **BAKED EMISSIVE** (the kitsune-blocker class). A character with baked flame/lightning is
   unusable, and finding out after writing 13 acting lines is the expensive way. Measured over every
   subject pixel: fraction that is near-white (all channels >= 250) and fraction that is "hot"
   (bright-and-warm `r>=235,g>=200,b<160`, or a near-white core).
2. **PADDABILITY.** These raw plates are cropped tight (85-98% of frame height). `pad-anchor-plate.mjs`
   re-composites onto a 1536 square, and it REFUSES rather than silently shrinking margins. The
   number that matters is the FILL it takes to reach 200px margins — see the trap below.
3. **PLATE KEYS CLEAN** — `check-plate-key.mjs`, new in this phase. Keys the still with the real
   keyer math and renders the alpha. Decisive, local, free.

### ⚠ THE PADDING TRAP — FILL IS A RESOLUTION BUDGET, NOT A PREFERENCE
A WIDE subject cannot have both 200px side margins and the standard 0.68 fill in a square frame; the
only lever is to shrink it. But fill is height on the plate, and the engine scales the clip back up
to the fighter box — **so a low fill is spent as UPSCALING, i.e. lost resolution on screen.**
At 0.50, a 720p render gives ~360px of actual character. That is the same structural bind that makes
satoshi / sora / ir56 prop-EXTENDED and un-kittable without a re-plate — and it is Tim's pending
ruling, so wave 2 does not decide it either.

---

## RESULTS

### TIER A — ship-ready. Standard-or-near fill, clean key, distinct archetype.
| character | fill | margins | opaque% | p99 dist | archetype (nothing like it in the roster) |
|---|---|---|---|---|---|
| **lich-scythe** | 0.68 | **L312 R314 T468** | 11.96 | 5.1 | SCYTHE. Roomiest plate in the whole MK set — 100px more per side than raiju. Genuinely prop-TUCKED |
| **hydra-flail** | 0.68 | L222 R220 T468 | 13.29 | 5.4 | CHAIN FLAIL, three skull heads. The fine chain links keyed cleanly, which is the thing to worry about with a thin prop |
| **gargoyle-spear** | 0.66 | L206 R209 T498 | 17.45 | 5.0 | WINGED stone. First winged silhouette; wings dominate the left of the mask |

### ~~TIER B~~ — **EMPTY. `drake-glaive` was REJECTED in phase 109. See the correction below.**

### TIER C — PROP-EXTENDED. Do NOT write kits without Tim's ruling.
| character | fill needed | why |
|---|---|---|
| **nurikabe-shield** | 0.55 | The shield IS the silhouette — a huge mass |
| **golem-mace** | 0.50 | Half the frame height spent to fit the mace. Worst in the set |
Same class as satoshi / sora / ir56. Consistent treatment: they wait for the same ruling.

> **⚠ PHASE 143 — I ALMOST WROTE THE NURIKABE KIT ANYWAY. READ THIS BEFORE RE-SCREENING.**
> Looking for the next character to build, I re-ran `check-plate-key` and `measure-anchor-budget` on
> the padded plates that had no kit, got `KEYS WITH MARGIN · emis 0.20% · L208 R210 T666` for
> nurikabe-shield, judged it viable and dispatched an agent to write its 13 states. It was stopped
> before it wrote anything, but only because I then opened THIS FILE.
>
> **A fresh measurement is not a fresh decision.** Every number I got was correct and none of them
> was the reason this character is held — the reason is the FILL (0.55), which is a resolution
> budget, not a key or a margin problem, and it is Tim's call and no one else's. The loop prompt
> already says to skip this class; I re-derived a "yes" from the two screens that happen to pass and
> never checked the tier.
>
> **So: before briefing ANY kit, check this table first.** A plate having a padded anchor on disk is
> not permission — three of the padded plates here (nurikabe, golem-mace, drake-glaive) are held or
> rejected, and a kit-writing agent has no way to know that.

---

## ★ CORRECTION, PHASE 109 — THE EMISSIVE SCREEN ABOVE WAS HUE-BIASED AND WRONG

The first screen tested for NEAR-WHITE and for **WARM** emissives (`r>=235, g>=200, b<160`). **A flame
can be any colour.** A kit-writing agent caught it on lich-scythe: he carries a **VIOLET crown flame**,
brightest `rgb(214,157,255)` — blue-dominant, so it fails the warm test *and* the near-white test. It
scored **0.00% warm** and is actually ~0.8-1.0%.

Re-measured hue-agnostically — **BRIGHT (max channel >= 215) AND SATURATED (max-min >= 70)**, which
catches warm, violet, cyan and acid-green alike, because ordinary lit material DESATURATES as it
brightens while a flame does not:

| character | warm% (old, wrong) | any-hue% | outcome |
|---|---|---|---|
| **drake-glaive** | 0.49 "clean" | **5.26** | **REJECTED — it was in TIER B on the strength of the bad number** |
| Horned Ruin Vex | 0.00 | 4.65 | already rejected (duplicate archetype); metric now agrees |
| Sol Ofuda | 0.14 | 2.12 | already rejected (duplicate); has an emissive feature too |
| Wight Spear | 0.00 | 1.98 | the cyan glow was PLAINLY VISIBLE in the contact sheet while the metric said 0.00 |
| Lira_Astraea | 0.05 | 2.02 | already rejected |
| hydra-flail | 0.03 | **0.87** | TIER A HOLDS — minor, must be pinned in its kit |
| lich-scythe | 0.00 | **0.77** | TIER A HOLDS — the violet crown flame; pinned in its kit |
| gargoyle-spear | 0.00 | **0.00** | TIER A HOLDS — genuinely clean |

**Two lessons, and the second is the general one:**
1. The corrected test is now IN `check-plate-key.mjs` as an `emis%` column with its own verdict, so
   this cannot regress into a one-off script again.
2. **The visual read caught what the metric missed** — wight-spear's cyan glow was noted by eye and
   scored 0.00%. That is the same shape as raiju, where the metric cried wolf and the eye was right,
   only inverted. Neither channel is authoritative alone. **Run both, and when they disagree, go and
   find out WHY rather than picking the one you prefer.**

---

### REJECTED — BAKED EMISSIVE (measured, then confirmed at full size)
| character | hot% | what is baked in |
|---|---|---|
| Godflame_Liu | **2.74** | Head is on fire; flame-bladed weapon |
| Emberpaw Kage | 1.80 | Sword is a burning flame blade |
| Lira_Astraea | 1.88 (+0.72 pure white) | Glowing white/silver figure |
| Ashrune Belakor | 0.89 | Flaming horns + a magma-lit mace |
| Warlord_Kharos | 0.62 | Flaming crown |

### REJECTED — DUPLICATE ARCHETYPE (the brief requires picks to read as distinct)
| character | collides with |
|---|---|
| Sol Ofuda | eclipse-ofuda — the same hat + hanging ofuda + katana idea |
| Antler_Mire | thorn-warden — antlered figure |
| Azure_Ling | ir37-pink-tessen — war-fan |
| Tengu Naginata | raiju-naginata — same weapon |
| Horned Ruin Vex | oni-tetsubo — red horned demon |

### REJECTED — NO CLEAR ARSENAL (nothing to build a signature beat from)
Lilith_Palehorn (ribbons/cloth, no weapon) · Symbiote_Vex (bare claws, and pale-choir already owns
the claw archetype).

### NOT SCREENED
Ghast Flail — keys clean (0.02% hot) but carries **baked smoke/mist** around the base in the plate,
which is the banned effect class rendered into the character rather than the action. Wight Spear and
Zephiron key clean and are archetype-viable; they were simply below the six taken forward.

---

## FACING — ALL SIX PADDED PLATES FACE SCREEN-RIGHT NATIVELY
No hflip anywhere, confirmed from the rendered alpha masks. The three-way verdict
(side-profile / PARTLY OPEN / front-facing) is still owed per character at FULL SIZE before its kit
is written — five of six wave-1 plates turned out PARTLY OPEN, and on two of them the decisive crop
was the FEET, because both feet showing their full tops is impossible in true profile.

## WHAT SHIPPED FROM THIS SCREEN
Six padded plates in `qa-boss/anchors/mk/`, all verified >=200px margins and all keying clean.
`lich-scythe` went to a kit writer in the same phase.

---

## WAVE 3 — THE `rare` TIER, EMISSIVE PRE-SCREEN (phase 161, 2026-08-01)

Wave 2 covered `mythic` + `legendary` only. Tier A from it is now EXHAUSTED (lich, hydra and
gargoyle are all kitted), so the pool needed extending — which is what STEP 4 of the loop asks for.

`input/MK FINAL/rare` holds 114 files = **38 base plates** (each character also has a ` PFP` and a
` TCG` crop, which the screen skips). Screened with `node qa-boss/screen-emissive.mjs`, using the
HUE-AGNOSTIC test from the phase-109 correction: BRIGHT (max channel >= 215) AND SATURATED
(max-min >= 70).

**23 of 38 rejected on baked emissive — 61%, in seconds.** That is the cheapest screen there is and
it belongs first, exactly as this file already argues.

**IT SELF-VALIDATES:** `Satoshi Odachi` is in the tier and scores **0.22%** — a known roster
character landing exactly where a clean plate should. The screen is not just discriminating, it is
calibrated against something we already know.

### CLEAN — emissive under 0.8%, worth the next screen
| plate | emis% | subject % of frame | note |
|---|---|---|---|
| **Violet Contract** | **0.00** | 38.1 | ALREADY ON GREEN CHROMA. Faces screen-right. Crescent war-axe + 3 hanging talisman tags. Big flowing CLOAK owns the left edge; the tags are thin danglers (lich-chain class). |
| **Iron Vow** | 0.01 | 31.4 | |
| **Hector Warhammer** | 0.01 | 31.1 | |
| **Captain_Nyra** | 0.08 | 31.2 | |
| **Umbra_Jelly** | 0.09 | 29.0 | |
| **Shiro_Gale** | 0.03 | 24.1 | |
| **Elara_Frostplate** | 0.02 | 15.9 | low subject fraction |
| **Ningara_Silk** | 0.18 | 15.3 | low subject fraction |
| ~~Satoshi Odachi~~ | 0.22 | 25.5 | already in the roster; SKIP-listed for prop-extension, not for emissive |

### HAS A LIT FEATURE — usable but must be PINNED in its kit, like lich's violet crown flame
`Wolfmark_Hild` 0.80 · `Kenji Ashblade` 0.90 · `Charm Ronin` 0.93 · `Ash Choir` 1.22 ·
`Null Mire` 1.26 · `Thalyss_Nox` 1.40

### REJECTED — BAKED EMISSIVE (23)
Tigerstripe_Ona 1.58 · Violet_Tanuki 1.82 · Kasumi_Moonveil 1.85 · Nekomata Kama 2.04 ·
Sister_Vespera 2.35 · Prism_Hex 2.72 · Cedric Flailmark 2.74 · Yuki Kama 2.92 · Balance_Jin 3.22 ·
Scalewing Mira 3.29 · Theobald Spear 3.33 · Seris_Bandage 3.42 · Shiro_Umbral 3.66 · Mei_Rosa 4.54 ·
Pyra_Korr 4.70 · Ghostveil_Han 4.72 · Mei_Phantom 5.72 · Scale_Saki 6.83 · Inferna Cinder 7.28 ·
Rina_Coilspin 7.97 · Varrick_Ember 8.40 · Nova_Aether 11.12 · Cinderfang Nox 12.97

**STILL TO DO on the clean eight:** view each at FULL SIZE for facing and arsenal, pad with
`pad-anchor-plate.mjs`, verify >=200px margins, then `check-plate-key` + inspect the alpha mask.
Emissive is only screen #1 of three. `Epic` (84 files) is still entirely unscreened.
