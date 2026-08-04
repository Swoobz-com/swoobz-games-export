# LADY-KUROTACHI ANCHOR TRIAGE — phase 273 (2026-08-04)

Closes SESSION 27 §5.4 (*"`lady-kurotachi` … 10 of 13 clips NEVER REACHED `--min-agree 0.60` … **Nobody
has looked.**"*) and re-opens the question SESSION 14 asked and nobody answered.

**§5.4's two hypotheses were both wrong.** It is not that her clips are "genuinely dissimilar to its
idle", and not that "the recalibration sits tight for it". `MIN_AGREE 0.60` is fine. The kit is
**tightly anchor-locked** — it is the REFERENCE that is off, and there are **THREE** defects, not one,
with **three different fixes**.

---

## 0. THE LOOP-GUARD ENTRY I OWED AND ALMOST SKIPPED

**The core fact was ALREADY RECORDED and I first reported it as new.** `HANDOFF:2522-2527` (SESSION 14,
2026-07-29) says *"**HER IDLE IS THE OUTLIER**"* with the same 0.932 peer median; `check-anchor-lock.mjs:136-166`
names her in its own source; `src/characters/ir48-hex-paper-lord.ts:16` cross-references her.
My grep covered `qa-boss/*.md` and **missed `HANDOFF-STREETFIGHTER.md` itself** (repo root, not `qa-boss/`)
**and the `.mjs`/`.ts` sources.** §0.1 says grep before you work; a grep whose PATH excludes the biggest
document in the repo is not a loop-guard. **Grep the repo root and the tool sources, not just `qa-boss/*.md`.**

What SESSION 14 left open (`HANDOFF:2606-2608`): *"Which pose is her true anchor? This is a decision, not
a re-roll — and it is ONE clip either way, not 13."* `HANDOFF:2334` records it undecided through sessions
14-15, then it **fell off the open-items list**. It was never declined by Tim; it was **dropped**, and
SESSION 27 §5.4 rediscovered a downstream SYMPTOM of it without recognising the cause.

**What is new here:** the question is answered against the PLATE, the §5.4 abstention is explained, no
clip turns, TWO further defects that the gate's refusal was HIDING are surfaced, and every option is priced.

---

## 1. THE REFERENCE OF RECORD IS THE PLATE, NOT A PEER CLIP

Measure a fix against **`qa-boss/anchors/lady-kurotachi-anchor-green.png`** / its keyed form
**`qa-boss/proc/lk-anchor-still.png`** — the still the keyer is fed. Not against a peer clip.
(My first pass nominated `attack-block.webm f0`. Conclusions survive — `block` vs plate = 0.965 — but the
plate is what exposed that the WHOLE idle clip is off, not just its f0.)

⚠ **The still came from the `-r` (MIRRORED) plate**: still vs `plateR` **0.984**, vs `plateN` **0.192**
(`clipdata.json:353` is right). **`flip-lk.mjs:2-3` states the opposite** — *"idle/ko + the still came from
the non-`-r` plate"* — and that is measurably false. No `cal` consequence here (the still's content bbox is
`cx 315.0` against `W/2 = 315.0`, so mirroring shifts `cal.left` by **0.00**), but `flip-lk.mjs:5` itself
warns `cal.left` is not flip-invariant, so the header's stated premise for re-keying is wrong. **Fix the header.**

### The chroma-vs-alpha measurement ceiling
Raw `.mp4` silhouettes must be taken by chroma (they are unkeyed); shipped `.webm` by alpha. That
comparison has a ceiling — measured on a pair where BOTH representations exist:
`lk-anchor-still.png` (production pink-safe matte) vs the same plate's crude chroma = **0.984**;
plate chroma vs a shipped keyer alpha (`attack-block f0`) = **0.965**.
**So ~0.965 IS the ceiling for an identical pose.** A raw scoring 0.966-0.967 is not "close" — it is
**at the ceiling, indistinguishable from the same pose**. Threshold-perturbation across 5 chroma settings
(g>40..150, dr/db 10..80) moves v2 only 0.942-0.973: **the chroma threshold is not load-bearing.**

