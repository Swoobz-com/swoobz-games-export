# SESSION 30 — the 35 harvested clips: keyed, gated, and what each one is worth

Staging only. **Nothing under `public/assets/` or `src/` was touched** — proven by a full-tree md5
before/after the first keying run (`PUBLIC+SRC BYTE-IDENTICAL`). Nothing committed.

Produced by `qa-boss/key-s30-harvest.mjs --char <id>` (a bare run exits 1, per repo law §0.4).
Output tree: `qa-boss/staged-s30/<char>/{frames,keyed}/<state>` + `webm/<state>.webm`.

---

## 1. The post-pass was decided by measurement, not by picking a side

Three sources disagreed (see the header of `key-s30-harvest.mjs` for the full quotes):
`green-neutralize 32` (what gargoyle/lich actually shipped with, commit `7d3002e`) vs
`green-neutralize 4` (`FIRE-PLAN.md:432-436`, `HANDOFF:3083-3086`, `oni-tetsubo.ts:15` — at 32 it
leaves 7% of pixels at exactly `r==g`, which renders **sickly olive**, and that shipped once
undetected) vs FIRE-PLAN's own annotation preferring **despill**.

Measured on gargoyle-spear `attack_strike`, 97 frames, native res, three identical copies of the
SAME keyer output, scored by `qa-boss/check-plate-retention.mjs --plate green`:

| post-pass | plate% | olive% | opaque px | px deleted |
|---|---|---|---|---|
| keyer only | 4.94 **WATCH** | 0.00 | 15,369,390 | — |
| **green-despill** | **0.00 clean** | 0.00 | **15,369,390** | **0** |
| green-neutralize 4 | 0.00 clean | 0.00 | 14,074,951 | −1,294,439 (−8.4%) |
| green-neutralize 32 | 0.00 clean | 0.00 | 14,471,481 | −897,909 (−5.8%) |

**despill reaches the identical clean verdict while deleting ZERO pixels and keeping the feather
intact.** It strictly dominates both neutralize settings, so the 4-vs-32 dispute is moot for this
batch. Recorded as the batch recipe, with `green-neutralize 4` (never 32) as a measured escalation
if despill ever leaves residue. **It never did** — across all 35 clips, despill drove every single
one to 0.00%, including lich `special_3` which entered at **16.79%**. Zero escalations fired.

Two further corrections to the first pass, both now in the script:
* `-auto-alt-ref 0` was **missing** from the VP9 encode. It is in ir56's recorded encode line and in
  `FIRE-PLAN.md:434`; without it VP9's alt-ref frames corrupt the alpha plane.
* `check-plate-retention` now runs **BEFORE** the post-pass. After a green pass, `g<=max(r,b)` by
  construction and the number is a tautological 0.00% — measuring after proves nothing.

`cut-bloom-plate` is in NO chain: `FIRE-PLAN.md:416-419` records it deleted **28.06% of ir56's
visible pixels — his entire green armour — and exited 0**.

---

## 2. ⚠ THE ANCHOR-LOCK GATE IS NOT CALIBRATED THE SAME FOR EVERY CHARACTER

`check-anchor-lock` reported **10 of lich-scythe's 10 new clips "break the anchor"** at f0-body
0.800-0.838, against its `>=0.90 ok` band. That verdict is **an artifact, not 10 defects**, and the
control is what proves it:

> **CONTROL — lich's already-SHIPPED, already-ACCEPTED `attack-strike.webm` scores f0body 0.851 and
> is reported "start drifts" by the same gate.**

An accepted, shipped clip fails the threshold. So 0.80-0.85 is simply lich's normal body-IoU, not a
defect band. The cause is visible in the tool's own two columns: lich's `f0all` is **0.916-0.939**
(fine) while `f0body` is 0.82 — the largest-connected-component "body" heuristic mis-splits on a
character whose scythe is a huge thin element spanning the frame (`lich-scythe.md:10-19`:
*"the SCYTHE SPANS x326..x1221 — 895px OF A 910px SUBJECT. BOTH LATERAL EDGES BELONG TO THE WEAPON"*).
**For lich, read the `all` column.**

The same gate on **thorn-warden** put all 11 shipped clips at **0.929-0.956** — well-calibrated
there. Same gate, opposite conclusion, and **only running the control tells you which you are in.**
This is repo law §0.10 (*"a relative measurement means nothing until a control has been through it"*)
paying for itself twice in one session.

⚠ Corollary for whoever wires these: gargoyle-spear ships only `idle.webm`, so **no control exists
for gargoyle**. Its verdicts below are trusted only because 8 of 12 clips land in a healthy
0.90-0.95 band with 4 clear outliers — a real distribution — and because the four outliers were
independently confirmed BY EYE at full size, not by the number alone.

---

## 3. Per-character verdicts

### gargoyle-spear — 12 new clips, 6 clean, 6 defective. The dirtiest kit of the five.
`prompts/gargoyle-spear.md` calls it *"the cleanest kit delivered so far: nothing needed fixing."*
On the actual pixels it is the worst. Confirmed by eye at full size, not by gate numbers alone:

