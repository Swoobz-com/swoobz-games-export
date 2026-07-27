# CONTAINMENT SWEEP — regenerated at HEAD

Generated `2026-07-27T21:26:58.145Z` by `qa-boss/profile-containment.mjs` over `public/assets/characters`.
Measurement only. No verdicts, no viewed judgements — those live in `CONTAINMENT-TRIAGE.md`.

```
calibration   CLEAR A200 < 32 · REVIEW 32-89 (or <200 with dwell<3) · BLOCK A200 >= 200 OR (A200 >= 90 AND dwell >= 3)
dwell         frames whose A200 run on that edge is >= 24 source px   (CONTAINMENT-TRIAGE.md:193)
edges         TOP / LEFT / RIGHT only. BOTTOM is measured but never counts (feet on the floor line).
```

## HEADLINE

- **97 shipped clips scanned, 0 decode errors.**
- **BLOCK 16 · REVIEW 14 · CLEAR 67.**
- This supersedes the per-clip border data in `CONTAINMENT-TRIAGE.md`, which was measured
  BEFORE the 17 phase-27/28 clips were horizontally flipped and therefore reports LEFT/RIGHT
  swapped for those clips. Magnitudes were unaffected by the flip; sides were.
- 1 superseded file(s) under `old/` excluded from the counts: `satoshi-odachi/old/special-b-cyclone.webm` (REVIEW).

## PER CHARACTER (campaign order)

| node | character | clips | BLOCK | REVIEW | CLEAR |
|---|---|---|---|---|---|
| 1 | sora-yari | 10 | 0 | 4 | 6 |
| 3 | thorn-warden | 10 | 3 | 4 | 3 |
| 4 | hollow-pale | 13 | 0 | 0 | 13 |
| 5 | satoshi-odachi | 13 | 5 | 2 | 6 |
| 6 | eclipse-ofuda | 13 | 0 | 2 | 11 |
| 7 | ir37-pink-tessen | 13 | 2 | 1 | 10 |
| 8 | ir56-lion-serpent | 12 | 5 | 1 | 6 |
| 9 | lady-kurotachi | 13 | 1 | 0 | 12 |

## RE-ROLL QUEUE — BLOCK clips, earliest node first

Earliest node first, because a defect at node 3 is seen by every player who reaches node 3,
while a defect at node 9 is seen only by those who get there.

| node | clip | edge | A200 | @frame | dwell |
|---|---|---|---|---|---|
| 3 | `thorn-warden/attack-block.webm` | RIGHT | **315** | f48 | 1/97 |
| 3 | `thorn-warden/attack-throw.webm` | LEFT | **142** | f44 | 4/97 |
| 3 | `thorn-warden/attack-strike-b.webm` | RIGHT | **98** | f67 | 35/97 |
| 5 | `satoshi-odachi/special-c.webm` | LEFT | **486** | f52 | 10/97 |
| 5 | `satoshi-odachi/special-b.webm` | TOP | **340** | f54 | 12/97 |
| 5 | `satoshi-odachi/attack-strike-b.webm` | TOP | **276** | f51 | 10/97 |
| 5 | `satoshi-odachi/attack-strike.webm` | TOP | **259** | f25 | 2/97 |
| 5 | `satoshi-odachi/victory.webm` | TOP | **192** | f77 | 13/97 |
| 7 | `ir37-pink-tessen/attack-throw-b.webm` | RIGHT | **157** | f44 | 12/97 |
| 7 | `ir37-pink-tessen/attack-strike.webm` | RIGHT | **116** | f66 | 26/97 |
| 8 | `ir56-lion-serpent/special-c.webm` | RIGHT | **434** | f59 | 12/97 |
| 8 | `ir56-lion-serpent/special-b.webm` | RIGHT | **362** | f29 | 10/97 |
| 8 | `ir56-lion-serpent/ko.webm` | LEFT | **197** | f68 | 38/97 |
| 8 | `ir56-lion-serpent/attack-throw.webm` | RIGHT | **138** | f46 | 22/97 |
| 8 | `ir56-lion-serpent/attack-block-b.webm` | LEFT | **106** | f41 | 58/97 |
| 9 | `lady-kurotachi/attack-strike.webm` | TOP | **251** | f40 | 8/97 |

