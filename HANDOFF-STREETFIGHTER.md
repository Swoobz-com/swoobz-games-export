# HANDOFF — Frozen Requiem (RPS-as-MK-fighter), for a fresh Fable 5 session

Working title Frozen Requiem. Folder `streetfighter/` (own git repo inside the
swoobz-games-export export). Dev server port **5340 strictPort**. Tim's art in `input/`
is canonical. HEAD at handoff: `71a459f` (phase 15). Everything below is VERIFIED, not
self-reported: every phase was live-driven headless (screenshots VIEWED) before its
commit. Rewritten clean 2026-07-20 after phase 15.

FRESH-SESSION START HERE (in this order, before touching anything):
1. Read this file fully, then `CHARACTER-CONTRACT.md` (THE LAW) if the task touches
   characters, and `FIGHT-SPEC.md` §8 for game rules.
2. Read project memory `frozen-requiem-state.md` (full phase log, phases 3-15).
3. `git log --oneline -15` to confirm HEAD matches; `npx vitest run` should print 81/81.
4. Ask Tim which backlog item (section 5) to start, or continue his explicit ask.

## 0. Operating model (Tim's standing directive — read first)

You are the ORCHESTRATOR: plan, brief, verify, review, commit. Specialized subagents
(Opus 4.8 builders via the Agent tool) do the building from implementation-grade briefs
(`subagent-briefing` skill: context/task/constraints/expected output/verification);
run generation (Higgsfield MCP) yourself — media ids, cost preflights and Tim's
approvals live in YOUR loop. NEVER trust a builder's or reviewer's self-report — re-run
its gates yourself, review the diff with your own eyes, then live-drive the real game
before committing. Keep ONE builder per feature and send follow-up briefs to the SAME
agent via SendMessage (it keeps context; phases 13-14 ran 4 briefs through one agent
with zero re-onboarding). Tim approves every credit spend per batch (hard law); when he
is AFK on a spend question, do the free/reversible fixes, hold the spend. He answers
fast and concretely — treat his defect reports as correct SYMPTOMS and measure the
mechanism (right about the symptom EVERY time — including overruling my "fixed" verdict
on the flame box, twice — ~half the time about the mechanism). When Tim overrules a
design (e.g. forfeit -> auto-play), rework BEFORE committing, never commit then patch.
Update project memory + this handoff at every phase boundary, and route durable lessons
to their global homes (SAVE-GLOBAL law).

## 1. What the game is now (state at HEAD)

A complete, playable, staked MK-style duel with REAL MULTIPLAYER and a full Swoobz
skin. Flow: title -> mode (CPU brute/warden/oracle or friend create/join) -> character
select (live idle previews, 22-slot roster = 2 real + 20 mystery; ARENA picker row) ->
stake (winner-takes-all, pot 2S) -> vsIntro -> rounds (STRIKE>THROW>BLOCK>STRIKE, 3 HP,
best-of-3, 5s shot clock, tie=CLASH) -> receipt -> rematch/character select/quit.