| clip | defect | evidence |
|---|---|---|
| `attack_strike_b` | **stone statue PLINTH under his feet**, present f0 → f97 | viewed at full size; anchor 0.699/0.655 |
| `attack_throw_b` | **tiled pavement slab** under his feet at the last frame | viewed; anchor f0 0.935 but fLAST **0.474** |
| `attack_block` | **whole clip is FRONTAL, wings spread** — not the kit's side-profile anchor | viewed; anchor **0.431** f0 AND fLAST |
| `attack_block_b` | left-edge overrun **366px @f12** — far past the 48px house feather band | containment; anchor 0.727 |
| `hit` | left-edge overrun **230px @f7**, right 66px @f3 | containment |
| `attack_throw` | ground rubble persisting to the last frame; left overrun 42px @f63 (featherable) | viewed + containment |

CLEAN (8 by anchor, 6 with no defect at all): `attack_strike`, `special_1`, `special_2`, `special_3`,
`victory`, `ko` (end exempt by spec).
The plinth/pavement class is the same one that got oni's `hit` v1 rejected — an invented prop the
geometry can't distinguish from an effect. **These need RE-ROLLS, not re-keys.**

### lich-scythe — 10 new clips. 8 good, 2 real end-pose breaks.
Reading the `all` column (see §2), against the 0.90/0.80 bands:
* f0all **0.916-0.939 on all 10** — every start pose is fine.
* `attack_throw` fLASTall **0.274** — END POSE BROKEN. Real.
* `special_1` fLASTall **0.512** — END POSE BROKEN. Real.
* `ko` fLASTall 0.517 — exempt, ko ends down by spec.
* `attack_block_b` fLASTall 0.867 — drifts, borderline; look before wiring.
* remaining 6 ≥0.916 — clean.

Containment (lich is structurally lateral-overrun-prone, see §2): `attack_throw_b` LEFT 112px,
`special_2` RIGHT 110px — past the house band; `special_1` RIGHT 75px borderline;
`attack_throw` LEFT 59px and `special_3` LEFT 28px — within the documented 48px feather remedy.

### thorn-warden — 2 new clips. 1 ships, 1 broken. **The most trustworthy verdict in this report**,
because his 11 shipped clips ran as the control in the same invocation and all scored 0.929-0.956.
* `special_3` (rootfall) → **`special-c.webm`: 0.932 / 0.933 — CLEAN. Ready to wire.**
* `special_1` (thornbreak) → `special.webm`: f0 0.931 OK, **fLAST 0.359 — END POSE BROKEN**, will
  snap on return to idle. Containment LEFT 16px (routine, inside the 48px band).

Wiring these two completes thorn-warden **11/13 → 13/13** — but only `special-c` is currently good.

### oni-tetsubo — 10 new clips: 9 keyed, **1 hard refusal**. Second-best kit here.
Control healthy (idle 1.000, ko 0.949, victory 0.971), so these verdicts are trustworthy.

**✅ `hit` IS FIXED AND IS THE BEST CLIP IN THE KIT.** anchor 0.962 / 0.962, and
`check-extra-objects` reads **1 blob, exit 0 — CLEAN**. The v1 was REJECTED at phase 98 for an
invented phantom mace flying in from the right (`oni-tetsubo.ts:75-87`); that defect is **gone**.
The `hit` slot, blocked since phase 98, is now fillable.

**⛔ `special_1` (earthshaker) — the phase-271 keyer refusal fired, its first live catch on this
batch.** `key-idle-clips` returns a 960x960 union bbox on a 960x960 source and REFUSES: *"plate
survived at every extreme, so nothing was actually keyed out."* Cause established by viewing the raw
at full size, not guessed: the ground-slam throws **airborne debris specks that reach all four frame
extremes** by f60, so the union bbox across 97 frames spans the whole frame — and a **rubble pile
persists at f96**. This is not a keyer bug; the clip is unkeyable as generated. **RE-ROLL** (debris
must stay inboard and must be gone by the last frame).
⚠ Do NOT reach for the refusal's suggested escape hatch here. It offers
`key-clips-green-pinksafe.mjs`, which silently **GREYSCALES a warm subject** — and oni is the
deep-blood-red character, the closest match in the roster to the known kitsune orange failure.

**`attack_strike`** — anchor f0 **0.629 START POSE BROKEN** (recovers to 0.956 by the end). Will snap
on crossfade in. Needs a re-roll or a start-trim.

**`special_3` (ogre stomp)** — the gate's own annotation: *"ENDS WITH DEBRIS ON SCREEN — pose ok, but
fix the prompt: the shed material must be GONE by the last frame"* (fLASTbody 0.952 vs fLASTall
0.536). Pose is fine; the debris is the defect. Exactly the class HANDOFF §5.4 put on its watch list.

CLEAN on anchor (0.947-0.962): `attack_strike_b`, `attack_throw`, `attack_throw_b`, `attack_block`,
`attack_block_b`, `hit`, `special_2`.
Containment: 8 of 9 over the 6px threshold, range 16-89px — mostly inside or near the 48px house
feather band, which is oni's documented remedy (`ko` shipped with `edge-feather --right 48`).

