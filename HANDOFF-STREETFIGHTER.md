# HANDOFF — Frozen Requiem (RPS-as-MK-fighter), for a fresh Fable 5 session

Working title Frozen Requiem. Folder `streetfighter/` (own git repo inside the
swoobz-games-export export). Dev server port **5340 strictPort**. Tim's art in `input/`
is canonical. HEAD at handoff: `91c1277` (phase 11b complete). Everything below is
VERIFIED, not self-reported: every phase was live-driven headless before its commit.
Rewritten clean 2026-07-18 end-of-session (the old phase-by-phase log grew unreadable;
git history has the detail).

## 0. Operating model (Tim's standing directive — read first)

You are the ORCHESTRATOR: plan, brief, verify, review, commit. Specialized subagents
(Opus 4.8 builders via the Agent tool) do the building from implementation-grade briefs
(`subagent-briefing` skill: context/task/constraints/expected output/verification).
NEVER trust a builder's self-report — re-run its gates yourself, then live-drive the
real game before committing. Tim approves every credit spend per batch (hard law);
he answers fast and concretely — when he reports a visual defect, treat his diagnosis
as a hypothesis and MEASURE (his reports have been right about the symptom every time,
~half the time about the mechanism). Update project memory + this handoff at every
phase boundary.

## 1. What the game is now (state at HEAD)

A complete, playable, staked MK-style duel. Flow: title -> mode (CPU personality
brute/warden/oracle or friend create/join) -> character select (MK1-style: live idle
previews, 22-slot roster = 2 real + 20 mystery "?") -> stake (winner-takes-all, pot 2S)
-> vsIntro -> rounds (STRIKE>THROW>BLOCK>STRIKE, 3 HP, best-of-3, 5s shot clock,
tie=CLASH) -> receipt -> rematch/character select/quit.

BOTH characters (GORVAK orc / VOLTA cyber-brawler) ship the FULL kit (phase 12 added
ko + victory, single takes, Tim-approved 216 cr total):
- idle (1, the anchor hub) + TWO interchangeable takes of attack_strike / attack_throw
  / attack_block / hit (contract §10: uniform-random per exchange, distinct actions)
  — EXCEPT two takes PULLED at the 2026-07-18 QA sweep, states run on one take pending
  regen (Tim's approval outstanding, 36 cr each): VOLTA attack-throw-b (baked phantom
  opponent, the SECOND phantom for that acting) and GORVAK attack-strike-a (frame-fixed
  lavender disc + cleaver-to-staff morph). Webms stay in assets, just unwired.
- a SPECIAL finisher (contract §11): GORVAK flaming cleaver circle, VOLTA lightning
  spin — plays automatically on any round-ending win, baked elemental trail (the
  sanctioned effect exception, "Scorpion quality" per Tim; fire is APPROVED for
  specials — the earlier fire ban applied to the old ember impact-burst only). Both
  re-encoded 2026-07-18 through scripts/magenta-neutralize.mjs (face blotches / pink
  lightning bands neutralized; fire + cyan untouched by the family test).
- ko (off-anchor: collapses, holds motionless on the ground) + victory (anchor-locked
  round-win taunt), single takes each (§10 deviation on record, cost call). On a
  round-ending win the winner's finisher CHAINS into victory (FxState-armed,
  race-proof) and through the roundEnd/matchEnd dwell the ko body stays down and the
  taunt keeps playing; every other phase fully resets to idle. fxReducer now takes
  clipEnd/phaseReset actions; the clipEnd stale-gate (state+take identity) blocks
  hidden deactivated clips' late onEnded from cutting live clips or eating the arm.

Presentation systems, all clip-driven: combo strings (1-3 `contacts` per attack take,
per-contact ring/glow/echo/spark/hitstop/shake, defender hit-clip re-trigger via
`hitRetrigger`, "N HITS" counter, "-1" floater on the FINAL contact only), clip-driven
CLASH (both play the shared attack state, freeze together at the later first-contact,
frost shock rings, cut back to idle), frost parry arc on block wins, eased everything
(wind-up/settle curves, decaying shake, HP drain, card-flip reveals). KO = hitstop +
launch + zoom. Zero remaining CSS-only combat paths in practice (the pre-clip
choreography survives as the contract fallback ladder for future clip-less characters).

