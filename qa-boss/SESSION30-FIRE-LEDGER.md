# STANDOFF re-roll run — 2026-08-06 (session 30)

Panel of record: Seedance 2.0 · 4s · 1:1 · 720p · Bitrate Standard · Audio OFF · Unlimited ON (free).
Generate button MUST read `GenerateUnlimited`. `Generate2418` = CREDITS = never fire on that.

**Method of record — REVISED this session, see BROWSER-FIRE-PROTOCOL.md §9 and §10:**
1. Real click on the editor → `ctrl+a` → `Delete` → `computer type`, **back to back with NO
   javascript_tool call anywhere between the click and the type** (§9: a JS call — including the
   focus assertion the old protocol demanded — clears Lexical's selection anchor, and the type then
   reports FULL SUCCESS into an empty editor).
2. A long type WILL time out and WILL wedge the renderer for minutes (§10). **That is not failure.**
   Wait it out, then read the lengths. Never retype — that double-inserts.
3. Verify `domLen === lexLen === WANT` (Lexical's store, not just the DOM).
4. Re-arm Unlimited — it resets to OFF on every fire-reload.
5. Guarded fire in ONE js task: all 9 checks must pass or it does not click.
6. POST-CHECK **BY THE JOBS API, NOT BY BEAT COUNT.**
   ⛔ **The protocol's §8 beat-count test is BROKEN and I proved it this session.** It says
   "2 occurrences = editor + ONE history card = LANDED". Measured on clip 2 BEFORE it was fired:
   `body.innerText` contained the beat **twice** while the API showed **no such job at all**. One of
   the two lives inside an `<li>`, so even "is it in a card element" does not separate them — the app
   renders the current prompt somewhere that looks like a card. Trusting it would have SKIPPED clip 2
   entirely (or, in the mirror case, double-fired). Use this instead — it is authoritative:
   ```js
   const tok = await window.Clerk.session.getToken();
   const qs = ['seedance_2_0','seedance_2_unlimited','seedance_unlimited']
       .map(t=>'job_set_type='+t).join('&') + '&size=3';
   const j = await (await fetch('https://fnf-api-gw.higgsfield.ai/fnf/jobs/accessible?'+qs,
       {headers:{Authorization:'Bearer '+tok}, credentials:'include'})).json();
   // newest job: check params.prompt.length === WANT, status, and cost === null (free)
   ```
   A fired clip appears as a job whose `params.prompt.length` equals the LEN you typed and whose
   `cost` is `null`. `plen === 0` is the dropped-prompt defect.

## ⛔⛔ FINDING 8 — "AN EARLY FIRE IS LOST" IS **WRONG**. IT IS CLEANLY REFUSED, AND THE TOAST IS THE ONLY SIGNAL
Measured twice back-to-back at 14:05 on `attack_throw` v3 (LEN 8907). This corrects the protocol.

**What the app actually does.** Clicking `GenerateUnlimited` while the Unlimited slot is occupied
produces a toast and **nothing else**:

> *"You can generate 1 unlimited video, image & audio generation at a time. To use full concurrency,
> switch to credit-based generations."*

**The refusal is CLEAN and COSTS NOTHING:** verified across the newest 20 jobs — **no job was created**
(no `plen 8907` anywhere), no credits spent, the page did **NOT** reload, and **the 8907-char prompt
stayed intact in the editor**. So a "premature" fire is not a lost clip; it is a no-op you can simply
retry. That removes the main reason the old protocol treated the busy-poll as safety-critical.
⚠ A retry cannot double-fire *once you have confirmed no job exists* — confirm first, then retry.

**THE UNLIMITED LIMIT IS 1 CONCURRENT GENERATION ACCOUNT-WIDE, ACROSS VIDEO + IMAGE + AUDIO.** Not one
video — one *generation of any modality*. That is why a teammate's Unlimited image or audio job blocks
your video fire.

### ⛔ AND THE JOBS API COULD NOT SEE THE BLOCKING JOB — so the toast is authoritative
At the moment of both refusals every query I had said the lane was free:
* `job_set_type=seedance_2_0|seedance_2_unlimited|seedance_unlimited`, `size=20`, filtered
  `cost===null && status in (in_progress,queued,processing)` → **0 busy**
* the SAME endpoint with **no** `job_set_type` filter, `size=15` → **`busy: []`** — and it also dropped
  Tim's two known `in_progress` paid jobs, so the unfiltered form is **not** a superset and must not be
  trusted as one.

So `c13_noBusyUnlimited` is **necessary but NOT sufficient** — nothing available to me predicts the
refusal in advance.

### ⛔⛔ BUT THE TOAST IS **NOT** AUTHORITATIVE EITHER — IT LINGERS. (corrected 10 min later, measured)
I first wrote that the toast was the reliable signal. **That is wrong and I caught it on the next fire.**
The toast **stays on screen** after the refusal that produced it, so on the retry that SUCCEEDED the
page still read `refusedToastVisible: true` while the job existed. Believing the toast would have made
me re-fire an accepted clip — the double-fire this whole check exists to prevent.

**THE JOBS API IS THE ONLY AUTHORITY, in both directions:**
```js
const mine = jobs.filter(o => o.params.prompt.length === WANT && o.cost === null);
// mine.length === 1 -> accepted exactly once.  0 -> refused, safe to retry.  >1 -> DOUBLE FIRE.
```
Use the toast only as a *hint*, and if you want it to mean anything, **dismiss it (its `×`) BEFORE
firing** so a toast afterwards is known-fresh.

### ⛔ A CDP TIMEOUT ON THE GUARDED-FIRE CALL DOES NOT MEAN THE FIRE FAILED
Same family as the long-type timeout (§10 / trap 2.3), now confirmed on the FIRE call. My retry ran
`sleep 40s → click → sleep 4.5s` in one `javascript_tool` call; it blew the 45s
`Runtime.evaluate` ceiling and returned an ERROR — **and the click had already gone through.** The job
(`6e15a7ad`, plen 8907, cost null) was sitting in `queued`. Had I treated the error as failure and
re-fired, that would have been a genuine double-fire.
**Never put a sleep inside the fire call, and always resolve the outcome by the API, never by the
tool's return value.** (This supersedes the EIGHTH FACT's beat-count tie-break, which trap 2.2 already
proved broken.)

### ⛔ IT HAPPENED TWICE MORE — A TIMED-OUT GUARD CALL **FIRES SILENTLY**. BUILD THE `already` CHECK IN.
On the last two clips of the run the guarded-fire call timed out at 45s with NO result, and **both had
already fired** — `attack_throw_b` v5 (`db6d996e`, plen 9708) and `attack_throw` v6 (`0c0c6d78`, plen
10703), each exactly ONE job, each `cost: null`. The `Runtime.evaluate` ran to completion inside the
page; only the RESULT was lost. So a guard that times out has probably done its job.

**This is why every guard in this run carries `c7: already === 0`:**
```js
const already = jobs.filter(o => (o.params?.prompt||'').length === WANT && o.cost === null).length;
// c7: already === 0   -> refuses to fire a clip that is already queued
```
Without it, the natural response to a timeout (re-run the guard) is a **double fire**. With it, the
retry refuses harmlessly and tells you the clip is already in flight. It fired correctly twice here.
**Order of operations after ANY timeout on the fire call: query the API for `plen === WANT && cost ===
null` FIRST. 1 = done, move on. 0 = safe to retry. >1 = you double-fired.** Never re-click first.
⚠ Do NOT read these as the type auto-submitting — the type does not fire anything. It is the guard's
own `gb.click()` completing behind a lost response.

