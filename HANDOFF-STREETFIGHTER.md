# HANDOFF — Frozen Requiem (RPS-as-MK-fighter), for a fresh Fable 5 session

Working title Frozen Requiem. Folder `streetfighter/` (own git repo inside the
swoobz-games-export export). Dev server port **5340 strictPort**. Tim's art in `input/`
is canonical. Phase 13 (real multiplayer) committed 2026-07-20.
Everything below is VERIFIED, not self-reported: every phase was live-driven headless
before its commit. Rewritten clean 2026-07-18 after phase 12; amended for phase 13.

FRESH-SESSION START HERE (in this order, before touching anything):
1. Read this file fully, then `CHARACTER-CONTRACT.md` (THE LAW) if the task touches
   characters, and `FIGHT-SPEC.md` §8 for game rules.
2. Read project memory `frozen-requiem-state.md` (full phase log, phases 3-13).
3. `git log --oneline -15` to confirm HEAD matches; `npx vitest run` should print 74/74.
4. Ask Tim which backlog item (section 5) to start, or continue his explicit ask.

## 0. Operating model (Tim's standing directive — read first)

You are the ORCHESTRATOR: plan, brief, verify, review, commit. Specialized subagents
(Opus 4.8 builders via the Agent tool) do the building from implementation-grade briefs
(`subagent-briefing` skill: context/task/constraints/expected output/verification);
autisk runs pixel QA sweeps; run generation (Higgsfield MCP) yourself — the media ids,
cost preflights and Tim's approvals live in YOUR loop. NEVER trust a builder's or
reviewer's self-report — re-run its gates yourself, view its evidence with your own
eyes, then live-drive the real game before committing. Same rule inverted for QA
reports: verify a reviewer's CRITICAL findings at full res yourself before spending
credits or pulling assets on its word. Tim approves every credit spend per batch (hard
law); when he is AFK on a spend question, do the free/reversible fixes, hold the spend.
He answers fast and concretely — treat his defect reports as correct SYMPTOMS and
measure the mechanism (right about the symptom every time, ~half the time about the
mechanism). Update project memory + this handoff at every phase boundary, and route
durable lessons to their global homes (SAVE-GLOBAL law).

## 1. What the game is now (state at HEAD)

A complete, playable, staked MK-style duel. Flow: title -> mode (CPU personality
brute/warden/oracle or friend create/join) -> character select (MK1-style: live idle
previews, 22-slot roster = 2 real + 20 mystery "?") -> stake (winner-takes-all, pot 2S)
-> vsIntro -> rounds (STRIKE>THROW>BLOCK>STRIKE, 3 HP, best-of-3, 5s shot clock,
tie=CLASH) -> receipt -> rematch/character select/quit.

BOTH characters (GORVAK orc / VOLTA cyber-brawler) ship the FULL contract kit:
- idle (single, the anchor hub) + interchangeable takes of attack_strike / attack_throw
  / attack_block / hit (contract §10: uniform-random per exchange, distinct actions).
  Two states run ONE take by Tim's ruling (2026-07-18, accepted §10 deviation, NO regen
  planned): VOLTA attack_throw (b-take pulled: baked phantom opponent) and GORVAK
  attack_strike (a-take pulled: frame-fixed lavender disc + cleaver-to-staff morph).
  The pulled webms stay in public/assets for reference; they are just unwired.
- a SPECIAL finisher (§11): GORVAK flaming cleaver circle, VOLTA lightning spin — plays
  automatically on any round-ending win, baked elemental trail (the sanctioned effect
  exception, "Scorpion quality"; fire is APPROVED for specials — the earlier fire ban
  applied to the old ember impact-burst only). Both re-encoded through
  scripts/magenta-neutralize.mjs (face blotches / pink lightning bands neutralized;
  fire + cyan untouched by the min(R-G,B-G) family test).
- ko (phase 12): cause-free exhaustion collapse, holds motionless on the ground, the
  ONE off-anchor clip. Head-trimmed on the motion-energy trace (GORVAK -24f, VOLTA
  -20f) so the buckle reads early; trim points verified near-anchor.