## 2. Architecture map (stable — learn before touching anything)

- `src/engine/fightEngine.ts` + `fightAi.ts` — **BYTE-FROZEN since phase 1**. Never
  edit; every commit checks `git diff --stat` shows them untouched.
- `src/engine/fightStakes.ts` — pure bigint stake math.
- `src/provider/fightProvider.ts` — the state machine. Module-const timings (RG-C5),
  StrictMode-safe, identity-agnostic. Resolve windows: RESOLVE_HIT_MS 2000 /
  RESOLVE_KO_MS 2400 / RESOLVE_MS 1800 (clash; single use site). Windows must FIT the
  clip beat — a too-short window cuts the swing pre-contact ("i dont see the animation").
- `src/characters/` — types + manifests + registry. `clips` accepts
  `FighterClip | FighterClip[]` (variant takes); `clipVariants(def, state)` in types.ts
  is THE resolver every path routes through. A new character = ONE manifest file.
  `special` is a state like any other. NO fxImpact on current characters (deprecated
  after the ember rejection; §7 machinery remains legal but opt-in).
- `src/ui/FightExperience.tsx` — zero-prop presentation. CAL block (baked-HUD
  %-positions, do not touch values) / SELECT_CAL (char-select previews) / CHO
  (choreography consts incl. LUNGE_EASE/SETTLE_EASE, CLASH_CLIP_FREEZE_MS 260).
  CLIP_RATE = 2.0. Fighter stacks one preloaded <video> per VARIANT (key
  `${state}-${i}`), never src-swaps. Variant pick per exchange is dispatched into
  FxState (p1Var/p2Var) so render + timing read the SAME index.
- `src/ui/fight.css` — never combine -webkit-text-stroke with background-clip:text
  (Chrome miter-spike). Fight fx all on the smoothness curve cubic-bezier(0.22,1,0.36,1).
- `src/transport/matchTransport.ts` — PvP seam; LocalSimTransport fakes the friend.
- `scripts/key-idle-clips.mjs` — THE keying recipe: border-ring median screen color,
  tight global key + border-seeded flood fill (candidacy = distance OR magenta-family
  min(R-G,B-G)>45, which catches effect-bloomed backdrop), edge-band despill 0.12,
  GLOBAL interior magenta-family suppress (SUPPRESS_MIN 28 / KEEP 0.25 — safe ONLY
  while no character wears magenta), 2px feather, union-bbox crop, cal JSON via
  `--still` (cals are NEVER hand-derived).
- `CHARACTER-CONTRACT.md` — THE LAW. §9 combo strings, §10 variants, §11 specials.
  Read fully before any character work. FIGHT-SPEC.md §8 overrides earlier sections.

## 3. Hard-won learnings (each cost real debugging — do not relearn)

Generation (Seedance 2.0 via Higgsfield MCP):
1. **Anchor hygiene is everything.** A dirty anchor plate (interior grey remnant,
   baked shadow) comes back as grey-disc hallucinations; one re-roll even grew a
   visible human opponent. Inspect the plate at full res; rebuild from the keyed still
   on pure magenta; scrub remnants with a SEEDED flood fill (bbox thresholding overshoots
   onto costume highlights). Match `aspect_ratio` to the anchor or pass "auto" — forced
   16:9 from a square anchor outpaints hallucination zones. (Global skill
   higgsfield-generation carries this law.)
2. **Grab-verb mime prompts MATERIALIZE the opponent** (a phantom severed arm appeared
   mid-throw). Solo prompts must avoid grabbing-an-opponent verbs and state "she is the
   ONLY thing in the frame, only her own two arms appear, hands stay empty".
3. **Hit-reaction prompts bake impact flashes** unless negatived: "the impact itself is
   INVISIBLE: no flash, no glow, no shockwave; the background stays plain flat magenta".
4. **Effect clips run off the SOURCE frame** (global memory `effect-clip-edge-cut`):
   the straight cut Tim reported was in the pixels, not a CSS box. Wide-framing prompts
   ("character occupies the middle half") shrink but never eliminate it. After keying
   ANY effect clip: per-frame edge-touch alpha scan (numbers convict; spot frames lie),
   then post-key smoothstep edge feather (48px top/left/right + 40px bottom with a
   protected center feet column). Never re-generate for this; never enlarge boxes.
