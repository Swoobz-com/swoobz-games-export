# HANDOFF — Frozen Requiem (RPS-as-MK-fighter), for a fresh Fable 5 session

Working title Frozen Requiem. Folder `streetfighter/` (own git repo inside the
swoobz-games-export export). Dev server port **5340 strictPort**. Tim's art in `input/`
is canonical. HEAD at handoff: `bcdfebb` (phase 5). Everything below is verified, not
self-reported: every phase was live-driven headless before its commit.

## 0. Operating model (Tim's standing directive)
You are the ORCHESTRATOR: plan, brief, verify, review, commit. Specialized subagents
(Opus 4.8 builders via the Agent tool) do the building from implementation-grade briefs
(see `subagent-briefing` skill: context/task/constraints/expected output/verification).
NEVER trust a builder's self-report - re-run its gates, then live-drive the real game
yourself before committing. Tim approves every credit spend per batch (hard law).

## 1. What exists (by phase / commit)
1. `8530a15` spec + art + scaffold. `4cbe2ac` phase 1: pure engine + AI + provider +
   transport seam + audio (34 tests). `7c1c165` phase 2: full arcade presentation
   (baked-HUD overlays via CALIBRATION %, keyed fighters, choreography, all screens).
2. `100a5e7` phase 3: Swoobz chassis - WINNER-TAKES-ALL stakes (stake S, NPC matches S,
   pot 2S, winner takes all; bigint lamports; balance in localStorage
   `frozen-requiem.balance.v1`; BetConsole copied verbatim from `originals/_shared`,
   skinned; MATCH RECEIPT; SWOOBZ mark; PLAY SAFE) + MK-style generated IDLE loops for
   both fighters (Seedance 2.0, anchor-locked).
3. `6671223` phase 4: CHARACTER-CONTRACT.md (the swappable-character law) + manifest
   registry `src/characters/` + proof trio clips (GORVAK attack_strike, VOLTA hit,
   GORVAK ember fx_impact) + provider hit windows (RESOLVE_HIT_MS 2000 / KO 2400) +
   THE FACING RULE + burst screen-blend + radial feather.
4. `bcdfebb` phase 5: CHARACTER SELECT (MK1 reference) + RUNTIME SLOTS: player pick =
   left slot, opponent = right; `isMirrored(def, slot)` mirrors fighter + ALL clips +
   portrait; opponent name dynamic everywhere. Both pick paths live-verified.
5. `849e51c` phase 6: CHARACTER SELECT v2 per Tim's `input/characterselectionidle.mp4`
   (MK1): full-body LIVE IDLE previews (`SelectPreview`, `SELECT_CAL` tunable block),
   name plate at the pick's feet, 22-slot roster strip (2 real + 20 mystery "?", two
   rows of 11), CONFIRM bottom-right. Zero credits (reuses keyed idles). Live-verified
   both pick paths. NOTE: sibling previews keyed by def.id mean a pick-swap MOVES the
   React instances (loops continue seamlessly, no remount) - intended, do not "fix".

Game flow: title -> mode (CPU personality brute/warden/oracle or friend create/join) ->
charSelect -> stake -> vsIntro -> rounds (STRIKE>THROW>BLOCK>STRIKE, 3 HP, best-of-3,
5s shot clock, tie=CLASH) -> receipt -> rematch/character select/quit.

## 2. Architecture map
- `src/engine/fightEngine.ts` + `fightAi.ts` - **BYTE-FROZEN since phase 1**. Never
  edit; every commit gate checks `git diff --stat` shows them untouched.
- `src/engine/fightStakes.ts` - pure bigint stake math (16 tests).
- `src/provider/fightProvider.ts` - the whole state machine. Module-const timings
  (RG-C5). StrictMode-safe: NO side effects in setState updaters; refs mirror state.
  Identity-agnostic (never knows WHICH character - the Experience owns `playerId`).
- `src/characters/` - types + `gorvak.ts` / `volta.ts` manifests + registry. A new
  character = ONE new manifest file (tile, fight, portraits all follow).