## REVIEW clips

| node | clip | edge | A200 | @frame | dwell |
|---|---|---|---|---|---|
| 1 | `sora-yari/attack-block.webm` | TOP | 47 | f14 | 6/97 |
| 1 | `sora-yari/attack-throw-b.webm` | RIGHT | 38 | f35 | 1/97 |
| 1 | `sora-yari/hit.webm` | LEFT | 38 | f61 | 4/97 |
| 1 | `sora-yari/attack-throw.webm` | LEFT | 36 | f36 | 4/97 |
| 3 | `thorn-warden/attack-block-b.webm` | TOP | 68 | f53 | 3/97 |
| 3 | `thorn-warden/attack-strike.webm` | TOP | 59 | f65 | 5/97 |
| 3 | `thorn-warden/attack-throw-b.webm` | RIGHT | 48 | f71 | 2/97 |
| 3 | `thorn-warden/hit.webm` | LEFT | 42 | f34 | 1/97 |
| 5 | `satoshi-odachi/hit.webm` | LEFT | 40 | f25 | 8/97 |
| 5 | `satoshi-odachi/attack-throw.webm` | RIGHT | 34 | f49 | 1/97 |
| 6 | `eclipse-ofuda/attack-strike.webm` | LEFT | 197 | f45 | 2/97 |
| 6 | `eclipse-ofuda/attack-throw-b.webm` | LEFT | 50 | f18 | 1/97 |
| 7 | `ir37-pink-tessen/attack-block.webm` | TOP | 59 | f60 | 2/97 |
| 8 | `ir56-lion-serpent/attack-strike-b.webm` | LEFT | 50 | f59 | 7/97 |

## FULL PER-CLIP TABLE (all edges, A200, source px)

