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

### THE POOL IS NOW FULLY VIEWED — UNVIEWED = 0 (phase 184)

The last three numerically-clean plates were viewed at full size. **All three rejected**, each on an
existing precedent rather than a new opinion:

| plate | numbers said | the view said |
|---|---|---|
| **skeleton-nodachi** | clean, p99 13.2 | **REJECT — double collision.** nodachi and odachi are the SAME weapon, colliding with the SHIPPED satoshi-odachi (the Tengu Naginata ground); and skeletal undead collides with lich-scythe. Thin bone struts are a secondary fringe risk. |
| **ningara-silk** | transl 7.67 "will fringe" | **REJECT — costume.** Sheer lace lingerie, stockings, heels: a pin-up render, tonally incompatible with a roster of armoured samurai, knights and creatures. The 7.67 turns out to be REAL see-through fabric across the whole torso, not a confound. Heels also give no stable ground contact for feet-flat beats, and the spear collides with the shipped sora-yari. |
| **kira-frostveil** | transl 11.49, highest | **REJECT — baked mist.** Paired sai are translucent ICE with vapour streaming off the blades: the banned effect class rendered into the plate, the Ghast Flail ground. The 11.49 is explained — the WEAPONS are see-through. |

**FINAL TALLY FOR THE WAVE-2 NUMERICALLY-CLEAN SET: 11 viewed, 5 rejected on the view (45%).**
That holds the earlier finding almost exactly: **screens 1–3 are a CHEAP FILTER, not a shortlist**,
and roughly half of everything that passes the numbers dies on sight.

**SURVIVORS — and this pool is now exhausted:**
`hector-warhammer` · `reef-maw` · `shiro-gale` · `elara-frostplate` (all four have kits written and
independently verified). Plus `violet-contract` and `iron-vow`, both held as Tim calls.

**THERE ARE NO MORE CANDIDATES HERE.** Any further characters must come from a NEW source — a
different tier of `input/MK FINAL/`, or a re-plate of something already rejected on grounds a
re-plate would actually fix (fill, padding), which is a decision and not a re-screen.

### ⚠ THE POOL WAS NOT EXHAUSTED — MYTHIC AND LEGENDARY HAD NEVER BEEN SCREENED (phase 185)

Phase 184 concluded the wave-2 pool was exhausted and that further characters needed a NEW source.
That was correct as far as it went — so I went to the new source, and it was not empty.

**Only `rare` (38) + `Epic` (28) had ever been screened. `mythic` (21) and `legendary` (13) never
had.** Screened both this cycle. Most of their contents turn out to BE the existing roster — mythic
is the tier oni-tetsubo, lich-scythe, gargoyle-spear, raiju-naginata, minotaur-axe, skullrend-orcus,
pale-choir, jin-goldenhand, thorn-warden and eclipse-ofuda all came from — which is why nobody
re-screened it. But four names were NOT accounted for:

| candidate | tier | emis | status |
|---|---|---|---|
| **Jorogumo Kusarigama** | mythic | 0.23 | **CLEARED — kit dispatched** |
| Zephiron | legendary | 1.11 | unviewed; "keys clean, archetype-viable, below the six taken forward" |
| Wight Spear | legendary | 3.36 | unviewed; same note. NB spear collides with SHIPPED sora-yari |
| Stormlord_Rex | mythic | 4.46 | unviewed; name promises lightning — check for the blocker class |

**`Zephiron` and `Wight Spear` were never rejected** — the doc says they key clean and are
archetype-viable and were simply below the six taken forward. That is a queue position, not a
verdict, and it should not have read as one.

**JOROGUMO KUSARIGAMA — CLEARED, and it proves the padding step matters.** Raw art measured 96% fill
with 34/51px margins and a 1.05x span ceiling: unusable, and a snap judgement on the raw plate would
have rejected it. `pad-anchor-plate.mjs` rebuilt it to fill 68%, L212 R212 T468, span 1.38x — all
margins >=200px. Then: keys with margin (opaque 12.56, emis 0.25, p99 5.9); translucency 5.98 with
grnDom only 8.9, so REAL mild see-through from the cyan web membranes rather than a green confound.
Distinct archetype (spider-woman + chain-sickle) with no roster collision.

