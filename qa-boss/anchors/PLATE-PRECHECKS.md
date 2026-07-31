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
| `qa-boss/anchors/mk/` — raiju, minotaur, skullrend, pale-choir, jin | **ALL side-profile facing screen-right.** Curated for it. |
| `input/MK FINAL/XGundam not sorted/` | **NOT uniform.** IR-41 Kasa Oni is front-facing. The other 47 are unverified — check each one before writing its kit. |

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
| raiju-naginata | 0/160/16 | **62.7%** | **TWO-TONE — the rectangle.** Also much darker overall (g~160-176 vs 208-248 elsewhere) |

Rule of thumb: **top-bin share below ~70% means suspect a two-tone plate — go and look.**

WHY IT MATTERS AT KEYING: `key-idle-clips.mjs` samples the screen colour from the BORDER RING. On a
two-tone plate the border is the OUTER tone, so the INNER tone sits further from the sampled colour
and may survive the tight global key — leaving a rectangular alpha edge exactly where the two tones
meet. `check-plate-retention.mjs` would see it as retained plate.

**raiju action:** either re-plate to a single flat green with `replate-chroma.mjs`, or generate ONE
clip first and key it before writing the other twelve — the handoff's standing WATCH item. Do not
write his 13 acting lines until that is settled.
