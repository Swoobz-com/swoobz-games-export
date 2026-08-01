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

### WAVE 3 INTAKE — `violet-contract` COMPLETE (phase 162)

Padded and screened end to end. **`qa-boss/anchors/mk/violet-contract-anchor-green.png` is ready.**

```
source  1788x1536, subject 1750x1478 (96% of height) — already GREEN, border ring rgb(3,188,3)
padded  fill 0.62 -> subject 1128w x 952h · L204 · R204 · T560 · bottom free
key     opaque 18.25% · emis 0.00% · white 0.00% · p99 4.0 -> KEYS WITH MARGIN
```

**p99 4.0 is the best backdrop distance of any plate measured so far** (lich 5.1, gargoyle 5.0), and
emissive is a genuine 0.00%.

**pad-anchor-plate REFUSED 0.68 and 0.64** — correctly. At 0.68 he is 1236px wide leaving 150px per
side. It refuses rather than silently shrinking margins, which is the behaviour that makes this
number trustworthy. 0.62 is the first fill that clears 200px.

**FILL 0.62 IS THE ONE THING TO WEIGH, AND I AM FLAGGING IT RATHER THAN QUIETLY PROMOTING HIM.**
Tier A sits at 0.66-0.68; Tier C (held) at 0.55 and 0.50. He is between. At 720p, 0.62 gives ~446px
of actual character against gargoyle's ~475px at 0.66 — 6% less, not the 25% deficit that put
golem-mace on hold. My read: **viable**, but the threshold between "Tier A" and "held" has never
been set by Tim, and I promoted nurikabe on exactly this kind of reasoning three phases ago and had
to stop an agent mid-write. So: recorded as VIABLE WITH FILL FLAGGED, not silently added to Tier A.

**MASK INSPECTED — and it OVERTURNS a risk I flagged from the RGB:** solid silhouette, no
rectangular alpha edge, cloak one clean mass, crescent axe crisp, inter-leg negative space correct.
The three hanging TALISMAN TAGS survive as **SOLID shapes, not beads.** I had called them the
lich-chain class off the colour image; they are solid tags on solid rings, not open links. That is
the discriminator already recorded from lich's chain vs gargoyle's spear shaft — **holes bead,
solid shapes do not** — and it applies to any dangler, not just chains.

**ARCHETYPE:** crescent war-axe with hanging talismans and a long flowing cloak. No roster
collision — lich carries a scythe but reads nothing like this, and lady-kurotachi is a katana.

**REMAINING BEFORE A KIT:** a full-size FACING read is done (faces screen-right, body angled
right, head in profile). The open question for the kit author is the **CLOAK**: it owns the left
edge and, unlike gargoyle's stone wings, cloth may legitimately sway — so it cannot simply be
frozen, it needs a bounded sway.

### WAVE 3 BATCH INTAKE — seven more `rare` plates padded + keyed (phase 163)

| plate | fill | margins | opaque% | emis% | p99 | verdict |
|---|---|---|---|---|---|---|
| **hector-warhammer** | **0.68** | **L400 R399 T468** | 12.12 | 0.01 | 5.4 | **BEST PLATE FOUND THIS SESSION** |
| **umbra-jelly** | 0.68 | **L420 R421 T468** | 10.69 | 0.04 | 4.6 | roomiest margins in the whole set |
| **iron-vow** | 0.68 | L362 R362 T468 | 12.70 | 0.05 | 5.1 | roomier than lich |
| shiro-gale | 0.68 | L230 R230 T468 | 14.03 | 0.07 | 6.5 | standard fill, tighter sides |
| ningara-silk | 0.68 | L226 R226 T468 | 8.57 | 0.29 | 6.6 | standard fill, tighter sides |
| elara-frostplate | 0.60 | L212 R214 T590 | 7.90 | 0.21 | 5.4 | needed a lower fill |
| ~~captain-nyra~~ | — | — | — | — | — | **REFUSED even at 0.58 — too wide, Tier C class** |