**LESSON: judge a candidate from `input/MK FINAL/` only AFTER padding.** The raw art is cropped tight
by design — 85-95% fill is normal there — so raw margins say nothing about viability.

### ⚑ SOME WEAPONS ARE STRUCTURALLY INCOMPATIBLE WITH CONTAINMENT (phase 192)

Two candidates rejected the same day for the same reason, which makes it a rule rather than two
coincidences:

| plate | weapon | cloth | verdict |
|---|---|---|---|
| Null Mire | thorned WHIP, thrown in an S-curve across the right half | tattered cloak sweeping the left third | REJECT |
| Bone Ledger | segmented SPINE-FLAIL with twin skulls, thrown wide right | chain-embroidered cloak sweeping the left third | REJECT |

**The pattern: a LASH weapon whose entire vocabulary is GAINING REACH, plus a large flowing cloak —
so both frame edges are owned by things that must move.**

Padding fixes absolute margins. It does not fix this. Containment forbids gaining reach, so a lash
that may never extend has **no beats left**. That is a BEAT-LEVEL impossibility — the same class as a
projectile character on a no-projectile roster — and no amount of prompt care recovers it. Reject at
the view; do not spend a kit agent discovering it.

**THE CONTRAST THAT MAKES THE RULE PRECISE — `jorogumo-kusarigama` PASSED with a chain weapon.** Two
differences, both decisive:
1. **Her chain HANGS IN A LOOP close to the body** in the reference, rather than being thrown wide.
   So "hang, fall, drag, draw IN, coil" are all reference-consistent beats.
2. **The chain is not her only vocabulary.** She has four spider legs and a sickle, so the kit can
   build strikes, throws, blocks and specials that never involve extending the chain at all.

So the test is not "does it have a flexible weapon". It is: **strip away every beat that gains
reach — is there still a kit left?** If the answer is no, the plate is unusable however good it
looks, and both of these look very good.

### ⚑ SCREENING SHORTCUT: THE SOURCE ART REPEATS MOTIFS, SO COLLISIONS COME IN FAMILIES (phase 194)

`input/MK FINAL/` is not a set of independent designs — it is generated art with recurring motifs, so
a motif that collides once will collide repeatedly. The **wide straw conical hat with hanging paper
ofuda talismans** has now cost three separate rejections against the SHIPPED `eclipse-ofuda`:

| plate | tier | what it wore |
|---|---|---|
| Sol Ofuda | mythic | the same hat + hanging ofuda + katana idea |
| Ink Sovereign | Epic | hat + hanging ofuda + tassels, talisman in hand, naginata |
| Charm Ronin | rare | hat + hanging paper charms, over a modern bomber jacket |

**Check the motif before opening the plate.** Any candidate whose thumbnail or name suggests these
carries a near-certain collision with something already shipped:

| motif | collides with (SHIPPED unless noted) |
|---|---|
| wide straw hat + hanging paper ofuda | `eclipse-ofuda` |
| antlered figure | `thorn-warden` |
| war-fan | `ir37-pink-tessen` |
| katana / tachi / odachi / nodachi | `onryo-katana`, `lady-kurotachi`, `satoshi-odachi` |
| spear / yari | `sora-yari` |
| naginata | `raiju-naginata` (kit) |
| kanabo / tetsubo studded club | `oni-tetsubo` |
| flail / chain-and-weight | `hydra-flail` (kit) |
| sickle / kama / chain-sickle | `jorogumo-kusarigama` (kit) |
| skeletal undead | `lich-scythe` (kit) |
| armoured elf woman + blade | `elara-frostplate` (kit) |
| claw archetype | `pale-choir` (kit) |

**AND TWO NON-WEAPON GROUNDS THAT KEEP RECURRING**, both invisible to every metric:
- **Modern military dress** (uniforms, squadron patches, medal ribbons, bomber jackets, cargo pants)
  appears NOWHERE in a feudal-Japanese / dark-fantasy roster. Cost `Captain_Nyra` and contributed to
  `Charm Ronin`. This is NOT a "too anime" rule — `ir37-pink-tessen` is anime-styled and shipped.
