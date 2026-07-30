# FIRE PLAN — the 4 clips queued and verified fire-ready (phase 64, 2026-07-30)

All four build clean through `node qa-boss/check-prompt-sections.mjs` (108 clean / 0 problems).
**Nothing here has been fired** — the browser was never logged in to Higgsfield this session.

## Before the first fire of a session

```
node qa-boss/check-prompt-sections.mjs          # must print problems=0
```
Then in the logged-in Higgsfield tab, paste `qa-boss/fire-unlimited.js` and run `SF.inspect()`.
**Its DOM selectors are UNVERIFIED** (written while logged out) — `inspect()` exists to surface the
real ones. Fix them before trusting `SF.fire()`. The RULES it encodes are all recorded defects and are
sound; only the selectors are guesses.

Re-arm Unlimited and confirm `SF.inspect().generateButton === 'GenerateUnlimited'`. **It resets to
`Generate2418` on every reload** — `SF.fire()` re-checks in the same JS task as the click and throws
rather than billing, which has already blocked three would-be 2418-credit fires.

## The four clips, in firing order

| # | clip | build command | anchor plate |
|---|---|---|---|
| 1 | eclipse `attack_strike` v4 | `node qa-boss/build-prompt.mjs qa-boss/prompts/eclipse-ofuda.md attack_strike` | `qa-boss/anchors/eclipse-ofuda-anchor-green.png` |
| 2 | ir37 `attack_strike_b` v4 | `node qa-boss/build-prompt.mjs qa-boss/prompts/ir37-pink-tessen.md attack_strike_b` | `qa-boss/anchors/ir37-pink-tessen-anchor-green.png` |
| 3 | hollow-pale `special_2` v2 | `node qa-boss/build-prompt.mjs qa-boss/prompts/hollow-pale.md special_2` | `qa-boss/anchors/hollow-pale-anchor-green.png` |
| 4 | hollow-pale `special_3` v2 | `node qa-boss/build-prompt.mjs qa-boss/prompts/hollow-pale.md special_3` | `qa-boss/anchors/hollow-pale-anchor-green.png` |

**Swap the anchor plate to the clip's own character before each fire.** Session 15's note "swap the
ir37 anchor back in first" means exactly this — the reference image left loaded in the browser is
whatever the previous fire used, and a clip generated against another character's plate is a wasted
render that will not anchor-lock against its own kit.

## Per-clip acceptance — what "better" means, numerically

Judge against the PREVIOUS version's measured numbers, not against an absolute bar.

**1. eclipse `attack_strike` v4** — v3 was `f0 0.910 / fLast 0.467`, spanPeak 1.73, travel 80, TOP 36px.
- **PASS requires `fLast >= 0.90`.** This is the whole point of the v4 change: fLast failed twice
  (v2 0.502, v3 0.467) and the diagnosis is a TIME BUDGET, not a pose instruction — three separate
  "return to the anchor" sentences were already present and ignored, because a full committed cut
  runs out of clip. If fLast is still low, the action is still too big: shrink the CUT, do not add a
  fourth return sentence.
- Keep `f0 >= 0.90`, `spanPeak <= 1.60`, TOP overrun 0 (the blade-tip / never-vertical ban).

**2. ir37 `attack_strike_b` v4** — v3 was `f0 0.993 / fLast 0.993`, turn 0/97, spanPeak 1.53, travel 84,
65% duty, and one defect: RIGHT 44px @f57-58 from a single lotus petal.
- **PASS requires RIGHT overrun 0** with f0/fLast still `>= 0.99`.
- **This v4 is a RECONSTRUCTION** — v3's exact wording was never persisted, only its measurements. So
  if f0/fLast/spanPeak REGRESS, that is this wording's fault, not new information about the acting.
  Do not re-diagnose the acting on a regression here; fix the line.

**3. hollow-pale `special_2` v2** (ships as `special-b.webm`) — v1 was `f0 0.231 / fLast 0.187`, the
worst anchor break in the roster, not trimmable (no frame reaches 0.90).
- **PASS requires `f0 >= 0.90` and `fLast >= 0.90`.** The turn gate is clean across his whole kit, so
  this is a POSE break, not a facing break.
- Containment clean on LEFT/RIGHT/TOP. His budget is **L131 / R29 / T37** — the tightest in the
  roster — so expect to feather a prop tip. **Feather only if the BODY is well inside the band and
  only a tip crosses; if the body busts the frame, that is a re-roll.**
- Run `check-plate-retention` **BEFORE** `green-neutralize` — after it the number is a tautology (0.00%).

**4. hollow-pale `special_3` v2** (ships as `special-c.webm`) — v1 was minIoU 0.536 / travel 18px /
**15% duty**, and the manifest already calls it "by far the WEAKEST of the three finishers".
- **Judge on `dropPct`, NOT `minIoU`.** minIoU bbox-NORMALISES, which divides out scale, so it cannot
  see a sink — it scored a 42.7% height collapse as 0.363 "barely leaves the anchor". The beat is a
  deep braced crouch, so its entire signal is the height change. Reference: idle 1.0% · a static
  "finisher" 1.9% · a real crouch 30-43%.
- **PASS requires `dropPct >= 30%`** plus a duty cycle materially above 15%, containment clean, and
  f0/fLast on the anchor.

## Keying pipeline of record (unchanged)

```
extract -> key-idle-clips --still -> check-plate-retention (BEFORE) -> green-neutralize <dir> 4
        -> cut-bloom-plate <dir> -> edge-feather (only where an edge overruns)
        -> ffmpeg VP9 yuva420p crf30 -auto-alt-ref 0
```
Then `node qa-boss/rederive-cal.mjs` — **the keyer's emitted `.cal.json` files are all STALE**,
because neutralize deletes pixels after the cal is computed.

## Standing verification discipline

- **`check-containment.mjs` processes ONE argument.** A glob prints "scanned 1 | clean 1" and silently
  ignores the rest. Loop one file at a time.
- **Frame-inspect every motion-energy argmax** — 5 of 7 checked on IR-48 were the recovery or the tail
  of a sustained effect, not the blow.
- **Composite the frame and LOOK.** Every one of the three session-15 mistakes, and the session-14
  fabricated bloom, was invisible in the numbers and caught only by viewing a peak frame at >=2x.