Note oni is the only character showing measurable olive after despill (**0.26-0.72%**), vs lich
0.01-0.02% and gargoyle 0.00%. All far under `OLIVE_BAD=2`, but he is the deep-red character and this
is the hue the olive defect historically bit — worth watching, not yet a defect.

---

## 3b. SCOREBOARD — what each kit is actually worth right now

| character | new clips | keyed | anchor-clean | needs re-roll | would reach |
|---|---|---|---|---|---|
| **ir56-lion-serpent** | 1 | 1 | **1/1 — `kit anchor-locked` exit 0** | 0 | **13/13** ✅ |
| **oni-tetsubo** | 10 | 9 | 7 | 3 (`special_1` refused, `attack_strike` f0, `special_3` debris) | 10/13 now, 13/13 after re-rolls |
| **thorn-warden** | 2 | 2 | 1 | 1 (`special_1` end pose 0.359) | 12/13 now, 13/13 after 1 re-roll |
| **lich-scythe** | 10 | 10 | 8 (read the `all` column, §2) | 2 (`attack_throw`, `special_1` end pose) | 11/13 now, 13/13 after re-rolls |
| **gargoyle-spear** | 12 | 12 | 8 | 6 | 9/13 now, 13/13 after re-rolls |

**Zero clips are wired.** Everything above is staged under `qa-boss/staged-s30/`.
Total re-rolls needed to take all five kits to 13/13: **12 clips.**

### ir56-lion-serpent — 1 new clip (`attack_throw_b`), MAGENTA. ✅ THE STANDOUT RESULT.
Keyed **0.00% plate before AND after** — the magenta stock keyer left no residue at all, so
`magenta-neutralize` had nothing to do. No ad-hoc two-axis fringe fix was needed (contrast
`ir56-lion-serpent-clipdata.json:207`, where the original kit required one that was never
productized into `scripts/`).

**`check-anchor-lock` on all 13 (12 shipped as the control + the new one): `kit anchor-locked.`
EXIT 0.** The new `attack-throw-b` scores **0.958 / 0.959 — the joint-best in the entire kit**,
against a well-calibrated control spread of 0.936-0.961. This is a clean, complete, 13/13 kit.

Per `HANDOFF:958-995` this fills a genuinely MISSING slot, not a duplicate: raw `throw_b` shipped as
engine `attack_throw`, while raw `throw_a` failed QA and left `attack_throw_b` empty. Completing it
takes ir56 **12/13 → 13/13**.

Remaining work on it is routine, not a defect: containment reads **LEFT 86px @f24 | RIGHT 94px @f60**
(`--plate magenta`, which must be passed explicitly or the gate silently inverts). ir56's kit already
feathers per-clip by convention — his shipped `throw_b` used `edge-feather --left 48` — so this needs
a per-edge feather, at roughly double the 48px house band. That is a tuning call, not a re-roll.

⚠ Green-family tools must never touch him. `check-extra-objects` is green-only and refuses on
magenta — do not point it at his raw.

---

## 4. Two tool findings worth keeping

1. **`qa-boss/rederive-cal.mjs` REFUSES AND EXITS 0.** Pointed at a generation anchor plate it
   correctly detects the unkeyed-input trap and refuses — then returns exit **0**. In an `&&` chain
   that reads as success. This is an **eighth** instance of the `gate-vacuous-pass` class the repo
   already tracks (`profile-containment.mjs:35` is the seventh, HANDOFF §0b).
2. **`rederive-cal.mjs` needs a KEYED still, not the green anchor plate** — so cal re-derivation is
   **blocked for gargoyle-spear and lich-scythe**, neither of which has a keyed cutout. That is the
   same missing artefact that blocks their registration. Their `cal` currently falls back to the
   keyer's emitted value, which `oni-tetsubo.ts:21-24` warns is stale by construction whenever a
   post-pass moves the alpha bbox. The `calDrift` column in each `<char>.summary.json` reads `n/a`
   for this reason — it is honestly reporting that it could not measure, not claiming agreement.

---

## 5. What is NOT done

* oni-tetsubo and ir56-lion-serpent gates (anchor-lock, containment, extra-objects) — keying was
  still running when this was written.
* `check-facing` was NOT run on any of these: `scripts/check-facing.mjs` resolves a character by id
  against `public/assets/characters/<id>/` and **cannot read the staging tree at all**. All five kits
  were generated natively facing screen-right per `SESSION29-FIRE-LEDGER.md`, and gargoyle's frames
  were verified screen-right by eye — but no automated facing measurement exists for this batch.
* No `contacts` measured — `attack_*` states need `scripts/measure-contacts.mjs` before they can
  populate a `FighterDef`.
* Nothing wired. gargoyle-spear and lich-scythe have **no `src/characters/*.ts` and no
  clipdata.json at all**; wiring them needs a new manifest plus a product decision (campaign node vs
  roster) open since phase 182.