- **High heels** give no stable ground contact for the feet-flat beats every kit requires. Cost
  `ningara-silk` and contributed to `Ink Sovereign`.

---

## ★ FILL, PRICED (phase 217, 2026-08-03) — the ruling input, NOT the ruling

The four held characters (`golem-mace` 0.50, `nurikabe-shield` 0.55, `violet-contract` 0.62, plus
`iron-vow` on other grounds) wait on Tim. Phase 143 above is emphatic and still governs: **a fresh
measurement is not a fresh decision.** Nothing below promotes anyone. What was missing is that
"fill is a resolution budget" was never converted into pixels, so the call had no price tag.

### The chain, end to end — all of it measured, none of it assumed

1. **Renders are 960x960, not 720x720.** `resolution:'720p'` at `aspect_ratio:'1:1'` yields a 960
   square. Read off six raws in `qa-boss/raw/`. Every px figure below follows from this.
2. **Delivered character height = `fill x 960`.** Confirmed against four shipped webms — the keyer
   crops to the subject, so the webm's own height IS the delivered character:

   | character | plate fill | predicted `fill x 960` | actual webm h |
   |---|---|---|---|
   | hollow-pale | 0.919 | 882 | **890** |
   | eclipse-ofuda | 0.859 | 825 | **834** |
   | lich-scythe | 0.68 | 653 | **660** |
   | oni-tetsubo | 0.68 | 653 | **670** |

   Four for four within ~1% (the slack is motion headroom in the crop). The model is sound.
3. **On-screen the character is ~560px** *(corrected phase 220 — was published as ~600px)*.
   `.fr-stage` is `height: min(100vh, 100vw/1.83333)` = 1047px at 1920x1080; `CAL.fighterP1.h = 58`
   makes the square fighter box **607px**; the still is `object-fit: contain` inside it.
   Phase 217 then assumed the still was a TIGHT crop, so the character filled the box. **It is not.**
   Measured alpha bboxes — the check phase 217 asserted from dimensions alone and never ran:

   | still | file | subject h | vFill | on-screen character |
   |---|---|---|---|---|
   | hollow-pale | 912x900 | 843 | 0.937 | **561px** |
   | eclipse-ofuda | 473x900 | 835 | 0.928 | **564px** |
   | ir37-pink-tessen | 635x900 | 828 | 0.920 | **559px** |
   | lady-kurotachi | 900x900 | 829 | 0.921 | **560px** |

   Every still carries ~6-8% transparent padding. Four characters with four DIFFERENT still aspect
   ratios land within 5px of each other — which is itself the strongest confirmation on record that
   the pipeline normalises on-screen character height, and it is **560px**, not 600px.
4. **So headroom = `fill x 960 / 560`.** Every multiple below rose ~7% against what phase 217
   published. **No ranking, and no conclusion, changes** — the correction is uniform across the table.

   **`cal.h` cannot rescue a low fill — and the reason is the opposite of "cal ignores fill"
   (corrected phase 219).** `cal.h` DOES compensate for framing, precisely and automatically: it is
   ~100 for both hollow-pale (0.92 fill, 100.08) and oni-tetsubo (0.68 fill, 102.77) only because
   the keyer CROPS both webms to the subject, so the padding is already gone by then. Where a clip
   is left uncropped the cal absorbs that too — `eclipse-ofuda/attack-strike.webm` ships as a full
   960x960 frame and carries `cal.h 117.07`, which lands its character at ~611px on screen against
   idle's ~614px. The comment in `types.ts` is accurate: the anchor frame lands pixel-on-pixel.

   That is exactly WHY fill costs resolution rather than apparent size: **`cal.h` normalises every
   character to the same ~560px on-screen height, so a low-fill character arrives with fewer real
   pixels and is scaled UP to match.** The cal cannot invent the pixels the plate never spent.

### What that prices

| | fill | delivered px | headroom | status |
|---|---|---|---|---|
| hollow-pale | 0.919 | 882 | **1.58x** | SHIPPED 13/13, accepted |
| eclipse-ofuda | 0.859 | 825 | **1.47x** | SHIPPED 13/13, accepted |
| standard MK | 0.68 | 653 | 1.17x | below every shipped boss |
| violet-contract | 0.62 | 595 | 1.06x | barely above parity |
| nurikabe-shield | 0.55 | 528 | 0.94x | upscaled on screen |
| golem-mace | 0.50 | 480 | 0.86x | upscaled 1.17x |

