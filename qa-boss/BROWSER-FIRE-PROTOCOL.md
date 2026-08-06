# STANDOFF autonomous clip run — protocol of record (2026-08-05, session 29)

Tim lifted the generation hold and directed the BROWSER path (Higgsfield Unlimited, ZERO credits).
Scope: finish the 5 IN-PROGRESS characters only. NO new characters. 35 clips.
When all 35 are done -> STOP and report; Tim picks the next character.

## Panel of record (verified on screen before every fire)
Seedance 2.0 [UNLIMITED] · 4s · 1:1 · 720p · Bitrate **Standard** · Audio **Off** · Unlimited mode ON
Generate button MUST read `GenerateUnlimited`. `Generate2418` = 2418 CREDITS = BILLING. Never fire on that.

## ⚠ NEW FACT LEARNED THIS SESSION (not in the handoff)
**Firing NAVIGATES/RELOADS the page** (`/ai/video?flowId=...` -> `/ai/video`). That reload
**silently resets Unlimited mode to OFF** and wipes any injected helper. So the re-arm is not
optional-per-reload, it is **mandatory after EVERY fire**.

## ⚠ SECOND NEW FACT — THE PROMPT-DROP DEFECT (cost one clip; the worst trap here)
`document.execCommand('insertText')` and the synthetic `paste` ClipboardEvent BOTH fail to reach
the Lexical editor. Worse: execCommand can write the **DOM** while Lexical's own store stays EMPTY,
so a DOM-only length assert PASSES and the clip fires with **NO PROMPT AT ALL**. Seedance then does
pure image-to-video off the anchor and INVENTS a scene — the first ir56 fire came back as a ruined
city under a lightning storm instead of the magenta chroma. Identity was right (it had the plate);
everything the prompt controls was gone.

**THE ONLY METHOD THAT WORKS: the real trusted keyboard.**
```
computer left_click on the editor -> key ctrl+a -> key Delete -> computer type <the prompt>
```
**VERIFY AGAINST LEXICAL'S STORE, NOT THE DOM:**
```js
const ed=document.querySelector('[contenteditable="true"]');
ed.textContent.length === WANT && (ed.__lexicalTextContent||'').length === WANT
```
`__lexicalTextContent` is the authoritative mirror. DOM-only agreement is NOT evidence.

⚠ A long `computer type` (1800+ chars) often returns
`CDP "Input.dispatchKeyEvent" timed out` — **the text still landed.** Do not retype on that error;
re-read the two lengths first, or you will double-insert.

**POST-CONDITION (cheap, definitive):** after firing, the new History card must DISPLAY the prompt
text. A card showing only `Seedance 2 720p 4.0s 1:1 ... Rerun` with no prose = the prompt was dropped
= that clip is void and must be re-fired.

## Poll expression (precise — never regex the whole page, it matches the prompt text)
```js
[...document.querySelectorAll('span')].filter(e=>/^(Processing|Generating|Queued|In queue|Starting)$/.test((e.textContent||'').trim())).length
```
1 = my clip still busy. 0 = done, safe to fire the next.
**The badge moves Processing -> Generating -> done.** Watching only `Processing` reports "free"
while the clip is still generating, and Unlimited is SERIALIZED, so an early fire is lost.
Also pause videos every cycle or the renderer freezes CDP:
```js
[...document.querySelectorAll('video')].forEach(v=>{try{v.pause();v.autoplay=false}catch(e){}});
```