---

## 2. THE THREE DEFECTS

`check-anchor-lock` **REFUSES** this kit — the only refusal in 9 full kits — so **none of these have ever
been gated**. Substituting an on-pose idle into a scratch COPY (repo untouched) makes the hidden two appear:

```
node qa-boss/check-anchor-lock.mjs <scratch>/simkit          EXIT=1
  hit.webm    0.515  0.949 | *** START POSE BROKEN — will SNAP on crossfade ***
  ko.webm     0.575  0.478 | *** START POSE BROKEN — will SNAP on crossfade ***
  the other 10                0.934-0.955   ok
```

| # | clip | measured | cause | fix | fire? |
|---|---|---|---|---|---|
| 1 | **idle.webm** | f0 **0.375** vs the action group; **max 0.578 across ALL 97 frames** vs plate | wrong pose: far arm TUCKED; plate + still + 10 clips all hold it OUT | **DECISION — both existing raws disqualified (§3)** | see §3 |
| 2 | **hit.webm** | f0 **0.515** START POSE BROKEN | `flip-lk.mjs:25 trim:10` starts the clip at raw f10, which is **already 0.51** | **NO FREE FIX (§4)** | re-fire |
| 3 | **ko.webm** | f0 **0.575** START POSE BROKEN | off-plate at generation: raw f0 is **0.573** | re-fire | re-fire |

`ko`'s END is exempt by spec (`check-anchor-lock.mjs:189`, "ko ends down by spec") and `clipdata.json:111`
correctly calls the collapse *"OFF-ANCHOR by design"* — **that covers the END. Its START breaking is not by design**,
and the same note's *"f0 exact anchor facing right"* is refuted at 0.573.

### Why idle is the wrong one and not the other twelve
| evidence | vs the action-clip pose |
|---|---|
| anchor plate `lady-kurotachi-anchor.png` | far arm **OUT**, clear of torso (viewed) |
| HUD still `public/assets/enemies/lady-kurotachi.webp` | **0.935** |
| `attack-strike.webm` / `victory.webm` | **0.994 / 0.992** |
| ten action clips, alpha>8 bbox | **exactly 388x824, aspect 0.471**, all ten |
| **`idle.webm`** | **0.375** · bbox **342x834**, aspect **0.410** |

Roster context — HUD still vs its OWN idle: ir56 0.979 · sora 0.974 · satoshi 0.973 · thorn 0.963 ·
eclipse 0.960 · ir37 0.927 · ir48 0.905 · **hollow-pale 0.596** · **lady-kurotachi 0.383**.

---

## 3. THE IDLE DECISION — BOTH EXISTING RAWS ARE DISQUALIFIED

`qa-boss/raw/lady-kurotachi-idle-v2.mp4` and `-v3-energy.mp4` are on-plate **AT f0** (0.966 / 0.967
hflipped). **An f0-only score qualifies the START pose and says nothing about the clip.** Full timeline:

```
rawV2  hflip vs plate : min 0.964  median 0.967  max 0.972   0/25 below 0.85
       frame-to-frame silhouette change (1-IoU): mean 0.003   <- it holds the anchor by BARELY MOVING
rawV3  hflip vs plate : f0 0.967 -> 0.345 @f20 -> 0.382 median -> 0.97 @f96   22/25 below 0.85
rawV4  (SHIPPED)      : never exceeds 0.578 in either orientation, at ANY frame
```

- **v2 is a frozen pose, not an idle.** `clipdata.json:323` already ruled: v4 *"SUPERSEDES the **near-static
  idle v2**"*. Mean frame-to-frame change **0.003** is that ruling as a number.