**The finding that outranks the held three: even the STANDARD 0.68 MK fill (1.17x) ships below every
accepted boss (1.47-1.58x).** The held characters are the tail of a gap the whole MK wave already
has — because an MK plate spends 32% of frame height on padding where an original boss spends ~8%.

### THE LEVER NOBODY COSTED: RENDER AT 1080p

Seedance `mode:'std'` supports 1080p, which gives a 1440 square (see the pixel-budget proof below):

| | fill | @1080p | headroom | vs shipped bar |
|---|---|---|---|---|
| standard MK | 0.68 | 979 | 1.75x | **above both bosses** |
| violet-contract | 0.62 | 893 | 1.59x | **above eclipse's 1.47x** |
| nurikabe-shield | 0.55 | 792 | 1.41x | just under eclipse's 1.47x |
| golem-mace | 0.50 | 720 | 1.29x | still lowest, but above today's 0.68@720p |

### ✔ AND THE EYE SAYS THE 0.68 GAP DOES NOT SHOW (phase 221)

The table above is arithmetic. Arithmetic is not the decision, so the gap was rendered and LOOKED at:
a shipped boss and a shipped MK character, each scaled to its true 560px on-screen height, side by
side at full size.

```
hollow-pale idle.webm  890px character -> 560px   headroom 1.58x   (boss, accepted)
lich-scythe idle.webm  660px character -> 560px   headroom 1.17x   (MK, standard 0.68 fill)
```

**No visible resolution deficit in the MK character.** At deploy size the lich's chain links,
individual toes, robe tatters, crown filigree and scythe-blade edge all read crisply — fully
competitive with the boss beside it. Both are DOWNSCALES (>1.0x), so nothing is being upscaled at
standard fill; 1.17x simply spends less of its surplus than 1.58x does.

**This narrows the question rather than answering it.** The fill concern is arithmetically real and
visually absent AT 0.68. So:
- **standard 0.68 MK needs no rescue** — a 1080p re-render of the whole wave buys headroom nobody
  can see, and its unlim coverage is unknown anyway.
- the live question is only the two that fall BELOW 1.0x and are genuinely upscaled on screen:
  **nurikabe-shield (0.94x)** and **golem-mace (0.86x)**. violet-contract at 1.06x is a downscale
  and by this evidence is very likely fine.
- **Still Tim's call** — this changes no verdict and the guard still refuses all three.

Caveat kept honest: one character pair, one frame, one viewport. It is strong evidence that 1.17x is
safe, not proof that 0.86x is not. The two upscaled plates were NOT tested this way, because neither
has a clip to test.

Incidental, recorded but not investigated: at FULL size hollow-pale's idle shows faint coloured
speckling along the thin bone spurs of the wing arm (chroma fringe on high-frequency structure). It
is not visible at 560px deploy size. Its black lower body was checked and is ART, not a key artifact
— tufted silhouette, internal value variation, legs emerging correctly beneath.

### ✔ THE 0.86x CASE, TESTED BY SIMULATION — AND THE VIEWPORT DOMINATES IT (phase 222)

Phase 221 closed 1.17x by rendering it, and stated its own limit: *"strong evidence 1.17x is safe,
NOT proof 0.86x is not"* — because neither upscaled plate has a clip. That gap is now closed by
SIMULATION off a clip that does exist: take the boss's 882px character, downscale to what each fill
would have delivered (`fill x 960`), then scale back to the 560px deploy size. Same pixel budget, real
detail to spend.

```
A  REF   fill 0.919 -> 882px -> 560   headroom 1.58x
B        fill 0.68  -> 653px -> 560   headroom 1.17x
C        fill 0.55  -> 528px -> 560   headroom 0.94x   (upscaled)
D        fill 0.50  -> 480px -> 560   headroom 0.86x   (upscaled)
```

**At true deploy size all four are indistinguishable to me.** At **3x zoom** the ladder degrades
monotonically and plainly: by C the teeth blur into a mass and the rib striations flatten, D is
softest. So the loss is real and ordered — it simply lives below the threshold the game renders at.