- BOTH characters (GORVAK orc / VOLTA cyber-brawler) ship the FULL contract kit:
  idle anchor hub; interchangeable takes of attack_strike/throw/block/hit (two states
  single-take by Tim's ruling, NO regen: VOLTA throw-b + GORVAK strike-a pulled);
  SPECIAL finisher (flame circle / lightning spin, radial-feathered `-r2` assets);
  ko (exhaustion collapse, holds on ground); victory (anchor-locked taunt, chains from
  the finisher, persists through the round-end dwell). Combo strings (1-3 contacts,
  per-contact fx + hit re-trigger + "N HITS"), clip-driven CLASH, frost parry arc.
- REAL FRIEND MODE (phases 13-14): ws room relay embedded in vite dev+preview
  (`/fr-ws`), room codes FRZxxx, exchange-indexed pick relay, opaque fighter-id
  profile relay (mirror matches render), reconnect grace (10s, resume tokens, buffered
  frames), AUTO-PLAY on true disconnect (Tim's law: NEVER forfeit — the match continues
  with uniform-random picks for the absent player, settles by real KO; leaver always
  nets -stake), stake refunds ONLY for never-started matches (waiting-room back-out,
  join/connect fail). Two isolated browsers played full matches in lockstep with exact
  opposite receipts; disconnect + reconnect + both refunds live-verified.
- SWOOBZ SKIN (phase 15): full design-system restyle (tokens in section 2), drawn
  background-independent HUD, official wordmark, ARENA picker (1 real arena + 4 locked
  tiles, localStorage persist, NO popup — change it manually in character select).

## 2. Architecture map (stable — learn before touching anything)

- `src/engine/fightEngine.ts` + `fightAi.ts` — **BYTE-FROZEN since phase 1**. Never
  edit; every commit checks `git diff --stat` shows them untouched.
- `src/engine/fightStakes.ts` — pure bigint stake math.
- `src/provider/fightProvider.ts` — the state machine. Module-const timings (RG-C5),
  StrictMode-safe, identity-agnostic (relays opaque fighter ids, never branches).
  Resolve windows: RESOLVE_HIT_MS 2000 / RESOLVE_KO_MS 2400 / RESOLVE_MS 1800 (clash) /
  ROUND_END_MS 2000 — windows must FIT the clip beat. Friend-mode machinery: transport
  acquired FRESH per friend match (CPU constructs none); opponent picks buffered in a
  Map keyed by exchange index, drained on beginPicking (a pick arriving during
  fightBanner survives); `handleMatchEvent` peerLost/peerBack/peerGone (peerGone =
  auto-play: `opponentGoneRef`, picks from `randomMove(autoPickRngRef)`, NEVER aiPick);
  `stakeCommittedRef` one-shot guards every refund/settle path (zero-sum everywhere;
  ghost-win pot evaporation is Tim's accepted trade-off, documented in headers).
- `src/transport/matchTransport.ts` — the seam. `WsTransport` (lazy socket to
  `/fr-ws`, queue-before-open, connect timeout CLEARED on settle + settled-guarded
  callback — learning 21; auto-reconnect with resume token, all timers in named fields);
  `LocalSimTransport` survives for tests/injection. Interface: sendPick(move, exchange),
  sendProfile(fighterId), onMatchEvent('peerLost'|'peerBack'|'peerGone').
- `src/server/matchRelay.ts` — dumb verbatim ws room relay, embedded via vite plugin
  (`configureServer` + `configurePreviewServer`; own upgrade listener owns ONLY
  `/fr-ws`, never touches HMR). Grace/resume/peerGone per section 1. Zero game logic —
  both clients run the symmetric engine, no authority needed. NOTE: matchRelay.ts loads
  at vite STARTUP — server-side edits need a dev-server restart, no HMR.
- `src/characters/` — types + manifests + registry. `clipVariants(def, state)` is THE
  resolver. A new character = ONE manifest file. Special assets are `-r2` filenames
  (cache-bust convention: rename on any asset re-swap).
- `src/arenas/arenas.ts` — ARENA registry (phase 15): cathedral = assets/background.png
  + getArena fallback. Pick lives in FightExperience state (`arenaId`, localStorage
  `frozen-requiem.arena.v1`), NEVER in the provider. New background = drop file in
  public/assets + ONE ArenaDef row (the picker + persistence + stage wiring all follow).
- `src/ui/FightExperience.tsx` — zero-prop presentation. CAL block = baked-art
  geometry, values NEVER changed; drawn HUD cover plates expand past the CAL box at
  render time (`pctRectPad`, NamePlate CENTER_REACH 2.4). CLIP_RATE = 2.0. fxReducer
  takes ACTIONS (clipEnd stale-gate: only an ended element whose state+takeIdx matches
  what is shown may drive a transition — hidden opacity-0 videos are live actors).
  Victory-chain arm rides IN FxState (race-proof).
- `src/ui/fight.css` — SWOOBZ TOKENS (phase 15, extracted live from Tim's staging /ds
  page; full set + extraction recipe in global memory `swoobz-ds-tokens.md`):
  ink #07080c / coal #0d0f15 / glass rgba(13,15,21,.72) / line rgba(255,255,255,.08) /
  bone #f2f3ef / fog #98a1b3; accents cyan #29E6FF (accent TEXT <32px = #00D0DE, fills
  #0EA5E9), gold #FFC83D, blood #FF4135. Fonts: Space Grotesk (UI) / JetBrains Mono
  (numbers, tabular-nums) / Anton (hero: logo, banners, section titles). Wordmark
  public/assets/swoobz-logo.svg. `--fr-plate-cover` = FULLY OPAQUE coal (0.94 alpha
  ghosted bright baked text). Never combine -webkit-text-stroke with
  background-clip:text (Chrome miter-spike).
- `scripts/` — durable pipeline tools: `key-idle-clips.mjs` (THE keying recipe),
  `edge-feather.mjs` (straight band — legal ONLY for prop overflow),
  **`radial-feather.mjs` (THE effect-clip feather: asymmetric-ellipse falloff centered
  on the character, feet-protecting ryDown, 12px safety ramp; defaults cx .5 cy .56
  rx .53 ryUp .61 ryDown .68 band .78-1.02)**, `magenta-neutralize.mjs` (interior
  magenta fixer — WARNING: any re-encode can crush a feather, re-run the inset-ring
  profile after it, learning 23). Encode: `ffmpeg -framerate 24 -i f%03d.png -c:v
  libvpx-vp9 -pix_fmt yuva420p -b:v 0 -crf 24 -row-mt 1 -auto-alt-ref 0 out.webm`.
- `CHARACTER-CONTRACT.md` — THE LAW (§6 step 4 per-frame QA sweep, §9 combo strings,
  §10 variants, §11 specials). FIGHT-SPEC.md §8 overrides earlier sections.

## 3. Hard-won learnings (each cost real credits, debugging, or a Tim re-report)

Generation (Seedance 2.0 via Higgsfield MCP) — unchanged from phase 12, still law:
1. Anchor hygiene is everything (dirty plate = grey-disc hallucinations; inspect at
   full res; "auto" aspect resolves square-to-square).
2. The model PAINTS whatever the prompt narrates (grab verbs materialize opponents;
   negatives do NOT stop baked impact flashes; defeat clips describe only the RESULT).
3. The phantom-opponent class survives one solo re-roll — budget 2+ rolls or choose
   opponent-free acting.
4. Effect/prop content runs off the SOURCE frame — cut is in the pixels; wide-framing
   prompts shrink but never eliminate it. See learning 23 for the CURRENT fix doctrine.
5. Late-reading reaction clips are head-trimmable FREE (motion-energy trace).
6. Preset interception: retry same params + `declined_preset_id`.
7. Anchor lock works (start==end==references); directional acting prompts in ART space.
8. Costume drift under effect light: lock the outfit in the prompt.

QA discipline:
9. Numeric all-frame scans + per-frame sheets over DARK; adjudicate visually; judge
   mattes over black AND white.
10. The foreign-object/consistency sweep is a standing gate (contract §6 step 4,
    global character-clip-qa gate 5, slot-known-regressions A15-A18).
11. Judge facing by the HEAD at full resolution.
12. Ground truth for "is the clip playing": hook HTMLMediaElement.play via
    evaluateOnNewDocument; multiple play() entries = hitstop cycles, check currentTime.
13. A headless click helper must VERIFY registration and retry; drives hunting a
    specific outcome must RANDOMIZE picks (the AI reads patterns).
14. contacts are MEASURED (motion-energy peaks), never guessed.
15. Hidden video elements are live actors — the clipEnd stale-gate covers new one-shot
    states; do not bypass it.

Environment:
16. Background dev-server notifications lie — `curl -s -o /dev/null -w "%{http_code}"
    http://localhost:5340/` is the truth. DEV-SERVER HYGIENE LAW applies.
17. Parallel `curl a & b & wait` in the Bash tool loses downloads — sequential.
18. Headless recipe: puppeteer-core via createRequire on the export root package.json,
    system Chrome, `--autoplay-policy=no-user-gesture-required`. Proven driver patterns
    in the 2026-07-20 scratchpad (rewrite from descriptions if gone): verify-forfeit.mjs
    (two-context multiplayer + money assertions), verify-swoobz.mjs (visual sweep +
    persistence), verify-flamefix.mjs (special-clip burst). Selectors: `.fr-overlay`
    `.fr-pick` `.fr-fighter` `.fr-state-video` `.fr-connlost(-auto)` `.fr-autoplay-note`
    `.fr-arena-tile(-selected/-locked)` `.fr-nameplate` `.fr-wordmark`, buttons by text.
19. The environment persists shell cwd — absolute paths; check `git status` before
    `git add -A` (Tim drops new files into input/ mid-session; never sweep them
    blindly — ask/flag what they are).
20. Two agents editing one file collide — partition ownership up front; sequence
    follow-ups with SendMessage to the SAME agent.
21. **Success paths must cancel their timeout timers** (phase 13, caught live only):
    a connect-timeout emitted presence(false) OUTSIDE the settled guard 5s after a
    SUCCESSFUL createRoom — phantom-disconnect aborted a live match while 11 unit tests
    passed (each finished inside the window). Clear the timer on settle AND bail
    `if (settled)` first. THE ACCEPTANCE DRIVE MUST OUTLAST THE LONGEST TIMEOUT IN THE
    SYSTEM. Regression pattern: injectable timeout, succeed, wait past it, assert no
    event; verify the test fails pre-fix.
22. Two-page multiplayer drives need ISOLATED incognito contexts (shared localStorage
    corrupts money assertions) + a window.WebSocket frame-log hook as ground truth.
    Multi-page headless also wants the --disable-background-timer-throttling family.
23. **The effect-clip feather doctrine** (phases 11b -> 14 -> 14b, Tim re-reported
    TWICE): (a) outermost-pixel edge scans LIE — use the INSET-RING profile (max alpha
    at 2/10/25/49/80px; 255 inside ~15px = cut); (b) ANY re-encode can crush a feather
    (magenta-neutralize collapsed 48px to 8px); (c) a soft STRAIGHT fade still reads
    as "the box" — the eye reads the fade CONTOUR, not the hardness. Fix of record =
    `scripts/radial-feather.mjs` on PRE-feather frames from git (never stack contours),
    cache-bust rename, verify curve + live peak (burst on VIDEO VISIBILITY
    opacity>0 && currentTime>0.1, not banner text). Straight bands only for prop tips.
    Codified: global memory effect-clip-edge-cut.md, character-clip-qa gate, and
    character-assets Rule 4 (generation-time: wide framing + radial as STANDARD stage).
24. **Cover-plate law** (phase 15): drawn HUD over baked art must be alpha 1.0 (0.94
    ghosts bright baked text) and cover the FULL baked footprint (wider than the CAL
    box — expand at render time, asymmetric toward where the baked art extends; CAL
    values themselves never change). Verify over the baked bg AND a plain dark
    override. Global: swoobz-ds-tokens.md.
25. Vite HMR reloads pages mid-drive while a builder edits — never live-drive a moving
    tree; wait for the builder to land, and restart the server for matchRelay.ts edits.

## 4. Credits / generation facts (Higgsfield MCP)

- Balance ~838 (phases 13-15 spent ZERO credits — pure code/engineering).
  Seedance 2.0 4s 1080p std = 36 cr/clip; `get_cost:true` on generate_video is the
  preflight. ALWAYS preflight + Tim's per-batch OK. Upload path: media_upload ->
  presigned PUT (curl) -> media_confirm.
- Persistent media ids: **GORVAK CLEAN anchor `35867470-54cd-4e75-94a6-10b915c61b19`**
  (the old `23fb74be...` is RETIRED — grey wedge, hallucinations), VOLTA anchor
  `19539771-3ddb-424d-a9af-a5bfc280957a`, black plate 1024
  `b757c6e3-263a-4eb6-a800-d37fd3391c77`.
- Job ids live in phase commit messages + project memory.

## 5. What to do next (Tim's priority order — ask him which)

1. **Custom arena background #2**: Tim drops an image -> public/assets + one ArenaDef
   row -> live-drive the drawn HUD over it (the phase-15 dark-bg probe predicts it
   works; a real image is the true test). Zero credits, minutes of work.
2. **Character #3**: one art drop from Tim -> keyed still -> clean anchor plate
   (inspect at full res) -> acting table (prefer opponent-free acting) -> kit
   generation (~36cr/clip, batch-approved) -> per-frame sweep BEFORE keying -> key ->
   RADIAL-FEATHER any effect clips (learning 23 / character-assets Rule 4) -> measure
   contacts -> ONE manifest file -> live-drive both slots. Pipeline proven twice.
3. **Announcer VO** (RG-C5: zero-param audio fns, value-independent fanfares).
4. **VS splash diagonal split** per FIGHT-SPEC.
5. **Optional multiplayer polish**: in-room rematch protocol (currently each rematch
   creates a fresh room to share again); peer payload schema validation; waiting-room
   tab-close still eats the stake (nothing alive to refund — needs storage-side
   recovery if Tim cares).
6. **Optional visual polish, only if Tim asks**: variant pairs for ko/victory/special
   (single-take deviation on record); idle loop-seam nits; select-screen baked HUD
   showing through the top scrim (pre-existing, now partially covered by phase-15
   plates); Anton letter-spacing taste pass (tuning knobs per banner in fight.css).
7. **If Tim reports feel issues**: CLIP_RATE (2.0) and provider windows are the levers.

## 6. Gates before ANY commit (all of them, quote real output)

`npx tsc --noEmit` clean; `npx vitest run` **81/81** (grows with new test files; suite
runs serial — fileParallelism:false kills a Windows tinypool flake); `npm run build`
ok; `git diff --stat` shows fightEngine.ts + fightAi.ts untouched (provider frozen too
unless the task IS the provider); live headless drive of the changed surface
(randomized picks; play-hook ground truth; screenshots you have VIEWED; two isolated
contexts + frame-log for anything multiplayer; drives outlast the longest timeout);
for any new/changed clip: §6-step-4 per-frame sweep + INSET-RING profile + composite
over dark (+ radial feather for effects); no em-dashes in user-facing copy; RG-C5
(zero-param audio, module-const timings, value-independent celebrations; auto-play
picks from randomMove only). Commit with
Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>. Repo git config: user.name Tim,
user.email erstrijbis@gmail.com (set locally).

## 7. Memory locations (SAVE-GLOBAL check before ending any task)

Project memory: `~/.claude/projects/...streetfighter/memory/frozen-requiem-state.md`
(full phase log, current through phase 15). Global (`~/.claude/memory/` + MEMORY.md
index): `effect-clip-edge-cut.md` (radial-feather doctrine), `swoobz-ds-tokens.md`
(exact DS tokens + extraction recipe + cover-plate law),
`stale-timeout-timer-phantom-events.md` (timer law + drive-outlasts-timeout),
`genvideo-character-clip-lessons.md`, anchor hygiene in the `higgsfield-generation`
skill. Global skills: `character-clip-qa` (inset-ring + radial gates, stormforge
`8db99c2`), `character-assets` Rule 4 (effect clips at generation),
`slot-known-regressions` A15-A18. Artifacts for Tim: `specials-preview.mp4` at the
repo root + the claude.ai artifact "Frozen Requiem: Special Attacks". Update project
memory + this handoff at every phase boundary.
