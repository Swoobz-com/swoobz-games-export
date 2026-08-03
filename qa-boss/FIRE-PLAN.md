# FIRE PLAN

## ⛔⛔⛔ STOP — DO NOT FIRE. TIM RULED THIS ON 2026-08-03. ⛔⛔⛔

**Tim's words, asked directly and answered directly: _"let's wait with generating."_**
No trial, no credit spend, no clips. This is a HUMAN HOLD, not a technical blocker, and it
**outranks the autonomous loop prompt**, which is a standing automated message that keeps re-issuing
the old instructions every cycle. A standing prompt does not override a live decision.

**Three independent reasons a fire is wrong right now — any one of them is sufficient:**

1. **Tim's hold** (above). He also ruled: generate the prop-EXTENDED characters later; leave
   `kitsune-tanto`'s raws unkeyed; leave the shipped kitsune green halo; leave the stills cap at 900.
2. **The account is blocked anyway.** `use_unlim:true` on `user_3FzP62OkeSn8OYHW3kjt3xDrWKK` returns
   *"Unlimited generations aren't supported for seedance_2_0"* — account-level, not model-level (see
   §THIRD ACCOUNT below). Probed across four day boundaries, same answer. **Tim has said stop
   probing.** `balance` held at 710 throughout, so a refused request is still never charged.
3. **The loop prompt's own 6-clip QUEUE is 100% SHIPPED** — eclipse `attack_strike`, ir37
   `attack_strike_b`, hollow-pale `special_2`/`special_3`, eclipse `special_1`, ir37 `special_3` all
   exist as wired `.webm`. Firing any of them would RE-ROLL a shipped clip. Its STEP 4 is stale too:
   all six MK FINAL kits already exist and need clips, not authoring.