### AND THEN THE NUMBER THAT REFRAMES THE WHOLE HOLD

On-screen character height scales with the viewport, so headroom does too:

| viewport | fighter box | on-screen char | boss 0.919 | MK 0.68 | 0.55 | 0.50 |
|---|---|---|---|---|---|---|
| 1920x1080 | 607 | 561 | **1.57x** | 1.16x | 0.94x | 0.85x |
| 2560x1440 | 810 | 749 | **1.18x** | 0.87x | 0.71x | 0.64x |
| 3840x2160 | 1215 | 1123 | **0.79x** | 0.58x | 0.47x | 0.43x |

**The shipped, accepted bosses are themselves upscaled on any display above 1080p** — 0.79x at 4K.
And moving 1080p -> 4K costs a boss 0.78x of headroom, which is MORE than the entire fill gap between
a boss and golem-mace at 1080p (0.72x).

**So the display the game is played on affects delivered sharpness more than the fill choice does,**
and "upscaled on screen" is already a shipped and accepted condition. That does not make 0.50 free —
it makes it second-order, and it means any bar applied to fill has to be stated per-viewport or it is
not a bar at all.

**⚠ THIS IS A LOWER BOUND ON THE DAMAGE, NOT A VERDICT.** The simulation models *pixel-count* loss
only. A real 0.50-fill generation also gives the MODEL less room to draw into, and it will very
likely put less detail there in the first place — a loss this method cannot show. C and D are
downscaled REF pixels, not renders. Genuine confirmation still needs one real low-fill clip.
Unchanged: still Tim's call, no verdict moved, the guard still refuses all three.

**⚠ ONE UNRESOLVED DEPENDENCY ON THIS LEVER.** Whether `1080p` is inside the *unlim-covered configs*
cannot be determined from this account: `models_explore` returns no "Unlim configs" list while
`unlim.available` is false. If 1080p is not covered, the remedy costs credits and the ruling changes
shape. **Check the covered-config list the moment the account works, before planning the wave.**

So the honest framing of Tim's call is **not** "is 0.50 acceptable" but "**do we re-render the MK wave
at 1080p**" — which lifts every MK character above the shipped bar and moves two of the three held
ones into range. `iron-vow` is untouched by this: its hold is duplicate weapon class vs oni-tetsubo,
a roster-composition question no pixel count answers.

### ✔ THE 1440 FIGURE IS NO LONGER A GUESS (phase 218) — `resolution` IS A PIXEL BUDGET

Phase 217 flagged `1440@1080p` as the one load-bearing number inferred from a ratio. **Closed for
free, off the 278 raws already on disk** — no render needed:

```
276 files  960x960     (aspect_ratio 1:1,  resolution 720p)
  2 files  1280x720    (aspect_ratio 16:9, resolution 720p)  <- both named *-169, aspect intent explicit
```

```
960 x  960 = 921,600
1280 x 720 = 921,600     <- EXACTLY equal, not approximately
```

**`resolution` fixes a total PIXEL BUDGET and `aspect_ratio` distributes it** — that is why a square
"720p" is 960 a side and not 720. The rule is confirmed by an exact identity across two aspect ratios
in this project's own corpus. Applying it one tier up:

```
1080p 16:9 = 1920 x 1080 = 2,073,600     ->   square side = sqrt(2,073,600) = 1440 EXACTLY
```

So the 1080p column in the table above stands on derived arithmetic, not a ratio guess.
Residual caveat, stated plainly: **the budget rule is verified at the 720p tier only.** Carrying it to
1080p is an extrapolation — but a principled one, and the exactness of the identity (not a rounding)
points to a designed rule rather than a coincidence. One 1080p render still confirms it outright.

### Stated limits — do not over-read this
- Assumes a 1920x1080 viewport. A taller display shrinks every headroom figure proportionally;
  the RANKING is viewport-independent, the absolute multiples are not.
- No MK character has a still yet, so its `cal.h` is not yet derived. The ~560px on-screen figure
  comes from the existing tight-crop still convention (all are 900px tall, varying widths).
