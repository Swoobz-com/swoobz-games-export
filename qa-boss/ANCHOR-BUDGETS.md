# ROSTER ANCHOR BUDGETS — measured, phase 63

Produced by `node qa-boss/measure-anchor-budget.mjs <plate.png> [--magenta]`, which uses the same
chroma test as `pad-anchor-plate.mjs`. Validated against the three budgets measured by hand in phase
53: it reproduces eclipse 495/484/140 and hollow-pale 131/29/37 exactly, and ir37 at 1.6x the 960px
frame that budget was taken in (206/208/88 -> 329/332/140). Numbers below are normalised to a 1536px
plate so different plate sizes compare.

**BODY-only L/R** re-measures the bbox counting only columns where the subject is at least 15% of
frame height — i.e. the body mass, excluding thin props. The gap between the two is the length of
prop hanging off the silhouette at REST.

| character | LEFT | RIGHT | HEAD | body-only L/R | prop overhang |
|---|---|---|---|---|---|
| ir56-lion-serpent *(magenta)* | **46** | **46** | 289 | 104 / 231 | 243px |
| satoshi-odachi | **48** | **48** | 266 | 178 / 747 | 829px |
| sora-yari | **48** | **48** | 398 | 173 / 776 | 853px |
| onryo-katana | **50** | **57** | 436 | 275 / 667 | 835px |
| kitsune-tanto | 110 | 118 | 140 | 207 / 537 | 516px |
| hollow-pale *(720px plate)* | 279 | **62** | **79** | 341 / 875 | 875px |
| ir37-pink-tessen | 329 | 332 | 140 | 505 / 364 | 208px |
| thorn-warden | 360 | 362 | 141 | 393 / 744 | 415px |
| lady-kurotachi | 458 | 455 | 138 | 486 / 484 | 57px |
| eclipse-ofuda | 495 | 484 | 140 | 504 / 512 | 37px |

## The finding: there are TWO CLASSES of anchor plate, and the backlog is one of them

**Class A — prop TUCKED.** eclipse, lady-kurotachi, thorn-warden, ir37. The prop sits along the body,
so 37-415px hangs off the silhouette and the plate keeps **329-495px of side margin**. These are the
kits that come out clean.

**Class B — prop EXTENDED.** satoshi, sora, onryo, ir56, kitsune. The anchor pose holds a long weapon
out horizontally, so **243-853px** of thin prop hangs off the body and the plate is left with
**46-118px of side margin**. Their body mass is fine — satoshi's is 611px wide with 178px/747px of
clearance, the most generous in the roster. It is the *prop* that is already touching the wall.

**Nearly every open containment defect belongs to Class B.** satoshi carries 5 containment BLOCKs and
a `special` at 0.645 / 20px / **0% duty**; `SIGNATURE-BEAT-PLAN.md` already flags sora with
"CONTAINMENT WATCH — the yari is long; a level thrust will span the frame"; and ir56's
`edge_feather_notes` records a tip-graze needing a feather on strike_a, throw_a, throw_b, block_a,
victory, special_1, special_2 AND special_3 — nearly his whole kit. A 46px margin predicts exactly
that.

## Why this is arithmetic, not wording — and why the phase-58/61 fix cannot save them

The lesson banked in phases 58 and 61 was **bound the PROP TIP, not the hands**, because a height
bound on the body does not bound a long prop. That works when the tip has somewhere legal to be.

On Class B it does not. **Satoshi's blade tip is already 48px from the frame edge in the anchor
itself.** There is no legal position to bound it to. Worse, the tip sits 699px from his body mass, so
it is the end of a long lever: rotating the blade a few degrees sweeps the tip through an edge, and
lifting it needs far more than the 266px of ceiling he has. Every wording that passed containment did
so by removing the motion — which is precisely the
`~/.claude/memory/defect-gates-converge-on-boring.md` failure, and it is why his finisher is a static
hold with 0% duty rather than a finisher.