**WHAT TO DO INSTEAD**, in order: read the SESSION block at the top of `HANDOFF-STREETFIGHTER.md`
(it holds Tim's six rulings and four corrections), then take read-only work — measurement, gates,
sweeps — that touches nothing under `public/assets/`.

**WHEN THE HOLD LIFTS:** derive the real gap with `node qa-boss/fire-queue.mjs` (it REPORTS, it does
not fire), never from the loop prompt's list. Then follow the procedure below.

---

## (historical header, kept for provenance — its 4 clips have ALL since shipped)
*"the 4 clips queued and verified fire-ready (phase 64, 2026-07-30). All four build clean through
`node qa-boss/check-prompt-sections.mjs`. Nothing here has been fired."*

## ★ TRANSPORT OF RECORD (phase 67, learned from a working sibling session)

Fire through the Higgsfield **MCP** (`mcp__claude_ai_higgsfield__generate_video`), not the browser.
The MCP path returns job ids and direct mp4 URLs, so harvesting is a download — no DOM scraping, and
none of the polling bugs that cost session 15.

## ⛔ THERE IS A THIRD ACCOUNT, AND IT CANNOT FIRE FOR FREE (phase 160, 2026-08-01)

**Firing is BLOCKED whenever the session lands on `user_3FzP62OkeSn8OYHW3kjt3xDrWKK`.**

The flip is not between two accounts, as recorded below — there are at least THREE:

| account | balance seen | `use_unlim` |
|---|---|---|
| `user_3HFAtp47rDRPDwG2FFOzR2CP7fn` | ~10 credits | **works** — every clip this session fired here |
| `user_3DR1OB2c…` | 10 → 0.9 credits | worked (session 17) |
| **`user_3FzP62OkeSn8OYHW3kjt3xDrWKK`** | **1162 credits, plan `plus`** | **REJECTED** |

On the third account `use_unlim: true` returns:

> Unlimited generations are part of the Higgsfield free trial. Start the trial to use them.

So it has a big credit balance and NO unlimited entitlement. Firing there would spend Tim's
credits, which the loop protocol forbids outright ("use_unlim:true, never credits").

### ⚠ THE REJECTION NOW COMES BACK NAMING THE **MODEL**. IT IS STILL THE ACCOUNT. (phase 216, 2026-08-03)

Same account, same `use_unlim: true`, **different wording**:

> Error starting generation: Unlimited generations aren't supported for seedance_2_0.

That reads as a MODEL capability verdict — `unlim_not_supported` in the tool's own vocabulary, whose
docs define it as "the model has no unlim path". Taken at face value it sends a session to swap
models, or to abandon seedance. **Do not take it at face value.**

**PROVEN BY FIRING A SECOND MODEL, NOT BY READING A FIELD.** `kling3_0` — a different provider, and
the model this project's own notes rate the best fallback — returned the *identical* model-shaped
refusal in the same minute:

> Error starting generation: Unlimited generations aren't supported for kling3_0.

Both models advertise `supports_unlim: true` in the catalog. Two independent models cannot both have
lost their unlim path between one call and the next. **The refusal is account-wide, rendered as a
model-level string.** Nothing changed on 2026-08-03 — this is the phase-160 blocker in new words,
now tested across a third day boundary, same verdict. `balance` held at 710 across both attempts:
the never-silently-charged guarantee held again.

**DO NOT "CHECK" THIS WITH `models_explore` FIRST.** Its top-level `unlim` block reads
`{available: false}` right now, but that field is **known unreliable** — `~/.claude/memory/`
`higgsfield-unlim-trial-video-constraints.md` records it reading `false` while unlim generations
were demonstrably succeeding, and the tool contract says the same: send the flag and let the backend
answer. The field is not evidence in either direction. **The fire IS the test, and it is free.**

What the catalog IS good for: telling you the error string is lying about its subject.
`supports_unlim` is a property of the MODEL; the entitlement is a property of the ACCOUNT.

Corollary for the queue: **a model swap buys nothing.** `seedance_2_0_mini`, `kling3_0` and `wan2_7`
all advertise unlim and all sit behind the same account-level zero — and swapping would also trade
away the 3-role identity lock seedance was chosen for. Stay on seedance; the blocker is the account.

No `recovery_tool` was offered on either rejection — the docs say `unlim_trial_available` returns one
pointing at the trial offer. Its absence is consistent with the trial being unavailable on this
account rather than merely unstarted, which is why **starting it remains Tim's call.**

**THE PROTECTION WORKED AND THAT IS THE POINT.** The request was rejected loudly and nothing was
charged — which is exactly why `use_unlim` is mandatory on every call. Had it been omitted, this
would have silently spent credits on a clip.

**WHAT TO DO WHEN YOU LAND HERE:**
1. `balance` is a HINT, **NOT a fingerprint** — corrected phase 190. This used to read "1162
   credits / `plus` = the un-fireable account", and then the balance MOVED: 1162 → 1146 on
   2026-08-01, from four `Nano Banana Pro` IMAGE generations at 4 credits each between 10:15 and
   10:25 UTC. **This is Tim's working account and he spends on it.** A session that keys off the
   literal number 1162 will mis-identify the account the moment it drifts.
   **The stable fingerprint is the USER ID**, which every CDN url carries:
   `https://d8j0ntlcm91z4.cloudfront.net/<user_id>/hf_...` — read it out of `show_generations`.
   `user_3FzP62OkeSn8OYHW3kjt3xDrWKK` = the account with credits and NO unlim entitlement.
   (~10 credits = the account that works.) Balance is still useful as a cheap CHANGE signal — see
   below — just never as identity.
2. Do NOT fire. Do NOT "just this once" drop `use_unlim`.
3. The plate re-upload is still wasted work on this account — check `balance` FIRST, then upload.
4. Use the cycle for kit work instead: reads, sweeps, gates, new kits. That is where most of this
   session's value came from anyway.
5. Starting the trial, or authorising credit spend, is **Tim's call, not the loop's.**

### ⚠ A BALANCE CHANGE IS A NON-INTERFERENCE SIGNAL (phase 190)

The balance sat at exactly 1162 for **twenty-two consecutive cycles**, then dropped to 1146.
`transactions` named the cause in one call: four `Nano Banana Pro` image generations, 4 credits
each, 10:15–10:25 UTC on 2026-08-01 — the newest 11 minutes before the check.

**So the account is in ACTIVE HUMAN USE, and `transactions` is the tool that tells you by whom and
for what.** `show_generations(type:'video')` showed NOTHING new — correctly, because the spend was
on IMAGES. **The video history alone would have reported "all clear" while someone was working on
the account.** That is a real hole in the STEP 1 check as written.

**WHAT TO DO:** treat any balance movement the loop did not cause as equivalent to a pending job.
Call `transactions` (not just `show_generations`), see what actually happened, and do not fire that
cycle. The loop is a guest on this account.

### Hypotheses TESTED AND DEAD — do not re-probe these (phase 173, 2026-08-01)

- **"The allowance resets at the day boundary."** Tested directly. The session crossed
  2026-07-31 → 2026-08-01 and the third account was probed with a real, fully-formed fire
  (hector-warhammer `idle`, plate freshly uploaded to that account, `use_unlim:true`). Same
  rejection, verbatim: *"Unlimited generations are part of the Higgsfield free trial. Start the
  trial to use them."* **This block is trial ELIGIBILITY, not a daily or monthly allowance —
  no amount of waiting clears it.** Only Tim starting the trial, or the session landing on a
  different account, will.
- Probing is nevertheless SAFE and costs nothing: the tool contract guarantees a request that
  cannot be served free is **rejected, never silently charged**. One probe per session when the
  account may have flipped is fine. Hammering is not.

**Already uploaded to the third account** (valid only while the session stays on it — media ids do
NOT survive an account flip, that is the `Media input not found` signature):
`hector-warhammer-anchor-green.png` → `4bf0e314-3d58-4a54-9580-50401e811b87`

## ★ THE ACCOUNT FLIPS. RE-UPLOAD THE PLATE, DO NOT REUSE A media_id ACROSS A GAP (phase 112)

**Check `balance` before every fire session — it is the cheapest account fingerprint you have.**
Observed on 2026-07-31 alone, in one day: `user_3HFAtp47…` (session 17) → `user_3DR1OB2c…`
(10 → 0.9 credits, morning) → **back to `user_3HFAtp47…` (10 credits, afternoon)**. It flips both
ways, not just forward.

**Every `media_id` belongs to the account that uploaded it.** After a flip, a plate id recorded in any
clipdata returns `Media input not found`. **The fix is a RE-UPLOAD, not a retry** — and it costs
nothing, so just do it rather than testing whether the old id still lives:
```
media_upload → curl -X PUT --data-binary @<plate>.png '<upload_url>'   (expect HTTP 200)
             → media_confirm {media_id, type:'image'}
```
The failure is loud and free (`use_unlim` is REJECTED, never silently charged), so a wrong account
costs a round-trip and nothing else. The CDN path also carries the user id, which is how you tell
whose job is whose in `show_generations` without reading the prompt.

**Pass the anchor plate in THREE roles at once, all the same media_id:**
```
medias: [ {role:'start_image', value:<id>}, {role:'end_image', value:<id>}, {role:'image', value:<id>} ]
```
`end_image` is the important one and was missed at first: it pins the LAST frame to the plate, which is
precisely what `check-anchor-lock` measures as `fLast`. Passing start+end == the anchor is a structural
fix for the `first frame == last frame == the anchor` law — it stops being a thing we ask the prose to
do and becomes a thing the transport enforces. Expect fLast to improve for free.

**Settings that are PROVEN to work on this path** (observed on a concurrent session's completed jobs):
`mode:'std'`, `bitrate_mode:'standard'`, `generate_audio:false`, PNG input accepted.

**What FAILED, and the corrected diagnosis.** Three jobs failed with `start_image` ALONE plus
`bitrate_mode:'high'`. I first blamed the account, then the PNG format — both wrong: the same PNG +
`start_image` succeeds for a sibling session, and the failure reproduced identically across two
accounts. The untested-but-likely cause is `bitrate_mode:'high'` combined with a media input (a
text-only job with `high` and no media DID complete). **So: use `bitrate_mode:'standard'`, and if a
job fails, drop the extra roles before you touch anything else.** A failed job costs NOTHING — the
balance did not move across three failures — so bisecting here is free.

**Renders take ~90 seconds**, not the 20-60 minutes the browser Unlimited path took. Budget the 24h
window accordingly: it is worth hundreds of clips, and the bottleneck is now QA, not generation.

**`use_unlim: true` on every call, never credits.** A request that cannot be served free is REJECTED,
never silently charged.

## ✔ HARVEST IS VERIFIED END-TO-END AGAINST A REAL JOB (phase 249)

`qa-boss/harvest.mjs` is the FIRST tool that runs after a successful fire, it was patched in phase
229, and the patch had never been exercised. Tested now against a real completed generation on the
account (an existing job — no credits, no new render):

```
node qa-boss/harvest.mjs bdfd5379-2faf-4305-985d-5289670185e7 out.mp4 \
     --at 1785363083 --back 5 --fwd 5 --tries 2 --user user_3FzP62OkeSn8OYHW3kjt3xDrWKK
  -> READY  ts=1785363083  3119369 bytes  round 1  (6 URLs tried)   exit 0
  -> ffprobe: h264 960x960 97 packets      (a genuine 4s/24fps clip, not an error page)
```

**All four paths verified:**
- **The phase-229 `--user` fix works.** `--user` parses correctly BOTH before and after the
  positionals — the old parser would have swallowed `--user user_ABC` as the jobId.
- **URL derivation is correct** — jobId + `createdAt` + user prefix resolves to the real CDN object.
- **Guards exit 2**: bad uuid · missing outFile · nonsensical scan window.
- **The wrong-account trap fires as designed.** Run WITHOUT `--user` (i.e. on the default) against a
  job that lives on the other account and every URL 404s — and the timeout names the ACCOUNT as
  suspect #1, which is the whole point: a 404 is this poll's normal case, so "wrong prefix" and
  "not finished yet" are otherwise indistinguishable.

⚠ **`DEFAULT_USER` is `user_3HFAtp47…`, which is NOT the account this session keeps landing on**
(`user_3FzP62O…`). That default is the account FIRE-PLAN records as the one where unlim works, so it
is not wrong — but **pass `--user` explicitly unless you have just confirmed the prefix**, and read
the id out of the path segment after the host in any `show_generations` CDN url.

(Incidental cross-check: the harvested clip is **960x960**, independently confirming SESSION 24 §3 —
`resolution` is a PIXEL BUDGET and a 1:1 "720p" is 960x960, not 720.)

## ★ THE PRESET RECOMMENDER KEYS ON THE PROMPT, NOT THE CHARACTER (corrected phase 119)

Session 17 recorded it as character-consistent — *"eclipse always suggests DROWN IN MUSIC,
ir37/hollow-pale/oni always IN THE DARK"*. **That is wrong.** Same character, same plate, same
session, three consecutive fires:

| clip | preset offered |
|---|---|
| thorn `special_1` | IN THE DARK · `24bae836-2c4a-48e0-89b6-49fcc0b21612` |
| thorn `special_2` | IN THE DARK · `24bae836-…` |
| thorn `special_3` | **DROWN IN MUSIC** · `f1821f84-945b-4cd1-9085-1f479db0028e` |

So it cannot be cached per character. Declining the WRONG id does nothing — the notice simply comes
back. **Read the id out of the response you just got and echo THAT back as `declined_preset_id`.**
The recommendation notice is not a job: it costs nothing and burns no rate-limit window, so the extra
round-trip when the preset changes is free.

**Confirmed again phase 134, and this is the tightest evidence available.** The earlier table varies
three things at once (three different states). This pair varies exactly ONE:

| clip | preset offered |
|---|---|
| lich `idle` **v1** | IN THE DARK · `24bae836-2c4a-48e0-89b6-49fcc0b21612` |
| lich `idle` **v2** | **DROWN IN MUSIC** · `f1821f84-945b-4cd1-9085-1f479db0028e` |

Same character, same plate, same media_id, same state, same settings, minutes apart — only the acting
sentence was rewritten, and the preset flipped. It keys on prompt TEXT. Do not cache it by character,
by state, or by session; read it fresh out of every response.

## NON-INTERFERENCE (standing, Tim 2026-07-31)

Another terminal generates on a DIFFERENT account against the same rate limit. Before ANY fire, call
`show_generations(type:'video', size:5)`:
- any job `pending`/`in_progress` -> the other session is working. **Do not fire, do not retry.**
- the newest job completed **less than ~10 minutes ago** -> it is still mid-session. **Hold.**
- otherwise -> clear to fire, one clip at a time.
A 429 `rate_limit_reached` means the same thing: back off, do not hammer. Three rapid retries produced
three 429s and helped nobody.

## ⚠ THE ARSENAL CONTRACT COVERS 10 OF 40 KITS — DECLARE YOURS BEFORE YOU FIRE IT (phase 245)

`qa-boss/arsenal.json` is the CHARACTER ARSENAL CONTRACT (Tim, 2026-07-26): *"what each boss actually
WIELDS, so a prompt can never ask a swordsman to shoot something. Every clip prompt is checked
against this BEFORE it is fired."* It declares **exactly 10 characters** — the 10 campaign bosses.
There are **40 kit files**. So 30 kits fire without a per-character contract, and
`check-prompt-coherence` marks them `wields: (arsenal not declared)`.

**Measured, not assumed — what that actually costs:**

| still enforced on an undeclared kit | silently NOT enforced |
|---|---|
| the UNIVERSAL melee-roster rules — detached-effect placement, projectile wording, grab framing. These are BLOCK-level and read from the universal block, not the character def. Proof: `ir52-umbra-pinions` and `jin-goldenhand` both report **BLOCK** while showing "(arsenal not declared)". | the `def.banned` loop (`check-prompt-coherence.mjs:172`) — **it iterates `def.banned \|\| []`, so with no entry it does nothing at all.** Per-character weapon constraints ("a spearman must not do fan actions", "sword-only actions") are never checked. |

So the dangerous class is still caught; what is lost is the character-specific half.

**⚠ ALL SIX MK FINAL KITS ARE UNDECLARED** — `oni-tetsubo`, `raiju-naginata`, `minotaur-axe`,
`skullrend-orcus`, `pale-choir`, `jin-goldenhand` — and they are the queue's next batch (loop STEP 4).

**WHAT TO DO: add the character's entry to `arsenal.json` as the first step of firing its kit**, in
the shape the 10 declared ones use (`node`, `wields[]`, `body[]`, `effectPalette[]`, `banned[]`).
**Derive `wields` from the PLATE you are about to fire against — look at it — not from the character's
name.** Half this roster's names imply a weapon (`minotaur-axe`, `raiju-naginata`) and half do not
(`skullrend-orcus`, `pale-choir`, `jin-goldenhand`); a guessed entry silently mis-gates every prompt
for that character, which is worse than the honest gap. **Deliberately NOT bulk-filled** for exactly
that reason: this is a Tim-authored contract, and an entry is cheap to write correctly at the moment
someone is already looking at the plate.

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

## ★ MEASUREMENT REFERENCE — three references exist and they are NOT interchangeable (phase 78)

A freshly generated clip is a RAW GREEN-SCREEN mp4. A shipped clip is a KEYED webm with alpha. The
kit anchor can be either the anchor PLATE png or `idle.webm` f0. Mixing them silently changes the
scale of every number, and I did exactly that: I rejected hollow-pale special_2 v2 for falling under a
"0.906 kit floor" that was measured `keyed webm vs idle.webm`, while the clip's own numbers were
measured `raw mp4 vs plate`.

Measured proof that the references are not comparable — the SAME shipped clip, scored two ways:
    hollow-pale special-c.webm  vs idle.webm f0  ->  0.988
    hollow-pale special-c.webm  vs anchor PLATE  ->  0.872 all / 0.832 body
A perfect clip loses ~0.15 just by changing the reference.

**RULE. Judge a fresh clip only against clips measured the SAME way.** For raw mp4s that means
`raw green-screen frames vs the anchor plate`, and the peer set is the other raw clips from this
session, not the shipped kit:
    eclipse strike_a v5    f0 0.924  fLast 0.925   ACCEPT
    ir37 strike_b v4       f0 0.930  fLast 0.930   ACCEPT
    hollow-pale sp2 v2     f0 0.873  fLast 0.753   REJECT (fLast is the outlier, and far below its own f0)
`check-anchor-lock.mjs` runs on the KEYED kit and its 0.906-0.988 numbers belong to that domain only —
use them after keying, never to judge a raw generation.

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

## Keying pipeline of record (inset-ring gate added phase 240)

> # ⛔⛔ THIS PIPELINE IS GREEN-ONLY AND IT WILL DESTROY A MAGENTA CHARACTER ⛔⛔
> **(phase 250 — audited by running every step on real inputs. Full report:
> `qa-boss/TOOLCHAIN-AUDIT.md`.)**
>
> Until phase 250 this file contained the word "magenta" **zero times**, while listing every step
> below unconditionally. **THREE characters are magenta-plate** — `ir56-lion-serpent`,
> `onryo-katana`, and **`pale-choir`, which is one of the six MK FINAL kits STEP 4 fires NEXT.**
>
> **`cut-bloom-plate` deleted 28.06% of ir56's visible pixels — its entire green armour — and exited
> 0**, with `check-plate-retention --plate magenta` still reporting `0.00% clean` afterwards. Its
> test is green-family and it has no `--plate` flag. **Do not run it on ir56 / onryo / pale-choir
> until it is plate-aware.**
>
> On a magenta character you must ALSO pass `--plate magenta` to `check-plate-retention` and
> `check-frontturn` (both silently invert and report a clean full-frame otherwise), and know that
> `screen-translucency` is hue-locked to green and cannot measure a magenta plate at all.
>
> **AND THE KEYER ITSELF FAILS ON hollow-pale.** `key-idle-clips` — named below — returns a
> full-frame bbox and **16.91% BAD** plate retention on his frames (a green ring around the whole
> frame). `key-clips-green-pinksafe.mjs` gives `776x890` / **0.00%**, which is what
> `BRIEF-hollow-pale-wire.md` already prescribes. The brief and this pipeline disagree; the brief is
> right for hollow-pale. ⚠ pinksafe is NOT a general keyer either — it silently greyscales a warm
> character (kitsune's orange fox came out black-and-white).

```
extract -> key-idle-clips --still -> check-plate-retention (BEFORE) -> green-neutralize <dir> 4
        -> cut-bloom-plate <dir> -> edge-feather (only where an edge overruns)
        -> ffmpeg VP9 yuva420p crf30 -auto-alt-ref 0
        -> node qa-boss/check-inset-ring.mjs <clip.webm>        <-- AFTER the encode, every time
```

⚠ **`green-neutralize <dir> 4` is DESTRUCTIVE and has a non-destructive equal this file never
mentions.** It cost kitsune **−72% of its partial-alpha (feather)** and 624k deleted px; hollow-pale
**−29% of visible pixels**. `scripts/green-despill.mjs` reached the **identical 0.00%** plate result
on kitsune while deleting **0 px** and keeping the feather intact (verified through encode+decode).
Prefer despill; reach for neutralize only if despill leaves plate residue.

⚠ **Four exit-code liars in this chain** — `check-turn` prints "face the wrong way" and exits 0;
`check-extra-objects` prints "EXTRA OBJECT PRESENT" and exits 0; `cmp-alpha` exits 0 after comparing
nothing on a dims mismatch; `check-plate-retention` prints "all clean" and exits 0 while a clip is
WATCH (1–5% band). **Read the rows, never the exit code, for these four.**

⚠ **Five mutating tools exit 0 after processing ZERO frames** when handed an empty dir or a dir of
mp4s (`green-neutralize`, `cut-bloom-plate`, `edge-feather`, `green-despill`, `magenta-neutralize`).
In a `&&` chain a wrong path is a green light. Check the `frames=N/N` count on every step.

⚠ **`check-plate-retention` measures ~100x weaker on a WEBM than on a frames dir** (same content:
1.29% as frames, 0.00% as the webm — its internal `scale=240:-1` plus VP9 4:2:0 averages the fringe
away). Its own "roster baseline ALL CLEAN 0.00%" was measured on webms and is **not comparable** to
the frames-dir number this pipeline's BEFORE step produces.
Then `node qa-boss/rederive-cal.mjs` — **the keyer's emitted `.cal.json` files are all STALE**,
because neutralize deletes pixels after the cal is computed.

**WHY THE INSET-RING STEP IS IN THE CHAIN AND NOT OPTIONAL.** It catches an effect (flame, arc,
impact bloom) that runs off the SOURCE frame and ships as a hard flat wall floating mid-stage — the
clip border is not the screen border. `~/.claude/skills/character-clip-qa/SKILL.md` has mandated this
gate for a long time and **this repo never had it**: it shipped `scripts/radial-feather.mjs` (the
FIX) with no detector, so the class was only ever found by eye, one clip at a time, and it regressed
twice. The first sweep that ever ran found **5 genuinely sliced effects** in the shipped corpus.
**Re-run it after ANY re-encode** — a second decode+encode pass is what crushed a 48px feather to
~8px last time.

⚠ **ITS FLAG IS NOT A VERDICT.** `FLAT-EDGE` means "opaque content runs flat along a border". It
cannot tell a sliced EFFECT from a big PROP crossing the edge (a greatsword blade makes a 477px run
exactly like a cut does) — of 15 flagged clips, 10 were props and legitimately fine. **VIEW the
named frame over DARK at full size and classify it before acting.** Full evidence and the
classification of all 15: `qa-boss/INSET-RING-SWEEP.md`.

⛔ **AND ITS PASS IS NOT A FIX.** Proven with a control (phase 246): a clip cropped through the body
scores `i2 255/620` and exits 1, and the SAME clip with a 60px **soft straight** alpha ramp scores
`i2 255/80` and **exits 0**. So a straight feather turns this gate green — while the defect remains,
because a soft fade along a straight line still reads as "ends at an invisible box" (the eye reads
the CONTOUR, not the hardness). **That non-fix already shipped once on this repo** — phase 11b's
straight feather, which Tim re-reported, replaced by the radial one in phase 14b — **and this gate
would have certified it.**
**So: fix effects with `scripts/radial-feather.mjs` (curved, character-centred) and verify by VIEWING
the peak frame composited over dark. Never sign the repair off on this gate's exit code.**
`scripts/edge-feather.mjs` (straight band) stays legal ONLY for prop overflow, never for an effect.

### ✔ THE FIX PATH IS PROVEN END-TO-END (phase 248) — recipe, with numbers

Dry-run on `thorn-warden/attack-block` (f40-58 window, cut at f48), entirely in scratch, no shipped
asset touched. `radial-feather.mjs` takes a **frames directory of PNGs**, not a webm, so the chain is:

```
ffmpeg -c:v libvpx-vp9 -i <clip>.webm -vsync 0 -pix_fmt rgba  frames/f%03d.png
node scripts/radial-feather.mjs frames/            # defaults; exit 0, "19/19 frames"
ffmpeg -framerate 24 -i frames/f%03d.png -c:v libvpx-vp9 -pix_fmt yuva420p \
       -b:v 0 -crf 30 -auto-alt-ref 0 -an  out.webm
```

Result, measured and then VIEWED:

| | i2 | i10 | i25 | i49 | i80 | gate |
|---|---|---|---|---|---|---|
| before | **255**/314 | 255/314 | 255/310 | 255/298 | 255/266 | FLAT RIGHT |
| after | **22**/0 | 95/0 | 167/0 | 230/0 | 255/129 | **clean** |

That after-row is the textbook healthy ramp this file's own gate section describes (~1/30/128/236/255).
**And the contour was confirmed CURVED by eye** — the bloom thins along its own curvature and the
thorn tips fade instead of being amputated. That check is not optional: the gate cannot tell a curved
fade from a straight one (proven above), so the numbers alone would equally have passed a non-fix.

⚠ **Scope of this dry-run, stated honestly:** ONE clip, a 19-frame window, at DEFAULT parameters.
The defaults are character-centred (`cx 0.5 cy 0.56 rx 0.53 ryUp 0.61 ryDown 0.68`) and a character
who stands off-centre or whose effect sits high will need them tuned — check the fade does not eat
the figure. Re-run the inset-ring gate after the re-encode, and remember to rename the asset (`-r2`)
and update the manifest url so no browser cache serves the old clip.

## Standing verification discipline

- **`check-containment.mjs` processes ONE argument.** A glob prints "scanned 1 | clean 1" and silently
  ignores the rest. Loop one file at a time.
- **Frame-inspect every motion-energy argmax** — 5 of 7 checked on IR-48 were the recovery or the tail
  of a sustained effect, not the blow.
- **Composite the frame and LOOK.** Every one of the three session-15 mistakes, and the session-14
  fabricated bloom, was invisible in the numbers and caught only by viewing a peak frame at >=2x.
- **`check-inset-ring.mjs` after every encode and every re-encode** (see the pipeline above). Judge
  its FLAT-EDGE flags by eye — it ranks, it does not convict.
- **Decoding alpha needs `-c:v libvpx-vp9` explicitly.** VP9 alpha is an out-of-band track, so
  `ffprobe` reports `pix_fmt yuv420p` and the DEFAULT decoder silently drops it — any alpha filter
  then fails on EVERY clip. That uniform failure is the tell. (Same family as the standing rule
  "do NOT test alpha via `pix_fmt`", which once flagged 119 of 119 healthy clips as broken.)
- **`ffmpeg drawtext` needs an explicit `fontfile=` on this machine.** Fontconfig has no default
  config; without it drawtext fails and a tiling step silently produces an empty directory. Use
  `fontfile='C\:/Windows/Fonts/consola.ttf'`.

## PROMPT LENGTH — AN OPEN QUESTION, **NOT** THE RISK I FIRST CALLED IT (phase 175, CORRECTED phase 176)

Measured across all 29 buildable kits — assembled `idle` length, and the SHARED SUFFIX inside it —
sorted, with wired-clip status beside each. **The separation is perfect and has no exception:**

| group | shared suffix | assembled idle | kits |
|---|---|---|---|
| **has ACCEPTED, WIRED clips** | 309 – **1438** | 1027 – **2493** | 10 kits, 113 wired clips |
| **never wired** | **1708** – 4829 | **3453** – 8892 | 19 kits, 256 queued states |

The boundary sits between `oni-tetsubo` (1438 / 2493, shipped) and `ir05-fullbarge-titan`
(1708 / 3453, never wired). Nothing crosses it in either direction.

**WHERE THE GROWTH IS: the SHARED SUFFIX, which is the BOUNDS block.**

| kit | prefix | suffix | body |
|---|---|---|---|
| satoshi-odachi (13 wired) | 450 | **778** | 259 |
| eclipse-ofuda (13 wired) | 546 | **925** | 885 |
| ir37-pink-tessen (13 wired) | 587 | **1188** | 446 |
| hector-warhammer (0 wired) | 1589 | **3449** | 1952 |
| kira-foxflare (0 wired) | 1939 | **4004** | 1984 |

The acting BODY roughly doubled (legitimate — richer beats). **The suffix TRIPLED.** That block is
appended to all 13 states, so every bound added there is paid 13 times per character. This is
literal, measurable **bound accumulation** — the exact anti-pattern the doctrine names when it says
*a bound never beats a beat* — and it accumulated in the one place where it compounds hardest.

**⚠ STATE THE CONFOUND HONESTLY — THIS IS CORRELATION, NOT A PROVEN CAUSE.** The shipped kits are
also the OLDEST kits. Kits grew over time AND older kits had more chances to be fired, so
"long → the model ignores the bounds" is NOT established by this table and must not be reported as
established. Two things ARE established, and they are enough to act on:

1. **No clip has ever been ACCEPTED and WIRED from a prompt longer than ~2500 characters.** That is
   a fact about the entire evidence base, not an inference.
2. **All 256 queued states sit outside that envelope**, most of them far outside.

(Note: "never wired" is not "never generated" — onryo-katana has fired clips in the account history
that were never wired. The claim above is specifically about clips that survived QA and shipped.)

### ⚠ I OVERSTATED THIS. THE CONFOUND IS NEARLY TOTAL — READ THIS BEFORE ACTING ON THE TABLE ABOVE.

I labelled the section above "THE #1 RISK TO THE QUEUE". **That was wrong, and acting on it as a top
risk would waste a cycle.** I checked the creation date of every kit:

| group | created | suffix |
|---|---|---|
| all 5 kits with shipped clips | **2026-07-24** | 778 – 1188 |
| oni-tetsubo (2 clips) | 2026-07-31 | 1438 |
| lich, hector, kira-foxflare, shiro-gale … | **2026-07-31 / 08-01** | 3449 – 4139 |

**The "shipped vs never-fired" split IS the "written before vs after the account broke" split.**
No kit written after 2026-07-24 has shipped anything — REGARDLESS OF LENGTH — because firing has
been blocked since. Length is a third variable that also grew with date. The table above therefore
carries almost NO information about whether length affects adherence.

**And there is a mechanism pointing the other way.** The bounds accrued for real, observed defects:
satoshi (778, the oldest) has NO containment clause at all; every kit from eclipse onward has one,
because containment defects were found and fixed by adding it. So a long suffix is largely a record
of accumulated defect fixes — which means **trimming would be actively harmful**, not merely neutral.
The "do not delete existing bounds" instruction stands, and now has a real reason behind it rather
than caution.

**REVISED POSITION:** length is a genuinely open question worth ONE cheap experiment, and nothing
more. It is not a queue-wide risk, it does not block writing kits, and it must not be used to
justify stripping bounds from anything.

**THE EXPERIMENT, WHENEVER IT IS CONVENIENT (both arms are already written and build):**
1. Fire **hector-warhammer `idle`** (6990) as the deliberate test of the long form. It is gate-clean,
   fully verified, and its plate is comfortable (58% fill, 620px headroom) — so if it fails, length
   is the leading suspect rather than the plate.
2. Judge it on **bound ADHERENCE specifically** — facing, containment, debris count, no-new-objects
   — not on whether the acting looks nice. Dilution shows up as bounds being ignored, not as bad art.
3. If adherence is poor, **trim the SUFFIX first, never the body.** The body is the beat; the suffix
   is the accumulation. A trimmed suffix at ~1200 chars matching the shipped kits is the obvious
   A/B, and it is one clip to find out.
4. Both arms are prepared: `qa-boss/ab/hector-warhammer-SHORT.md` (4740) and the live kit (6990),
   same plate, same state, same settings. **Do NOT block kit-writing on this.**

**AND FIX THE SOURCE:** `qa-boss/xg/KIT-WRITING-BRIEF.md` is what drives agents to write these
suffixes. Every agent followed it faithfully — the drift is in the brief, not in the agents.

## ⚠ TWO STANDING ITEMS IN THE LOOP PROMPT ARE ALREADY CLOSED (phase 219, 2026-08-03)

The autonomous loop prompt fires every cycle carrying instructions that were satisfied phases ago.
Re-deriving that each cycle is pure waste, so both are recorded here — **check this section before
acting on the prompt's QUEUE or its WATCH line.**

**1. THE 6-CLIP QUEUE IS 100% SHIPPED.** Verified file-by-file:

| queue item | wired file | dims |
|---|---|---|
| eclipse `attack_strike` | `eclipse-ofuda/attack-strike.webm` | 960x960 |
| ir37 `attack_strike_b` | `ir37-pink-tessen/attack-strike-b.webm` | 606x946 |
| hollow-pale `special_2` | `hollow-pale/special-b.webm` | 590x904 |
| hollow-pale `special_3` | `hollow-pale/special-c.webm` | 776x890 |
| eclipse `special_1` | `eclipse-ofuda/special.webm` | 498x852 |
| ir37 `special_3` | `ir37-pink-tessen/special-c.webm` | 712x832 |

Both characters are 13/13. Firing any of these would re-roll a shipped clip. **When the account
unblocks, fire from `qa-boss/fire-queue.mjs` (which derives the real gap), not from the prompt.**

**2. THE RAIJU RECTANGLE IS DISPROVEN — TWICE.** The prompt says *"raiju's padded plate retains a
faint rectangle — check its first keyed clip for a rectangular alpha edge."* No clip is needed: the
plate is a STILL, so the keyer runs on it for free. Phase 107 did this and found a clean silhouette;
re-run in phase 219 on the padded plate:

```
check-plate-key      opaque 11.86% · emis 1.97% · p99 28.7 · max 70 · keys with margin
screen-glow-survival 5514 emissive px -> 5514 survive = 100.0%  (OPAQUE lit feature)
mask VIEWED at full size -> crisp silhouette; blade, mane spikes and individual toes all resolve;
                            background uniformly black; NO rectangular alpha edge anywhere
```

The eye sees a rectangle because it is sensitive to a FLAT-vs-NOISY boundary; the keyer only measures
distance, and 99.4% of backdrop pixels sit within 29 of the border colour against TIGHT=45. Both
facts are true at once. **raiju-naginata is clear to fire — no re-plate, no first-clip caution.**

## ⚠ TWO GATES COULD NOT FAIL — AND ONE OF THEM CRIES WOLF (phase 230, 2026-08-03)

Swept every `check-*.mjs` against a nonexistent input, asking the one question the vacuous-pass class
turns on: **does absence of input read as absence of defects?** 10 of 12 errored correctly. Two did not.

**1. `scripts/check-prompt-coherence.mjs` — FIXED. It printed the ALL-CLEAR over a file it never read.**
A missing kit produced `(no prompts file)`, then `No BLOCK findings.`, then **exit 0**. It fires only
in SINGLE-character mode (bulk mode takes its ids from `readdirSync`, so they always exist) — i.e.
exactly the mode used to vet one character before firing it. A typo, or the wrong hyphen/underscore
form of a name, returned a clean bill of health. Now counts unevaluated inputs, refuses to print the
all-clear, and exits **2**.

**2. `scripts/check-facing.mjs` — FIXED. It had NO `process.exit` at all.**
It fell off the end, so it returned 0 unconditionally: on a missing anchor, on an unreadable clip, and
even while printing its own alarm `KIT IS INTERNALLY INCONSISTENT`. **A gate that cannot fail cannot
gate** — in a chain (`check-facing && next`) it waved everything through. Now exits **2** when a
character could not be evaluated and **1** when a kit is internally inconsistent. Uniform mirroring vs
the anchor stays informational on purpose — the manifest's `faces` field legitimately handles that,
and inventing a failure there is a domain ruling this script has no business making.

Verified on all paths: nonexistent → 2 · real character → 0 · bulk unchanged · `check-facing
hollow-pale` (shipped, 13/13) still → 0.

### ⚠ AND THE COHERENCE GATE'S OUTPUT IS CURRENTLY NOISE — 35 BLOCKs, INCLUDING 5 SHIPPED KITS

Bulk mode reports **35 BLOCK findings across 15 kits, five of which are shipped 13/13**
(eclipse-ofuda, hollow-pale, ir37-pink-tessen, lady-kurotachi, satoshi-odachi). Clips that were
generated, gated, VIEWED, accepted and wired. So either the gate over-fires or shipped content
violates doctrine — and per this file's own rule, that disagreement gets investigated, not resolved
by preference.

**Sampled `eclipse-ofuda`. The gate over-fires.** Two unambiguous false positives:

| finding | actual context | why it is wrong |
|---|---|---|
| `detached-effect-placement: "in front of her"` (special_1 AND special_2) | *"katana held point-down **in front of her** exactly as in the reference"* | that is the character's own HELD WEAPON in the anchor-stance clause — no effect involved |
| `grab-framing: "seizes an unseen"` (throw_a) | *"seizes an unseen foe **through EMPTY AIR**"* | the next three words ARE the gate's own prescribed FIX |

The anchor-stance clause opens nearly every kit in the roster, which is exactly why 15 kits trip it.

**NOT FIXED, deliberately.** The exit-code bugs above are unambiguous correctness. The MATCHER is a
doctrine judgment, and a careless narrowing would create false NEGATIVES — a gate that misses a real
phantom-object defect is far worse than one that cries wolf. The fix wants a targeted exclusion (a
match inside the held-weapon anchor clause is not a detached effect) plus a re-run against all 35.
**Until then, read this gate's BLOCKs by hand; do not treat its exit 1 as authoritative.**
Scope of this check, stated honestly: ONE character sampled, not all 35 findings audited.

### ✔ COHERENCE MATCHER NARROWED — 8 FALSE POSITIVES OUT, 4 MASKED REAL ONES IN (phase 230b)

Phase 230 deferred this as "a doctrine judgment". On re-reading, the core of it is not: doctrine says
an effect must be anchored to the character, and **a HELD weapon is anchored by definition**, so
flagging it was a precision bug. And the false-negative risk was VERIFIABLE — capture findings before,
narrow, capture after, then read every finding that changed.

**The masking bug was the serious half.** The matcher was a single `.exec` over the whole state body,
so it reported the FIRST positional phrase. Every kit opens with the anchor-stance clause, so the
boilerplate always won — **and any genuine detached-effect phrase later in the same state was never
surfaced.** The gate was blind exactly where it was meant to look.

Two exclusions, each proven by diff:

| exclusion | rationale | evidence |
|---|---|---|
| phrase modifies something **HELD** | held = anchored, by doctrine | *"katana **held** point-down in front of her"* x2, *"the war-fan **held** OPEN beside her"* x2 |
| phrase followed by **"own &lt;body part&gt;"** | this is the CURE the gate's own FIX text prescribes ("erupt AROUND HIS OWN BODY") | *"in front of her **own chest**"*, *"beside her **own hip**"* |

```
BEFORE 35 BLOCK   ->   FINAL 31 BLOCK
  -8 false positives removed (all 8 read and confirmed against their context)
  +4 GENUINE findings surfaced that the boilerplate had been masking
```
Regression-checked: nonexistent -> exit 2, real character -> exit 0, both unchanged.

**RESIDUAL NOISE — NAMED, NOT TUNED.** Reading all 19 surviving detached-effect findings, some are
still false. Left alone deliberately: each needs a judgement call, and over-narrowing this gate buys
a false NEGATIVE, which is far worse than noise. The families:
1. ~~**Negation under-reach.**~~ **FIXED (phase 230c).** *"none ever hangs **in the air**, none travels
   sideways away from her"* is the prompt FORBIDDING the thing, and it was reported as the offence.
   Cause was one missing word: the negation vocabulary was `not|never|no|nothing|does not|doesn't|
   without` and **"none" was absent** — `no` cannot match "none". Added the universal negators
   (`none|neither|nor|cannot|can't`); each is unambiguously negative so none can suppress an
   AFFIRMATIVE placement, and the tight 40-char no-period-crossing window is unchanged.
   **31 -> 30 BLOCK, exactly one finding removed, none added.** The control that proves it did not
   over-reach: the AFFIRMATIVE finding in the SAME character, same kind, adjacent state — *"talismans
   forward that flare bright and burn away in the air in front of her"* — is still correctly flagged.
2. **Body-anchored without the word "own".** *"beside her **planted foot**"*, *"in front of her
   **front talon**"* — anchored to the fighter, but the "own" test misses them.
3. **Held-weapon cues outside the HELD_CUE list.** *"war-fan **open** beside her again"* — "open" is
   not currently a held cue.
**So: still read this gate's BLOCKs by hand.** It is now materially better signal, not yet clean.

### ✔ TRIAGED: THE FIRE-READY QUEUE CARRIES NO REAL COHERENCE DEFECT (phase 231)

30 BLOCKs remain and I said they must be read by hand. Done — for the subset that actually gates
future work. **Findings on SHIPPED kits are moot** (those clips are generated, viewed, accepted and
wired). What matters is UNFIRED kits with a `WRITE` verdict, because firing one carrying a genuine
phantom-object defect burns a generation. That is **9 findings across 5 kits**, and they were read
against their own context:

| kit | finding | actual context | verdict |
|---|---|---|---|
| ir52-umbra-pinions | `projectile-wording: "launches"` | *"she **launches her whole body** forward off her rear talon"* | FALSE — her own body |
| ir52-umbra-pinions | `"in front of her"` | *"...bite into the ground just in front of her **front talon**"* | FALSE — body-anchored |
| ir52-umbra-pinions | `"beside her"` | *"STAMPS that talon down into the ground beside her **planted foot**"* | FALSE — body-anchored |
| jin-goldenhand | `"in front of her"` | *"...into the stone floor just in front of her **leading slipper**"* | FALSE — body-anchored |
| jin-goldenhand | `"in front of her"` | *"her leading leg stays long in front of her with its **slipper**..."* | FALSE — her own limb |
| jorogumo-kusarigama | `projectile-wording: "hovering"` | *"their pointed tips hovering just ahead of her **own shoulders**"* | FALSE — her own limbs |
| wolfmark-hild x2 | `"beside her"` | *"the EXACT low extension and line it has in the reference image beside her **rear hip**"* | FALSE — body-anchored |
| **onryo-katana** | `projectile-wording: "hovering"` | *"**Feet hovering just above the ground.**"* | **MISLABELLED BUT REAL — see below** |

**CONCLUSION: 8 of 9 are false positives, and no unfired kit carries a real detached-effect or
projectile defect.** The fire-ready queue is clean on this axis. Do not spend a cycle "fixing" these
prompts.

**THE ONE THAT IS NOT NOISE — `onryo-katana` idle, and it is not a projectile.** *"Feet hovering just
above the ground"* is canonical for an onryo (a vengeful spirit), but it contradicts the
**FEET STAY FLAT ON THE GROUND** rule every other kit in the roster carries, and it bears on
anchor-lock, where ground contact is what the pose is measured against. **This wants a deliberate
decision before onryo fires**, not a silent inheritance of a line no other character has.

### AND THE RESIDUAL NOISE NOW HAS A SPECIFIED FIX (evidence: 7 of the 8 above)

Every body-anchored false positive has the same shape: the positional phrase is **immediately
followed by a possessive noun** — `her front talon`, `her planted foot`, `her leading slipper`,
`her rear hip`, `her own shoulders`. A GENUINE detached placement instead ends the clause:
*"in the air in front of her**,** then snaps back"*, *"in front of her**,** a burst of talismans"*.

**So the discriminator is objective, not a doctrine call:** if the phrase continues into a possessed
noun it is anchored to the fighter; if it terminates at punctuation or a clause boundary it is free
space. That is the next narrowing to make, and it should be proven the same way the last three were —
apply, diff, and READ every finding that changes. Not done this phase on purpose: the triage above is
the deliverable, and folding a fourth matcher change into the same cycle would muddy its attribution.

### ✔ POSSESSIVE-NOUN DISCRIMINATOR APPLIED — AND IT CAUGHT ME INTRODUCING A FALSE NEGATIVE (phase 232)

Applied the narrowing phase 231 specified: a positional phrase that runs ON into a noun the fighter
possesses is anchored; one that ENDS the clause is free space. **30 -> 25 BLOCK, 5 suppressed, 0 added.**
All five verified against their own context — `her front talon`, `her planted foot`,
`her leading slipper`, `her rear hip` x2.

**THE FIRST CUT WAS WRONG AND THE VERIFICATION IS THE ONLY REASON I KNOW.** It stop-listed only
CONJUNCTIONS, so it silenced two REAL violations:

```
"a SMALL compact hot-pink-and-white wind-arc just IN FRONT OF HER that fades within frame"
"a short contained crescent of steel light up IN FRONT OF HIM that fades within frame"
```

Both are detached effects thrown into open space. `that` is a relative pronoun, not a possessed
noun — the rule read "her that" as "her <noun>" and suppressed them. **That is the exact
false-negative this gate must never produce**, and it survived one round of my own reasoning; it died
only because every suppressed finding gets READ against its context before the change is kept.
Stop-list now covers relative pronouns and adverbs (`that|which|who|again|once|still|just|only|...`)
as well as conjunctions. Both effects confirmed BACK in the output.

Deliberately conservative fallout: *"war-fan open **beside her again**"* is flagged once more, because
`again` is now a function word. It is a held weapon and probably noise — **under-suppressing is the
correct policy for this gate**, so it stays.

Regression: nonexistent -> 2, real character -> 0, unchanged.

**Running total across 230 / 230b / 230c / 231 / 232: 35 -> 25 BLOCK**, two vacuous-pass holes closed,
one masking blind spot removed, and every single change proven by reading the findings it moved.