- **This changes no verdict.** golem-mace / nurikabe-shield / violet-contract remain TIM in
  ROSTER-VERDICTS.json, and `may-i-write-kit.mjs` still refuses them.

---

## ★ `iron-vow` — THE WEAPON-CLASH RULING, MADE CHEAP (phase 223, 2026-08-03)

`iron-vow` is held as *"duplicate WEAPON class (collides with oni-tetsubo); recorded as a Tim call
rather than an auto-reject"*. It is the ONLY held character whose blocker is not fill, so nothing in
phases 217-222 touched it. Both plates were rendered side by side at size and compared.

**The collision is real, and it is weapon-family ONLY:** both carry a two-handed blunt club of
similar length, held forward. That is exactly what the verdict says.

**Everything else is maximally distinct — this is the roster's WEAKEST collision, not its strongest:**

| | oni-tetsubo | iron-vow |
|---|---|---|
| body | bare-chested horned oni, rope harness, plated loincloth, **barefoot** | bald scarred human, **metal jaw-guard**, layered black plate, boots |
| back | nothing | **hooded mantle/cape** with a white crescent sigil |
| palette | saturated warm **RED** | desaturated **BLACK/GREY** |
| weapon detail | tapering wooden shaft, pale **organic tusk-spikes** | straight iron cylinder, regular **blunt metal studs** |
| angle held | low across the body, angled down-forward | raised diagonally up-forward |

At 560px deploy size the two read apart instantly — horns + red skin versus cape + bald head. Compare
the collisions that WERE auto-rejected: `Tengu Naginata` (same weapon **and** same archetype as raiju)
and `Horned Ruin Vex` (same red horned demon as oni). Those share the creature idea. iron-vow shares
only the weapon family with an entirely different creature — which is precisely why it was recorded
as a Tim call instead of an auto-reject. That instinct looks right.

**AND IT HAS NO OTHER BLOCKER.** Re-measured this phase:

```
check-plate-key        opaque 12.70% · emis 0.05% · p99 5.1 · max 70 · KEYS WITH MARGIN
measure-anchor-budget  1536x1536 · subject 812w x 1044h · fills 68.0%  (STANDARD fill, no Tier C)
screen-glow-survival   136/136 emissive px survive = 100%  (no meaningful lit feature)
```

Standard 0.68 fill, roomy L362/R362 margins, cleanest p99 of the held set, no emissive risk. **If the
ruling is "distinct enough", iron-vow is kit-ready the same day with nothing else to fix** — unlike
golem-mace and nurikabe-shield, which would still carry their fill question.

Unchanged: **this is ruling INPUT, not a ruling.** `iron-vow` stays TIM in ROSTER-VERDICTS.json and
`may-i-write-kit.mjs` still refuses it.

### ✅ THE LAST THREE UNVIEWED CANDIDATES — ALL VIEWED, ALL REJECTED (phase 263)

The rows at "PHASE 185" left three candidates carrying an `unviewed` note. Viewed at full size this
cycle (no account needed, nothing generated). **All three rejected — mythic and legendary are now
genuinely exhausted, and this time the pool really is empty.**

| plate | numbers said | the view said |
|---|---|---|
| **Stormlord_Rex** | emis 4.46, highest in the set | **REJECT — baked lightning, the kitsune-blocker class.** Yellow-white arcs are rendered INTO the plate along the whole spear shaft and both blades. Same precedent as the kira-frostveil rejection ("the banned effect class rendered into the plate"). SECOND independent blocker: the pose is near-frontal/three-quarter, torso and face to camera — the `ir41-kasa-oni` frontal-plate blocker, not the native side-profile-facing-screen-right the roster requires. |
| **Zephiron** | emis 1.11, "keys clean" | **REJECT — baked lightning.** Blue-white arcs along BOTH staves, rendered in. Also near-frontal. Its low emis score is the interesting part — see the metric note below. |
| **Wight Spear** | emis 3.36 | **REJECT — double collision**, the exact precedent that killed `skeleton-nodachi`: undead humanoid collides with the shipped `lich-scythe`, and the spear collides with the shipped `sora-yari` AND `gargoyle-spear`. No baked emissive (the frost rime is opaque paint, not glow), and it is a clean side-profile facing screen-right — but the archetype ground is taken twice over. Its flatter, lower-fidelity render is also a cohesion break against the photoreal roster. |

