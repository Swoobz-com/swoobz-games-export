# TOOLCHAIN AUDIT — every tool the fire run-book prescribes, run on real inputs (phase 250)

**Why:** clip generation has been blocked for weeks. The moment it lifts, ~20 tools run for the first
time in weeks, on a fresh clip, under time pressure. Two had already been caught unverified this
session (`radial-feather.mjs` never run end-to-end; `harvest.mjs`'s phase-229 patch never exercised).
This audit ran the rest. **6 agents — 3 auditing, 3 adversarially verifying — on real clips, plates
and raws, entirely in scratch.** Zero writes under `public/**`, `src/**`, `input/**`,
`qa-boss/{webm,anchors,raw,prompts}/**` — independently confirmed by file count (902 → 902), mtime
sweep (0 writes) and unmoved HEAD.

---

## ⛔ 1. THE ONE THAT DESTROYS ASSETS: `cut-bloom-plate` DELETES MAGENTA-PLATE CHARACTERS

`node qa-boss/cut-bloom-plate.mjs <ir56-keyed-dir>` → `cutPx=6836697 (28.06% of visible)`, **exit 0**.
Viewed: **ir56-lion-serpent's entire green armour is gone.** `check-plate-retention --plate magenta`
afterwards still reports `0.00% clean`. Every gate stays green.

Cause: its test is green-family (`g > b+25 && g >= r*0.92`). ir56/onryo/pale-choir are keyed off a
**MAGENTA** plate precisely *because* the character is green — so the tool eats the subject.
It has **no `--plate` flag, no guard, and its header never mentions magenta.**

**AND `grep -i magenta qa-boss/FIRE-PLAN.md` RETURNED ZERO.** The "keying pipeline of record" lists
this step unconditionally and is silently green-only.

**THREE characters are magenta-plate** (`grep -l "solid saturated MAGENTA" qa-boss/prompts/*.md`):

| character | status |
|---|---|
| `ir56-lion-serpent` | shipped 12/13 |
| `onryo-katana` | kit ready, 0 raws |
| **`pale-choir`** | **one of the six MK FINAL kits the loop fires NEXT (STEP 4)** |

So the next character through the documented pipeline is a magenta one. **Do not run
`cut-bloom-plate` on ir56, onryo or pale-choir until it is plate-aware.**

## ⛔ 2. THE CANONICAL KEYER FAILS ON A LIVE CHARACTER

`scripts/key-idle-clips.mjs` is the keyer FIRE-PLAN names. On hollow-pale's frames: exit 0, but
`bbox 960x960` (the whole source frame — survivors at every extreme) and
`check-plate-retention --plate green` = **16.91% BAD**. Viewed: a bright-green 1px ring around the
entire frame plus heavy green through the translucent smoke skirt.

`scripts/key-clips-green-pinksafe.mjs` on the same frames → `776x890`, **0.00%**.

`BRIEF-hollow-pale-wire.md` already prescribes pinksafe — but **FIRE-PLAN's pipeline names
`key-idle-clips` with no per-character selector**, so the two documents disagree and the run-book
loses. This is the TOOL, not the invocation: the documented command was run on a real raw.

⚠ `key-clips-green-pinksafe.mjs` is NOT a general keyer either — it is a black+hot-pink fork. Run on
the kitsune fox it silently returns a **greyscale** character (`if (g>b){g:=b; if(r>b) r:=b}` collapses
orange fur to r=g=b). Exit 0, plate 0.00%, no gate detects it.

## ⛔ 3. GATES THAT CANNOT FAIL — the phase-230 class, on FOUR more tools

Phase 230 fixed this on `check-prompt-coherence` and `check-facing`. It is still live elsewhere:

| tool | prints | exits |
|---|---|---|
| `check-turn` | `1 clip(s) face the wrong way mid-action` | **0** |
| `check-extra-objects` | `EXTRA OBJECT PRESENT` | **0** |
| `cmp-alpha` | `!! DIMS 776x890 vs 786x906` (compares nothing) | **0** |
| `check-plate-retention` | `all clean.` while a clip is `WATCH` (1.31/1.55%) | **0** |

Any `&&` chain or `$?` test treats all four as permanent passes.

## ⛔ 4. SILENT UNDER-MEASUREMENT — tools that measure a fraction and say nothing

- **`check-body-commitment --kit`** prefix-matches RAW FILENAMES, not the character id. `--kit
  satoshi-odachi` judged **1 of 14** raws → `0 flagged`, exit 0 (the raws are `satoshi-*`).
  Measured undercount: satoshi 2/14 · oni-tetsubo 4/8 · thorn-warden 11/18 · ir37 23/45 ·
  eclipse-ofuda 41/59 · ir56 13/14. A *partial* match is silent; a zero match at least exits 2.
- **Five mutating tools exit 0 after processing ZERO frames** on an empty dir or a dir of mp4s:
  `green-neutralize` `frames=0/0` · `cut-bloom-plate` `frames=0` · `edge-feather` `feathered 0/0` ·
  `green-despill` `touched 0/0` · `magenta-neutralize` `0 px across 0 frames`. `magenta-neutralize`
  is worst — it prints neither the dir nor the params, so scrollback cannot tell it from a real run.
- **`check-containment` "scanned 1" is still live.** Three file args → `scanned 1`. Loop one at a time.
- **`screen-translucency`** silently drops a readable plate with zero subject pixels (3 asked, 2 rows,
  exit 0). `screen-emissive` catches the identical case and exits 2. Only `screen-emissive` prints an
  `N of M` denominator.
- **Four silent NaN misparses, all exit 0**: `green-neutralize --hard 4` → `HARD=NaN` (destructive
  branch dead) · `green-despill --margin` → NaN · `edge-feather --right` → null · `magenta-neutralize
  --min 14` → `MIN=NaN`, output text identical to a correct run.

## ⛔ 5. WRONG-PLATE INVERSIONS THAT PASS SILENTLY

- **`check-frontturn` green-lights magenta raws.** ir56 raw on the default plate →
  `sym 0.999 aspect 1.00 [ok]`, **exit 0**. 960x960 with aspect 1.00 *is* the full frame — the mask
  inverted and it measured nothing. With `--plate magenta`: `sym 0.287 aspect 1.23`. Unlike
  `check-containment` (which screams 960px), this one is silent.
- **`check-plate-retention --plate` defaults to green silently.** The SAME dirty green frames read
  **86.44% BAD / exit 1** on `--plate green` and **2.26% "all clean" / exit 0** on `--plate magenta`.
- **`screen-translucency` is hue-locked to green**, no `--magenta`: its metric `g - max(r,b)` cannot
  be positive over magenta. `pale-choir-anchor-green` 3.58% vs `-anchor-magenta` **1.35%** — the
  magenta plate reads as the cleanest in the set. (`screen-glow-survival` samples the border ring and
  adapts — it is safe.)

## ⚠ 6. `rederive-cal` — MANDATORY, AND ITS BLAST RADIUS REACHES THE SCREEN

Its output is hand-transcribed into `src/characters/<char>.ts` as `cal: {h, bottom, left}`, which is
what positions every clip on screen (`height: cal.h%`). Two ways to get a plausible wrong answer:

- **On an UNKEYED (opaque) frames dir** it emits `h 98.95 / drift 7.98 / "DRIFTED — use the
  re-derived cal"`, exit 0. Alpha 255 everywhere degenerates the anchor bbox to the full frame, so
  the anchor contributes nothing. `h≈99` is the right ballpark, so nothing looks wrong. **No guard
  that the frames carry alpha at all.**
- **With the wrong character's still** — nothing binds the frames dir to the still. `h 74.04`,
  `drift 26.04`, same confident verdict, exit 0.

**And its constants have drifted from the file it claims to mirror.** Header says "copied verbatim …
same A_THR/COV":
```
qa-boss/rederive-cal.mjs:25    A_THR = 8     COV = 1
scripts/key-idle-clips.mjs:191 A_THR = 128   COV = 3
```
Measured: `h`/`bottom` unaffected, `left` differs 0.05–0.34 — against an accept band of `drift<=0.2`.
On `hollow-pale-attack-throw-b` the two thresholds give left **51.76 vs 51.42**, and **51.42 is what
shipped** (`src/characters/hollow-pale.ts:69`). So the drift alone can produce a false "DRIFTED"
against a correct shipped cal. Comparability is this tool's entire stated purpose.

## ⚠ 7. `pad-anchor-plate` WRITES EVEN WHEN IT REFUSES

ffmpeg runs `-y` with no existence check: pointed at an existing plate it **overwrote it silently**,
exit 0 (md5 `b4e16a35…` → `e0e5f7a2…`). Worse, the `--min-margin` refusal is a **post-write** check —
`--fill 0.95` printed `budget: TIGHT` and exited **3** with the bad 1.5 MB PNG already on disk. A
session reading "refused" would assume nothing landed. **Always run it on a copy.**

## ⚠ 8. MEASUREMENT-SCALE TRAPS

- **`check-plate-retention` is ~100x less sensitive on a webm than on a frames dir.** Same content:
  PNG frames full-res **1.29% WATCH** · decoded-after-VP9 as a dir **0.13%** · the webm itself
  (internal `scale=240:-1`) **0.00% clean**. The file's own "roster baseline … ALL CLEAN 0.00%" was
  measured on **webms**, so it is **not comparable** to the frames-dir number FIRE-PLAN's mandatory
  pre-check produces. A fresh session comparing them reads a false regression.
- **Cross-domain feeds produce plausible garbage with no warning.** `check-extra-objects` on a keyed
  webm → "CLEAN" exit 0 while the same character's raw says "EXTRA OBJECT PRESENT".
  `check-raw-anchor` on keyed webms → 0.796/0.618 vs 0.944/0.901 in its correct raw domain. Neither
  checks the extension it was handed.
- **`matte-proof` reports `worst frame f-1` on a clean matte** — `worst` initialises to `{f:-1}` and
  is never updated, so clean is indistinguishable from "measured nothing". (The scanner IS
  functional — unkeyed green frames → `f0: 79670 px`.)
- **`effect-strength` divides the baseline by 12 regardless of frame count.** On a 6-frame dir it
  reported `baseline 0.16%` where the true mean is 0.32% — **exactly halved**, inflating every peak.

## ⚠ 9. THE DESTRUCTIVE STEP HAS A NON-DESTRUCTIVE EQUAL — AND FIRE-PLAN MANDATES THE DESTRUCTIVE ONE

`green-neutralize <dir> 4` destroys the matte's feather: kitsune partial-alpha 7007 → 2381 px/frame
(**−72%**), 624,676 px deleted; hollow-pale visible 165,819 → 117,671 (**−29%**), partial-alpha
8694 → **57**.

**`scripts/green-despill.mjs` reached the identical 0.00% plate result on kitsune while deleting 0 px
and keeping the feather intact** (verified through encode+decode: both 0.00%; despill keeps 205,407
vs 197,807 opaque px and 19,918 vs 16,343 partial-alpha px). **FIRE-PLAN mandates `green-neutralize`
and never mentions `green-despill`.**

Related: `BRIEF-hollow-pale-*.md` prescribe `pinksafe → green-despill → green-neutralize 32`, and I
measured **both post-passes touching 0/33 frames** — pinksafe already forces `g<=b` on every opaque
pixel, so they are tautological zeros, not evidence of a clean key.

## ⚠ 10. PORTABILITY — 16 SCRIPTS HARDCODE THE ABSOLUTE REPO PATH

`createRequire('C:/Users/Erstr/OneDrive/Bureaublad/.../streetfighter/package.json')` appears verbatim
in **16 `.mjs` files**, plus 5 gates with hardcoded absolute data paths (`check-turn:49`,
`check-frontturn:94`, `check-extra-objects:36`, `check-raw-anchor:55`, `check-containment:33`).
They all work today. But it is a **OneDrive** path with a locale-dependent folder (`Bureaublad`) — a
re-path or rename kills 16 tools at import. **Eight qa-boss scripts already use the relative form
`createRequire(path.join(HERE, '..', 'noop.js'))` — that is the pattern to copy.**

## ⚠ 11. LATENT: `build-prompt` A/B COLLISION VIA THE vN TIE-BREAK

`headingPattern('attack_strike')` is `^## attack_strike\b.*$`, which matches BOTH `## attack_strike A`
and `## attack_strike B` (the space is a word boundary); ties break on `vN` in the heading. Renaming
one heading to `## attack_strike B v2` — the routine result of a re-roll — made `attack_strike`
resolve to the **B** section: both states built byte-identical prompts and `check-prompt-sections`
reported `clean=10 problems=0`, exit 0.

**Swept all 40 kits × 3 A/B pairs: ZERO current collisions.** This is a trap waiting for the next
re-roll, not a live bug. The only signal is a stderr line that `fire-queue.mjs` discards via
`stdio:'ignore'`.

## ✔ WHAT IS SOUND

`check-anchor-lock` (idle f0 = 1.000 self-ref, ko auto-exempt) · `check-plate-key` (viewed mask
clean, values unpinned) · `check-containment` (handles the VP9-alpha trap correctly with
`-c:v libvpx-vp9` before `-i`) · `check-raw-anchor --selftest` (the only tool with built-in
self-verification; reproduces its ledger) · `screen-glow-survival` (border-ring sampling adapts to
plate colour) · `screen-emissive` (the only screen-* tool printing `N of M`) · `fire-queue`
(report-only, confirmed no writes) · `may-i-write-kit` · `check-prompt-sections`.

## ✘ NOT TESTED — stated so nobody reads this as complete

- `check-extra-objects` magenta-awareness — it has no `--plate` flag at all; no positive control was
  buildable, so treat as **unverified for magenta**.
- `onryo-katana` has zero raws, so the magenta trap was proven only on ir56 and pale-choir's plate.
- Gates were run on 2–3 characters each, not all 12.
- `pad-anchor-plate`'s pre-flight exit-2 path (no roster source is wide enough to trip it).
- Nothing here is an ASSET verdict — asset work is parked. Clip-quality numbers seen in passing were
  recorded as tool behaviour only.