| clip | band | top | left | right | (bottom) |
|---|---|---|---|---|---|
| `eclipse-ofuda/attack-block-b.webm` | CLEAR | 0 | 0 | 0 | 0 |
| `eclipse-ofuda/attack-block.webm` | CLEAR | 0 | 0 | 10 | 0 |
| `eclipse-ofuda/attack-strike-b.webm` | CLEAR | 15 | 0 | 0 | 0 |
| `eclipse-ofuda/attack-strike.webm` | REVIEW | 176 | 197 | 0 | 0 |
| `eclipse-ofuda/attack-throw-b.webm` | REVIEW | 0 | 50 | 6 | 0 |
| `eclipse-ofuda/attack-throw.webm` | CLEAR | 0 | 10 | 16 | 0 |
| `eclipse-ofuda/hit.webm` | CLEAR | 0 | 0 | 0 | 0 |
| `eclipse-ofuda/idle.webm` | CLEAR | 0 | 0 | 0 | 0 |
| `eclipse-ofuda/ko.webm` | CLEAR | 0 | 0 | 19 | 58 |
| `eclipse-ofuda/special-b.webm` | CLEAR | 0 | 0 | 0 | 0 |
| `eclipse-ofuda/special-c.webm` | CLEAR | 0 | 0 | 0 | 0 |
| `eclipse-ofuda/special.webm` | CLEAR | 0 | 0 | 0 | 0 |
| `eclipse-ofuda/victory.webm` | CLEAR | 0 | 0 | 0 | 0 |
| `hollow-pale/attack-block-b.webm` | CLEAR | 0 | 0 | 12 | 0 |
| `hollow-pale/attack-block.webm` | CLEAR | 0 | 0 | 0 | 0 |
| `hollow-pale/attack-strike-b.webm` | CLEAR | 0 | 0 | 0 | 0 |
| `hollow-pale/attack-strike.webm` | CLEAR | 0 | 0 | 0 | 0 |
| `hollow-pale/attack-throw-b.webm` | CLEAR | 0 | 0 | 0 | 0 |
| `hollow-pale/attack-throw.webm` | CLEAR | 0 | 0 | 0 | 0 |
| `hollow-pale/hit.webm` | CLEAR | 0 | 0 | 0 | 0 |
| `hollow-pale/idle.webm` | CLEAR | 0 | 0 | 0 | 0 |
| `hollow-pale/ko.webm` | CLEAR | 0 | 0 | 0 | 0 |
| `hollow-pale/special-b.webm` | CLEAR | 0 | 0 | 0 | 0 |
| `hollow-pale/special-c.webm` | CLEAR | 0 | 0 | 0 | 0 |
| `hollow-pale/special.webm` | CLEAR | 0 | 14 | 0 | 0 |
| `hollow-pale/victory.webm` | CLEAR | 0 | 0 | 0 | 0 |
| `ir37-pink-tessen/attack-block-b.webm` | CLEAR | 0 | 0 | 0 | 0 |
| `ir37-pink-tessen/attack-block.webm` | REVIEW | 59 | 0 | 0 | 0 |
| `ir37-pink-tessen/attack-strike-b.webm` | CLEAR | 0 | 0 | 0 | 0 |
| `ir37-pink-tessen/attack-strike.webm` | BLOCK | 0 | 6 | 116 | 0 |
| `ir37-pink-tessen/attack-throw-b.webm` | BLOCK | 0 | 0 | 157 | 0 |
| `ir37-pink-tessen/attack-throw.webm` | CLEAR | 0 | 0 | 0 | 0 |
| `ir37-pink-tessen/hit.webm` | CLEAR | 0 | 0 | 0 | 0 |
| `ir37-pink-tessen/idle.webm` | CLEAR | 0 | 0 | 0 | 0 |
| `ir37-pink-tessen/ko.webm` | CLEAR | 0 | 0 | 0 | 109 |
| `ir37-pink-tessen/special-b.webm` | CLEAR | 0 | 0 | 0 | 0 |
| `ir37-pink-tessen/special-c.webm` | CLEAR | 0 | 0 | 0 | 0 |
| `ir37-pink-tessen/special.webm` | CLEAR | 0 | 0 | 0 | 0 |
| `ir37-pink-tessen/victory.webm` | CLEAR | 0 | 0 | 0 | 0 |
| `ir56-lion-serpent/attack-block-b.webm` | BLOCK | 0 | 106 | 0 | 0 |
| `ir56-lion-serpent/attack-block.webm` | CLEAR | 0 | 0 | 0 | 0 |
| `ir56-lion-serpent/attack-strike-b.webm` | REVIEW | 0 | 50 | 0 | 0 |
| `ir56-lion-serpent/attack-strike.webm` | CLEAR | 0 | 0 | 0 | 0 |
| `ir56-lion-serpent/attack-throw.webm` | BLOCK | 0 | 0 | 138 | 0 |
| `ir56-lion-serpent/hit.webm` | CLEAR | 0 | 0 | 30 | 0 |
| `ir56-lion-serpent/idle.webm` | CLEAR | 0 | 0 | 0 | 0 |
| `ir56-lion-serpent/ko.webm` | BLOCK | 0 | 197 | 0 | 0 |
| `ir56-lion-serpent/special-b.webm` | BLOCK | 0 | 16 | 362 | 28 |
| `ir56-lion-serpent/special-c.webm` | BLOCK | 0 | 72 | 434 | 0 |
| `ir56-lion-serpent/special.webm` | CLEAR | 0 | 0 | 0 | 0 |
| `ir56-lion-serpent/victory.webm` | CLEAR | 0 | 0 | 31 | 0 |
| `lady-kurotachi/attack-block-b.webm` | CLEAR | 0 | 0 | 0 | 0 |
| `lady-kurotachi/attack-block.webm` | CLEAR | 0 | 0 | 16 | 0 |
| `lady-kurotachi/attack-strike-b.webm` | CLEAR | 0 | 0 | 0 | 0 |
| `lady-kurotachi/attack-strike.webm` | BLOCK | 251 | 0 | 17 | 0 |
| `lady-kurotachi/attack-throw-b.webm` | CLEAR | 0 | 0 | 0 | 0 |
| `lady-kurotachi/attack-throw.webm` | CLEAR | 0 | 0 | 0 | 0 |
| `lady-kurotachi/hit.webm` | CLEAR | 0 | 0 | 0 | 0 |
| `lady-kurotachi/idle.webm` | CLEAR | 0 | 0 | 0 | 0 |
| `lady-kurotachi/ko.webm` | CLEAR | 0 | 0 | 0 | 71 |
| `lady-kurotachi/special-b.webm` | CLEAR | 7 | 13 | 0 | 2 |
| `lady-kurotachi/special-c.webm` | CLEAR | 0 | 0 | 0 | 0 |
| `lady-kurotachi/special.webm` | CLEAR | 0 | 0 | 0 | 0 |
| `lady-kurotachi/victory.webm` | CLEAR | 0 | 0 | 0 | 0 |
| `satoshi-odachi/attack-block-b.webm` | CLEAR | 28 | 14 | 20 | 0 |
| `satoshi-odachi/attack-block.webm` | CLEAR | 28 | 0 | 6 | 0 |
| `satoshi-odachi/attack-strike-b.webm` | BLOCK | 276 | 34 | 0 | 0 |
| `satoshi-odachi/attack-strike.webm` | BLOCK | 259 | 24 | 0 | 0 |
| `satoshi-odachi/attack-throw-b.webm` | CLEAR | 30 | 14 | 22 | 0 |
| `satoshi-odachi/attack-throw.webm` | REVIEW | 0 | 16 | 34 | 0 |
| `satoshi-odachi/hit.webm` | REVIEW | 0 | 40 | 34 | 0 |
| `satoshi-odachi/idle.webm` | CLEAR | 0 | 0 | 0 | 0 |
| `satoshi-odachi/ko.webm` | CLEAR | 0 | 0 | 0 | 0 |
| `satoshi-odachi/special-b.webm` | BLOCK | 340 | 22 | 314 | 292 |
| `satoshi-odachi/special-c.webm` | BLOCK | 0 | 486 | 0 | 0 |
| `satoshi-odachi/special.webm` | CLEAR | 0 | 0 | 0 | 0 |
| `satoshi-odachi/victory.webm` | BLOCK | 192 | 0 | 188 | 0 |
| `sora-yari/attack-block-b.webm` | CLEAR | 12 | 0 | 12 | 0 |
| `sora-yari/attack-block.webm` | REVIEW | 47 | 20 | 0 | 0 |
| `sora-yari/attack-strike-b.webm` | CLEAR | 0 | 14 | 0 | 0 |
| `sora-yari/attack-strike.webm` | CLEAR | 0 | 0 | 21 | 0 |
| `sora-yari/attack-throw-b.webm` | REVIEW | 0 | 12 | 38 | 0 |
| `sora-yari/attack-throw.webm` | REVIEW | 0 | 36 | 20 | 14 |
| `sora-yari/hit.webm` | REVIEW | 0 | 38 | 22 | 0 |
| `sora-yari/idle.webm` | CLEAR | 0 | 0 | 0 | 0 |
| `sora-yari/ko.webm` | CLEAR | 0 | 0 | 21 | 228 |
| `sora-yari/victory.webm` | CLEAR | 25 | 0 | 0 | 0 |
| `thorn-warden/attack-block-b.webm` | REVIEW | 68 | 62 | 42 | 0 |
| `thorn-warden/attack-block.webm` | BLOCK | 76 | 0 | 315 | 0 |
| `thorn-warden/attack-strike-b.webm` | BLOCK | 56 | 94 | 98 | 0 |
| `thorn-warden/attack-strike.webm` | REVIEW | 59 | 0 | 0 | 0 |
| `thorn-warden/attack-throw-b.webm` | REVIEW | 0 | 0 | 48 | 0 |
| `thorn-warden/attack-throw.webm` | BLOCK | 58 | 142 | 46 | 0 |
| `thorn-warden/hit.webm` | REVIEW | 10 | 42 | 0 | 0 |
| `thorn-warden/idle.webm` | CLEAR | 0 | 0 | 0 | 0 |
| `thorn-warden/ko.webm` | CLEAR | 0 | 0 | 0 | 0 |
| `thorn-warden/victory.webm` | CLEAR | 0 | 0 | 0 | 0 |