## ⛔ TIM FIRES FROM A SECOND TERMINAL — HOW TO TELL HIS JOBS FROM YOURS, AND THE GUARD HOLE IT EXPOSED
Tim confirmed it again this session (*"i ll generated in a other terminal as well make sure to not get
confused"*). It happened live at 13:33 and was caught. **Three independent discriminators — use all
three, never position in the list:**

| signal | MINE | HIS (observed) |
|---|---|---|
| **`cost`** | **`null`** (Unlimited, free) | **`3600`** (paid credits) |
| `params.prompt.length` | matches my exact typed LEN (7372-8907) | **660** |
| `params.prompt` head | `The EXACT SAME hulking stone gargoyle from the reference ima…` | `Hand-drawn 2D anime illustration, held exactly as in the ref…` |

Strongest of all: **I record the full job UUID of every fire in this ledger**, so identification is an
exact-id match, never a guess. `cost === null` is also the billing proof — his paid job ran adjacent to
mine and mine still came back `cost: null`, so the `GenerateUnlimited` label guard held.

### ⛔ THE GUARD HOLE THIS EXPOSED — the DOM busy-count does NOT see the other terminal
Measured: while his job was `in_progress` account-wide, my DOM busy-count
(`Processing|Generating|Queued|In queue|Starting` spans) read **0**. So the old
`c6_idle: busy === 0` check would have PASSED and fired into a busy serialized queue.
**Fix, now in the guard as `c13_accountIdle`:** query the jobs API inside the guard and require the
NEWEST job to be none of `in_progress` / `queued` / `processing`, whoever owns it:
```js
const newest = (await jobsApi(size=1))[0];
const acctIdle = newest.status!=='in_progress' && newest.status!=='queued' && newest.status!=='processing';
```
Protocol §6 already said *"do NOT try to fire 'around' it"* — this makes that mechanical instead of a
judgement call. I held hit v3 until his job flipped to `completed`, then fired: 13/13 checks, `cost: null`.

## ⛔ THE DOCUMENTED API POLL IS WRONG AND WOULD FIRE EARLY (session 31, measured)
`HANDOFF` SESSION 30 §1 says: *"poll the API until N is not `queued`/`processing`"*. **There is no
`processing` status.** The real sequence, observed live on clip 5 (`f547945f`):

```
queued  ->  in_progress  ->  completed
```

So `status !== 'queued' && status !== 'processing'` is **TRUE while the clip is still rendering**, and
Unlimited is SERIALIZED — an early fire is lost. **Poll for `status === 'completed'` AND a non-empty
`results.raw.url`**, never for the absence of a guessed status string. Belt-and-braces: the DOM
busy-count (`Processing|Generating|Queued|In queue|Starting` spans) read `1` correctly throughout,
so agreeing both is cheap.

⚠ Also: do NOT put a long poll loop inside one `javascript_tool` call. Anything over ~45s dies on
`Runtime.evaluate timed out` and you lose the result even though the loop keeps running in the page.
One short fetch per call.

## Pipelining (Tim, 2026-08-06): *"work in the type you r waiting for the clip"*
Generation is serialized at ~20 min/clip and the editor is FREE the whole time. So the loop is:
fire clip N → **type clip N+1's prompt while N generates** → poll until `busy===0` → re-arm
Unlimited → guarded fire. The type (the slow, wedge-prone step) is moved off the critical path
entirely, and the fire becomes instant. Kit-writing agents run underneath in parallel.

## The 12 re-rolls — every prompt pre-built and verified before the run
Prompts: `qa-boss/prompts/<char>-REROLL.md`, built with `build-prompt.mjs`, staged as files.
Defect column = the MEASURED reason v1 was rejected (see SESSION30-GATE-REPORT.md).

| # | char | state | LEN | measured defect being fixed | result |
|---|---|---|---|---|---|
| 1 | gargoyle-spear | hit | 7372 | LEFT 230px @f7 + RIGHT 66px @f3 overrun | **DONE** — API `completed`, plen 7372, cost null |
| 2 | gargoyle-spear | attack_strike_b | 7935 | stone statue PLINTH under his feet, f0→f97 | **DONE** — API `completed`, plen 7935, cost null (session 31 confirmed) |
| 3 | gargoyle-spear | attack_block | 7737 | FRONTAL whole clip, wings spread, anchor 0.431 | **FIRED** (s31) — job `41605532`, API `queued`, plen 7737 exact, cost null. 10/10 guard checks passed. |
| 4 | gargoyle-spear | attack_block_b | 7384 | LEFT 366px overrun @f12 | typing (s31) — typed WHILE clip 3 generates |
| 5 | gargoyle-spear | attack_throw | 8233 | rubble persists to last frame + LEFT 42px | queued |
| 6 | gargoyle-spear | attack_throw_b | 7690 | tiled PAVEMENT slab by last frame, fLAST 0.474 | queued |
| 7 | oni-tetsubo | special_1 | 4380 | UNKEYABLE — debris reaches all 4 frame extremes | queued (plate swap) |
| 8 | oni-tetsubo | attack_strike | 3139 | start pose broken, f0 0.629 | queued |
| 9 | oni-tetsubo | special_3 | 4160 | ends with debris on screen, fLASTall 0.536 | queued |
| 10 | lich-scythe | attack_throw | 9028 | END pose collapses, fLASTall 0.274 | queued (plate swap) |
| 11 | lich-scythe | special_1 | 10373 | END pose broken, fLASTall 0.512 | queued |
| 12 | thorn-warden | special_1 | 5007 | END pose broken, fLAST 0.359 | queued (plate swap) |

Order: all 6 gargoyle first — **the gargoyle plate is already loaded**, and the anchor swap is the
most failure-prone step in the whole protocol, so this spends exactly 3 swaps instead of 12.

---

# SESSION 31 (2026-08-06) — gargoyle-spear worked to completion, per Tim: "always finish just 1 character"

## ⛔ FINDING 1 — clip 1 (`hit`) v2 IS REJECTED: FRONTAL FROM FRAME 0. And v1 was NOT.
Harvested and measured, not eyeballed alone. `check-frontturn --plate green` over the WHOLE gargoyle
raw set gives a **bimodal f0 selfSym population** — and f0 selfSym read as an ABSOLUTE value is what
separates side-on from frontal for this character:

| f0 selfSym | clips | reading |
|---|---|---|
| **0.158** | `attack_strike_b-r2` (clip 2) | most side-on clip in the kit |
| 0.184-0.221 | ko, victory, special_1/2/3, hit **v1**, attack_strike, attack_throw, attack_throw_b, attack_block_b, attack_strike_b v1 | normal side-on |
| **0.546** | **`hit-r2` (clip 1)** | **FRONTAL** |
| **0.565** | `attack_block` v1 | FRONTAL — independently documented so in S30 §4 (anchor 0.431) |

`hit-r2` lands with the one clip S30 already proved frontal. Confirmed by eye on a f0/f24/f48/f72/f96
montage: square to camera, chest open, both wings spread. ⚠ **`hit` v1 was 0.186 — side-on. The
RE-ROLL introduced the defect**, so a re-roll can regress a state that was never broken on that axis.

## ✅ FINDING 2 — FIXED THIS SESSION. `check-frontturn` WAS STRUCTURALLY BLIND TO A CLIP FRONTAL AT f0
It baselines each clip against **its own frame 0**, so a clip frontal from the first frame has nothing
to deviate from. Proof from the gate's own output: **`attack_block` v1 — the known-frontal clip that
motivated this whole re-roll — is reported `[ ok ] run 0/97`.** It PASSES the gate while being the
defect. Same blind-spot family as the ir48 mirror-check gap the gate was built to close.
**The fix is free: compare the ABSOLUTE f0 selfSym against the character's own population median**
(0.186 here). A clip whose f0 sym is ~3x the kit median is frontal, whatever the delta says.
This is S30 §4's law generalised: **the population IS the control.**

**FIX LANDED (working tree, `qa-boss/check-frontturn.mjs`).** A new `[FRNT0]` verdict class compares each
clip's ABSOLUTE f0 selfSym against the run's own population: threshold = **kit median + 0.12**, which
for gargoyle is `0.186 + 0.12 = 0.306` (n=16) — comfortably inside the empty band between 0.221 (the
highest side-on clip) and 0.546 (the lowest frontal one). Verified on the full 16-clip gargoyle set:
it newly convicts **exactly** the two known-frontal clips and nothing else, printing
`FRONTAL AT f0: 0.565 > median 0.186 + 0.12 = 0.306 (n=16). Frame 0 IS the baseline, so the delta
signals cannot see this. VIEW f0.` `attack_block` v1 moved `[ ok ] → [FRNT0]`; every other verdict is
unchanged. The delta logic and all existing thresholds are untouched.

## ✅ FINDING 3 — the CAUSE is a single missing clause, and it is measurable in the prompt
The anti-frontal lock that actually holds is the geometric one stated INSIDE the beat:
> THE LINE OF HIS TWO SHOULDERS AND THE LINE OF HIS TWO HIPS HOLD THE SAME ANGLE TO CAMERA THEY HAVE
> IN THE REFERENCE IMAGE IN EVERY SINGLE FRAME … he may SINK and BRACE, but he never TURNS.

Correlation across the kit: `attack_strike_b` HAD it → came back 0.158 (best in kit). `hit` did NOT
(only a weak, lowercase, trailing "chest never squares up") → came back 0.546 FRONTAL. The kit's own
`attack_block` rationale already says the remedy is to state the bound "INSIDE the beat itself rather
than trust the suffix alone" — `hit` simply never got that treatment.
⚠ `hit` v2 also carried **"his back is never shown"**, a likely frontal cue: the model can satisfy
"don't show his back" + "flinch backward" by turning square to camera. Removed in v3.

**HARDENED 4 states** (lock inserted inside the beat; `hit`'s back-never-shown clause replaced with a
positive STRICT SIDE PROFILE bound). New LENs — **the old LENs are stale, rebuild before typing:**

| state | old LEN | **new LEN** |
|---|---|---|
| hit (now clip 13, v3) | 7372 | **7823** |
| attack_block_b (clip 4) | 7384 | **7745** |
| attack_throw (clip 5) | 8233 | **8594** |
| attack_throw_b (clip 6) | 7690 | **8051** |
| attack_block (clip 3) | 7737 | 7737 (already had the lock) |
| attack_strike_b (clip 2) | 7935 | 7935 (already had the lock) |

Re-verified after editing: `check-prompt-sections` repo-wide **clean=511 problems=0**.

## ⛔ FINDING 5 — THE NEW f0 CHECK CONVICTS TWO *IDLE* CLIPS ON OTHER CHARACTERS. AN IDLE IS AN ANCHOR.
Swept 203 raws across 11 characters with the fixed gate. It newly convicts **three** clips that every
delta signal in the file rated `[ ok ] run 0/97` — and two of them are **idle** clips:

| clip | f0 selfSym | kit median | bar | verified |
|---|---|---|---|---|
| `gargoyle-spear-attack_block.mp4` | 0.565 | 0.186 | 0.306 | ✅ by me |
| **`kitsune-tanto-idle-v2.mp4`** | **0.518** | 0.314 | 0.434 | ✅ by me (n=12) |
| **`eclipse-ofuda-idle.mp4`** | **0.441** | 0.237 | 0.357 | ✅ by me (n=41) |

**Eye-grade matters here and the two idles are NOT the same severity — do not conflate them:**
* `kitsune-tanto-idle-v2` and `gargoyle attack_block` are **textbook dead-square-to-camera**.
* `eclipse-ofuda-idle` is **~3/4 OPEN, not 90° frontal.** I viewed its f0 beside a peer
  (`attack-strike-v4` f0, inside the clean cluster): the idle shows the whole torso front and both
  shoulders, while the peer is tightly edge-on with one shoulder line. Its aspect is 0.35 — NARROW,
  not widened — so it is not the arms-spread frontal shape; it is an anchor that sits more open to
  camera than the kit generated against it. Real internal inconsistency, milder defect.
  ⚠ Do NOT describe eclipse as "frontal" in any downstream note; describe it as 3/4-open.

**Why this outranks a normal clip defect: the idle IS the anchor pose.** Every other clip in a kit is
generated and gated against it, so a frontal idle propagates to the whole kit and to `check-anchor-lock`'s
own reference. ⚠ **`kitsune-tanto` is decision-register #2** ("canonical look — blocks node 2; 13 raws
on disk", OPEN since S13/S8) — this is the first MEASURED evidence bearing on that decision, and it
points at the idle itself rather than the 13 raws. `eclipse-ofuda` is worse in one way: it is an
already-SHIPPED character (12 shipped clips), so this is a shipped-anchor finding.
**Neither touched** — different characters, and Tim's rule is one at a time. Do not fold these into
gargoyle's work; they are their own decisions.

### Honest limits of the new check (from the implementer, and they matter)
* **It CONVICTS, it never CLEARS.** A LOW f0 selfSym is NOT evidence of a side profile — a prop held
  out to the side can dominate the silhouette and mask a square torso (`lady-kurotachi-strike-b-v2`
  reads 0.188, inside the clean cluster, while arguably as square as the 0.544 v1 this convicts).
* **`[NOPOP]` does not change the exit code.** A single-clip run has no population, so it still
  **exits 0** with a banner — in a `&&` chain that is a PASS. Residual vacuous-pass surface: always
  pass the whole kit, never one clip.
* The threshold is the gate's own `DEFAULTS.symMargin` (0.12, phase-264), **not** fitted to gargoyle's
  gap, and it deliberately ignores `--sym-margin` so a loose flag cannot drag the bar onto the median.
  Worst clearance across 11 kits: 0.081 on the correct side, 0.084 on the convicted side.
* Four more clips fire but change no verdict (already `[FRONT]`): `gargoyle-hit-r2`,
  `hollow-pale-special-2`, `ir37-pink-tessen-victory`, `lady-kurotachi-strike-b`.
* ⚠ **`sora-yari`'s raws are a MAGENTA plate** and the gate header's magenta list does not say so —
  running them `--plate green` inverts all 10 to 100% fill and refuses at exit 2. Doc gap to fix.
* I over-specified my own brief: I expected `hit-r2` to be a NEW conviction; it was already `[FRONT]`
  from its mid-clip run (3/97 @f76). Only `attack_block` actually moved tag.

## ⚠ PRE-FLIGHT FOR THE NEXT CHARACTERS — 4 of the 12 re-rolls still have NO stance lock
Audited every staged prompt for the clause that proved decisive (`grep -c "LINE OF H[IE][SR] TWO SHOULDERS"`):

| kit | states | shoulderHipLock |
|---|---|---|
| gargoyle-spear | all 6 | **1** (hardened this session) |
| lich-scythe | attack_throw, special_1 | **1** (already had it) |
| **oni-tetsubo** | **attack_strike, special_1, special_3** | **0 ⚠** |
| **thorn-warden** | **special_1** | **0 ⚠** |

Deliberately NOT edited — Tim's rule is one character at a time, and oni/thorn need per-character
wording (the gargoyle clause is written "his"; check the pronoun and the character's own geometry
before pasting it). **Do this audit BEFORE firing oni or thorn**, and apply the same audit to the 6
fire-ready Gundam kits. Caveat on strength of evidence: oni's and thorn's re-roll defects are END-pose
collapse and debris, and their v1 clips were NOT frontal — so the frontal risk there is speculative,
not measured. But `hit` is proof that a re-roll can flip an axis nobody was watching.

## ⛔⛔ FINDING 9 — `attack_throw A` IS **BLOCKED ON A DESIGN DECISION**, NOT ON ANOTHER PROMPT TWEAK
I am stopping this state after two failed re-rolls rather than burning a third generation, because the
evidence says the beat is fighting itself and the fix is Tim's call, not a mechanical one.

**What the frames show (f0 / f38 / f42, viewed):**
1. **A FLAGSTONE SLAB IS UNDER HIS FEET FROM FRAME 0.** That is the 26.59% f0 floor-band vs ~15.8% on
   every other gargoyle clip. **The prompt asks for it** — *"the ONLY thing his weapon touches is the
   bare flagstone floor"* and it rams "the flagstone". The model complied. On a chroma plate.
2. **The debris is HEAD-SIZED**, against a prompt that says *"each chip no bigger than one of his own
   toe-claws"*, and it is flung **far above his knee** against *"rising no higher than his own knee"*.
3. Those oversized chunks are what breach **TOP (96px), LEFT (6px) and RIGHT (50px)**.

**Why another prompt pass is the wrong move.** v2 and v3 both failed on debris containment, v3 worse,
and v3 already carried FIVE separate debris bounds (count=5, size≤toe-claw, height≤knee, right≤leading
foot's claws, plus an absolute no-edge-contact clause). Adding a sixth is not a plan. The state is
asking for a violent floor-ram with shattering stone **on a green screen**, and the model escalates the
debris every time.

**The kit already contains the pattern that WORKS — twice.** Both are measured, this session:
* `attack_strike_b` (STRIKE B) rams the butt-spike DOWN but explicitly hits nothing: *"it does NOT bury
  itself, does NOT crack anything, does NOT strike any surface, and nothing bursts, chips or breaks
  loose"* → extra-objects **CLEAN exit 0**, containment **CLEAR**, best-in-kit stance 0.158. ✅
* `attack_throw_b` (THROW B) bans every floor and has **no debris beat at all** → floor-growth
  −0.03pp, extra-objects CLEAN (1 blob), containment CLEAR. ✅ (its only failure was the leap)

### ✅ RESOLVED — TIM RULED (2026-08-06): **THE RAM STOPS ON NOTHING.** Rewritten as v4, LEN **9139**.
He took the recommendation. `attack_throw A` is now written on the STRIKE B pattern:
* every floor clause deleted; `HE STANDS ON NOTHING` stated at the FIRST frame **and** the LAST
* `the ONLY thing his weapon touches is the bare flagstone floor` → **`HIS WEAPON TOUCHES NOTHING AT ALL`**
* the ram `RAMS the barbed head DOWN THROUGH EMPTY AIR until it STOPS SHARPLY` +
  `IT DOES NOT BURY ITSELF, DOES NOT CRACK ANYTHING, DOES NOT STRIKE ANY SURFACE`
* the entire debris beat deleted → **`THERE IS NO DEBRIS IN THIS CLIP AT ALL`**
* the impact re-attributed: **`THE DEAD STOP AND THE HOLD ARE WHAT CARRY THE IMPACT`** — weight read in
  the abrupt stop and the strain of the hold, never in flying stone
* the move keeps its name and read; it is no longer literally breaking a floor.

Audited on the BUILT prompt, not the kit: `bare flagstone floor` 0, `EXACTLY FIVE chips` 0, `buried head`
0, `into the flagstone` 0. Every surviving mention of chip/shard/rubble/flagstone is inside a NEGATION,
and the specials' debris add-on is NOT injected (`SOLID MATERIAL` 0). Gate: **clean=511 problems=0**.

**The original recommendation, kept for provenance:** rewrite THROW A the way STRIKE B is written — the
ram **stops on nothing**, no floor, no chips, the weight and the hold carry the impact instead of
shattering stone. It keeps the move's read (a crushing downward ram) and deletes the only thing that
has ever failed on it. The cost is that "floor-ram" stops literally breaking a floor.
**Alternatives if he wants the debris kept:** (a) keep the beat and accept edge contact for this one
state, tightening only the feather in post; (b) re-plate/re-frame wider so the debris has room —
expensive and affects every clip; (c) generate the ram and the debris as separate passes and composite.
~~Do not fire THROW A again until this is answered.~~ **ANSWERED — see the RESOLVED block above.
THROW A v4 (LEN 9139) is built, audited and fire-ready; it fires as soon as the Unlimited lane frees.**

## ⚠ SUPERSEDED BY FINDING 9 — the original flag on `attack_throw A`'s floor
Its acting line says *"the ONLY thing his weapon touches is the bare flagstone floor"* and it rams the
head into "the flagstone", while its sibling `attack_throw_b` was re-rolled specifically to BAN any
floor ("NO floor, NO tiles, NO flagstones, NO paving"). Those two are in direct tension inside one
kit. v1's rejection was rubble-persisting + LEFT 42px, not "a floor appeared", so the model evidently
did not draw a floor plane — but the language is a live risk on a green plate. **Left as written; I
only added the stance lock. Tim's call whether throw A should lose its floor too.**

## ✅ FINDING 3b — `hit` v2's TWO gate failures are ONE root cause, so the stance lock should fix both
Objective gate runs on the raws (v1 vs v2), plus a side-by-side frame read:

| clip | containment | front-turn f0 | extra-objects |
|---|---|---|---|
| hit **v1** | exit 1 — **LEFT 222px @f7 · RIGHT 62px @f3** | 0.186 (side-on) | — |
| hit **v2 (r2)** | exit 1 — **RIGHT 62px @f24** only | **0.546 FRONTAL** | — |
| attack_block **v1** | exit 0 CLEAR | 0.565 FRONTAL | CLEAN |
| **attack_block-r2** | **exit 0 CLEAR** | **0.143** | **CLEAN** |
| attack_strike_b **v1** | exit 0 CLEAR | 0.221 | ⛔ **exit 1 EXTRA OBJECT** (the plinth) |
| **attack_strike_b-r2** | **exit 0 CLEAR** | **0.158** | **CLEAN exit 0** |

So the v2 re-roll DID fix `hit`'s primary defect — the **LEFT 222px overrun is gone** — but it went
frontal, and a RIGHT 62px overrun remains. Frame f24 read side-by-side against `attack_block-r2` f24
shows why they are the SAME defect: **frontal ⇒ the right wing SPREADS WIDE OPEN, and that spread wing
is what crosses the right edge.** hit-r2 is also rendered noticeably LARGER / off-anchor than the
accepted clip. One root cause, two gate failures. **The v3 stance lock should therefore close the
containment failure as a side effect** — but re-run BOTH gates, do not assume it.

⚠ Note the plinth fix is now OBJECTIVELY confirmed, not just eyeballed: `check-extra-objects` moved
`attack_strike_b` from **exit 1 "EXTRA OBJECT PRESENT"** to **exit 0 "CLEAN"**.

## ⛔ FINDING 4 — TWO defects in `key-s30-harvest.mjs`, and BOTH have already caused silent loss
Found while planning the re-key. Both verified by me directly, not taken on report.

**4a. The `rederive-cal` call is a COMPLETE NO-OP, for every character.** `key-s30-harvest.mjs:162-170`
spawns `rederive-cal.mjs`, then gates on **`if (o.rederived)`** — but that key **has never existed**;
the tool emits **`cal`** (`rederive-cal.mjs:157`, and `grep -c rederived` on the tool = **0**). It also
never reads `rd.status`. So even a fully SUCCESSFUL re-derivation is discarded and the stale emitted
cal is kept, silently. Measured across every staged summary: **26 of 26 rows have `cal === emittedCal`
and `calDrift: null`.** No clip in session 30's keying batch has EVER used a re-derived cal.
⚠ This — not a missing keyed still — is the real cause of "cal falls back to the keyer's emitted
value". **Decision-register #14's stated mechanism is wrong** (see 4c).

**4b. `--state` TRUNCATES the whole summary, and it already destroyed 8 rows + a refusal record.**
`:188` does `fs.writeFileSync(sumPath, {ok: summary, failed: failures})` with ONLY the rows processed
in that run. Live proof on disk right now:
* `qa-boss/staged-s30/oni-tetsubo/webm/` holds **9 keyed clips**.
* `oni-tetsubo.summary.json` records **1 row (`special_3`) and `failed: []`.**
So a later single-state run erased 8 keyed rows **and** the record of the `special_1` hard refusal that
S30 §4 documents as the phase-271 keyer's first live catch. Anyone reading that summary as the record
of what was keyed gets two false answers. **Fix: merge on write (read the existing summary, replace
only the states in this run). Until then, NEVER run `--state` — always re-key the whole `--char`.**
(The formats also diverge: 4 characters are a bare ARRAY, oni is `{ok,failed}` — an older writer.)

**4c. Decision-register #14 is FALSE AS WRITTEN and must be rewritten, not just closed.**
`rederive-cal.mjs` does **not** exit 0 on the refusal the register names — it exits **2**, and it did
so at S30's own commit `7d76728`. The guard landed in `69101ff` (phase 269), one phase BEFORE. The
register text matches `TOOLCHAIN-AUDIT.md:135-139`'s description of the **pre-269** tool word for word,
so it was transcribed from a stale audit entry rather than measured. `TOOLCHAIN-AUDIT.md:27` still
lists §6 as "STILL OPEN" and is what propagated the false finding into S30.
**A REAL exit-0 vacuous pass did exist in that file though, on a path the register misses:** the
`--emitted` comparison printed a confident `"DRIFTED - use the re-derived cal"` **at exit 0** on
malformed input — `{}`, a partial cal, `null`, or non-numeric fields — because `cal.h - undefined` is
NaN, `NaN <= 0.2` is false, so the DRIFTED branch is the else, and `JSON.stringify` renders NaN as
`null` so the drift column merely looks "unmeasured". One case FABRICATED a delta of 50.00 out of a
null. That verdict is hand-transcribed into `src/characters/<char>.ts` as `cal:`. **Now guarded, exit 2**
(convention taken from `pad-anchor-plate.mjs:76` — "usage error, NOT 1; 1 is reserved for a real
detected failure"). Success paths still exit 0, including a legitimate DRIFTED verdict.

## ⛔ FINDING 6 — A "NEVER FURTHER RIGHT THAN IN THE REFERENCE IMAGE" BOUND IS LOOSER THAN THE FRAME
This is a **structural** prompt defect, not a model miss, and it explains clip 5 and probably clip 1's
residual RIGHT 62px too.

The anchor plate is **1536x1536** with wide green margins; the generated clip is **960x960 and framed
TIGHTER on the character**. So a bound expressed relative to the REFERENCE IMAGE ("the barbed HEAD
never travels further toward screen-right than it does in the reference image") permits travel out to
wherever that feature sits in the PLATE — roughly 85% of the plate's width — which, after the tighter
crop, is **at or past the clip's own right edge.** The bound is satisfied and the clip still overruns.
Debris inherits the same loose bound: clip 5's chips were bounded by "never further toward screen-right
than the barbed head sits in the reference image", and one landed at x=959.

**THE RULE: bound moving parts and debris to the CHARACTER'S OWN BODY, never to the reference frame,
and add an ABSOLUTE frame-edge ban.** Body-relative bounds ("never past his leading foot's claws")
survive any re-crop; frame-relative ones do not. Applied to `attack_throw A` v3 (LEN 8594 → **8907**):

* `never further toward screen-right than the barbed head sits in the reference image`
  → `never further toward screen-right than **HIS OWN LEADING FOOT'S CLAWS**`
* added: `NO CHIP, SHARD OR PIECE OF BROKEN STONE EVER TOUCHES OR CROSSES THE RIGHT, LEFT OR TOP EDGE
  OF THE FRAME AT ANY MOMENT ... the strip of green along each of those three edges stays completely
  empty and unbroken from the first frame to the last.`

⚠ The other five gargoyle states still carry reference-relative spear bounds in the SHARED SUFFIX.
They passed containment, so I did **not** rewrite the shared suffix — that would touch every state in
the kit and every other kit built on it. Flagged for Tim as a kit-wide question, not changed.

## ⛔⛔ FINDING 7 — THE HEADLINE: **3 OF 3 RE-ROLLS FIXED THEIR NAMED DEFECT AND BROKE A DIFFERENT ONE**
This is the most important result of the session and it is a process finding, not a clip finding.

| clip | named v1 defect | FIXED? | NEW defect the re-roll introduced |
|---|---|---|---|
| `hit` | LEFT 222px overrun | ✅ gone | ⛔ went **FRONTAL** (f0 sym 0.186 → 0.546) |
| `attack_throw` | rubble persists + LEFT 34px | ✅ both gone | ⛔ **debris escaped the RIGHT edge** (72px @f40, ground level) |
| `attack_throw_b` | pavement slab grew in | ✅ gone (+13.65pp → −0.03pp) | ⛔ **LEAPT 82px off the ground** @f48 |

**Every single re-roll honoured the newly-emphasised constraint and relaxed one that v1 already
satisfied.** Had I gated only on the defect each re-roll was written to fix — the obvious, cheap thing
to do — I would have accepted **three defective clips** and only found out after wiring.
**LAW: every re-roll is gated on the FULL suite, never on its own target defect.** The suite caught a
regression 3 times out of 3; that is not luck, it is the base rate for this pipeline.
(Repo memory already names the general pattern: `optimiser-destroys-what-it-doesnt-measure`.)

Corollary on prompt authoring: for `hit` and `attack_throw_b` the violated bound was **already in the
prompt** — `attack_throw_b` says verbatim "HIS FEET STAY FLAT ON THE GROUND FOR THE ENTIRE CLIP - he
never jumps, never leaps, never hops" and it leapt anyway. A bound in the SHARED SUFFIX is weaker than
the beat's own verbs: "**erupts** STRAIGHT UP" beat it. v3 changes the VERB ("DRIVES") and restates the
bound INSIDE the beat with a per-frame test ("at the single highest moment of the rise both feet are
STILL FLAT on the same green"). Same lesson as the stance lock in FINDING 3 — **put the bound in the
beat, and make it checkable frame-by-frame, not adjectival.**

## ⛔ FINDING 7b — A MID-CLIP LEAP HAD NO DETECTOR AT ALL. New gate: `qa-boss/check-feet-planted.mjs`
Clip 6 passed **every** gate in the acceptance basis while being 82px airborne:
* `check-containment` exit 0 — a leap moves AWAY from the edges, never toward them
* `check-extra-objects` exit 0 — one blob; a leap adds no second object
* `check-floor-growth` exit 0 — it compares f0 vs fLAST only, and the leap is mid-clip and returns
* `check-frontturn` — its two signals are SYMMETRY and ASPECT, neither is ELEVATION
* `check-anchor-lock` would also miss it — the clip returns to the anchor perfectly

Signal: the BOTTOM row of non-plate pixels per frame, relative to the clip's own f0 (no anchor file, no
calibration). Control-validated before use:

| clip | f0 bottom | worst lift | verdict |
|---|---|---|---|
| **`attack_throw_b-r2` (known leap)** | y=943 | **82px @f48** | ⛔ LEFT THE GROUND (exit 1) |
| `attack_block-r2` ✅ | y=944 | 1px | planted (exit 0) |
| `attack_block_b-r2` ✅ | y=944 | 1px | planted (exit 0) |
| `attack_strike_b-r2` ✅ | y=877 | 0px | planted (exit 0) |
| `ko` | — | — | EXEMPT (collapses by spec), exit 0 |

The leap is a clean SINGLE-FRAME spike: `f0:0 f6:0 … f42:0 f48:82 f54:0 … f96:0`. Bare run exits 2.
⚠ Being f0-relative it is blind to a fighter already airborne AT f0 — the same trap as FINDING 2.

## ⛔ FINDING 10 — A CLIP CAN START OFF-ANCHOR AND PASS EVERYTHING. New gate: `qa-boss/check-anchor-pair.mjs`
`attack_throw_b` v3 passed containment (exit 0), extra-objects (CLEAN, 1 blob), feet-planted
("planted"), floor-growth's own threshold and the chroma check — while its **FIRST FRAME did not match
its own last frame**: f0 `y[210..902] h=693` vs fLAST `y[312..943] h=632`. It begins standing taller and
higher than it settles, so it JUMPS the instant it starts playing — the exact defect anchor-locking
exists to prevent. `check-anchor-lock` cannot cover this for gargoyle: `gate-control` reports the
character **UNUSABLE** there (only `idle.webm` shipped ⇒ empty f0 population).

**New gate compares the clip against ITSELF** — IoU of the non-plate bbox at f0 vs the last frame. No
anchor file, no shipped population, so it works on a character with zero wired clips.

| clip | anchor-pair IoU | dTop / dBot / dH |
|---|---|---|
| `attack_strike_b-r2` ✅ | **1.000** | 0 / 0 / 0 |
| `hit-r2` ✅ | **0.999** | 0 / 0 / 0 |
| `attack_block-r2` ✅ | **0.999** | 0 / −1 / −1 |
| `attack_block_b-r2` ✅ | **0.994** | −2 / −1 / +1 |
| **`attack_throw_b-r2` v3** ⛔ | **0.791** | **+102 / +41 / −61** |
| `ko` | EXEMPT (ends down by spec) | — |

Fail bar 0.95 sits in the empty gap between 0.994 and 0.791. Bare run exits 2, drift exits 1.

⚠ **SCOPE — this is a WITHIN-clip test, not a cross-clip one.** Accepted clips legitimately differ from
EACH OTHER (`strike_b` sits at y[68..877] while `hit` sits at y[312..943]) because the model reframes
per state; the keyer's `cal` (h/bottom/left) is what normalises that downstream. Do not read cross-clip
framing agreement off this tool.

### ⚠ AND IT EXPOSED A CONFOUND IN MY OWN floor-growth GATE — read them together
`check-floor-growth` reported `f0 8.99% → fLAST 15.79%` = **+6.80pp "FLOOR GREW IN"** on that clip. **No
floor grew.** 15.79% is the kit's NORMAL; it is **f0 that was anomalous** (8.99%), because an off-anchor
f0 puts less of the body in the bottom band. The gate's stated assumption — "both frames are the same
anchor pose, so the subject contributes ~equally" — was violated. **So a floor-growth flag must be read
alongside the anchor-pair IoU: if IoU < 0.95, the floor verdict is unreliable and the real defect is
the off-anchor frame.** Fixing the cause (v4 pins f0 to the reference stance) should clear both.

## ⛔⛔ FINDING 11 — THE REAL SPLIT IS **CONTAINED ACTIONS PASS, EXPLOSIVE ACTIONS DON'T**
After 8 re-roll generations on 6 states, the pattern is not random and it is not about which bound you
write. Sort the kit by what the BEAT ASKS THE BODY TO DO:

| state | the action | generations | outcome |
|---|---|---|---|
| `attack_strike_b` | butt-spike bite — a **fold and sink**, hits nothing | 1 | ✅ PASS |
| `attack_block` | shaft brace — a **sink and hold** | 1 | ✅ PASS |
| `attack_block_b` | pauldron guard — a **hunch and hold** | 1 | ✅ PASS |
| `hit` | small flinch — a **twitch and settle** | 2 | ✅ PASS |
| `attack_throw` | floor-ram — a **full-body wrench + impact** | **5** | ⛔ never passed |
| `attack_throw_b` | horn toss — a **coil + explosive eruption** | **4** | ⛔ never passed |

**Every CONTAINED beat passed first or second try. Both EXPLOSIVE beats have never passed.** And each
explosive failure lands somewhere different at the ACTION PEAK — debris out the right, debris out three
edges, an 82px leap, an off-anchor f0, a spear overhead, a wing 268px out the left. The bounds are not
being ignored at random; **a big full-body action simply exceeds this framing, and the model relieves
the pressure through whichever axis is least pinned that round.** Note also that the explosive clips
render the figure LARGER at the peak (throw_b f48) or overall (throw A f0 h=720 vs the kit's 632), so
they have the least margin exactly when they need the most.

### ✅✅ FINDING 11 IS NOW CONFIRMED BY EXPERIMENT — the contained rewrite PASSED FIRST TRY
`attack_throw_b` had failed 4 times in a row (pavement · 82px leap · off-anchor f0 · wing 268px out the
left), each time on a different axis, each time after a fix that worked on its own target. Tim ruled
CONTAINED RE-CHOREOGRAPHY; the rise was deleted and the jab moved to head-and-neck-only.
**v5 passed EVERY gate on the first attempt** — containment exit 0, anchor-pair 0.997, feet 1px,
floor −0.04pp, extra-objects CLEAN. That is the prediction of FINDING 11 tested and confirmed: the
problem was never which bound was written, it was the beat's ambition against the frame.
⚠ And the fear that "contained" would mean "static" did not materialise: the horn-jab still reads
clearly by eye (dip → snap with jaw open → settle). **Prefer this shape for every future explosive beat.**

**THIS IS THE ACTIONABLE CONCLUSION, and it is a design one:** stop re-bounding the throw states and
RE-CHOREOGRAPH them as contained beats, the way the four passing states are written — the impact read
in a dead stop and a strained hold rather than in travel, debris, or a big silhouette change. Tim's
THROW A ruling already moved half-way there (it deleted the floor and the debris, and both stayed
deleted); the remaining half is to stop the BODY exploding too.
⚠ Do not read this as "the prompts are wrong". Each individual fix WORKED on its own target, every
time, and is still holding in the next version. The problem is the beat's ambition versus the frame.

## ⛔⛔ FINDING 12 — ALL SIX GEOMETRIC GATES PASSED A CLIP THAT BREAKS FOUR EXPLICIT CHOREOGRAPHY BOUNDS
`attack_throw` **v7** (job `35fb42e7`, LEN 11286) is the cleanest gate sheet of the entire run:

| gate | v5 | v6 | **v7** |
|---|---|---|---|
| feet-planted | 58px ⛔ | 61px ⛔ | **1px planted ✅** |
| containment | CLEAN | TOP 24 · LEFT 78 ⛔ | **exit 0 CLEAN ✅** |
| anchor-pair | 0.997 | 0.968 | **0.998 ✅** |
| floor-growth | −0.05pp | −0.37pp | **−0.03pp ✅** |
| extra-objects | CLEAN | CLEAN | **CLEAN ✅** |

The contained first third did exactly what it was written to do — f24 shows the body DEAD STILL with only
the spear turning, the 61px wind-up lift is gone, and the framing came back into the kit's normal band
(f0 h=633 vs v6's 712). **Six gates, all green.**

**AND THE MOVE IS STILL WRONG.** Zoomed on f48: the spear is **FULLY VERTICAL with the barbed head and
wing-vanes at the TOP**, butt down near the ground, **gripped in ONE hand**. That breaks four bounds the
prompt states explicitly and in capitals:
* `THE SPEAR IS NEVER SWUNG FULLY VERTICAL`
* `NEVER PLANTED BUTT-DOWN LIKE A STANDARD`
* `THE BARBED HEAD IS THE END THAT GOES DOWN, AND IT STAYS DOWN … the LOWEST part of the spear`
* `BOTH of his stone hands stay closed on the shaft in every single frame`

**THE LESSON: the geometric gates measure WHERE things are, never WHAT THE MOVE IS.** containment,
feet-planted, floor-growth, extra-objects, anchor-pair and chroma are all satisfied by a vertical
head-up spear raise, because it stays inside the frame, keeps the feet down, adds no object, grows no
floor and returns to the anchor. A clip can be gate-perfect and be a different move entirely.
**This is why acceptance step 6 — READ THE MONTAGE BY EYE FOR THE STATE'S OWN ACTING BEAT — is not
optional and can never be automated away by adding more geometric gates.** It is the only check that
caught this, and it caught it after six gates said ship.

### ⛔ VERDICT: `attack_throw` IS PARKED. GARGOYLE SHIPS 5/6.
Seven generations, seven different failures: debris-persist+drift · debris out the RIGHT · debris out
THREE edges + a slab · spear overhead · feet 58px · feet 61px · **spear vertical head-up**. Tim's two
rulings both held permanently once made (no floor and no debris never came back, in v4-v7). But the
state kept relocating its defect, and I committed to v7 being the last attempt. **No 8th.**
The staged/keyed tree therefore keeps `attack_throw`'s **v1** clip, whose own known defects are rubble
persisting to the last frame + LEFT 34px — recorded here so nobody reads that keyed clip as accepted.
**To resume this state later:** the beat needs re-choreographing so the ram's END STATE is unambiguous
without a floor to hit (a head-down hold against nothing is evidently hard to specify), or it needs
the two-pass/composite route. Its prompt is at v7 (LEN 11286) with every other bound already proven.

## 📐 THE ACCEPTANCE BASIS FOR GARGOYLE — stated explicitly, because the usual gate CANNOT be used
`gate-control.mjs` (new this session) reports **gargoyle-spear as UNUSABLE for `check-anchor-lock`**:
only `idle.webm` is shipped under `public/assets/characters/gargoyle-spear/`, so the f0 population is
EMPTY and idle's own 1.000 is a tautology. There is no accepted-clip control for this character, which
is exactly the condition S30 §4 says must stop you trusting a per-character verdict.

So gargoyle's re-rolls are accepted on this basis instead, all of it measured on the RAWS:
1. **`check-frontturn` f0 selfSym read as an ABSOLUTE value against the 14-clip kit population** (the
   FINDING 2 method — the delta test alone cannot see a constant frontal pose).
2. **`scripts/check-containment.mjs --plate green`** — must be exit 0 CLEAR (6px contiguous on
   TOP/LEFT/RIGHT; bottom is expected and exempt).
3. **`qa-boss/check-extra-objects.mjs`** — must be exit 0 CLEAN (this is what caught the plinth).
4. **Chroma sampled at BOTH top corners on f0 AND f96** — the plate must hold, no scene invention.
5. **ffprobe exact**: 960x960, 24fps, 97 frames, 4.041667s.
6. **A f0/f24/f48/f72/f96 montage read by eye** for anchor return and the state's own acting beat —
   because the gates' own docs say a flag is a reason to LOOK, never a verdict.
7. **`qa-boss/check-floor-growth.mjs` — NEW this session, and it closes a MEASURED hole in 1-6.**
8. **`qa-boss/check-feet-planted.mjs` — NEW this session (FINDING 7b), the only detector for a leap.**
9. **`qa-boss/check-anchor-pair.mjs` — NEW this session (FINDING 10), f0-vs-fLAST bbox IoU, fail <0.95.
   The only detector for a clip that STARTS off-anchor when `check-anchor-lock` is unusable.**

⚠ **READ 7 AND 9 TOGETHER.** A floor-growth flag is only meaningful when anchor-pair IoU ≥ 0.95; below
that, an off-anchor f0 confounds the band delta and the real defect is the frame, not a floor.

### ⛔ Why gate 7 had to exist: a grown-in floor is invisible to BOTH gates 2 and 3
`attack_throw_b` **v1 grew a tiled flagstone floor by the last frame** (its documented defect,
anchor fLAST 0.474) and yet:
* `check-extra-objects` → **exit 0 CLEAN** (the floor is ATTACHED to the footprint, so it reads as ONE object)
* `check-containment` → **exit 0 CLEAR** (it builds no contiguous run at TOP/LEFT/RIGHT)

It was caught ONLY by `check-anchor-lock`'s fLAST — the one gate `gate-control` says is **UNUSABLE for
gargoyle**. So on this character the floor defect had NO detector at all. Clips 5 and 6 are precisely
the floor/rubble states, so I built one: it measures the NON-PLATE pixel share of the bottom 28% band
at f0 vs fLAST. Both frames are the same anchor pose, so the subject contributes ~equally and a floor
does not. Control-validated before use:

| clip | band f0 → fLAST | delta | verdict |
|---|---|---|---|
| **`attack_throw_b` v1 (KNOWN pavement)** | 15.80% → 29.44% | **+13.65pp** | **FLOOR GREW IN** ✓ caught |
| `attack_throw` v1 (rubble persists) | 18.25% → 19.91% | +1.66pp | clean (rubble is extra-objects' job — it exits 1 there) |
| `attack_strike_b` v1 (plinth, CONSTANT from f0) | 21.10% → 22.71% | +1.62pp | clean — correct: a CONSTANT plinth is not GROWTH, extra-objects catches it |
| `attack_block-r2` ✅ | 12.90% → 12.86% | **−0.03pp** | clean |
| `attack_block_b-r2` ✅ | 15.80% → 15.78% | **−0.02pp** | clean |
| `attack_strike_b-r2` ✅ | 8.14% → 8.13% | **−0.01pp** | clean |

Bar at +6pp sits in an empty band between 1.66 and 13.65. Exit contract matches repo convention:
bare run **2**, floor detected **1**, clean **0**. Bonus signal: the accepted clips' ±0.03pp means f0
and fLAST are near pixel-identical in background composition — an independent anchor-return check.
⚠ It is a GROWTH detector by construction, so it cannot see a defect present from f0 (the same
self-baselining trap as FINDING 2) — pair it with extra-objects, which catches the constant case.

⚠ Anything requiring the keyed tree (`check-anchor-lock`, `check-plate-retention`, `rederive-cal`,
`check-facing`) is deferred to after the re-key, and `check-anchor-lock`'s gargoyle verdict must be
read as UNUSABLE rather than as a pass or a fail.

## Clip results so far
| # | state | LEN fired | verdict |
|---|---|---|---|
| 1 | hit | 7372 | ⛔ **REJECT — FRONTAL, and it fails containment too.** f0 sym 0.546. `check-containment` **exit 1: RIGHT 62px @f24**. Re-roll as clip 13 @ LEN 7823. |
| 2 | attack_strike_b | 7935 | ✅ **PASS** — PLINTH GONE (clean green under his feet f0→f96), side-on 0.158, returns to anchor. Its `[FRONT]` flag is the gate's own documented SINK/FOLD false positive, annotated as such. |
| 3 | attack_block | 7737 | ✅ **PASS — and it CONFIRMS the hypothesis.** Job `41605532`. **f0 selfSym 0.565 (v1, FRONTAL) → 0.143 (v2)** — now the MOST side-on clip in the whole kit. Gate `[ ok ] run 0/97`, exit 0. By eye: strict side profile all 5 sampled frames, wings FOLDED (v1 had them spread wide), spear on the shallow diagonal and never horizontal (the third v1 defect), braced crouch at f48, returns to the anchor at f96. All THREE v1 defects fixed at once. |
| 4 | attack_block_b | **7745** | ✅ **PASS** (hardened) — job `0aae6360`. **containment exit 0 CLEAR — the v1 LEFT 366px overrun is GONE.** extra-objects CLEAN exit 0, chroma held f0+f96, f0 sym **0.186** (exactly the kit median). Its `[FRONT]` flag is the SINK/FOLD confound (0.186→0.462, aspect 1.10→1.74) — confirmed benign by eye: the hunched pauldron guard reads exactly as prompted, wings stay INBOARD, spear drops to the low dead carry, returns to anchor at f96. |
| 5 | attack_throw | **8594** | ⛔ **REJECT — but BOTH v1 defects were fixed.** Job `f547945f`. ✅ floor-growth **−0.05pp clean**, ✅ **last frame CLEAN** (right edge 0px, bbox x[130..828] fully inside — the "rubble persists" defect is GONE), ✅ LEFT edge 0px (v1's LEFT 34px gone), ✅ chroma held. ⛔ **containment exit 1: RIGHT 70px @f40**, and I measured WHO: col959 has a 72px run at **y836-907 — ground level**, bbox reaches x=959. That is a **DEBRIS CHUNK escaping the right edge**, not the body. extra-objects exit 1 = max 3 blobs @f20 sizes [42322 body, 1021, 593] — the two small ones are the INTENDED flagstone chips. Re-roll as **v3 @ LEN 8907**. |
| 6 | attack_throw_b | **8051** | ⛔ **REJECT — HE LEAPT.** Job `214b5523`. ✅ **floor-growth −0.03pp — the v1 PAVEMENT SLAB IS GONE** (v1 was +13.65pp), ✅ containment exit 0, ✅ extra-objects exit 0 CLEAN (1 blob, no debris at all), ✅ chroma held, ✅ perfect anchor return. ⛔ **feet left the ground 82px @f48** — bbox bottom 943 on every sampled frame except f48 (861). Violates its own emphasised bound "he never jumps, never leaps, never hops". **NO EXISTING GATE CAUGHT THIS** (see FINDING 7). Re-roll as **v3 @ LEN 8542**. |
| 13 | hit **v3** | **7823** | ✅✅ **PASS — ACCEPTED.** Job `6bd01740`, cost null. **f0 selfSym 0.546 (v2 FRONTAL) → 0.185** = the kit median exactly; gate `[ ok ] run 0/97`, no FRNT0. ✅ containment **exit 0** (v2's RIGHT 62px GONE — one stance fix closed both failures, as predicted in FINDING 3b), ✅ feet-planted **0px**, ✅ floor-growth −0.04pp, ✅ extra-objects CLEAN (1 blob), ✅ chroma held. By eye: strict side profile all 5 frames, wings folded throughout, small contained flinch, clean anchor return. |
| 14 | attack_throw **v3** | **8907** | ⛔⛔ **REJECT — WORSE THAN v2. ⛔ BLOCKED, NEEDS TIM'S DESIGN RULING (see FINDING 9).** Job `6e15a7ad`. containment **exit 1 on THREE edges**: `TOP 96px @f42 (x816-911) · LEFT 6px @f40 · RIGHT 50px @f38 (y678-727)` — v2 breached only RIGHT. ✅ feet-planted 0px, ✅ chroma held. My body-relative debris bound + absolute frame-edge ban did **NOT** hold. |
| 15 | attack_throw_b **v3** | **8542** | ⛔ **REJECT — the LEAP IS FIXED but f0 came back OFF-ANCHOR.** Job `392e3b13`. ✅ feet-planted worst lift **+27px (WATCH, exit 0)** vs v2's 82px ⇒ anti-jump bound WORKED. ✅ containment exit 0, ✅ extra-objects CLEAN (1 blob), ✅ chroma held. ⛔ **anchor-pair IoU 0.791** — f0 `y[210..902] h=693` vs fLAST `y[312..943] h=632`: dTop **+102**, dBot **+41**, dH **−61**. The clip STARTS standing taller/higher than it settles, so it would visibly JUMP on play. Re-roll as **v4 @ LEN 9254**. |
| 16 | attack_throw **v4** | **9139** | ⛔ **REJECT — but TIM'S RULING WORKED ON BOTH ITS TARGETS.** Job `8150cedf`. ✅✅ **extra-objects exit 0 CLEAN, 1 blob — the DEBRIS IS GONE** (v3 threw head-sized chunks). ✅✅ **floor-growth f0 9.96% → −0.45pp clean — the SLAB IS GONE** (v3's f0 band was 26.59%). ✅ anchor-pair **IoU 0.980**, ✅ feet-planted 25px WATCH, ✅ chroma. ⛔ **containment exit 1: TOP 48px @f83** — and the frames show why: the spear is **RAISED FULLY OVERHEAD**, near-vertical, head UP (at f48 he is planting the BUTT down like a standard). That violates the prompt's own `NEVER swung fully vertical, NEVER raised overhead`. Removing the floor removed the ram's TARGET, so the model lost the downward end-state. Breach is a narrow 30-48px run travelling rightward across frames (x482→504→726) = the spear sweeping the top. |
| 17 | attack_throw_b **v4** | **9254** | ⛔ **REJECT — BOTH ITS TARGETS FIXED, new defect at the peak.** Job `5e9da9f4`. ✅✅ **anchor-pair IoU 0.791 → 0.999** with `dTop 0 dBot 0 dH 0`, and f0 now `y[312..943] h=632` = the anchor EXACTLY. ✅✅ **feet-planted 82px (v2) → 27px (v3) → 0px "planted"**. ✅ floor-growth −0.02pp, ✅ extra-objects CLEAN (1 blob), ✅ chroma. ⛔ **containment exit 1: LEFT 268px @f48** (`y492-758`). At the horn-jab peak the **WING IS SPREAD WIDE OPEN** toward screen-left — that is the breach — the spear is swung up near-overhead, and the whole figure renders noticeably LARGER. Three explicit bans broken at the one action peak, with the wing-freeze law present in BOTH the beat and the suffix. |
| 18b | attack_throw **v5** | **10036** | ⛔ **REJECT — containment FIXED, and the pressure moved to the FEET.** Job `41056711`. ✅✅ **containment exit 0 CLEAN** (v4's TOP 48px gone — the spear-overhead ban held). ✅ **anchor-pair IoU 0.997**, ✅ floor-growth −0.05pp, ✅ extra-objects CLEAN, ✅ chroma. ⛔ **feet-planted 58px @f24 — LEFT THE GROUND** (`f0:0 f12:32 f18:50 f24:58 f30:12 … f66:42 f84:1 f96:0`). Textbook FINDING 11: I pinned the spear, so the BODY lifted instead. |
| 19 | attack_throw_b **v5** | **9708** | ✅✅ **PASS — ACCEPTED. TIM'S CONTAINED RE-CHOREOGRAPHY WORKED FIRST TRY.** Job `db6d996e`, cost null. **containment exit 0 CLEAN** (v4's LEFT 268px wing-spread GONE) · **anchor-pair IoU 0.997** · **feet-planted 1px "planted"** · floor-growth −0.04pp · extra-objects CLEAN (1 blob) · chroma held. **Every gate green — the first time this state passed anything.** And the action still READS: f24 head dipped, **f48 head snapped forward, jaw open, horns leading**, f72 settling, f96 back on anchor — with body height, scale and folded wings unchanged throughout. Contained did NOT mean static. ORIGINAL NOTE: The rise is DELETED: `THIS IS A CONTAINED BEAT … the ONLY thing that really travels is his HEAD AND NECK`; `HIS BODY BARELY MOVES AT ALL`; `HIS SILHOUETTE NEVER GROWS`; `HE DOES NOT COIL INTO A DEEP CROUCH, DOES NOT ERUPT, DOES NOT DRIVE UPWARD, DOES NOT RISE`; the jab fires `FROM THAT STILL BODY`, driven from neck and shoulders alone; wings get an absolute `NO PART OF EITHER WING EVER TOUCHES OR CROSSES THE LEFT EDGE`; and the closing adjective changed `Coiled, erupting, savage` → **`Low, still, savage`** (a positive "erupting" in the summary line would have fought the whole rewrite — audited: zero positive uses of erupt remain, only the ban). |
| 20 | attack_throw **v6** | **10703** | **FIRED** — job `0c0c6d78`, plen 10703 exact, cost null, `queued`, exactly 1. 12/12 guards (fired through a timed-out call; caught by `already`). ⚠ **MY JUDGEMENT CALL, flag it to Tim:** this is NOT a new design change — it PORTS the feet clause that **measured 0px lift on throw_b v4** into throw A verbatim, plus `THERE IS NO UPWARD WIND-UP OF HIS BODY BEFORE THE RAM … the ram is loaded by FOLDING DOWN, never by going up first`. Tim's dead-stop ruling (no floor, no debris) is untouched and has held in v4, v5 and v6. If he'd rather throw A get the same full contained re-choreography he approved for throw_b, that is a one-line reversal. |
| 18 | attack_throw **v5** | **10036** | built + audited, needs typing. Adds, inside the beat: `THE BARBED HEAD IS THE END THAT GOES DOWN, AND IT STAYS DOWN … IT NEVER RISES ABOVE HIS OWN HIP`; `NEVER SWUNG FULLY VERTICAL, NEVER RAISED OVERHEAD, NEVER LIFTED ABOVE HIS OWN SHOULDERS AND NEVER PLANTED BUTT-DOWN LIKE A STANDARD`; and an ABSOLUTE `NO PART OF THE SPEAR … EVER TOUCHES OR CROSSES THE TOP EDGE OF THE FRAME`. The ram now stops `a hand's width above the bare green` — a target without a surface. |

### ⚠ COST NOTE ON `attack_throw` — 4 generations spent, v5 is the 5th
v1 debris+drift · v2 right-edge debris · v3 three edges + a slab · v4 spear overhead. It is the only
state in the kit that has never passed. Each failure was real and different, and each fix worked on its
own target — but the state keeps finding a new way out. **If v5 fails, my recommendation is to park
`attack_throw` and ship gargoyle 5/6 rather than spend a 6th**: the other five states are clean, and a
single missing attack variant is a smaller cost than an open-ended loop. That is Tim's call, not mine.
⚠ Its FRAMING is also tighter than the rest of the kit — f0 bbox h=720 and x1=957 (2px off the right
edge) against the accepted band h=632-810 — so this state has the least margin of any clip to work in,
which is part of why bounds that hold elsewhere fail here.

### Rejected takes are PARKED under explicit names — never wire these
`qa-boss/raw/` now holds, alongside the v1 raws:
* `gargoyle-spear-hit-r2-REJECTED-frontal.mp4` (f0 sym 0.546)
* `gargoyle-spear-attack_throw-r2-REJECTED-rightedge.mp4` (debris 72px over RIGHT @f40)
* `gargoyle-spear-attack_throw_b-r2-REJECTED-leap.mp4` (82px airborne @f48)
Renamed BEFORE the replacements downloaded, so the canonical `-r2` name always holds the ACCEPTED
take. They are deliberately kept: each is a known-bad control for the gate that caught it, and the
frontal one is now part of `check-frontturn`'s gargoyle population (n=19).
| 13 | hit **v3** | **7823** | queued — the `hit` re-roll WITH the stance lock. Gargoyle therefore needs **7** generations, not 6. |

Both harvested raws: 960x960, 24fps, 97 frames, 4.041667s, green held at BOTH top corners on f0 AND
f96 (hit-r2 0,228,5/0,225,3 · strike_b-r2 0,229,1/0,225,0). No VOID scene-invention.
Saved as `qa-boss/raw/<char>-<state>-r2.mp4` — **v1 raws are NOT overwritten** (all 12 v1 files exist).

## Notes
- Anchor is in **Reference** mode (verified on the "Use as ..." menu). A pale-blue thumbnail is a
  LAZY-LOAD PLACEHOLDER, not a lost plate.
- A wedged renderer recovers on its own — the prompt that "failed" with three consecutive CDP
  timeouts was sitting in the editor at exactly 7372/7372 once it came back.