- victory (phase 12): anchor-locked round-win taunt. On a round-ending win the winner's
  finisher CHAINS into victory; through the roundEnd (2000ms) / matchEnd dwell the ko
  body stays DOWN and the taunt keeps playing (behind the receipt too); every other
  phase fully resets both fighters to idle. Single takes each (cost call, on record).

Presentation systems, all clip-driven: combo strings (1-3 `contacts` per attack take,
per-contact ring/glow/echo/spark/hitstop/shake, defender hit-clip re-trigger via
`hitRetrigger`, "N HITS" counter, "-1" floater on the FINAL contact only), clip-driven
CLASH (both play the shared attack state, freeze together at the later first-contact,
frost shock rings, cut back to idle), frost parry arc on block wins, eased everything.
KO = hitstop + launch + zoom + the real ko clip + grayscale loser dim (reads well).
Zero remaining CSS-only combat paths in practice (the pre-clip choreography survives
as the contract fallback ladder for future clip-less characters).

## 2. Architecture map (stable — learn before touching anything)

- `src/engine/fightEngine.ts` + `fightAi.ts` — **BYTE-FROZEN since phase 1**. Never
  edit; every commit checks `git diff --stat` shows them untouched.
- `src/engine/fightStakes.ts` — pure bigint stake math.
- `src/provider/fightProvider.ts` — the state machine. Module-const timings (RG-C5),
  StrictMode-safe, identity-agnostic. Resolve windows: RESOLVE_HIT_MS 2000 /
  RESOLVE_KO_MS 2400 / RESOLVE_MS 1800 (clash) / ROUND_END_MS 2000. Windows must FIT
  the clip beat — a too-short window cuts the swing pre-contact ("i dont see the
  animation"). Phase flow on a round win: resolve (2400) -> roundEnd (2000) -> next
  round, or -> matchEnd (terminal, receipt overlay over the live stage).
- `src/characters/` — types + manifests + registry. `clips` accepts
  `FighterClip | FighterClip[]`; `clipVariants(def, state)` in types.ts is THE resolver
  every path routes through. A new character = ONE manifest file. `special`, `ko`,
  `victory` are states like any other. NO fxImpact on current characters (deprecated;
  §7 machinery legal but opt-in).
- `src/ui/FightExperience.tsx` — zero-prop presentation. CAL block (baked-HUD
  %-positions, do not touch values) / SELECT_CAL / CHO (choreography consts).
  CLIP_RATE = 2.0. Fighter stacks one preloaded <video> per VARIANT (key
  `${state}-${i}`), never src-swaps. **fxReducer takes ACTIONS since phase 12**:
  plain patch, `clipEnd` (a one-shot's natural end; ALL policy pure in the reducer:
  stale-gate -> ko hold -> victory chain -> idle), `phaseReset` (dwell-aware reset).
  THE STALE-GATE LAW: deactivated clips keep playing hidden at opacity 0 and their
  late onEnded still fires — only an ended element whose (state, takeIdx) MATCHES what
  that fighter currently shows may drive a transition. The victory chain arm rides IN
  FxState (race-proof across the resolve->roundEnd flip, measured ~1ms apart in either
  order). Variant pick per exchange is dispatched into FxState (p1Var/p2Var) so render
  + timing read the SAME index.
- `src/ui/fight.css` — never combine -webkit-text-stroke with background-clip:text
  (Chrome miter-spike). Fight fx all on cubic-bezier(0.22,1,0.36,1).
  **SWOOBZ SKIN since phase 15**: tokens extracted live from Tim's staging /ds page
  (headless computed-style dump — the page itself is token-first, no hexes in HTML):
  ink #07080c / coal #0d0f15 / glass rgba(13,15,21,.72) / line rgba(255,255,255,.08) /
  bone #f2f3ef / fog #98a1b3; accents volt #00F0FF, cyan #29E6FF (accent TEXT <32px
  must be #00D0DE per brand OLED rule; fills #0EA5E9), gold #FFC83D, blood #FF4135.
  Fonts: Space Grotesk (UI), JetBrains Mono (numbers/micro, tabular-nums), Anton
  (hero: logo, banners, section titles, select name). Wordmark public/assets/
  swoobz-logo.svg (from input/). HUD chrome is DRAWN (background-independent) at the
  CAL positions: nameplates/timer/pips are FULLY-OPAQUE `--fr-plate-cover` COVER
  plates expanded past their CAL box (pctRectPad + NamePlate CENTER_REACH 2.4) to
  mask the baked chrome completely — 0.94 alpha let bright baked text ghost through
  (learning: covers over baked art must be alpha 1.0 and cover the FULL baked
  footprint; verify over the cathedral AND a plain dark override). HP fill #0EA5E9->
  #29E6FF, pips gold, danger blood; frost fight fx stay icy but in the cyan family.
- `src/arenas/arenas.ts` — the ARENA registry (phase 15): one real entry (cathedral =
  assets/background.png) + getArena fallback. The pick lives in FightExperience state
  (`arenaId`, localStorage `frozen-requiem.arena.v1`), NEVER in the provider; the
  charSelect screen has the ARENA tile row (1 real + 4 locked '?' tiles, selected =
  cyan border, live backdrop preview). NO popup anywhere; changing arenas = go to
  character select manually (Tim's rule). New backgrounds: drop the file in
  public/assets, add ONE ArenaDef row.
- `src/transport/matchTransport.ts` — PvP seam. **REAL since phase 13**: `WsTransport`
  (one lazy socket to `/fr-ws`, queue-before-open, 5s connect timeout that is CLEARED on
  settle and settled-guarded — learning 21) + `LocalSimTransport` (tests/sim injection
  only). Interface carries `sendPick(move, exchange)` + `sendProfile(fighterId)`.
- `src/server/matchRelay.ts` — the ws room relay embedded in vite dev AND preview via a
  plugin (`vite.config.ts`); `noServer:true` upgrade listener owns ONLY `/fr-ws`, never
  touches Vite HMR upgrades. Dumb verbatim relay: rooms by FRZxxx code, 2 clients, peer
  presence, pick/profile relay (profile buffered until pairing), room drops on either
  close. Zero game logic server-side; each client runs the engine (RPS resolution is
  symmetric, so both converge without an authority).
- Provider friend-mode machinery (phase 13, revised phase 14 per Tim's "never forfeit,
  auto pick"): transport acquired FRESH per friend match (CPU mode constructs none);
  opponent picks buffered in a Map keyed by exchange index and drained on beginPicking.
  DISCONNECT DOCTRINE (phase 14): mid-match peer drop -> server holds the room a
  RECONNECT_GRACE_MS (10s) window (survivor sees pulsing `RIVAL CONNECTION LOST`,
  `.fr-connlost`; picks toward the absent member are buffered + flushed on resume);
  WsTransport auto-reconnects with a resume token (fresh socket + `{t:'resume'}`); grace
  expiry -> `{t:'peerGone'}` -> AUTO-PLAY: the match CONTINUES, absent player's picks =
  `randomMove` uniform (Nash-neutral, unexploitable, RG-C5 value-independent; NEVER
  aiPick), banner `RIVAL LEFT, AUTO PLAY` (`.fr-connlost-auto`), matchEnd note
  `.fr-autoplay-note`, settle by REAL KO only (survivor can honestly win or lose vs the
  ghost; leaver always nets -stake; ghost-win = pot uncollected, Tim's accepted
  trade-off, on record). NO mid-match refunds ever (the rage-quit exploit). Stake
  one-shot `stakeCommittedRef`: refund ONLY for never-started matches (waiting-room
  back-out, join fail, connect fail — two silent stake leaks fixed in phase 14).
  matchEnd disconnect is a no-op. Friend rematch still creates a fresh room each match
  (v1 limitation). Opponent identity relays as an OPAQUE fighter id; mirror matches
  render correctly. matchEnd overlay derives its winner from engine matchOver with a
  receipt fallback (`endWinner`).
- `scripts/` — the durable pipeline tools:
  - `key-idle-clips.mjs` — THE keying recipe (border-ring median screen color, tight
    global key + border-seeded flood fill with magenta-family candidacy, edge-band
    despill 0.12, GLOBAL interior magenta-family suppress SUPPRESS_MIN 28 / KEEP 0.25 —
    safe ONLY while no character wears magenta, 2px feather, union-bbox crop, cal JSON
    via `--still`; cals are NEVER hand-derived).
  - `edge-feather.mjs` — post-key smoothstep alpha ramp per edge (`--top 48` etc.),
    LEGAL ONLY for prop overflow (a raised cleaver tip); for EFFECT clips use
    radial-feather.mjs (learning 23: a straight fade contour reads as a box).
  - `radial-feather.mjs` — the effect-clip feather of record (phase 14): asymmetric-
    ellipse falloff centered on the character + 12px straight safety ramp; run on
    PRE-feather frames restored from git; verify inset-ring profile + viewed curve.
  - `magenta-neutralize.mjs` — second-pass interior magenta-family neutralizer for
    keyed frame dirs (`<dir> 14 0.15`); fixes purple/pink residue pockets without
    touching fire (fails B>G) or cyan (fails R>G). Also works decode->fix->re-encode
    on already-shipped webms (`ffmpeg -vcodec libvpx-vp9 -i clip.webm` keeps alpha).
- Encode recipe: `ffmpeg -framerate 24 -i f%03d.png -c:v libvpx-vp9 -pix_fmt yuva420p
  -b:v 0 -crf 24 -row-mt 1 -auto-alt-ref 0 out.webm`.
- `CHARACTER-CONTRACT.md` — THE LAW. §6 step 4 = the per-frame QA sweep (see learning
  19), §9 combo strings, §10 variants, §11 specials. Read fully before any character
  work. FIGHT-SPEC.md §8 overrides earlier sections.

## 3. Hard-won learnings (each cost real credits or debugging — do not relearn)

Generation (Seedance 2.0 via Higgsfield MCP):
1. **Anchor hygiene is everything.** A dirty anchor plate comes back as grey-disc
   hallucinations. Inspect the plate at full res; rebuild from the keyed still on pure
   magenta; scrub remnants with a SEEDED flood fill. Match `aspect_ratio` to the anchor
   or pass "auto" (phase 12: "auto" DID resolve square-to-square correctly).
2. **The model PAINTS whatever the prompt narrates** — the unifying law behind three
   burned batches: grab verbs materialize an opponent (phantom arms, ghost bodies);
   "an unseen blow arrives... the impact is INVISIBLE" still baked a spark burst over
   VOLTA's head and a face-spray on GORVAK (negatives do NOT stop it); defeat clips
   must describe only the RESULT ("his strength leaves him, knees buckle, collapses
   under his own weight" — clean first try). Solo prompts state "the ONLY figure in
   the frame, only her own two arms appear, hands stay empty".
3. **The phantom-opponent class survives one solo re-roll** (VOLTA throw-b: the re-roll
   of a phantom-limb reject STILL carried a ghost opponent and hid for a phase).
   Grab/clinch acting = solo-safety unproven until the per-frame sweep passes; budget
   2+ rolls or choose opponent-free acting.
4. **Effect/prop content runs off the SOURCE frame** — the cut is in the pixels, not a
   CSS box; wide-framing prompts shrink but never eliminate it. After keying: per-frame
   edge-touch alpha scan (numbers convict; spot frames lie), then
   `scripts/edge-feather.mjs` on the offending edges only. Applies to solid props too
   (a feathered cleaver tip reads as motion softness). Never re-generate for this.
5. **A late-reading reaction clip is head-trimmable FREE** when the trim point still
   reads near-anchor. Phase 12 kos: measure per-frame motion energy, trim the sag so
   the buckle reads inside the early-impact window (~0.3s game time), verify the
   trim-point pose vs the anchor at full res (masked by hitstop + launch anyway).
6. **Preset interception:** prompts matching a Higgsfield preset return a notice
   instead of generating; retry same params + `declined_preset_id`.
7. **Anchor lock works:** start_image == end_image == image_references = seamless loop
   + identity (ko: start + references only — it must END off-anchor). Directional
   acting is prompted in ART space (the blow comes from the character's FACING side —
   RIGHT for both current characters).
8. **Costume drift under strong effect light:** lock it in the prompt ("his outfit
   stays dark leather ... even when lit by fire").

QA discipline (the phase-12 sweep caught two shipped defects older QA had passed):
9. **Numeric all-frame scans + per-frame sheets over DARK, never spot frames.** Defects
   hide over the magenta plate and exactly between samples. Adjudicate visually over
   dark; judge mattes over black AND white.
10. **The foreign-object/consistency sweep is a standing gate** (Tim's ruling: learn,
    don't regen). Before wiring ANY batch and again all-clips after it lands: phantom
    bodies/limbs, frame-fixed remnants (body moves, blob doesn't = keyed backdrop
    remnant, not motion blur), weapon silhouette held at every contact frame, baked
    impact flashes, costume/palette drift. Codified: contract §6 step 4, global
    character-clip-qa skill gate 5, slot-known-regressions rows A15-A18 (stormforge
    `f5bcb03`). autisk runs it well from an implementation-grade brief — but VERIFY its
    CRITICALs with your own eyes before acting on them.
11. **Judge facing by the HEAD at full resolution** (a body can stance one way while
    the head reads the other — the head is what reads).
12. **Ground truth for "is the clip playing"**: hook HTMLMediaElement.prototype.play
    via page.evaluateOnNewDocument and log src+timestamp; DOM opacity sampling misses
    everything. Multiple play() entries for one clip = hitstop pause/resume cycles, not
    re-triggers (check currentTime monotonicity before calling it a §9 violation).
13. **A headless click helper must VERIFY registration and retry** (pick buttons
    unmount on lock; the 5s shot clock auto-picks and frames the game for a bug it
    does not have). And the AI reads pick patterns (warden counters throw-spam) —
    drives hunting a specific outcome must RANDOMIZE picks.
14. **contacts are MEASURED, never guessed**: motion-energy peaks confirmed
    frame-by-frame on the sheet. Same tool decides head-trims (learning 5).
15. **Hidden video elements are live actors** — the phase-12 race: a PREVIOUS
    exchange's hit clip, deactivated but still playing at opacity 0, reached its
    natural end mid-finisher and consumed the victory arm. Any onEnded/onPlaying
    driven policy must gate on element identity (state+takeIdx) vs what is actually
    shown. If you add new one-shot states, the reducer's clipEnd stale-gate already
    covers them — do not bypass it.

Environment:
16. **Background dev-server notifications lie** — `curl -s -o /dev/null -w
    "%{http_code}" http://localhost:5340/` is the truth. DEV-SERVER HYGIENE LAW: kill
    only PIDs whose command line points at THIS project, then start your own
    (--strictPort), kill your own PID when done.
17. **Parallel `curl a & b & wait` in the Bash tool loses downloads** — sequential.
18. **Headless recipe:** puppeteer-core via
    `createRequire('C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/package.json')`,
    system Chrome, `--autoplay-policy=no-user-gesture-required`. The proven acceptance
    driver pattern (play-hook + visible-video probes + event-triggered screenshots +
    randomized picks) is `verify-phase12.mjs` in the 2026-07-18 session scratchpad —
    REWRITE it fresh from this description if gone (scratchpads die with sessions;
    selectors: `.fr-overlay` `.fr-pick` `.fr-fighter` `.fr-state-video`, buttons by
    text BRUTE/CONFIRM/FIGHT/REMATCH/CHARACTER SELECT).
19. **The environment persists shell cwd across commands** — a leaked `cd` once
    polluted a commit. Absolute paths; check `git status` before `git add -A`.
20. **Two agents editing one file collide** — partition ownership up front (phase 12:
    builder owned FightExperience.tsx, orchestrator owned manifests; stated explicitly
    in both briefs) and sequence follow-up briefs with SendMessage to the SAME agent
    (it keeps its context; round 2 cost no re-onboarding).
21. **Success paths must cancel their timeout timers** (phase 13, caught live only): a
    connect-timeout whose callback emitted presence(false) OUTSIDE the settled guard
    fired 5s after a SUCCESSFUL createRoom and phantom-disconnect-aborted the creator's
    live match — while 11 unit tests passed (each finished inside the timeout). The
    acceptance drive must OUTLAST the longest timeout in the system. Fix pattern: clear
    the timer on settle AND bail `if (settled)` first in the callback.
22. **Two-page multiplayer drives need ISOLATED incognito contexts**
    (`browser.createBrowserContext()` per player) — same-context tabs share
    localStorage, so both players would share one practice bank and corrupt the settle
    assertions. Also wrap `window.WebSocket` in evaluateOnNewDocument to log /fr-ws
    frames (send+recv) — that frame log is ground truth for "who knew what when" and
    convicted learning 21 in one read. Driver of record: `verify-multiplayer.mjs` in
    the 2026-07-20 session scratchpad (rewrite from this description if gone).
23. **Edge-touch scans lie; ANY re-encode can crush a feather; and a SOFT STRAIGHT
    fade still reads as a box** (phase 14, Tim's outthebox report — TWICE): the shipped
    specials passed the outermost-pixel edge scan (edge alpha 0) while alpha hit 255
    just 10px in (the phase-12 magenta-neutralize re-encode collapsed the 11b feather
    to ~8px = razor cut). First fix attempt (wide 120px STRAIGHT-band re-feather)
    softened the edge but Tim re-reported correctly: the fade CONTOUR was still the
    rectangle, and the eye reads the contour, not the hardness. THE RECIPE OF RECORD
    for effect clips is now `scripts/radial-feather.mjs`: asymmetric-ellipse falloff
    centered on the character (defaults cx .5 / cy .56 / rx .53 / ryUp .61 /
    ryDown .68, band .78->1.02, 12px straight safety ramp) applied to the PRE-feather
    frames from git (never stack contours), so rings/arcs thin along their own
    curvature; planted feet at bottom-center stay protected by the larger ryDown.
    Verify = inset-ring profile (ramps like 0/14/113/206/250) + VIEWED composite (the
    fade must follow a curve) + in-arena capture. Cache-bust the filename on any asset
    swap (-r2) so a stale browser can't show the old clip. Straight-band edge-feather
    stays legal only for PROP overflow (a cleaver tip), never for effects. Also: Tim's
    mechanism guesses stay ~50% but his symptom reports are exact — and my repro burst
    missed the arc peak twice; trigger bursts on VIDEO VISIBILITY
    (opacity>0 && currentTime>0.1), not on banner text.

## 4. Credits / generation facts (Higgsfield MCP)

- Balance ~838 after phase 12 (216 spent: 144 approved batch + 72 approved ko re-roll;
  the two v1 kos were burned credits — learning 2). Seedance 2.0 4s 1080p std = 36
  cr/clip; `get_cost:true` on generate_video is the preflight (there is no separate
  get_cost tool). ALWAYS preflight + Tim's per-batch OK. Upload path works agent-side:
  `media_upload` -> presigned PUT (curl) -> `media_confirm`.
- Persistent media ids (start/end/image_references):
  **GORVAK CLEAN anchor `35867470-54cd-4e75-94a6-10b915c61b19`** (USE THIS — the old
  `23fb74be...` is RETIRED: grey wedge, causes hallucinations),
  VOLTA anchor `19539771-3ddb-424d-a9af-a5bfc280957a`,
  black plate 1024 `b757c6e3-263a-4eb6-a800-d37fd3391c77`.
- Phase 12 job ids: gorvak-victory `5c3421c1`, volta-victory `c90683b8`, gorvak-ko-v2
  `d7dee08e`, volta-ko-v2 `8e2b4d91` (v1 rejects `abdf2dda` / `e3807258`). Every
  accepted clip is committed in public/assets; job ids live in phase commit messages +
  project memory.

## 5. What to do next (Tim's priority order — ask him which)

DONE phase 13 (2026-07-20): real multiplayer transport (was #1) — two-browser staked
match live-verified end-to-end incl cross-client consistency, exact settle math both
sides, mirror + non-mirror identity relay, disconnect refund, CPU-mode regression
smoke. Loss-path receipt (was #4) verified live in the same drive (DEFEAT / $0.00 /
bank $995 screenshot viewed). Known v1 limitations, on record: friend rematch creates
a FRESH room (no in-room rematch protocol); peer pick payloads are not schema-validated
(localhost practice-bank mockup); after a peer disconnect our own socket stays open
until the next menu action / friend match (then disposed).

1. **Announcer VO** (RG-C5: zero-param audio fns, value-independent fanfares).
2. **VS splash diagonal split** per FIGHT-SPEC.
3. **Character #3**: one art drop from Tim -> keyed still -> clean anchor plate
   (INSPECT it at full res, learning 1) -> acting table (contract §3; prefer
   opponent-free acting, learning 3) -> kit generation (~36 cr/clip, batch-approved) ->
   per-frame sweep (learning 10) BEFORE keying -> key -> measure contacts -> ONE
   manifest file -> live-drive both slots. Pipeline fully proven twice.
6. **Optional polish, only if Tim asks**: variant pairs for ko/victory/special
   (single-take deviation on record); regen of the two pulled takes (Tim ruled NO on
   2026-07-18 — do not re-raise unless he does); idle loop-seam nits (fighter-2 idle
   wrap ~3.5x a normal frame step — autisk NIT, animotty domain); GORVAK hit-b slow
   recovery vs §9 re-trigger readability.
7. **If Tim reports feel issues**: CLIP_RATE (2.0) and provider windows are the levers.
   Victory's last ~250ms is cut by the roundIntro flip (anchor-to-anchor, reads clean —
   a full play would need a ROUND_END_MS bump, taste call for Tim).

## 6. Gates before ANY commit (all of them, quote real output)

`npx tsc --noEmit` clean; `npx vitest run` **74/74** (grows with new test files);
`npm run build` ok; `git diff --stat` shows fightEngine.ts + fightAi.ts untouched;
live headless drive of the changed surface (both pick paths for anything touching
characters; randomized picks; play-hook ground truth; screenshots you have VIEWED);
for any new/changed clip: the §6-step-4 per-frame sweep + edge-touch scan + composite
over dark; no em-dashes in user-facing copy; RG-C5 (zero-param audio, module-const
timings, value-independent celebrations — variant picks from Math.random only, the
special/victory from round state only). Commit with
Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>. Repo git config: user.name Tim,
user.email erstrijbis@gmail.com (set locally).

## 7. Memory locations (SAVE-GLOBAL check before ending any task)

Project memory: `~/.claude/projects/...streetfighter/memory/frozen-requiem-state.md`
(full phase log, phases 3-13 — current through phase 13). Global:
`~/.claude/memory/MEMORY.md` index; `genvideo-character-clip-lessons.md` carries
lessons 8-9 (cause-free defeat prompts; phantom persistence); `effect-clip-edge-cut.md`;
anchor hygiene lives in the global `higgsfield-generation` skill. The QA sweep is
codified globally in `character-clip-qa` (gate 5) + `slot-known-regressions` (A15-A18),
both in stormforge `.claude/skills/` (git `f5bcb03`, junctioned into `~/.claude/skills/`
so every project loads them). Artifacts for Tim: `specials-preview.mp4` at the repo
root + the claude.ai artifact "Frozen Requiem: Special Attacks". Update project memory
+ this handoff at every phase boundary.