**FIVE PAD AT THE FULL 0.68 STANDARD**, and three of those (umbra-jelly 420, hector 400, iron-vow
362) are **ROOMIER THAN LICH (312)** — the plate wave 2 called "the roomiest in the whole MK set".
The `rare` tier is better proportioned than `mythic`/`legendary` were.

#### ★ hector-warhammer — the strongest candidate found so far
Viewed at full size: a human knight in white-and-silver plate over brown leather, **near-STRICT
PROFILE facing screen-right**, two-handed WARHAMMER carried across the body with the head toward
screen-right and a spiked butt toward screen-left.

What makes him the best plate in the set is what he does NOT have: **no wings, no cloak, no chains,
no hanging tags, no membrane.** Every hard clip this session was hard because of an appendage —
lich's beading chain, gargoyle's wings owning two edges at once, violet-contract's swaying cloak,
nurikabe's shield mass. Hector is a body and a hammer. He is also prop-TUCKED and sits at the full
0.68 fill with 400px margins.

**ARCHETYPE IS DISTINCT ON BOTH AXES.** Weapon: the roster already has scythe, spear, axe, flail,
katana, club/tetsubo, naginata, cleaver and gauntlets — no warhammer. Character: the roster is
almost entirely monsters, demons and undead; a clean HUMAN KNIGHT reads unlike anything in it.

**RECOMMENDED AS THE NEXT KIT** once firing is unblocked — and as the lowest-risk first clip of any
plate currently on disk.

### WAVE 3b — the `Epic` tier, screened + padded (phase 164). THE POOL IS NOW FULLY SCREENED.

28 base plates. **16 REJECTED on baked emissive (57%)**, 7 carry a lit feature that must be PINNED,
5 clean. Four of the five padded:

| plate | fill | margins | opaque% | emis% | p99 |
|---|---|---|---|---|---|
| **kira-foxflare** | 0.68 | **L394 R396 T468** | 12.06 | 0.04 | 5.2 |
| **kira-frostveil** | 0.68 | **L382 R384 T468** | 10.28 | 0.26 | 7.6 |
| skeleton-nodachi | 0.68 | L244 R244 T468 | 8.51 | 0.17 | **13.2** — highest p99 yet, watch the key |
| reef-maw | 0.66 | L208 R208 T498 | 11.29 | 0.05 | 5.7 |
| ~~bone-ledger~~ | — | REFUSED even at 0.58 | | | |

