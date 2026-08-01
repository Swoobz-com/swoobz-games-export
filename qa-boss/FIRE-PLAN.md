# FIRE PLAN — the 4 clips queued and verified fire-ready (phase 64, 2026-07-30)

All four build clean through `node qa-boss/check-prompt-sections.mjs` (108 clean / 0 problems).
**Nothing here has been fired** — the browser was never logged in to Higgsfield this session.

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