- **v3 is a recorded failure** — `clipdata.json:271` `fail:frontal-rotation`, *"rotates FULLY FRONTAL by ~f6"*.
  The probe reproduces it exactly (0.97 → 0.36 by f4). **It is the labelled negative that validates the method** —
  and the defect another kit's idle was DROPPED for (`thorn-warden-clipdata.json:137`).
- **v4 (shipped) was chosen deliberately** and for a good reason — `clipdata.json:323`: *"alive — draws katana
  up to chest, inspects + re-grips finger by finger, sets it back … profile LOCKED all frames"*. **v4 exists
  because it solved v3's rotation.** Its only fault is that its resting pose is not the plate's.
  ⚠ That same note claims v4 *"ends at anchor"* — refuted: max 0.578 at any frame. It ended at its OWN
  start pose. **A relative check against the clip's own opening is not an anchor check** (SESSION 14 §3.3).

**Swapping in either raw trades a pose defect for a defect a human already rejected.** The honest statement
is: *two raws are on the plate at f0; neither is a drop-in idle.*

### Options for Tim
- **A — keep v4.** Idle stays alive. The 0.375 gap and its return-to-idle snap persist; the kit stays
  ungated. Zero work.
- **B — v2 hflipped + re-key.** On-plate 0.967 all-timeline, no generation, kit becomes gateable — but her
  idle becomes near-static and it reverts a documented QA decision. **Not recommended.**
- **C — re-fire an idle that is alive AND holds the arm-out pose.** The right answer. Hold-blocked.
- **D — touch no asset; DECLARE the kit's true anchor** so the gates stop being blind. Fixes the measured
  harm (gate blindness) at zero asset risk. §5.5 already contemplates a per-character declaration
  (the `arsenal.json` shape) for keyer routing — **proposed, not built: "do not invent the mechanism unasked."**

---

## 4. `hit` HAS NO FREE FIX — the "smaller trim" idea was checked and it fails

Raw `lady-kurotachi-hit-v2.mp4`, per frame vs plate:

```
f0-f4   0.97  <- the ONLY on-anchor frames
f5-f9   0.20-0.26  <- the phantom bolt, IN the bbox (clipdata:127: a neon blue-white projectile,
                      "it lives ONLY in f5-f9 streaking past her head; f10+ is completely clean")
f10     0.51  <- where trim:10 starts the shipped clip (matches shipped hit.webm 0.518)
f13-f25 ~0.33 <- recoil
```

The on-anchor frames are immediately followed by the contaminated ones. **No trim value gives an on-anchor
start:** trim to f5 re-admits the bolt; an internal f5-f9 cut splices f4 (0.97) to f10 (0.51), which IS the
snap moved four frames later, and deletes the impact beat. **hit is accept-or-re-fire.**
(The bolt also explains the f5-f9 dip: a raw's chroma silhouette includes the projectile, so the bbox
explodes — the same "bbox set by the PROP" mechanism as HANDOFF §3c. It is not a pose change.)

---

## 5. NO CLIP TURNS — §5.4's worry is a clean negative

`--min-agree 0.10` admits EVERY frame (nothing abstains): **`hit.webm` is 0/87** — mirror never beats as-is
by 0.04 on any frame, at 0.10 AND 0.30 AND against the correct anchor. The 8 clips that convict at 0.10 have
worst gains **0.157-0.373**, inside §3c's false-positive band (0.343-0.368) and nowhere near the one real
turn (0.850). **The worst-gain frame of all 8 was VIEWED: she faces screen-right in every one**; the blade
extends screen-left (block-b f30, throw-b f42, strike f61, victory f64) or an FX burst dominates (special-b f16).
`MIN_AGREE 0.60` is correct — **do not re-tune it off this kit.**

The abstention is a DOWNSTREAM SYMPTOM of defect 1, not a property of the action clips:

