# PLATE PRE-CHECKS — run these BEFORE writing a kit, not after

Two blockers have now cost work by being found LATE. Both are cheap to check up front.

## 1. FACING — is the plate natively side-profile facing screen-right?

`check-frontturn.mjs`'s own header states the law: a frontal stance "has no side, so it cannot be
mirrored into agreement with the rest of the kit — it is wrong in BOTH slots". A front-facing plate
cannot produce a usable kit no matter how good the acting lines are: frame 0 is square to camera, so
every clip begins by turning.

**IR-41 Kasa Oni was written in full — 13 gate-clean acting lines — before anyone noticed his plate
is front-facing.** The kit is fine; the plate is out of spec. That is entirely wasted sequencing.

Verdicts so far, taken by building a contact sheet and LOOKING:

| set | facing |
|---|---|
| `qa-boss/anchors/mk/` — raiju, minotaur, skullrend, pale-choir, jin | All face screen-RIGHT; none is frontal. But see the caveat below — "side profile" is not binary. |
| `input/MK FINAL/XGundam not sorted/` | **NOT uniform.** IR-41 Kasa Oni is front-facing. The other 47 are unverified — check each one before writing its kit. |

**CAVEAT — CHECK FACING AT FULL SIZE, NOT ON A CONTACT SHEET.** I first read these five off a
400px-per-plate contact sheet and recorded them as "all natively side-profile facing screen-right".
minotaur-axe's kit writer then opened the plate properly and found his **hips and chest sit about a
third of a turn open to camera** — both pectorals and both legs visible — with only his head, axe and
intent committed to screen-right. That is not a blocker the way a frontal plate is, but it changes
the acting lines: writing the roster-standard *"in strict side profile facing screen-right"* would
have ordered the model to RE-POSE him toward pure profile mid-clip, fighting his own anchor. His kit
says *"angled to camera exactly as in the reference image and facing screen-right"* instead, and bans
the turn in BOTH directions (never opens further toward the viewer, never turns away).

So facing is a THREE-way verdict, not two: **frontal** (unusable, re-pose the plate) ·
**partly open** (usable, but the acting lines must lock the anchor's own angle rather than demand
strict profile) · **strict profile** (roster-standard wording applies). A thumbnail can only reliably
separate the first from the other two.

## 2. PLATE UNIFORMITY — is the backdrop ONE green, or two?

`measure-anchor-budget.mjs` reports "dominant plate %", which counts pixels satisfying the `isGreen`
predicate. **That number cannot see a two-tone plate, because both tones are green and both pass the
predicate.** raiju-naginata scores 88.3% dominant plate and still carries a plainly visible darker
rectangle over the left two-thirds of the frame. The handoff flagged this as "dominant green only
56.7%"; re-measured it is 88.3%, so that specific number is stale — but the DEFECT is real and
visible. A number that disagrees with the picture is the tell, again.

**The metric that works is the share held by the single most common green bin.** Measured over
8-level-quantised bins:

| plate | top bin | share | verdict |
|---|---|---|---|
| jin-goldenhand | 0/248/0 | **99.2%** | single-tone — clean |
| minotaur-axe | 0/216/0 | 76.3% | two near-identical tones (216 vs 208) — mild gradient, fine |
| raiju-naginata | 0/160/16 | **62.7%** | ~~TWO-TONE — the rectangle~~ **SCREENING FLAG ONLY — the plate KEYS CLEAN. See the RAIJU box below.** Genuinely darker overall (g~160-176 vs 208-248 elsewhere), and genuinely noisy, but the spread never reaches the keyer's threshold |

Rule of thumb: **top-bin share below ~70% means suspect a two-tone plate — go and look.**

WHY IT MATTERS AT KEYING: `key-idle-clips.mjs` samples the screen colour from the BORDER RING. On a
two-tone plate the border is the OUTER tone, so the INNER tone sits further from the sampled colour
and may survive the tight global key — leaving a rectangular alpha edge exactly where the two tones
meet. `check-plate-retention.mjs` would see it as retained plate.

### ★ RAIJU IS NOT BLOCKED — SETTLED 2026-07-31 (phase 105) BY KEYING THE PLATE, NOT BY ARGUING