5. **A late-reading reaction clip can be head-trimmed free** if the trim point is still
   the anchor pose (VOLTA's fold: dropped 14 lead frames, beat now inside the
   early-impact law).
6. **Preset interception:** prompts matching a Higgsfield preset ("IN THE DARK") return
   a notice; retry with `declined_preset_id`. Different prompts trip different presets.
7. **Anchor lock works:** start==end==image_references = seamless loop + identity.
   Directional acting must be prompted in ART space (the blow comes from the character's
   FACING side — RIGHT for both current characters); screen-space prompts invert when
   the slot mirrors.
8. **Costume drift under strong effect light** (fire washed GORVAK's outfit warm):
   lock it in the prompt ("his outfit stays dark leather ... even when lit by fire").
8b. **ko/defeat prompts: describe only the FALL, never the blow.** "A devastating
   unseen blow arrives" baked an impact flash straight through the negatives on BOTH
   v1 kos (VOLTA's head replaced by a spark burst; GORVAK grew a face spray). The
   cause-free re-roll ("his strength leaves him ... collapses under his own weight")
   came back clean first try. Corollary of the grab-verb law: any CAUSE mentioned
   gets VISUALIZED.
8c. **The phantom-opponent class survives one solo re-roll.** VOLTA's throw-b re-roll
   (already the fix for a phantom limb) still carries a ghost opponent + disembodied
   forearm. For grab/throw acting, treat solo-safety as unproven until the QA sweep
   passes; budget for 2+ rolls or pick opponent-free acting.

QA discipline:
9. **Numeric all-frame scans, never 2-3 spot frames.** A washed backdrop plate hid
   exactly between my sample frames; the border haze scan (alpha coverage in the outer
   12% band, every frame) caught it. But border coverage alone cannot convict when a
   legit effect occupies the band — always adjudicate visually OVER DARK.
10. **Judge facing by the HEAD at full resolution** (VOLTA's body stances left, head
    reads right). Judge mattes over black AND white; the magenta plate hides magenta-
    family defects and edge cuts.
11. **Ground truth for "is the clip playing"**: hook HTMLMediaElement.play via
    page.evaluateOnNewDocument; DOM opacity sampling misses everything.
12. **A headless click helper must VERIFY registration** (pick buttons unmount on lock)
    and retry — fire-and-forget clicks silently miss the pick window and the 5s shot
    clock auto-picks, which once framed the game for a bug it didn't have.
13. **The AI reads pick patterns** (warden counters throw-spam): drives that hunt a
    specific outcome must RANDOMIZE picks.
14. **contacts are MEASURED, never guessed**: motion-energy peaks (scratchpad
    measure-contacts.mjs pattern) confirmed frame-by-frame on the sheet.

Environment:
15. **Background dev-server notifications lie** — `curl -s -o /dev/null -w "%{http_code}"
    http://localhost:5340/` is the truth. DEV-SERVER HYGIENE LAW applies (kill only
    PIDs whose command line points at THIS project).
16. **Parallel `curl ... & ... & wait` in the Bash tool loses the downloads** when the
    shell returns early — download sequentially.
17. **Headless recipe:** puppeteer-core via
    `createRequire('C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/package.json')`,
    system Chrome, `--autoplay-policy=no-user-gesture-required`. Reusable drivers in the
    session scratchpad: verify-final.mjs (variant+special hunt), verify-combo.mjs,
    hunt-parry.mjs, capture-resolve.mjs (dense frames), probe-pick.mjs, haze-scan.mjs,
    measure-contacts.mjs, edge-feather.mjs / bottom-feather.mjs (port to scripts/ when
    next needed — scratchpads die with sessions).
18. **The environment persists shell cwd across commands**: a `cd` into batch-raw once
    leaked 14 QA intermediates into a repo-root commit (cleaned in `9e4240f`). Prefer
    absolute paths; check `git status` before `git add -A`.

## 4. Credits / generation facts (Higgsfield MCP)

- Balance ~838 after phase 12 (216 spent: 144 approved batch + 72 approved ko
  re-roll; the v1 kos were burned credits — see learning 8b). Seedance 2.0 4s 1080p
  std = 36 cr/clip; `get_cost:true` param on generate_video is the preflight. ALWAYS
  preflight + Tim's per-batch OK. Upload path works agent-side: `media_upload` ->
  presigned PUT (curl) -> `media_confirm`. Phase 12 job ids: gorvak-victory 5c3421c1,
  volta-victory c90683b8, gorvak-ko-v2 d7dee08e, volta-ko-v2 8e2b4d91 (v1 rejects:
  abdf2dda / e3807258). "auto" aspect_ratio DID resolve square-to-square this time.
- Persistent media ids (start/end/image_references):
  **GORVAK CLEAN anchor `35867470-54cd-4e75-94a6-10b915c61b19`** (USE THIS — the old
  `23fb74be...` is RETIRED, it carries the grey wedge that caused hallucinations),
  VOLTA anchor `19539771-3ddb-424d-a9af-a5bfc280957a`,
  black plate 1024 `b757c6e3-263a-4eb6-a800-d37fd3391c77`.
- Full job-id provenance: scratchpad batch-jobs.md (dead with the session) — but every
  accepted clip is committed in public/assets and its job id is in the phase commit
  messages / project memory.

## 5. What to do next (in Tim's priority order)

0. **Regen decision PENDING with Tim** (asked 2026-07-18, he was AFK): regenerate the
   two pulled takes (VOLTA throw-b solo-hardened per learning 8c, GORVAK strike-A with
   cleaver-silhouette lock) at 36 cr each. Until then those states run one take.
1. ~~ko / victory~~ DONE phase 12 (single takes; variant pairs remain optional later).
2. **Real multiplayer transport**: WebSocket behind MatchTransport; friend-mode staked
   flow live-verified end-to-end (only fake-connect was ever driven).
3. **Announcer VO** (RG-C5: zero-param audio fns, value-independent).
4. **VS splash diagonal split** per FIGHT-SPEC.
5. **Loss-path receipt live check** (math is unit-tested; never watched live).
6. **Character #3**: one art drop from Tim -> keyed still -> clean anchor plate
   (inspect it!) -> acting table (contract §3) -> 9-clip kit (idle + 2x4 states,
   ~324 cr) + optional special (+36) -> key -> measure contacts -> ONE manifest file ->
   live-drive both slots. The entire pipeline is proven; every law above applies.
7. **If Tim reports feel issues**: CLIP_RATE (2.0) and provider windows are the levers;
   GORVAK's strike-A has mid-swing weapon drift (cleaver reads as staff ~f50-60,
   invisible at speed — re-roll only if Tim notices).

## 6. Gates before ANY commit (all of them, quote real output)

`npx tsc --noEmit` clean; `npx vitest run` **62/62** (grows with new test files);
`npm run build` ok; `git diff --stat` shows fightEngine.ts + fightAi.ts untouched;
live headless drive of the changed surface (both pick paths for anything touching
characters; randomized picks; screenshots); for effect clips: edge-touch scan + haze
scan + composite over dark; no em-dashes in user-facing copy; RG-C5 (zero-param audio,
module-const timings, value-independent celebrations — the variant pick derives from
Math.random only, the special from round state only). Commit with
Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>. Repo git config: user.name Tim,
user.email erstrijbis@gmail.com (set locally).

## 7. Memory locations

Project memory: `~/.claude/projects/...streetfighter/memory/frozen-requiem-state.md`
(current through phase 11b — the full phase log lives there + in git history).
Global: `~/.claude/memory/MEMORY.md` index; this session added `effect-clip-edge-cut.md`
and earlier `genvideo-character-clip-lessons.md`; the anchor-hygiene law is in the
global `higgsfield-generation` skill (stormforge repo, junctioned). Artifacts for Tim:
`specials-preview.mp4` at the repo root (side-by-side finishers export) + the
claude.ai artifact "Frozen Requiem: Special Attacks". Update memory + this handoff at
every phase boundary (SAVE-GLOBAL LAW).