- `src/ui/FightExperience.tsx` - zero-prop presentation. CALIBRATION const block =
  %-positions over the baked-HUD background art (do not touch values). CHO block =
  choreography consts. CLIP_RATE = 2.0.
- `src/ui/fight.css` - NEVER combine -webkit-text-stroke with background-clip:text
  gradient text (Chrome miter-spike bug; use stacked drop-shadows).
- `src/transport/matchTransport.ts` - PvP seam. LocalSimTransport fakes the friend;
  real WebSocket slots in later without touching engine/provider.
- `scripts/key-idle-clips.mjs` - clip keying (border-seeded flood matte, 5px edge-band
  despill 0.12, GLOBAL magenta-family suppress [safe ONLY while no character wears
  magenta], 2px feather, union-bbox crop, cal JSON emission via `--still`).
- `CHARACTER-CONTRACT.md` - THE LAW for characters/clips/effects/facing. Read fully
  before any character work. FIGHT-SPEC.md section 8 overrides earlier sections.

## 3. Hard-won learnings (each cost real debugging - do not relearn)
1. **"i dont see the animation" = window truncation.** Attack clips are a 2s beat with
   contact at 875ms; the provider's old 700ms resolve window cut the swing pre-contact
   and clamped hitstop onto a windup frame (reads as stutter). Hit windows must FIT the
   clip beat (RESOLVE_HIT_MS/RESOLVE_KO_MS). If a future clip's contact overruns its
   window, the UI clamp keeps the beat landing - but fix the window, not the clamp.
2. **Judge character facing by the HEAD at FULL resolution.** VOLTA's body stances left
   but her head looks right; at thumbnail size I mis-QA'd her as left-facing, shipped
   her unmirrored, and Tim caught it. The head is what reads.
3. **THE FACING RULE (contract section 4).** Slot is runtime; left slot faces right,
   right slot faces left; mirror when `faces` disagrees. The mirror wraps the WHOLE
   video stack so clips can never desync from the still.
4. **Directional acting must be prompted in ART space.** VOLTA's hit clip was prompted
   in screen space ("blow from frame-left") and is inverted for the unmirrored left
   slot (whips TOWARD the attacker). Correct rule: the blow comes from the character's
   FACING side in the raw clip; then it reads right in both slots. Re-roll queued.
5. **Ground-truth probe for "is the clip playing": hook `HTMLMediaElement.play` via
   `page.evaluateOnNewDocument`.** DOM opacity sampling missed everything and burned an
   hour; the play-hook found the truth in one run.
6. **Impact effects: generate on PURE BLACK, composite `mix-blend-mode: screen`, then
   (a) trim to the detonation window (Seedance rains embers for the full duration),
   (b) tag color range on re-encode AND (c) radial-feather mask the element - untagged
   limited-range black lifts to grey and screen blend shows a hard box.**
7. **Seedance preset interception:** prompts matching a Higgsfield preset return a
   notice instead of generating; retry with `declined_preset_id`. DIFFERENT presets can
   fire on different prompts ("3D RENDER", "IN THE DARK") - decline each id as it appears.
8. **Anchor lock works:** `start_image == end_image == image_references` = seamless
   loop + identity + drop the duplicated last frame (n<120 of 121). Idle restarts at
   currentTime=0 on return (frame 0 IS the anchor).
9. **Keying:** sample the screen color per frame (border-ring median), border-seeded
   flood fill (protects interior by construction), edge-band despill only - PLUS the
   global magenta-suppress for interior motion-blur pockets (safe only while no
   character wears magenta; gate it per character). Verify mattes over black AND white
   AND grey on first/mid/high-motion/last frames. Transparent plane never pure black.
10. **This environment lies about background dev servers**: a "killed" task
    notification does NOT mean the server died - `curl -s -o /dev/null -w "%{http_code}"
    http://localhost:5340/` is the truth. It DID die once too - then restart per the
    DEV-SERVER HYGIENE LAW (kill only PIDs whose command line points at THIS project).
