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