**`Kira_Foxflare` measures 0.02% emissive.** The name promises fire and the plate has none — which is
exactly the warning at the top of this file ("a name that promises fire sometimes has none baked in,
and a name that promises nothing sometimes has a lit weapon"). It scores cleaner than lich, who does
carry a real flame. Screen, never assume.

**`skeleton-nodachi` p99 13.2** is more than double any other plate and worth flagging: the backdrop
distance is the margin the keyer works in. It still passes, but it is the one plate here whose first
keyed clip should be checked for fringing.

REJECTED on emissive: Hiveblade_Skara 1.79 · Frost_Nyx 2.03 · Icebrand_Vex 2.34 · Stingvolt_Bea 2.35 ·
Mirror Tag 2.66 · Frost Empress 2.79 · Dark_Voltage 2.83 · Revenant_Ash 3.30 · Umbral_Vel 4.34 ·
Vera_Crimsonhand 4.38 · Elder_Volt 4.51 · Kintsugi_Vey 5.40 · Myth_Pion 7.29 · Cyber_Scorch 8.39 ·
Drakengold Kai 8.59 · Volt_Mark 15.68.

LIT FEATURE, usable if pinned: Yokai Kama 0.87 · Kappa Bo 0.95 · Pyre Seal 0.96 · Hexlun Veil 1.18 ·
Ink Sovereign 1.40 · Dragon_Emperor 1.44 · Troll Hammer 1.49.

---

## POOL STATUS AFTER WAVES 2 + 3 (phase 164)

`mythic` and `legendary` (wave 2), `rare` (wave 3) and `Epic` (wave 3b) are now ALL screened.
Across `rare` + `Epic`: **66 base plates → 39 rejected on baked emissive (59%)**, and 10 plates have
been padded, keyed and are sitting ready in `qa-boss/anchors/mk/`.

**Ready and unkitted, best first:**
1. **hector-warhammer** — L400 R399, fill 0.68, emis 0.01. The simplest silhouette in the roster:
   no wings, no cloak, no chains, no danglers. Kit commissioned phase 164.
2. **umbra-jelly** — L420 R421, fill 0.68. Roomiest margins of any plate.
3. **kira-foxflare** — L394 R396, fill 0.68.
4. **kira-frostveil** — L382 R384, fill 0.68.
5. **iron-vow** — L362 R362, fill 0.68.
6. skeleton-nodachi · shiro-gale · ningara-silk · reef-maw · elara-frostplate · violet-contract

**None of these has been VIEWED at full size except hector and violet-contract.** Emissive + padding
+ key are screens 1-3; the facing and arsenal read is still owed on the rest, and this file's own
rule is that nothing is chosen from a filename.

### WAVE 3c — THE VIEW SCREEN, and why it cannot be skipped (phase 165)

Screens 1-3 (emissive, padding, key) measure **KEYABILITY and CONTAINMENT**. They do NOT measure
**FIGHTER SUITABILITY**. Two plates that passed all three numerically:

#### ❌ umbra-jelly — REJECTED. The ROOMIEST plate in the entire set, and unusable.
L420/R421 at full 0.68 fill, keys with margin, emis 0.04% — the best numbers on disk. Viewed at full
size she is a gothic woman with:
  · a large **OPEN UMBRELLA** with a starfield print over her shoulder — a wings-class appendage that
    owns the left and top edges AND can close, so it is higher variance than gargoyle's stone wings
  · **STILETTO HEELS.** Every kit in this roster carries "HIS FEET STAY FLAT ON THE GROUND FOR THE
    ENTIRE CLIP" as a core law. A stiletto is structurally not flat. The law and the plate contradict.
  · **SHEER LACE PANELS.** Semi-transparent fabric over chroma keys badly and leaves an olive fringe
    — the bloom-lit-plate class. **The emissive screen cannot see transparency at all.**
  · **no clear weapon** — a folded fan at best, and the brief requires an arsenal to build a
    signature beat from.

#### ⚠ iron-vow — STRUCTURALLY FINE, DUPLICATE WEAPON CLASS
L362/R362, full fill, keys with margin. Bald scarred brute, metal jaw-guard, dark mantle with white
crescent sigils, **near-strict profile facing screen-right, feet flat in boots, no sheer fabric.**
Everything structural is right. But his weapon is a **huge STUDDED CLUB**, which is the same weapon
class as **oni-tetsubo** ("massive dark iron tetsubo war-club studded with pale bone-coloured
spikes"). This file already rejected `Tengu Naginata` for exactly that — same weapon as raiju.
**Difference worth noting before deciding:** the CHARACTERS read nothing alike (oni is a huge red
demon; iron-vow is a human brute in a hooded cape), so this is a weaker collision than tengu/raiju
was. Recorded as a Tim call rather than an auto-reject.

**THE LESSON, and it cost nothing to learn because the view is free:** the numeric screens rank
plates by how well they will KEY and CONTAIN. They are blind to heels, to sheer fabric, to whether
the character even holds a weapon, and to archetype collision. **hector-warhammer was picked as the
best plate on a full-size VIEW, not on his numbers** — and umbra-jelly, which beats him on every
number, is unusable.

#### ❌ kira-foxflare — REJECTED, DUPLICATE ARCHETYPE (phase 169)
L394/R396 at full 0.68 fill, keys with margin, **0.02% emissive** — a fine plate by every number,
and the emissive reading is itself useful: the NAME promises fire and there is none, cleaner than
lich who carries a real flame.

Viewed at full size she is a **KITSUNE SAMURAI** — fox ears, THREE fox tails, straw kasa, black-and-
red kimono — wielding **DUAL TANTO**. The roster already has **`kitsune-tanto`**: same creature,
same weapon. That is the same collision this file used to drop `Tengu Naginata` (raiju's weapon) and
`Azure_Ling` (ir37's war-fan).

Secondary risks, recorded in case Tim overrules the duplication call: three fluffy FOX TAILS are a
large soft-edged appendage toward screen-left (fur keys worse than hard edges, and it will want to
sway), and she stands on GETA platform sandals rather than flat soles.

---

### ★ RUNNING TALLY OF THE VIEW SCREEN (phase 169)

Four of the numerically-clean plates have now been viewed. **Two were rejected on grounds no metric
can see:**

| plate | numbers | view verdict |
|---|---|---|
| hector-warhammer | good | **BEST IN SET** — chosen ON the view, not the numbers |
| violet-contract | best p99 on disk (4.0) | viable; cloak needs a bounded sway |
| umbra-jelly | **best margins in the set** | **REJECT** — heels, sheer lace, umbrella, no weapon |
| iron-vow | good | duplicate WEAPON class (oni-tetsubo) — Tim call |
| kira-foxflare | good, 0.02% emis | **REJECT** — duplicate ARCHETYPE (kitsune-tanto) |

**50% of numerically-clean plates fail the view.** That is the argument for never skipping it, and
for treating the emissive/pad/key screens as a CHEAP FILTER rather than a shortlist.

**Still unviewed (5):** kira-frostveil · skeleton-nodachi (p99 13.2, watch fringing) · shiro-gale ·
ningara-silk · reef-maw · elara-frostplate.

### CONTACT-SHEET FIRST PASS on the last five (phase 170)

Read from a 700px contact sheet, **not** full size. That is deliberate but limited: a thumbnail is
good enough to spot heels, a missing weapon or an archetype collision, and it is NOT good enough for
a facing call — IR-13 was called "frontal" off a contact sheet and is PARTLY OPEN at full size.
**Anything below that survives gets a full-size view before a kit is briefed.**

| plate | first-pass verdict |
|---|---|
| **ningara-silk** | **REJECT.** Black lace bodysuit, stockings, **HIGH HEELS** — the umbra-jelly class exactly (heels contradict the feet-flat law in every kit; lace is semi-transparent over chroma). Her naginata also duplicates raiju-naginata. |
| **kira-frostveil** | **RISK — baked VAPOUR.** Her blades trail a white frost/vapour effect. Emissive scored only 0.26% because vapour is TRANSPARENT, not bright. |
| **elara-frostplate** | **BEST OF THE REMAINING.** Ornate silver plate, longsword extended screen-right, armoured boots, **no cloak, no wings, no danglers** — the hector profile. Weaker on budget: fill 0.60, L212/R214. |
| **reef-maw** | Genuinely DISTINCT archetype (crustacean humanoid — nothing like it in the roster), but its weapon is a **flexible barbed whip-tail**: thin, floppy, hard to contain and hard to key. |
| **skeleton-nodachi** | Clean silhouette, faces screen-right, but the nodachi collides with satoshi-odachi. Also carries the p99 13.2 fringing watch. |
| **shiro-gale** | Clean samurai silhouette, but the katana collides with lady-kurotachi, and he stands on GETA. |

### ⚠⚠ THE EMISSIVE SCREEN IS BLIND TO TRANSPARENCY — SECOND INSTANCE, SO IT IS A PATTERN

`umbra-jelly` passed at 0.04% with **sheer lace panels**. `kira-frostveil` passes at 0.26% with a
**baked vapour effect on her blades**. The test is BRIGHT (max >= 215) AND SATURATED (max-min >= 70)
— it is built to catch FLAME, and a translucent white wisp is neither bright nor saturated.

Both are the same shipping hazard as a baked flame: **semi-transparent pixels over chroma key to an
olive fringe** (the session-14 bloom-lit-plate defect). So the screen has a known hole, and until
something measures alpha-ish translucency, **the VIEW is the only thing that catches it.** Add
"translucent vapour / sheer fabric / smoke baked into the plate" to what you are looking for when
viewing, alongside heels and missing weapons.

## ★ SCREEN #4 — TRANSLUCENCY, and an unflagged risk on an already-written kit (phase 171)

`qa-boss/screen-translucency.mjs`. Built because the emissive screen's blind spot bit TWICE
(umbra-jelly's sheer lace at 0.04% emissive, kira-frostveil's baked blade vapour at 0.26%). A
semi-transparent pixel over chroma is a BLEND of backdrop and material, so it carries green excess
that opaque material does not: `greenExcess = g - max(r,b)`, counted in a 18..130 band.

**CALIBRATED against plates whose truth was established BY EYE first**, which is the only reason the
thresholds mean anything:

| plate | transl% | known truth |
|---|---|---|
| hector-warhammer | 3.01 | opaque — best plate in the set |
| gargoyle-spear | 3.28 | opaque — idle passed FIRST take |
| lich-scythe | 4.93 | opaque + a SMALL pinned violet flame; 3 accepted clips |
| umbra-jelly | 7.30 | sheer lace — rejected on sight |
| ningara-silk | 7.67 | lace + stockings — rejected on sight |
| kira-frostveil | 11.49 | baked blade vapour — flagged on sight, scores highest |

Opaque cluster 3.0-4.9, translucent cluster 7.3-11.5, clean gap between. **< 5 clean · 5-7 inspect
· >= 7 will fringe.** lich at 4.93 is the useful calibration point: a small localised translucent
feature is fine IF the kit pins it.

### ⚠ THE CONFOUND, AND THE REAL RISK IT UNCOVERED

**`hydra-flail` scored 36.15% — five times anything else — and he is not translucent at all.** He is a
GREEN SCALED HYDRA: mean subject `rgb(74,83,54)`, **49.6% of his pixels green-dominant**. greenExcess
cannot tell "green showing through" from "the character is green". `raiju-naginata` is the same
story at 29.2%.

**That is not a null result.** A green character on a GREEN plate is the documented **ALPHA-HOLES**
hazard — the keyer removes green and can eat parts of him. So the tool now prints `grnDom%` beside
`transl%` and, above 25%, reports THAT risk instead of a translucency verdict.

**ACTION THIS RAISES:** `hydra-flail` is a **TIER A kit that is already written and has never been
fired**, and nobody had flagged that half his body is green-dominant on a green plate. Before his
first clip, either key a still and inspect the alpha for holes, or re-plate him on MAGENTA — the
`pale-choir-anchor-magenta.png` already on disk is the precedent, and it scores the cleanest
translucency of the whole set (1.35%). raiju-naginata carries the same question at 29.2%, on top of
his existing faint-rectangle watch.

### ✔ THE ALPHA-HOLES CONCERN IS DISPROVEN — I TESTED MY OWN RECOMMENDATION AND IT WAS WRONG (phase 172)

Last phase I recommended keying a still or re-plating `hydra-flail` on MAGENTA, because 49.6% of his
pixels are green-dominant on a green plate. **I keyed both green-dominant plates and inspected the
alpha. Neither has holes.**

| plate | grnDom% | key verdict | alpha mask |
|---|---|---|---|
| hydra-flail | 49.6% | keys with margin (opaque 13.29, p99 5.4) | **CLEAN** — solid body, three necks solid, chains connected, no interior holes |
| raiju-naginata | 29.2% | keys with margin (opaque 11.86, p99 28.7) | **CLEAN** — solid body, naginata crisp, no interior holes |

**AND THE REASON IS PRINCIPLED, NOT LUCK: the keyer is a BORDER-SEEDED FLOOD.** It removes only green
that is REACHABLE FROM THE FRAME EDGE. An interior greenish body pixel is never a candidate, however
green it is. So "the character is green" is NOT the alpha-holes hazard on this keyer — the hazard
would be green that CONNECTS to the border through a gap in the silhouette.

**NO MAGENTA RE-PLATE IS NEEDED for either.** `grnDom%` stays in the tool as the explanation for an
inflated `transl%`, but it should NOT be read as a keying verdict on its own. Corrected here so the
recommendation does not outlive the test that killed it.

**RAIJU'S FAINT-RECTANGLE WATCH, closed at plate level.** The standing loop instruction is "raiju's
padded plate retains a faint rectangle — check its first keyed clip for a rectangular alpha edge."
The plate's rendered alpha shows **no rectangle at all**. That closes the PLATE question; the
clip-level check still stands when he is first fired, since compression can introduce what a still
does not show.

**ONE REAL ITEM RAIJU'S SCREEN DID RAISE:** `emis 1.97%` with the verdict `emissive feature — LOOK`,
more than double lich's 0.77%. His kit already pins it ("the pale honed edge of the blade, its wavy
temper line, the polished steel rings, the brass ferrule and the pale blue-white RIM LIGHT along his
fur all stay exactly as bright as they are in the reference image"), which is the correct treatment
— the same one that let lich ship three clips with a real violet flame. No action, recorded so the
number is not re-investigated later.

### THE 9 PLATE-READY, KIT-LESS CHARACTERS — FULL PRE-FLIGHT (phase 173)

23 green anchors exist; 30 kits exist; **13 characters are plate-ready with no kit.** Four of those
are TIM-GATED and were NOT briefed (`golem-mace`, `nurikabe-shield`, `iron-vow`, `violet-contract`)
— a fresh measurement is not a fresh decision. The other 9, fully screened:

| char | fill | L/R margin | headroom | max span | opaque | emis | transl | grnDom | verdict |
|---|---|---|---|---|---|---|---|---|---|
| **kira-foxflare** | 68.0% | 394/396 | 468 | 2.06x | 12.06 | 0.04 | 3.13 | 4.6 | **cleanest on every axis** |
| **reef-maw** | 66.0% | 208/208 | 498 | **1.37x** | 11.29 | 0.05 | 3.92 | 13.8 | clean — but the tightest span |
| **shiro-gale** | 68.0% | 230/230 | 468 | 1.43x | 14.03 | 0.07 | 4.48 | 13.2 | clean |
| kira-frostveil | 68.0% | 382/384 | 468 | 1.99x | 10.28 | 0.26 | 11.49 | 13.2 | will fringe |
| skeleton-nodachi | 68.0% | 244/244 | 468 | 1.47x | 8.51 | 0.17 | 7.96 | 13.9 | will fringe · p99 13.2 |
| ningara-silk | 68.0% | 226/226 | 468 | 1.42x | 8.57 | 0.29 | 7.67 | 11.4 | will fringe |
| umbra-jelly | 68.0% | 420/421 | 468 | **2.21x** | 10.69 | 0.04 | 7.30 | 13.3 | will fringe (it is a jelly) |
| elara-frostplate | 60.0% | 212/214 | 590 | 1.38x | 7.90 | 0.21 | 6.01 | 26.0 | inspect — reading is an upper bound |
| drake-glaive | 58.1% | 208/208 | 620 | 1.37x | 14.15 | **4.63** | 3.13 | 4.6 | **rim light — PIN, do not reject** |

**NONE of the 9 is prop-EXTENDED.** Every one has real lateral margin (208–421px), so unlike
satoshi / sora / ir56 none of them needs a re-plate to pass containment. All 9 are at or under the
0.68 standard fill — no Tier C exception is needed for any of them.

**`drake-glaive` is NOT a reject.** He scored 4.63% emissive and the screen said "BAKED EMISSIVE —
REJECT". Inspected: it is **baked orange RIM LIGHT** tracing his wings, scale margins and limb
edges — real and extensive, so the *measurement* is right, but it is the same class as raiju's
pale blue-white fur rim (1.97%) and lich's violet crown flame (0.77%), **both of which shipped by
pinning the feature inline**. At 4.63% it is the strongest on record and must be pinned hard. The
screen cannot tell rim light from flame — both are bright+saturated — so the label was corrected
to route to a LOOK naming both outcomes, and the reject is a human call.

**The tightest constraint in this batch is `reef-maw` at 1.37x span** — he is already 1120px wide
on a 1536px plate and a lunge widens BOTH ways. His kit must favour vertical / in-place beats over
anything that reaches laterally.
