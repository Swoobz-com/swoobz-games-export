# INSET-RING SWEEP — the effect-clip edge cut (phase 239, CORRECTED phase 240)

> ## ⛔ READ THIS FIRST — PHASE 239'S HEADLINE WAS WRONG BY 3x
>
> Phase 239 reported **"15 of 118 shipped clips are razor-cut"**. Phase 240 VIEWED all fifteen.
> **Only 5 are sliced EFFECTS. The other 10 are a big PROP or BODY crossing the frame edge** —
> satoshi's odachi blade (5), ir56's serpent tail (2), thorn-warden's club (1), ir37's war-fan (2) —
> which is the known, accepted overrun condition, not this defect class.
>
> **Acting on the uncorrected number would have re-feathered 10 clips that are working as intended**,
> and re-encoding a healthy clip is exactly how the 48px feather got crushed to 8px last time.
>
> Cause: run length separates a thin weapon TIP (3-50px) from a sliced effect (134-480px), but a
> WIDE prop produces a long run too. **The gate cannot make the EFFECT-vs-PROP call. Only the eye
> can**, and phase 239 shipped a count before making it.

**5 of 118 shipped clips carry a genuinely sliced effect. Nothing is fixed — this is a measurement,
and the fix rewrites shipped assets, which Tim has parked.**

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

## All 15 flagged clips, VIEWED and classified (phase 240)

Every one rendered at native resolution, composited over dark, crop centred on the flagged run.
Sheets: `qa-boss/decisions/inset-ring/sheet-cuts-A.png` and `-B.png` (gitignored, regenerable).

### ✅ THE REAL DEFECT — 5 sliced EFFECTS

| clip | edge | run | frame | what is being cut |
|---|---|---|---|---|
| **thorn-warden/attack-block** | RIGHT | 314 | f48 | impact bloom + club thorns sliced flat |
| **lady-kurotachi/attack-strike** | TOP | 250 | f40 | slash arc amputated by a flat horizontal line |
| **ir56-lion-serpent/special-c** | RIGHT | 432 | f59 | green/white starburst rays run to the border |
| **ir56-lion-serpent/special-b** | RIGHT | 361 | f29 | same starburst, same slice |
| **ir56-lion-serpent/attack-throw** | RIGHT | 137 | f46 | fire-breath plume cut mid-flame |

**3 characters.** ir56 is prop-extended, but a fire-breath and a starburst are EFFECTS — the
prop-extended exemption does not cover them. thorn-warden and lady-kurotachi have no exemption at all.

### ❌ NOT THIS DEFECT — 10 prop / body overruns (accepted, do NOT re-feather)

| clip | edge | run | what is actually at the border |
|---|---|---|---|
| satoshi-odachi/special-c | LEFT | 477 | the odachi blade |
| satoshi-odachi/special-b | TOP | 339 | the odachi blade |
| satoshi-odachi/attack-strike-b | TOP | 274 | the odachi blade |
| satoshi-odachi/attack-strike | TOP | 259 | the odachi blade |
| satoshi-odachi/victory | TOP | 192 | the odachi blade |
| ir56-lion-serpent/ko | LEFT | 193 | body + serpent tail |
| ir56-lion-serpent/attack-block-b | LEFT | 108 | serpent tail loop |
| ir37-pink-tessen/attack-throw-b | RIGHT | 153 | the war-fan |
| ir37-pink-tessen/attack-strike | RIGHT | 118 | the war-fan in motion blur |
| thorn-warden/attack-throw | LEFT | 136 | the thorn club |

Every one is a solid object the character is holding or made of — the exact case
`qa-boss/ANCHOR-BUDGETS.md` already accepts, and for which a straight edge-feather stays legal.

**Clean of any flag:** eclipse-ofuda, hollow-pale, ir48-hex-paper-lord, sora-yari, lich-scythe,
oni-tetsubo, gargoyle-spear.

## ⚠ WHY THE PROP-EXTENDED THEORY LOOKED RIGHT AND WAS STILL THE WRONG CUT

Phase 239 noticed 10 of 15 belonged to prop-extended characters and treated that as a confound to be
argued past. It was actually the ANSWER — but at the level of the individual CLIP, not the character.
`sora-yari` is prop-extended with zero flags, and `ir56` has both kinds in the same kit: its tail
clips are legitimate overruns and its special/throw clips are genuine effect cuts. **Character-level
reasoning cannot resolve this; only looking at each clip can.**

## ✔ THE PATTERN, CROSS-TABBED — it tracks PROP SIZE, not effects (phase 241)

Re-analysis of the same sweep, no new decoding. "No feather at the border" by character:

| character | flagged / total | |
|---|---|---|
| satoshi-odachi | **10 / 13** | giant odachi — prop-EXTENDED |
| sora-yari | **9 / 10** | long yari — prop-EXTENDED |
| ir56-lion-serpent | **9 / 12** | serpent tail — prop-EXTENDED |
| thorn-warden | **7 / 11** | big thorn club |
| eclipse-ofuda | 4 / 13 | |
| ir37-pink-tessen | 3 / 13 | |
| lady-kurotachi | 3 / 13 | |
| hollow-pale | 2 / 13 | |
| **ir48-hex-paper-lord** | **0 / 13** | a COMPLETE, effect-heavy final-boss kit, entirely clean |
| lich-scythe · oni-tetsubo · gargoyle-spear | 0 / 3 · 0 / 3 · 0 / 1 | small samples |

**The top three are exactly the three prop-EXTENDED characters** named in `ANCHOR-BUDGETS.md`.
That is independent structural confirmation of the phase-240 reclassification, from data already on
disk: the flags cluster on LONG PROPS, not on effect-heavy characters. **ir48 proves a full kit can
be spotless**, so this was never a blanket pipeline failure.

**And a free negative control: `idle` is 0 / 12.** Every idle on every character is feathered — the
one state with no prop swing and no effect never reaches a border. An instrument that flagged those
would have been wrong.

## ✔ THE BOUNDARY QUESTION IS CLOSED (phase 241)

Phase 240 left this open: the 100-133 band had only ever been probed with PROP clips, never an
EFFECT. Only two WATCH-tier clips carry effect content, and both were viewed over dark at full size:

| clip | run | what is at the border |
|---|---|---|
| lady-kurotachi/special-b | 12 | one floating debris shard grazing the edge — soft, tapered, no wall |
| hollow-pale/special | 14 | the bone blade tapering naturally — no wall |

**Neither is a cut.** Across 17 of the 47 no-feather clips now viewed (15 FLAT + these 2),
**no sliced effect has been observed below run 137**, and all 5 confirmed cuts sit at 137+. Nothing
argues the threshold is in the wrong place.

## What is still NOT established

- 30 of the 47 no-feather clips remain unviewed — all WATCH tier, all run < 100, and the two lowest-
  risk of them were the two just checked. Low residual risk, but not zero.
- Nothing was checked **in motion, in-arena, or at device truth**. Static peak frames only. A cut can
  read differently when it sweeps across the stage than it does frozen.
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