This is the same shape as the phase-53 lunge arithmetic ("a lunge WIDENS the silhouette, it does not
translate it — 966px in a 960px frame cannot fit"): **the clip was geometrically doomed before the
prose mattered.** When a containment gate fails twice on the same edge with different wording, stop
rewriting and measure.

## Consequence — a decision, not a re-roll (for Tim)

Class B cannot be fixed by another acting line. The options:

1. **RE-PLATE with `pad-anchor-plate.mjs`** (the phase-60 tool, already used for the 6 MK FINAL
   plates): re-composite the character smaller and centred to buy real margin. This is the only
   option that makes their beats actually animatable. **Cost: the kit anchor changes, so their
   existing wired clips no longer anchor-lock against it — satoshi 11, sora 10, ir56 12 clips would
   need re-rolling.** That is a large, deliberate spend.
2. **Keep the plate and design AROUND the prop** — move only the body and the free bottom edge, keep
   the long weapon near-static. This is what has been happening; it yields the 0%-duty results.
3. **Leave Class B as-is** and spend the remaining rolls on Class A characters, where the same effort
   buys a visibly better clip.

Recommendation: **do not spend more rolls on satoshi `special`, sora `attack-strike`/`attack-strike-b`
or ir56 `special` until this is decided.** Those four are the top of the §6C list and all four are
Class B. hollow-pale `special-c` is NOT blocked by this (his problem is a small plate overall, not an
extended prop) and remains the best next spend.

## Note on hollow-pale

His raw plate is 720px, giving L131 / R29 / T37 — the tightest character in the roster, but for a
different reason: he is simply large in a small frame. His beats work if they are ground-hugging and
aimed DOWNWARD and slightly BACK toward screen-LEFT, which is the only free direction he has
(the bottom edge is free — `check-containment` never counts feet-on-floor contact).

### ⚠ TWO TRAPS FOUND JUDGING ir56 `attack_throw_b` (phase 214)

**1. `check-containment.mjs` DEFAULTS TO `--plate green`, AND ON A MAGENTA PLATE IT RETURNS GARBAGE
THAT LOOKS LIKE A CATASTROPHIC FAILURE.**

Its subject test is `isGreen`. On a magenta plate with a GREEN character the test inverts — the
character reads as background, the plate reads as subject — and it reports the full frame as overrun:

```
ir56 throw_b, no flag        TOP 960px @f0 | LEFT 960px @f0 | RIGHT 960px @f0   (frame is 960x960)
ir56 throw_b, --plate magenta   LEFT 198px @f48 | RIGHT 134px @f46
```

The flag is documented in the tool's own usage line; the default is simply wrong for this roster's
magenta characters. **ALWAYS pass `--plate magenta` for ir56, onryo-katana, and anything whose kit
commands "solid saturated MAGENTA".** Check the kit if unsure:
`node qa-boss/build-prompt.mjs <kit> idle | grep -oiE "solid saturated [A-Z]+"`.

`check-frontturn` shows the same signature on the wrong plate — `sym 0.999 aspect 1.00` constant
means it measured the whole frame, not a subject. **A metric pinned at a perfect value is an
instrument error, not a perfect clip.**

**2. ir56 BREAKS CONTAINMENT ON CLIPS THAT ARE ALREADY WIRED AND SHIPPED — so a containment number
alone cannot judge this character.**

```
throw_b  (unjudged)      LEFT 198px @f48 | RIGHT 134px @f46
throw_a  (WIRED, shipped) TOP 28px @f19 | LEFT 116px @f39 | RIGHT 94px @f34
```

That is what prop-EXTENDED means in practice: his anchor already touches the frame edge, so **there
is no version of this character that does not overrun** without a re-plate. His 12 wired clips were
accepted WITH overruns.

**CONSEQUENCE FOR THE ONE MISSING CLIP.** `attack_throw_b` is not a QA failure — it is the same
defect class already shipped twelve times, at a larger magnitude (198px vs throw_a's 116px). Whether
to wire it is **Tim's call**, and it is the same decision as the pending prop-EXTENDED re-plate
ruling. The raw is on disk: `qa-boss/raw/ir56-lion-serpent-throw_b.mp4`.

**AND CORRECT THE HANDOFF LINE THAT SAYS OTHERWISE:** node 8 is annotated
*"ir56 12/13 attack-throw-b — plain re-roll, not blocked"*. The measurement contradicts it. A re-roll
will not fix a character whose ANCHOR is the problem.
