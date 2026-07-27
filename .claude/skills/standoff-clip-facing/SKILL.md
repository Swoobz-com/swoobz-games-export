---
name: standoff-clip-facing
description: >-
  STANDOFF (streetfighter) ONLY — the two-sided fighter facing rule. Every clip in a
  boss kit must NATIVELY face the direction its `faces:` field states, and the whole
  kit must be normalised to ONE side BEFORE any pixel QA, because a horizontal flip
  swaps every left/right result (containment borders, feather args, edge-ring
  profiles). Use when flipping, wiring, QA-ing or re-rolling a STANDOFF boss clip kit
  — triggers: "facing", "faces left", "faces right", "mirrored clip", "flip the
  clips", "same side", "hflip", "faces away from the opponent", "check-facing".
---

# STANDOFF clip facing — the two-sided fighter rule

## SCOPE — read this first
**This skill applies ONLY to the STANDOFF fighting game in this repo (`streetfighter/`).**

It exists because STANDOFF is a **two-sided** game: two fighters occupy a p1/left and a p2/right slot
and must face each other, so the engine mirrors a whole fighter per slot and `faces:` is a real input to
that decision.

**It does NOT apply to slot-game main-character clips and must never be used to gate them.** A slot has
ONE character with no opposing slot, no per-slot mirror and no `faces:` field — "normalise the kit to one
side" is meaningless there and following it would cause needless re-keys. The global
`character-clip-qa` skill is the ship-gate for slot character clips; it is deliberately silent on facing,
and this skill adds to it **only inside this repo**, it does not overrule or extend it anywhere else.
Same for `slot-character-animation` and `character-assets` — untouched by this.

## The rule (Tim, 2026-07-27, binding for STANDOFF)
**Flip all clips to the same side BEFORE doing QA.**

Facing normalisation is a **precondition for QA, not a QA item.** A horizontal flip invalidates the
side-dependent output of every pixel gate: containment borders, feather args (`--left/--right`),
edge-inset ring profiles, and any "which side does the weapon exit" note.

*Evidence.* The containment sweep ran concurrently with the facing fix. After 17 clips were flipped, the
SAME clips flagged with **identical magnitudes but LEFT↔RIGHT swapped** — `lady-kurotachi
attack-throw-b` LEFT 422px became RIGHT 422px. Rankings survived (they sort on run length) but every
per-clip fix instruction was wrong-handed.

*Order of operations:* (1) normalise EVERY clip — and the character's `still` — to one side;
(2) then containment / feather / effect-edge QA; (3) then re-rolls.

## Why `faces:` is a correctness input, not a label
`src/ui/FightExperience.tsx:920` computes `isMirrored = def.faces !== (slot === 'p1' ? 'right' : 'left')`
and applies ONE mirror to the whole fighter stack (`:1087`). Because that decision is uniform across the
kit, **every clip must NATIVELY face the direction `faces:` states.** Clips generated one way and reused
for both slots is fine and by design — clips disagreeing WITH EACH OTHER is the bug.

Sweep of 2026-07-27 found 3 of 8 kits internally inconsistent: lady-kurotachi 11 clips, eclipse-ofuda 4,
ir37-pink-tessen 2 (`hit` — fires on nearly every exchange). The defect is silent: nothing crashes, the
boss just fights facing the wall.

**ROSTER CONVENTION: all eight bosses are `faces:'right'`.** eclipse-ofuda was normalised from `'left'`
to `'right'` (Tim's ruling) so there is no exception left — a lone exception is how this class survives.
**Her generation anchor faces LEFT, so every future eclipse re-roll must be hflipped at keying.**

## Deciding the side — measure, never eyeball
`node scripts/check-facing.mjs <id> [--still] [--all]` runs the anchor-IoU mirror test: bbox-normalise
the anchor and clip silhouettes to 64x64, compare `IoU(anchor,clip)` vs `IoU(anchor,mirror(clip))`.
Eyeballing was wrong 2/2 on this project; measuring was right 4/4. A "which way do the helmet horns
sweep" heuristic looked convincing and disagreed with the anchor test.

**Two reference traps, each of which produces a confident WRONG answer:**
1. **A uniformly-opaque alpha channel is a filled rectangle, and a rectangle is symmetric.**
   `qa-boss/anchors/<id>-anchor.png` are RGBA *containers* with alpha=255 everywhere — raw plates, not
   cutouts. Anchoring on one makes both IoUs equal, so the gate prints a serene "0/13 mirrored" for every
   kit. The gate now ABORTS on any anchor mask covering >95% of frame. Prefer `--still`.
2. **A relative gate reports agreement with its REFERENCE, not correctness.** If the reference is itself
   the outlier every label inverts — eclipse's still was the mis-facing asset, so the gate flagged her 9
   CORRECT clips as "mirrored". Resolve the absolute direction by VIEWING frames once, then let the gate
   do the bulk work.

## The flip recipe (proven 17/17, bit-exact)
Re-key **FROM RAW** with `-vf hflip` applied at the FRAME level before the key — never webm→webm, which
costs a VP9 generation.

1. **Validate first:** re-key one clip UNFLIPPED and confirm it reproduces the shipped webm bit-exactly
   (alpha IoU ~1.00000) and re-emits the manifest's existing cal. That simultaneously proves the
   raw→shipped mapping, the `--still`, and the recipe. Only then trust the flipped run.
2. Mirror-compare each flipped output against the clip it replaces (expect ≥0.9999 IoU).
3. **cal:** `h` and `bottom` are flip-invariant and must NOT move — an independent check the flip was
   pure. `left` mirrors about `100*onCX`, i.e. `left_new = 100 - left_old` for a centred still. Take the
   value the KEYER EMITS, never hand-apply it; deviations of ~0.12 are the keyer's odd-width
   `if (cw % 2) cw--` crop shift and are expected.
4. `contacts` are timings — a horizontal flip does not affect them. Leave them alone.
5. If a clip was flipped in a previous commit and needs flipping back, **restore it from git** rather
   than re-keying twice.

Use the character's OWN keyer (recorded in its clipdata `orchestrator_notes`) — pink/crimson-trimmed
characters need `key-clips-green-pinksafe.mjs`; eclipse's v1 keeps were keyed WITHOUT green-despill.
`-c:v libvpx-vp9` MUST precede `-i` on any decode or the alpha plane is silently dropped.

## Checklist before calling a facing pass done
- [ ] `node scripts/check-facing.mjs --all --still` — every kit internally consistent.
- [ ] Each kit agrees with its own `still` (the asset `faces:` describes).
- [ ] `faces:` matches the measured native direction; roster convention is `'right'`.
- [ ] `alpha_mode=1` on every re-encode; `h`/`bottom` unchanged; `left` from the keyer's emission.
- [ ] Matte proofs viewed over BOTH black and white (black hides dark smoke, white shows chewed mattes).
- [ ] **Containment re-run AFTER the flips** — prior per-clip border data is wrong-handed.
- [ ] Live-driven: `node qa-boss/phase28-drive.mjs` asserts the runtime wrapper's computed `scaleX`
      matches what each manifest implies for the p2 slot.

Repo companions: `scripts/check-facing.mjs`, `scripts/check-containment.mjs`,
`qa-boss/CONTAINMENT-TRIAGE.md`, `HANDOFF-STREETFIGHTER.md`.