The action above said "re-plate, or generate ONE clip first, and do not write his 13 acting lines
until that is settled". **It is settled, and no re-plate is needed.** There is a third option nobody
had taken: the plate is a still, so you can just RUN THE REAL KEYER ON IT and look at the alpha.

Measured with `key-idle-clips.mjs`'s own math — border-ring screen sample `2.0/164.0/21.0`,
`TIGHT=45`, `LOOSE=70`, border-seeded flood over the candidate set:
- **The alpha is a CLEAN SILHOUETTE. No rectangle.** 279,926 opaque px = 11.86% of frame, which is the
  figure plus the naginata and nothing else. Rendered to `qa-boss/frames/raiju/alpha-mask.png`.
- **The tone spread is far smaller than "two-tone" implies.** Distance from the sampled colour, over
  every backdrop pixel the border flood reaches: **81.6% within 9 · 92.9% within 19 · 99.4% within
  29** — all comfortably inside `TIGHT=45`. Border samples read `2/164/21` on all eight probes; the
  "inner tone" samples read `0/160/17`..`0/173/26`.
- So the real defect is a **NOISY / GRADIENT region against a flat border** (11,445 distinct green
  bins, top bin only 56.7% by this predicate), not two separated tones. The eye sees the rectangle
  because it is very sensitive to a flat-vs-noisy boundary; the KEYER does not, because the colour
  delta is ~18-29 against a 45 threshold.

**So: top-bin share is a SCREENING metric, not a verdict.** Below ~70% still means go and look — but
"look" now means key the plate and view the alpha, which is decisive, local and free. Do not re-plate
a character on the strength of the bin share alone.

**Residual risk, unchanged and worth carrying:** this was measured on the STILL. A generated clip adds
compression and motion blur that can widen the spread. **Check raiju's FIRST keyed clip for a
rectangular alpha edge** before trusting the other twelve. That is a first-clip check, not a blocker
on writing the kit.

## ★ MAGENTA IDENTITY COLOUR — RUN THE GLOW-SURVIVAL SCREEN BEFORE WRITING ANY KIT (phase 206)

**The keyer will silently delete a character's own MAGENTA.** `scripts/key-idle-clips.mjs` carries a
magenta-family escape (`min(r-g, b-g) > 45`) plus an interior magenta suppress. Both exist so
**magenta PLATES** can key — onryo-katana uses one — and both are **hue rules with no distance
term**, so they fire on magenta *anywhere in the frame*, including on the character.

`ir52-umbra-pinions` is the case, and it was found by ACCIDENT after its kit was already written:
its wing membranes are `rgb(254,0,249)`, sitting a distance of **420** from the plate colour when
LOOSE is 70 — nowhere near the backdrop — and 51,252 subject pixels were flooded away. The character
keyed as a skeletal wing frame with holes where its signature feature belongs.

**RUN THIS ON EVERY NEW PLATE, before the kit is written:**
```
node qa-boss/screen-glow-survival.mjs <plate.png>
```
It asks the one question no other screen answers: **of the pixels that read as emissive on the
plate, how many are still OPAQUE after keying?**

| reading | meaning |
|---|---|
| **100%** | opaque lit feature (rim light, lit material). Ships fine — just PIN it inline. |
| **95–100%** | fine. `ir37-pink-tessen` sits at 94.7% and has 13 ACCEPTED CLIPS. |
| **under 80%** | **the feature will be DELETED.** Render the mask and look before writing anything. |

**IF IT IS LOW AND THE CHARACTER IS MAGENTA, THE FIX IS A FLAG, NOT A RE-PLATE:**
```
node scripts/key-idle-clips.mjs <frames> <keyed> --still <plate> --no-magenta
```
Both screens accept `--no-magenta` too, so the fixed configuration can be modelled with no
generation spend. Measured on ir52: survival 42.8% → 100%, and `check-plate-key`'s p99 drops
404.6 → 6.4, because the same escape was inflating that statistic as well.

**DO NOT make the flag global.** It is what lets magenta PLATES key at all. The rule is per-character:

| plate | character identity colour | flag |
|---|---|---|
| green | magenta | `--no-magenta` **ON** |
| magenta | anything | **OFF** — the escape is removing the plate |

**Swept the whole roster:** ir52 is the only plate that trips this. Every other plate reads 94.7% or
above, so a low reading is a genuine alarm and not routine noise.
