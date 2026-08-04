# PAD-SEAM SWEEP — the "faint rectangle" on the MK FINAL padded plates (phase 261)

**Closes the standing WATCH** carried in the autonomous loop prompt: *"raiju's padded plate retains a
faint rectangle — check its first keyed clip for a rectangular alpha edge."*

Raiju has no keyed clip (`fire-queue` reports it 0/13, never fired) and generation is under Tim's
hold, so the WATCH as literally written is unrunnable. It was answered a different way: measure the
seam in the PLATES, then settle whether the keyer can carry it into alpha.

**Verdict: the seam is REAL and on FIVE of six plates — and it is harmless at the KEYING stage.**
Do not spend a re-plate on it. The one thing it could still cost is not testable under the hold (§4).

---

## 1. THE MECHANISM, FROM THE TOOL'S OWN SOURCE

`qa-boss/pad-anchor-plate.mjs` builds a padded plate as:

```
ffmpeg -f lavfi -i color=c=<PLATE>:s=1536x1536      <- ONE exact RGB, flat
       -i <source>
       [1:v]crop=<subject bbox>,scale=...[fg];[0:v][fg]overlay=dx:dy
```

`PLATE` is the **median of the source's border ring** (`platePlateColour`, line 71) — deliberately, and
its header explains why: v1 hardcoded `#00b140` while the MK FINAL art uses a brighter green, so every
plate came out two-tone.

Sampling the median fixed the *gross* case but not the residual one. The overlaid crop is the
subject's **bounding box**, which contains plate pixels too — and those carry the source's own noise
and gradient, while the canvas around them is mathematically flat. So the bbox boundary is a faint
rectangle. **This is inherent to composite-onto-flat-fill; it is not a bug in the median sampling.**

That makes it decisively measurable: the fill is *bit-exact*, so the pasted rect is exactly the set of
pixels not identical to the corner colour.

## 2. THE SWEEP — all six MK FINAL plates

`dE` = Euclidean RGB distance between the **plate pixels inside the pasted rect** and the flat fill.

| plate | fill rgb | pasted rect | margins L/R/T/B | **dE** | |
|---|---|---|---|---|---|
| **raiju-naginata** | 2,164,21 | 1134x1044 | 202/200/468/24 | **5.89** | ⚠ worst |
| skullrend-orcus | 0,249,1 | 1030x1044 | 252/254/468/24 | 3.10 | seam |
| minotaur-axe | 1,216,0 | 1090x892 | 222/224/620/24 | 3.03 | seam |
| pale-choir | 8,188,3 | 606x1044 | 466/464/468/24 | 2.31 | seam |
| jin-goldenhand | 3,252,2 | 752x1044 | 392/392/468/24 | 2.20 | seam |
| oni-tetsubo | 0,186,33 | 1068x1044 | 234/234/468/24 | **1.37** | clean |

**The loop prompt named raiju, and raiju is genuinely the worst — by 1.9x over the next plate and
4.3x over oni.** But it is not alone: five of six carry a measurable seam.

All six clear the `--min-margin 200` budget. Raiju is the tightest at **L202 / R200** — exactly on the
refusal boundary, which is worth knowing before anyone re-pads it at a higher `--fill`.

## 3. WHY IT IS HARMLESS AT THE KEYING STAGE — two independent lines

**a) The threshold math.** `scripts/key-idle-clips.mjs`:

```
key-idle-clips.mjs:48   const TIGHT = 45;            // global key distance
key-idle-clips.mjs:96   const t2 = TIGHT * TIGHT;    // 2025
key-idle-clips.mjs:61   dist2() returns SQUARED euclidean distance
key-idle-clips.mjs:101  if (q < t2) alpha[p] = 0;    // => a Euclidean RADIUS of 45
```

The keyer samples its screen colour from a **12px border ring** (line 76). On every padded plate the
rect's top margin is >=468 and its side margins >=200, so **the ring is 100% fill colour** — the keyer
learns the fill exactly, and the pasted plate sits **dE 1.37-5.89** from it. Worst case raiju:
**5.89 vs a radius of 45 — 7.6x inside the cut.** Both greens key away in the same pass.

The bottom margin is 24px and the ring is 12px, so even the bottom ring stays inside the fill. Checked.

**b) The empirical control.** `oni-tetsubo` is the only one of the six with clips off a padded plate
(3/13 shipped). A pad seam surviving the key would appear as a *long perfectly axis-aligned* alpha
edge — a silhouette cannot produce one, because its edges are curved. Measured over 13 frames of
`public/assets/characters/oni-tetsubo/idle.webm`:

```
longest VERTICAL   alpha edge  102/668 rows (15.3%)  at x=35
longest HORIZONTAL alpha edge   81/676 cols (12.0%)  at y=619
=> no rectangular seam; silhouette-shaped edges only
```

⚠ **State this control's weakness honestly: oni is the CLEANEST plate in the set (dE 1.37).** It
confirms the pipeline does not manufacture a seam from nothing; it does *not* by itself clear raiju at
4.3x the contrast. The threshold math in (a) is what clears raiju, and it clears it by 7.6x.

## 4. WHAT IS **NOT** ESTABLISHED — do not report this as fully closed

**Whether the GENERATOR reproduces the faint rectangle into the clip's own background.** The plate is
an *anchor* conditioning image, not a backdrop that gets keyed straight through. A seedance clip
renders its own background, and whether a dE~6 rectangle in the conditioning image survives into
generated frames cannot be answered without firing — which is blocked. **If raiju's first clips ever
come back with a rectangle in the plate, this is the cause, and the fix is a re-pad, not a re-key.**

The keying-stage question — the one the WATCH actually asked — is closed.

## 5. IF IT EVER DOES NEED FIXING

Do **not** re-pad at a higher `--fill` (raiju is already at R200, the refusal edge). The correct fix is
to make `pad-anchor-plate` flood the *whole* canvas after compositing — i.e. re-flatten plate-family
pixels inside the pasted rect to the sampled median — so the fill and the paste share one exact green.
That is a ~5-line change in the overlay step and it removes the defect class permanently rather than
per-character.

---

**Method note.** Both probes are read-only and were run from scratch; no plate, clip or asset was
written. The first detector tried (per-column mean of plate saturation) was **not** decisive — raiju's
steps were the same magnitude as the controls'. The bit-exact-fill probe worked because it keys off
how the tool actually builds the file, found by reading `pad-anchor-plate.mjs` rather than guessing.