**Running tally now: of everything that passed the numeric screens, ~50% has died on sight.** That
figure has been stable across three waves. Screens 1-3 remain a CHEAP FILTER, never a shortlist.

### ⚠ WHY THE NUMBER DID NOT CATCH EITHER LIGHTNING CHARACTER — AREA IS THE WRONG QUANTITY

Both rejected-for-lightning plates carry a defect that is obvious in one second of looking, and
neither is separable by a pixel-FRACTION metric. Measured on the raw plates, subject pixels only,
reproducing this file's stated metric (near-white all>=250; hot r>=235,g>=200,b<160) plus a mirrored
COOL test (bright and blue-dominant):

```
character          subj%   nearWhite    hot      coolMirror
Stormlord_Rex       20.6      0.11      0.16        0.25      <- baked lightning, BOTH metrics say clean
Zephiron            16.9      0.25      0.25        3.38      <- baked lightning
Wight Spear         22.6      0.00      0.00       12.62      <- NO glow at all (opaque rime)
Raiju Naginata      19.1      0.00      0.00        5.15      <- ACCEPTED playable
Kitsune Tanto       25.4      0.00      0.52        0.00      <- the blocker the class is named after
Eclipse Ofuda / Oni Tetsubo / Gargoyle Spear  all 0.00 across the board
```

**Three things follow, and two of them kill an obvious "fix":**

1. **A thin filament is a tiny AREA.** Lightning arcs are lines. Stormlord's are unmistakable to the
   eye and reach 0.16% of subject pixels. No area threshold can separate that from noise without
   drowning in false positives. **The quantity to measure would be local contrast / filament
   structure, not fraction** — and until such a screen exists, THE VIEW IS THE ONLY DETECTOR for this
   class. Do not let a low emis number stand in for looking.
2. **A "cool mirror" metric does NOT work — do not build one.** It scores `Wight Spear` 12.62% (which
   has no glow whatsoever, only pale opaque frost paint) and the ACCEPTED `raiju-naginata` 5.15%. It
   cannot tell cool-COLOURED from cool-EMISSIVE, so it would reject good plates and still miss
   Stormlord at 0.25%.
3. ⚠ **THE RECORDED `emis` COLUMN CANNOT BE REPRODUCED AT ALL. DO NOT TUNE OR TRUST IT.**
   It records Stormlord **4.46** / Wight Spear **3.36** / Zephiron **1.11**. I tried SIX plausible
   formulas (this file's stated hot-test over subject pixels and over the whole frame; near-white
   only; Rec.709 luma >=200 and >=180; any-channel >=250) across all THREE file variants
   (`<name>.png`, ` PFP`, ` TCG`) — **eighteen combinations, and not one reproduces all three
   recorded values.** The stated formula gives Stormlord 0.16 against a recorded 4.46, a 28x gap.
   The single apparent hit (luma>=200 on `Zephiron PFP` = 0.82) is coincidence: the same metric gives
   Stormlord 0.94 and Wight 2.41, not 4.46 and 3.36.
   So this is not "documented over a different denominator" — **the formula as documented is not the
   formula as run, and the real one is not recoverable from what is written here.** Every `emis`
   number in this file is therefore an UNVERIFIABLE historical artifact. Do not re-run it, do not
   tune a threshold against it, and do not let a low value clear a plate. Re-derive from scratch or
   view. The per-plate VERDICTS in this file rest on the VIEW and are unaffected.

**AND THE OBVIOUS FOLLOW-UP IS ALREADY DONE — do not re-screen `rare` and `Epic` looking for missed
filament emissive.** It is tempting to conclude that a warm/area metric this unreliable must have let
something through those two tiers. It did not get the chance: phase 184 recorded **"THE POOL IS NOW
FULLY VIEWED — UNVIEWED = 0"**, and the ~50% on-sight rejection rate across three waves is precisely
the record of the view overriding the numbers. Every `rare` and `Epic` candidate was looked at by a
human eye regardless of its score. **No candidate in this file was ever cleared on the number alone.**
The lesson is about what the numbers are worth, not about a gap in coverage — the coverage held
because nobody trusted them.