11. **Headless verification recipe:** puppeteer-core via
    `createRequire('C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/package.json')`
    + system Chrome `C:/Program Files/Google/Chrome/Application/chrome.exe` + arg
    `--autoplay-policy=no-user-gesture-required` (else videos never play headless).
    Click buttons by regex on textContent OR aria-label. Beware regex traps: the moves
    legend "STRIKE > THROW > BLOCK" matches /strike/ at ALL times.
12. **Chrome text-stroke miter-spike bug** (global memory `chrome-text-stroke-miter-spikes`).

## 4. Credit / generation facts (Higgsfield)
- Balance was ~1,963 credits after phases 3-4 (idle 90 + proof trio 135). Seedance 2.0
  1080p std 5s = 45 cr/clip; 4s = 45; 720p = 22.5. ALWAYS `get_cost` preflight + Tim's
  per-batch OK (AskUserQuestion). MCP upload works agent-side: `media_upload` ->
  presigned PUT -> `media_confirm`.
- Persistent confirmed media ids (reusable as start/end/image_references):
  GORVAK magenta anchor `23fb74be-90db-4b64-850c-ed1e39ed0b9a`,
  VOLTA magenta anchor `19539771-3ddb-424d-a9af-a5bfc280957a`,
  black plate 1024 `b757c6e3-263a-4eb6-a800-d37fd3391c77`.
- Accepted generations (provenance): idle `a1f13fe5.../15bc5056...`, strike
  `80d1ec37...`, volta hit `4c29d10d...` (DIRECTION INVERTED - re-roll), ember fx
  `ea304005...`.

## 5. What to do next (in order)
1. **The remaining clip batch** (needs Tim's OK, ~360 cr at 1080p): GORVAK
   attack_throw + attack_block + hit; VOLTA attack_strike + attack_throw + attack_block
   + her voltage fx_impact + RE-ROLL of her hit with corrected direction. Prompt rules:
   contract sections 3/5/7 + facing rule (directional acting in ART space - for BOTH
   characters the blow/attack direction references their FACING side, which is RIGHT
   for both). Study `input/kick fight reference.mp4` (timing) + `input/hiteffect.mp4`
   (Tim added it - NOT yet studied; check what it shows before prompting the fx).
   (`input/characterselectionidle.mp4` is already consumed - phase 6.)
   Pipeline per contract section 6; keying via scripts/key-idle-clips.mjs (use
   `--still` to emit cal JSON - never hand-derive); fill manifests; live-verify BOTH
   pick paths; commit.
2. **Contact-sync polish after the batch:** per-move contactMs measured from each QA
   sheet; consider starting the defender's hit clip slightly BEFORE contact so the whip
   lands at unfreeze (currently starts at contact).
3. **Backlog (Tim-prioritized):** real multiplayer transport (WebSocket) behind
   MatchTransport; friend-mode staked flow live-verified end-to-end (only fake-connect
   was driven); loss-path receipt live check (math is unit-tested); VS splash diagonal
   split per spec; reveal plate stagger (P2 shows "?" until resolve - needs provider
   contract change); announcer VO; `ko`/`victory` clips (optional states).
4. **If Tim reports feel issues:** CLIP_RATE (2.0) vs provider windows are the levers;
   GORVAK's strike has mid-swing weapon drift (cleaver reads as staff ~frames 50-60,
   invisible at speed - re-roll only if Tim notices).

## 6. Gates before ANY commit (all of them, quote real output)
`npx tsc --noEmit` clean; `npx vitest run` 50/50 (66 after new stake tests? no - 50
now, grows with new test files); `npm run build` ok; `git diff --stat` shows
fightEngine.ts + fightAi.ts untouched; live headless drive of the changed surface
(screenshots, both pick paths for anything touching characters); no em-dashes in
user-facing copy; RG-C5 (zero-param audio, module-const timings, value-independent
celebrations). Commit with Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>.
Repo git config: user.name Tim, user.email erstrijbis@gmail.com (already set locally).

## 7. Memory locations
Project memory: `~/.claude/projects/...streetfighter/memory/frozen-requiem-state.md`
(kept current through phase 5). Global: `~/.claude/memory/MEMORY.md` index +
`chrome-text-stroke-miter-spikes.md`. Update both at the end of any session that
learns something durable (SAVE-GLOBAL LAW).