## Per-clip cycle
1. Poll until processingCards === 0 (Unlimited is SERIALIZED, one at a time).
2. Re-arm Unlimited: click the toggle; assert button label === 'GenerateUnlimited'.
3. Swap the anchor plate ONLY when the character changes (see plate table).
4. Set prompt via execCommand insertText; assert exact length.
5. Guarded fire in ONE js task: lenOk && lockCount===1 && facing && label==='GenerateUnlimited' && unlim==='true'.
6. Confirm queued: a new card with the plate thumb + `Processing` badge.
7. If a CONTENT WARNING blocks the clip -> record it and SKIP to the next clip (Tim's rule).

## Anchor swap recipe (per character change)
hover the thumb (148,231) -> click the little x (164,215) -> "Upload media" dropzone appears
-> click its IMAGE icon (167,215) -> Uploads picker opens -> `find` "hidden file input"
-> `file_upload` the plate copy from scratchpad/plates/ -> wait ~20-40s for "Checking content..."
to clear -> click the NEWEST tile (423,305) -> toast "Added to prompt box" -> close picker (648,211).

## Plates (verified backdrop RGB)
| char | plate file (scratchpad/plates/) | chroma |
|---|---|---|
| ir56-lion-serpent | ir56-lion-serpent-anchor.png | MAGENTA 163,0,95 |
| thorn-warden | thorn-warden-anchor-green.png | GREEN 0,177,64 |
| lich-scythe | lich-scythe-anchor-green.png | GREEN 1,216,0 |
| oni-tetsubo | oni-tetsubo-anchor-green.png | GREEN 0,186,33 |
| gargoyle-spear | gargoyle-spear-anchor-green.png | GREEN 2,251,3 |

## Queue (35) — order: fewest-remaining first, to bank complete kits early
1. ir56-lion-serpent (1): attack_throw_b
2. thorn-warden (2): special_1, special_3
3. lich-scythe (10): attack_throw, attack_throw_b, attack_block, attack_block_b, hit, ko, victory, special_1, special_2, special_3
4. oni-tetsubo (10): attack_strike, attack_strike_b, attack_throw, attack_throw_b, attack_block, attack_block_b, hit, special_1, special_2, special_3
5. gargoyle-spear (12): attack_strike, attack_strike_b, attack_throw, attack_throw_b, attack_block, attack_block_b, hit, ko, victory, special_1, special_2, special_3

Prompts are PRE-BUILT and lock-verified in `scratchpad/prompts/<char>__<state>.txt`
(built by `scratchpad/build-all.mjs` off `qa-boss/build-prompt.mjs`; all 35 carry the
facing lock and the chroma lock).

## Harvest (AFTER the run — not during, to keep the queue moving)
Raws land in Higgsfield History. Download, then key + wire per the repo's normal gates.
NOTHING under `public/assets/` or the repo tree is touched by this run.


## ⚠ THIRD FACT — FOCUS IS NOT IMPLIED BY THE CLICK
A `computer type` can report full success while the editor is EMPTY, because the click missed
(the left panel's layout SHIFTS as the prompt box grows/scrolls). **Assert focus first:**
```js
document.activeElement === document.querySelector('[contenteditable="true"]')
```
Only type once that is `true`, and still verify both lengths afterwards.

## ⚠ FOURTH FACT — CHROME WINDOW OS-SHRINK, AND resize_window DOES NOT FIX IT
The automation window can collapse mid-run (seen: inner 286x136, **outer 160x28**). In that state
every element rect reads 0x0 and clicks land nowhere. `resize_window` returns
"Successfully resized" **and changes nothing** — do not trust its return value; re-read
`innerWidth/outerWidth` to confirm.
**Recovery that works:** `tabs_create_mcp` → navigate the NEW tab to the app. The new tab opens
with a healthy viewport AND the flow state (anchor plate, 4s/1:1/720p/bitrate/audio) carries over.
⚠ Closing the old tab afterwards can drop the whole MCP tab group even though another tab remains
— just call `tabs_context_mcp {createIfEmpty:true}` and navigate again. Unlimited resets to OFF on
any fresh tab, so re-arm.

## ⚠ FIFTH FACT — CDP TIMEOUTS ARE USUALLY LIES ABOUT FAILURE
`Input.dispatchKeyEvent timed out` on a long type, and even `Runtime.evaluate timed out`, are
usually just SLOW RESPONSES on this heavy page — the action landed. **Never retry a type on a
timeout.** Wait ~45s, then re-read `domLen`/`lexLen`. Retyping blind double-inserts the prompt.


## ⚠ SIXTH FACT — TIM FIRES FROM A SECOND TERMINAL ON THE SAME ACCOUNT (2026-08-05)
Told mid-run. Consequences:
1. **The busy-poll may show HIS generation, not mine.** That is SAFE (I just wait longer) because
   Unlimited is serialized account-wide anyway. Do NOT try to fire "around" it.
2. **The post-fire confirmation is NOT safe as written.** Reading only the TOP History card can read
   HIS clip. Scan the TOP SEVERAL cards for THIS clip's own unique beat string
   (e.g. "THROW (shoulder barge)", "SPECIAL FINISHER (the tithe)"), not the top card alone,
   and not the generic identity lock (which his clips may share if he fires the same character).
3. A clip of mine that never appears in any card = dropped prompt or lost fire -> re-fire it.


## ⚠ SEVENTH FACT — THE APP CAN CRASH TO "Oops / Something went wrong"
Seen after a very long `computer type` (7-8k chars) on an already heavy page. Symptom:
`document.querySelector('[contenteditable]')` returns null and the page shows a full-screen Oops.
**Recovery: click the on-page `Retry` button.** The app remounts with the ANCHOR PLATE STILL LOADED,
the PANEL still 4s/1:1/720p/Standard/Audio-Off, and — importantly — **the typed prompt intact**.
Only Unlimited resets to OFF, so re-arm and re-verify before firing. Do NOT retype the prompt before
checking its length: it usually survived.


## ⛔ NINTH FACT — ANY JS/CDP CALL BETWEEN THE CLICK AND THE TYPE KILLS THE CARET (2026-08-06)
**This is the same silent-drop DEFECT as §3, with a different cause, and the §3 fix does not cover it.**

`ed.focus()` sets `document.activeElement` — and Lexical still will not accept a keystroke, because a
programmatic focus gives it **no selection anchor**. Worse, so does a REAL click if any
`javascript_tool` / `Runtime.evaluate` call happens between the click and the type.

MEASURED, three times in a row:
* `ed.focus()` → assert `document.activeElement === ed` → **passes** → `computer type` 7372 chars →
  the tool reports **full success, echoing the entire prompt** → `domLen 0, lexLen 0`. Editor empty,
  placeholder still visible on screen.
* real click → **one JS call to verify focus** → `computer type "PROBE"` → **`domLen 0`**.
* real click → `computer type "PROBE2"` **immediately, no call in between** → **LANDED.**

**THE RULE: click → (keys only) → type, back to back. NEVER put a javascript_tool call between the
click and the type.** Verify AFTER the type, never between. Asserting focus first — which §3 tells you
to do — is exactly what breaks it, because the assertion itself is the JS call that clears the caret.
So §3 and this fact are in tension: obey THIS one, and treat the post-type length check as the gate.

## ⛔ TENTH FACT — ONE LONG `computer type` WEDGES THE RENDERER; TYPE IN CHUNKS
A single `computer type` of ~7.4k chars **reliably freezes the renderer for minutes** — reproduced
twice on gargoyle `hit` (LEN 7372). Symptoms in order: `Input.dispatchKeyEvent timed out after
30000ms`, then every `Runtime.evaluate` times out at 45s, then `Page.captureScreenshot` times out,
and finally **the Chrome extension itself disconnected**. Session 29 got away with 10k-char types;
do not read that as proof it is safe — it is machine- and page-state dependent.

**Cut the page weight first** (this alone was not enough, but it helps): switch History to Grid and
strip `src` off every `<video>` before typing.

**THE FIX — chunked trusted typing.** Issue the prompt as several back-to-back `computer type` calls
of ~1000 chars each. Each stays well under the 30s CDP ceiling, and the caret survives between them
**because there is no JS call in between** (§9). Do not clear between chunks — they append. Verify
`domLen === lexLen === WANT` ONCE, after the last chunk.
⚠ Do NOT fall back to `execCommand`/`paste` to dodge this: that is §3, the empty-prompt defect that
fires a clip with no prompt at all.

## ⚠ ELEVENTH FACT — THE ANCHOR THUMB IS NOT AN `<img>`, AND ONE BANNER LOOKS LIKE A LOST PLATE (2026-08-06, session 31)
Two independent ways to wrongly conclude the anchor plate is gone. Both cost a guard refusal on a
VALID, fire-ready state (safe direction, but it stalls the loop):

1. **The reference-slot thumbnail is NOT an `<img>` element.** A guard asserting
   `document.querySelectorAll('img')` in the left panel returns **0** while the plate is loaded and
   visible on screen. Probe by POSITION instead and walk up the ancestors accepting a
   `background-image`, an `<img>`, or a `<canvas>`:
   ```js
   const S=1456/innerWidth;                       // screenshot px -> CSS px
   let n=document.elementFromPoint(Math.round(153/S),Math.round(240/S)), hit=false;
   for(let i=0;i<6&&n;i++){const cs=getComputedStyle(n);
     if((cs.backgroundImage&&cs.backgroundImage!=='none')||n.querySelector('img')||
        n.querySelector('canvas')||n.tagName==='IMG'||n.tagName==='CANVAS'){hit=true;break;}
     n=n.parentElement;}
   ```
2. **`ERROR WHILE LOADING THE MEDIA...` in the top-left card is NOT the anchor.** That card is the
   MODEL/preset tile (`GENERAL · Seedance 2.0`) and the error is its promo video failing to load.
   The anchor lives in the SECOND box down, beside the `+` button. Cosmetic; ignore it.
   ⚠ Confirm the plate with a SCREENSHOT — eyes are the evidence here, not a selector.

⚠ **Also: never return a URL from `javascript_tool`.** Reading the thumb's `src` (a signed CloudFront
URL with a query string) gets the whole tool result replaced by `[BLOCKED: Cookie/query string data]`
and you lose the entire measurement. Return booleans.

## ⚠ TWELFTH FACT — AFTER A FIRE-RELOAD THE EDITOR IS SCROLLED OUT OF THE VIEWPORT (2026-08-06, s31)
Post-fire the prompt box measured `rect.y = -4026` while `window.scrollY === 0` — it sits in a
scrolled ANCESTOR, so `window.scrollTo(0,0)` does nothing. A click at the stale coordinate lands
nowhere and the type then goes into the void (§3's failure with yet another cause).
**Fix: `ed.scrollIntoView({block:'center'})`, then RE-MEASURE the rect and derive the click point
from it** (`screenshotX = cssX * 1456/innerWidth`). Never reuse a coordinate across a fire.

## ⛔ THIRTEENTH FACT — THE WINDOW RESIZES MID-SESSION, AND A CACHED CLICK COORDINATE THEN SILENTLY MISSES (2026-08-06, s31)
**This produces the EXACT symptom of §9 — `computer type` reports FULL SUCCESS, echoing the whole
prompt, into an editor at `domLen 0` — but the cause and the fix are completely different.** If you
diagnose it as §9 you will keep re-clicking the same dead pixel forever.

MEASURED. Mid-run the automation window changed size on its own:

| | before | after |
|---|---|---|
| `innerWidth` | 2129 | **1766** |
| screenshot width | 1456 | **1360** |
| scale (`shot/inner`) | 0.684 | **0.770** |
| correct editor click | (187, 359) | **(136, 367)** |

Firing the cached **(187, 359)** typed **0 chars** three times — including a 6-char `PROBE2`, which rules
out §9's caret theory and rules out the length/wedge theories too. Recomputing the point from a fresh
rect and clicking **(136, 367)** landed `PROBE3` at `domLen 6, lexLen 6` on the first try.

**THE RULE: never reuse a click coordinate. Recompute it from a FRESH `getBoundingClientRect()` before
every click, and derive the scale from the CURRENT screenshot width, not a remembered one:**
```js
const S = shotWidth / innerWidth;              // shotWidth = width of the screenshot you just took
const r = ed.getBoundingClientRect();
const click = { x: Math.round((r.x + r.width/2) * S), y: Math.round((r.y + r.height/2) * S) };
```
**And when a type lands 0 chars, PROBE WITH 6 CHARS before theorising.** A failed 6-char probe means the
coordinate or the editor is wrong (not the caret, not the length, not the renderer); a 6-char probe that
LANDS while a long type does not is the wedge. That one cheap call separates three different faults.
⚠ Related trigger: this happened right after a `Debugger is not attached to the tab` error and its
recovery, so treat any extension reconnect as invalidating every cached coordinate.

## ⚠ EIGHTH FACT — "Promise was collected" ON THE GUARDED-FIRE CALL IS AMBIGUOUS
The fire helper uses `await new Promise(setTimeout)` between the Unlimited re-arm and the click.
That call can die with `{"code":-32000,"message":"Promise was collected"}` — leaving it UNKNOWN
whether `gb.click()` ran. **NEVER just re-fire.** Decide it by COUNTING the beat string in
`document.body.innerText`:
```js
document.body.innerText.split('HIT (stagger)').length - 1
```
The editor still holds the prompt, so it contributes 1. Compare against the other beats already
fired for that character (each contributes exactly 1, from its history card).
  * beat count == 2  -> editor + ONE history card  -> the fire LANDED. Move on.
  * beat count == 1  -> editor only                -> the fire did NOT land. Re-fire.
