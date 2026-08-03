# INSET-RING SWEEP — the effect-clip edge cut is SYSTEMIC (phase 239, 2026-08-03)

**15 of 118 shipped clips are razor-cut at a frame border. 3 confirmed by eye. Nothing is fixed —
this is a measurement, and the fix rewrites shipped assets, which Tim has parked.**

Run it yourself: `node qa-boss/check-inset-ring.mjs --all`

## What the defect is, and why it is worse than it sounds

A generated effect (flame, slash arc, impact bloom) runs off the SOURCE frame, so the keyed clip ends
in a dead-straight line. **The clip's border is NOT the screen border** — the clip is composited
mid-stage at ~600px inside a ~1900px viewport — so the cut floats in open air as a hard-edged slab.
It does not read as "the effect left the screen"; it reads as "the effect hit an invisible wall".

`~/.claude/memory/effect-clip-edge-cut.md` records this class as solved TWICE on this repo
(phase 11b straight feather, phase 14b radial feather). **It is back.**

## Why nobody caught it

The gate that catches it is mandated by `~/.claude/skills/character-clip-qa/SKILL.md` — and **this
repo never had it.** It shipped `scripts/radial-feather.mjs` (the FIX) with no detector, so the
defect has only ever been found by eye, one clip at a time: Tim in a recording, and a phase-236
agent on ir56. `qa-boss/check-inset-ring.mjs` is that missing gate.

## The headline measurement: "has an edge feather" is BINARY

Max alpha 2px in from the border, over every frame of all 118 clips:

| i2 max alpha | clips |
|---|---|
| 250-255 (opaque AT the border — no feather) | **47** |
| 100-249 | **0** |
| 25-99 | **0** |
| 0-24 (feathered) | **71** |

**Zero clips in the middle.** This is not a spectrum with a threshold to argue about — 40% of the
shipped corpus has no edge feather at all, and 60% has one. Whether that is VISIBLE depends on how
much content sits on the border, which is what the contiguous RUN measures (3px to 480px).

## The 15 CUTs (run >= 100px of contiguous opaque at the border)

| clip | edge | run | frame | eye-confirmed |
|---|---|---|---|---|
| satoshi-odachi/special-c | LEFT | 477 | f52 | |
| ir56-lion-serpent/special-c | RIGHT | 432 | f59 | |
| ir56-lion-serpent/special-b | RIGHT | 361 | f29 | |
| satoshi-odachi/special-b | TOP | 339 | f54 | |
| **thorn-warden/attack-block** | RIGHT | 314 | f48 | **YES — impact bloom + club thorns sliced flat** |
| satoshi-odachi/attack-strike-b | TOP | 274 | f51 | |
| satoshi-odachi/attack-strike | TOP | 259 | f25 | |
| **lady-kurotachi/attack-strike** | TOP | 250 | f40 | **YES — slash arc amputated by a flat horizontal line** |
| ir56-lion-serpent/ko | LEFT | 193 | f68 | |
| satoshi-odachi/victory | TOP | 192 | f77 | |
| ir37-pink-tessen/attack-throw-b | RIGHT | 153 | f44 | |
| **ir56-lion-serpent/attack-throw** | RIGHT | 137 | f46 | **YES — fire-breath cut mid-plume** |
| thorn-warden/attack-throw | LEFT | 136 | f44 | |
| ir37-pink-tessen/attack-strike | RIGHT | 118 | f66 | |
| ir56-lion-serpent/attack-block-b | LEFT | 108 | f48 | |

Rendered over dark at full size in `qa-boss/decisions/inset-ring/` (gitignored, regenerable).

**By character:** satoshi-odachi 5 · ir56-lion-serpent 5 · thorn-warden 2 · ir37-pink-tessen 2 ·
lady-kurotachi 1. Clean of CUTs: eclipse-ofuda, hollow-pale, ir48-hex-paper-lord, sora-yari,
lich-scythe, oni-tetsubo, gargoyle-spear.

## ⚠ THE PROP-EXTENDED CONFOUND — AND WHY IT DOES NOT EXPLAIN THIS AWAY

satoshi-odachi and ir56-lion-serpent are prop-EXTENDED: their anchor plates already touch the frame
edge, so edge contact is a known, accepted condition for them (`qa-boss/ANCHOR-BUDGETS.md`), and
10 of the 15 CUTs are theirs. That is the obvious objection.

**It does not cover the other five.** `thorn-warden` (2), `ir37-pink-tessen` (2) and
`lady-kurotachi` (1) are NOT prop-extended, and two of the three eye-confirmed cuts are theirs.
Both are EFFECTS being sliced — an impact bloom and a slash arc — not a weapon crossing the edge.
Note also that `sora-yari` IS prop-extended and has **zero** CUTs, which breaks the correlation in
the other direction.

## What is NOT established

- **Only 3 of the 15 have been viewed.** The other 12 are ranked by a number, not convicted by eye.
- **The CUT/WATCH boundary is unvalidated between run 100 and 133.** 134 is the lowest run confirmed
  visible; 100 was chosen for margin below it, not fitted to a gap in the data.
- **The 32 WATCH clips are a to-look-at list, not a defect count.** Do not quote that number.
- **The BOTTOM edge is excluded from every verdict** — these clips are union-bbox cropped, so a
  standing character's feet sit exactly on the bottom border, and judging BOT flagged every clean
  idle in calibration. A genuine effect sliced along the bottom would be missed. Deliberate.
- Nothing was checked in motion, in-arena, or at device truth. Static peak frames only.

## The fix, when asset work reopens (do NOT do it piecemeal)

Per `effect-clip-edge-cut.md`, and the order matters:
1. **RADIAL feather, never a straight band.** A soft fade along a straight line still reads as a box —
   the eye reads the CONTOUR, not the hardness. This exact re-fix was rejected once by Tim already.
   `scripts/radial-feather.mjs` is the reference implementation.
2. Apply to **PRE-feather frames restored from git**, so contours never stack.
3. Re-encode VP9 alpha, **rename the asset (-r2) and update the manifest url** so no browser cache
   serves the old clip.
4. **Re-run this gate after the re-encode** — a second pass is exactly what crushed a 48px feather to
   ~8px last time.