| anchor | non-anchor clips clearing 0.95 |
|---|---|
| `idle.webm` f0 (shipped) | **0 of 12** — max 0.632 |
| `attack-block.webm` f0 | **10 of 12** — only idle (0.568) + ko (0.595) below |

---

## 6. GATE / DOC DEFECTS FOUND ON THE WAY (proposed, none applied)

1. **`check-anchor-lock.mjs:157` — the degenerate-anchor short-circuit HIDES per-clip defects.** It returns
   before the per-clip loop, so `hit` 0.515 and `ko` 0.575 have been invisible for the whole life of the kit.
   The refusal is right; **swallowing the rows is not.** It should still print them (or say "N rows suppressed").
   This changes a shipped gate's output contract — **Tim's call.**
2. **`check-turn.mjs:730` prose is false in the no-margin case.** *"so every frame of them abstained"* — but
   the row counter only counts frames that first cleared `--margin`, so `hit.webm` shows **0 abstained** while
   being listed in the footer. The tool's own correct wording is 104 lines earlier at `:626` (*"Every frame
   **that cleared --margin** therefore ABSTAINED"*). Verdict-safe, reader-hostile: a reader cross-checking row
   against footer finds an apparent contradiction and may dismiss the warning — **which is the §5.4 signal itself.**
   Also: the row counter is **not a coverage number** — `attack-throw` prints `[4 frames abstained]` while all
   97 of its frames are uncovered.
3. **`flip-lk.mjs:2-3`** asserts the still came from the non-`-r` plate; measured 0.984 vs `-r` / 0.192 vs
   non-`-r`. (§1.)
4. **`clipdata.json` QA notes assert anchor conformance that measurement refutes** — v4 *"ends at anchor"*
   (max 0.578), ko *"f0 exact anchor facing right"* (0.573). Both were judged against the clip's own opening.
5. ⚠ **`flip-lk.mjs` still has NO argument guard** (HANDOFF §0.4). Running it bare re-keys the kit.

---

## 7. NUMBERS FROM MY FIRST PASS THAT ARE WRONG — do not quote them

- ~~"bbox 387-388 x 822-824, aspect 0.470-0.471"~~ → **exactly `388x824`, aspect `0.471`, on all ten.**
  The range was an artefact of my `f0-grid` using **alpha > 128**; the gate's mask is **alpha > 8**.
- ~~"10 of 13 clear 0.95"~~ → **10 of 12 non-anchor** (11 of 13 counts `attack-block` itself at 1.000).
- ~~"ZERO of 13 clear"~~ → **0 of 12 non-anchor**; `idle` clears at 1.000 because it IS the anchor. Max 0.632 is exact.
- ~~"the correct idle take has been sitting in `qa-boss/raw/`"~~ → **f0-only claim; both candidates disqualified (§3).**

---

## 8. TOOLS (committed alongside, so these numbers keep a live derivation — §0.7)

| tool | what it answers | exit |
|---|---|---|
| `qa-boss/measure-vs-anchor.mjs <anchorClip.webm> <target...>` | IoU of any alpha asset (`.webm` f0 / `.webp` / `.png`) vs a reference f0, as-is AND hflipped, with bbox+aspect | 0 ok · 2 refused |
| `qa-boss/raw-timeline-probe.mjs <anchor> <hflip\|asis> <raw...> [samples]` | a RAW take's agreement with the plate **across the whole timeline** — the one that catches v3 and hit | 0 ok · 2 refused |
| `qa-boss/f0-grid.mjs <charDir> <outPng> [cols] [first\|last]` | contact sheet of every clip's f0/fLast + bbox table — "which clip is the odd one out", by eye | 0 ok · 2 refused |

All three are READ-ONLY on the repo (they write only to a path you name), all use `check-turn`'s exact
N=64 bbox-normalised alpha>8 math, and all four/three argument guards were tripped with constructed inputs
before use. `raw-timeline-probe` carries the v3 labelled-negative note in its header: **an f0-only anchor
score is not a qualification.**
