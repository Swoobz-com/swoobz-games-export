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
| 2 | gargoyle-spear | attack_strike_b | 7935 | stone statue PLINTH under his feet, f0→f97 | **FIRED** — API `queued`, plen 7935, cost null. Typed WHILE clip 1 generated. |
| 3 | gargoyle-spear | attack_block | 7737 | FRONTAL whole clip, wings spread, anchor 0.431 | queued |
| 4 | gargoyle-spear | attack_block_b | 7384 | LEFT 366px overrun @f12 | queued |
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

## Notes
- Anchor is in **Reference** mode (verified on the "Use as ..." menu). A pale-blue thumbnail is a
  LAZY-LOAD PLACEHOLDER, not a lost plate.
- A wedged renderer recovers on its own — the prompt that "failed" with three consecutive CDP
  timeouts was sitting in the editor at exactly 7372/7372 once it came back.
