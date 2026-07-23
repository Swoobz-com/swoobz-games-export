# HANDOFF — STANDOFF (RPS-as-MK-fighter), for a fresh Fable 5 session

Branded **STANDOFF** (Tim's pick 2026-07-20, over CLASH / DUEL ZERO / THROWDOWN; was
working title Frozen Requiem). Folder `streetfighter/` (own git repo inside the
swoobz-games-export export). Dev server port **5340 strictPort**. Tim's art in `input/`
is canonical (`input/progressivemap.jpg` = ANOTHER GAME'S map, reference-only, never
ship or commit it). HEAD at handoff: `bb4f0e7` (phase 22b — arena stage-aspect
crop fix). `npx vitest run` prints **148/148**. **PHASE 23 (boss character clip
generation) is IN PROGRESS and UNCOMMITTED — it is generation-only (Tim's ruling:
do NOT wire into the game yet, keep generating first), so there are NO game/src
changes; all work lives in the untracked `qa-boss/` dir + `scripts/prep-boss-anchors.mjs`.
Read the "## PHASE 23" section below FIRST if continuing the clip work.** Everything
else below is VERIFIED, not self-reported: every phase was
live-driven headless (screenshots VIEWED) before its commit. Rewritten clean 2026-07-21
after phase 17b; phases 18-19 appended 2026-07-22 (see project memory for full logs):
phase 18 quick-duel economy (CPU picks randomMove, win pays 1.92x = 96% RTP,
exploit-regression test), 18b demo rewards removed from map ("for now", re-add = one
registry row), 18c CSPRNG behind every money pick (`src/engine/secureRng.ts`; seeded
mulberry32 = tests/sims only), 19 lacquer-blade HUD extension (timer/nameplates/pick
buttons in the 17b language) + map label de-overlap (MAP_LABEL transform-only offsets)
+ node hit-area fix (button box pinned to disc width; every node center resolves to
itself in all progress states). Phase 20 (2026-07-22, `6cf027c`): Tim's final
per-node enemy art wired in (`input/characters/.../npc boss/` map 1-9 + finalboss;
registry `CampaignNodeDef.enemy {id,name}`, money fields byte-identical, fighterId
stays volta for fight visuals until clips exist), frontier-only ink-silhouette tease
on the map (`.fr-map-sil`, pointer-events:none), node card = named-mystery silhouette
until beaten then color-PFP reveal, `scripts/key-enemies.mjs` keyer with
enclosed-pocket cut + bgLikeKept self-check. See project memory phase-20 entry for
the keying lesson (verify "own-art color" claims against SOURCE pixels; a builder
invented "fan gems" to justify background leaks) + known cosmetic residuals.
**STANDING RULING (Tim 2026-07-22): skip EVERYTHING RONIN ZERO VENDING MACHINE for
now** — the untracked `pack-machine/` demo stays untracked and unworked until Tim
reopens it.

## PHASE 23 — BOSS CHARACTER CLIP GENERATION (IN PROGRESS 2026-07-23, RESUME HERE)

**The job (Tim, 2026-07-23):** generate full animated fighter clip kits for all 10
CONQUEST bosses so each node fights with its OWN character (today node fights still
show VOLTA's clips + the enemy's face/name from phase 20-21). Also queued after:
`input/MK FINAL/` roster (mythic 63 / legendary 39 / XGundam 156 / rare 114) + its
`backgrounds/` (134, animate like the phase-22 arena loops). READ `CHARACTER-CONTRACT.md`
FIRST (THE LAW: anchor-lock, per-char acting §3, ≥2 takes/state §10, special §11,
cause-free ko, solo-safe throws, QA sweep §6). Also global memory
`genvideo-character-clip-lessons.md` + `higgsfield-generation.md` (skill).

**TIM'S PHASE-23 RULINGS (all binding):**
1. **ZERO CREDITS. Generate ONLY via browser Higgsfield Unlimited** (free). NEVER the
   Higgsfield MCP for generation (it bills credits). MCP is allowed ONLY for free
   storage/reads (media_upload, show_generations, job_status, curl downloads).
2. **Do NOT wire clips into the game yet** — "keep generating first, we add it later."
   So NO src/ or manifest changes this phase; all output stays in `qa-boss/`.
3. **Background color is PER-CHARACTER so the key never eats body colors:** pink/red/
   warm-bodied bosses (IR-37 Pink Tessen, IR-48 Hex Paper Lord, Kitsune) generate on
   GREEN; green-bodied (IR-56 Lion-Serpent) on MAGENTA; neutral/steel (Sora Yari) either.
4. **Maps 5-10 bosses get 3 SPECIAL ATTACKS each** (signature finishers, contract §11).
5. **When waiting on a generation, CHECK ~EVERY 1 MINUTE** if it's done.
6. **Use the Chrome extension** (mcp__claude-in-chrome__*) — the generation runs in the
   automation tab titled "Create AI Videos ... | Higgsfield"; Tim watches that tab.

**THE PROVEN FREE PIPELINE (works end-to-end, all steps zero-credit):**
- ANCHOR PLATES: `node scripts/prep-boss-anchors.mjs` → 1536² GREEN plates (default) for
  all 10 bosses at `qa-boss/anchors/<id>-anchor-green.png`; `node scripts/prep-boss-anchors.mjs
  magenta` → magenta plates. (Keys each boss's green original, composites feet-planted on
  the chroma plate.) Lion-serpent uses magenta; everyone else green.
- BROWSER SETUP: higgsfield.ai → Video → model **Seedance 2.0** (has [UNLIMITED] badge) →
  turn **"Unlimited mode" toggle ON** (Generate then reads "Generate Unlimited", no credit
  cost). Set aspect **1:1** (plates are square). A page refresh RESETS the Unlimited toggle
  OFF and Generate shows "24 18" credits — ALWAYS re-check the toggle is ON before firing.
- UPLOAD (no OS dialog): MCP `media_upload` the plate (free) → curl PUT to presigned →
  the CloudFront url is browser-fetchable → in the automation tab: empty the image slot
  (hover its thumb, click the ×), click the image icon to mount the dropzone, then JS:
  `const i=document.querySelector('input[type=file]'); const b=await(await fetch(CDNURL)).blob();
  const f=new File([b],'x.png',{type:'image/png'}); const dt=new DataTransfer(); dt.items.add(f);
  i.files=dt.files; i.dispatchEvent(new Event('change',{bubbles:true}));` (assignment sometimes
  needs a 2nd run) → one-time "Media upload agreement" modal (2 checkboxes = truthful for Tim's
  own art, tick both + "I agree, continue") → ~6s content-verify → it appears in the Uploads
  picker → click the tile to load it as the start image.
- PROMPT: the field is a **contenteditable (Lexical), NOT a textarea**. RELIABLE method =
  click it, `key ctrl+a`, `key Delete` (clears to 0), then computer `type` the prompt ONCE.
  (execCommand/value-setter double-insert or fail. VERIFY single copy via a textContent regex
  count.) Prompt scaffold (per §3): "The EXACT SAME <identity> ... on a solid saturated
  GREEN/MAGENTA chroma screen (<#00b140 green / #a3005f magenta>, nothing <opposite> anywhere)
  . <STATE acting> . <locks: armor/weapon EXACTLY same, camera locked no zoom/pan, full body in
  frame, ONLY figure in frame, begins+ends on EXACT reference stance, 24fps>". Sora Yari's full
  set is authored at `qa-boss/prompts/sora-yari.md` — clone its structure per boss.
- FIRE: click **Generate** (≈131,663). Takes ~4-5 min/clip (Unlimited is free but slow).
- **★ CRITICAL FIRING CADENCE (the big 2026-07-23 learning): fire ONE clip, then WAIT until
  the browser shows "Generating"/"Processing" (confirming it took) BEFORE firing the next.
  Rapid-firing Generate back-to-back DROPS the later clicks — they never submit.** This is
  exactly why Tim said "check every 1 min". Sequential only. (First attempt rapid-fired 10
  states/boss; only the 3-4 fired with a pause between them actually generated.)
- HARVEST: MCP `show_generations({type:'video',size:30})` lists completed clips + rawUrl
  (same account, free) — but it LAGS ~10min+ indexing browser jobs, so also read the result
  url off the played `<video>` in the tab (filter out the demo `seedance_2.mov`), and curl
  the `d8j0ntlcm91z4.cloudfront...hf_*.mp4`.
- KEY + ENCODE (all local, free, proven): extract frames (`ffmpeg -i clip.mp4 f_%03d.png`)
  → `node scripts/key-idle-clips.mjs <framesDir> <outDir> --still <keyedAnchorStill.png>`
  (magenta OR green — it border-samples the screen color automatically; emits cropped keyed
  frames + `<outDir>.cal.json`) → `ffmpeg -framerate 24 -i keyed/f_%03d.png -c:v libvpx-vp9
  -pix_fmt yuva420p -b:v 0 -crf 28 -an out.webm`. VERIFY the matte: composite a mid keyed frame
  over BLACK and WHITE (contract §6 sweep) — no chroma halo, body/weapon intact, no phantom
  opponent (throws are the risk — budget a re-roll). Measure attack `contacts` from motion-energy
  peak over the keyed frames (never guess).

**WHAT'S DONE (all in `qa-boss/`, nothing committed):**
- 10 GREEN + 10 MAGENTA anchor plates (`qa-boss/anchors/`), all viewed clean incl. the
  green-armored lion-serpent (magenta) and the fox Kitsune (green).
- **SORA YARI (node 1, magenta — steel/red body, keys clean):** idle + strike-a (thrust) +
  strike-b (chop) FULLY DONE = generated, QA-passed (contact sheets viewed on-model), keyed,
  encoded to `qa-boss/webm/sora-yari-{idle,strike-a,strike-b}.webm`, cals+contacts saved to
  `qa-boss/sora-yari-clipdata.json`, still at `qa-boss/sora-yari-still.png`.
- **KITSUNE TANTO (node 2, green — orange fox, gold blade):** idle DONE + QA-passed (raw at
  `qa-boss/raw/kitsune-tanto-idle.mp4`), confirms the GREEN pipeline works for warm bodies.

**WHAT'S NEXT (resume the grind, sequential-fire cadence):**
1. RE-FIRE the states that got dropped by rapid-firing: Sora Yari {throw a/b, block a/b, hit,
   ko, victory} (magenta) and Kitsune {strike a/b, throw a/b, block a/b, hit, ko, victory}
   (green) — ONE at a time, wait-for-Generating between each. Prompts: sora-yari.md is written;
   author kitsune similarly (fox + gold tanto).
2. Then bosses 3-10 (thorn-warden, onryo-katana, satoshi-odachi, eclipse-ofuda, ir37-pink-tessen,
   ir56-lion-serpent[MAGENTA], lady-kurotachi, ir48-hex-paper-lord). VIEW each original first to
   pick green vs magenta. Maps 5-10 (satoshi..hex-lord) each get +3 specials (§11 finishers).
3. Key + encode every clip into `qa-boss/webm/<id>-<state>.webm` + save clipdata json per boss.
4. Then `input/MK FINAL/` roster + backgrounds.
5. WIRING INTO THE GAME IS A SEPARATE LATER PHASE (Tim's ruling) — when he greenlights it:
   per boss write `src/characters/<id>.ts` FighterDef (still/faces/portrait/clips with cal+
   contacts, contract §4), add to `src/characters/index.ts`, set that node's `fighterId` in
   `src/engine/fightCampaign.ts` (additive; money fields byte-identical), gates + live-drive.
   The cal system + VOLTA/GORVAK manifests are the template.

**GENERATION FACTS:** browser Unlimited = FREE (Tim's account, promo "top models unlimited");
MCP account token currently resolves to `user_3FzP62OkeSn8OYHW3kjt3xDrWKK` (browser account);
earlier arena uploads used a different token `user_3FLbEdg...`. Balance untouched by Unlimited
generation. ~4-5 min/clip; a full 10-13-clip boss kit ≈ 45-60 min sequential. This is a genuine
multi-session marathon; checkpoint progress to project memory each boss.

FRESH-SESSION START HERE (in this order, before touching anything):
1. Read this file fully, then `CAMPAIGN-SPEC.md` (campaign design of record) if the
   task touches the campaign, `CHARACTER-CONTRACT.md` (THE LAW) if it touches
   characters, `FIGHT-SPEC.md` §8 for duel rules.
2. Read project memory `frozen-requiem-state.md` (full phase log, phases 3-23).
3. `git log --oneline -20` to confirm HEAD (`bb4f0e7`); `npx vitest run` should print 148/148.
4. **If continuing the boss-clip work (the current active task), read the "## PHASE 23"
   section above — it is the resume point.** Otherwise ask Tim which backlog item to start.

## 0. Operating model (Tim's standing directive — read first)

You are the ORCHESTRATOR: plan, brief, verify, review, commit. Specialized subagents
(Opus builders via the Agent tool) do the building from implementation-grade briefs
(`subagent-briefing` skill); run generation (Higgsfield MCP) yourself — media ids, cost
preflights and Tim's approvals live in YOUR loop. NEVER trust a builder's self-report —
re-run its gates yourself, review the diff with your own eyes, then live-drive the real
game before committing. Keep ONE builder per feature; follow-ups via SendMessage to the
SAME agent (phases 13-14 ran 4 briefs, phase 17 ran 3 briefs through one agent each,
zero re-onboarding — a completed background agent RESUMES with full context). Tim
approves every credit spend per batch (hard law; when he explicitly asks for a
generated thing, preflight + state the cost and proceed on small spends). He answers
fast and concretely; treat his defect reports as correct SYMPTOMS and MEASURE the
mechanism (map-click complaint: my probe said center-clicks worked, the real causes
were parallax-moving targets + small discs — fix everything the measurement implicates,
not just the literal report). **Tim iterates design in rapid small rulings** (phase 17:
five sequential messages reshaped the campaign) — send delta briefs to the live builder
instead of restarting, and reconcile the design yourself before it lands. When he
overrules a design, rework BEFORE committing. Do the cheap reversible work immediately;
hold spends when he is AFK. Update project memory + this handoff at every phase
boundary; route durable lessons to global homes (SAVE-GLOBAL law).

## 1. What the game is now (state at HEAD)

A complete staked fighter with real multiplayer, a full Swoobz skin, and a SEASON
CAMPAIGN. Modes from the title screen: CONQUEST MAP (campaign), VERSUS CPU
(brute/warden/oracle quick duel - since phase 18 the personalities are FLAVOR only,
picks are uniform randomMove and a win pays 1.92x = 96% RTP, the campaign's pricing
doctrine; `cpuWinPayout` in fightStakes.ts), VS FRIEND (real ws multiplayer,
winner-takes-all 2S, unchanged - two humans trading stakes, no house edge).

### 1a. Core duel (phases 1-15, stable)
title -> mode -> charSelect (22-slot roster = GORVAK orc + VOLTA cyber-brawler + 20
mystery; live idle previews; ARENA picker) -> stake -> vsIntro -> rounds
(STRIKE>THROW>BLOCK>STRIKE, 3 HP, 5s shot clock, tie=CLASH) -> receipt. Both
characters ship the full contract kit (idle hub, variant attack takes, hit, SPECIAL
finisher w/ radial-feathered `-r2` fx, ko, victory chain); combo strings 1-3 contacts;
clip-driven CLASH. FRIEND MODE: ws room relay in vite dev+preview (`/fr-ws`), FRZxxx
codes, reconnect grace 10s + resume tokens, AUTO-PLAY on true disconnect (never
forfeit; ghost picks = uniform randomMove; leaver nets -stake), refunds ONLY for
never-started matches (stakeCommittedRef one-shot).

### 1b. CONQUEST MAP campaign (phases 16-17b, 2026-07-20/21) — RONIN ZERO season
Read `CAMPAIGN-SPEC.md` FIRST for campaign work. The compressed state:
- **10 nodes + 2 locked isles** on ORIGINAL generated sumi-e map art
  (`public/assets/campaign-map.webp`, no baked text) that is ALIVE: a Seedance
  image-to-video ambient loop (`campaign-map-loop.mp4`, trees sway/water flows/citadel
  fire, locked camera, muted, still-image fallback + reduced-motion) + CSS ambient
  (citadel glow breathe, seismic ring, cloud sweep) + pointer parallax that moves the
  SCENERY LAYER ONLY (node pins are static click targets - click-target law).
  Nodes/fog/flags/labels are code-drawn via MAP_CAL percent table.
- **PHASE-17 RULES (Tim): no quest objectives.** Every node = play normal RPS, WIN THE
  MATCH. Difficulty = two visible knobs: FORMAT (first-to-2 / first-to-3; the campaign
  judge reads round counts ONLY and plays PAST the frozen engine's 2-win matchOver —
  the engine's stale flag can even name the LOSER, never read it) and DEFENSE (enemy
  absorbs the player's first S decisive hits EACH ROUND; presented per node as
  'shield' = gold shard pips + SHIELDED deflection beat, or 'bulk' = visibly longer
  3+S segment health bar with normal hit beats — SAME math, +1 HP == 1 shield).
- **Ladder** (exact rationals, q(S)=1/2, 11/32, 29/128): n1-4 plain x1.92 | n5 bulk+1 /
  n6 shield1 x3.51 | n7 bulk+1 / n8 shield1 first-to-3 x4.25 | n9 bulk+2 x7.34 |
  n10 RONIN ZERO shield2 first-to-3 **x11.94** (8.0%). Every node <=96.00% RTP.
- **Money laws**: enemies pick `randomMove` ONLY (aiPick personalities are MEASURED
  exploitable: anti-brute 88% win = 176% RTP at 2x — never behind a real multiplier);
  flat 96% pricing at every node = grind/bet-size exploits structurally impossible;
  `applyCampaignExchange` in fightCampaign.ts is THE ONE shared absorb decision
  (provider + Monte-Carlo sim + tests import it — zero drift).
- Progression: beat node n -> n+1 unlocks forever (localStorage
  `frozen-requiem.campaign.v1` {v:1,beaten[10]}); conquered nodes replayable any bet.
  Demo cosmetic rewards REMOVED "for now" (Tim, phase 18b): the CampaignReward type,
  `reward?` registry field, all UI surfaces (map badge / node-card strip / receipt
  shine card), CSS and the two capsule webp assets stay WIRED - re-adding a reward is
  one registry-row edit on fightCampaign.ts.
- DEV force hooks (`?dev=1` on the map): CONQUER NEXT / RESET PROGRESS
  (progress-only, never money).
- HUD restyle (17b): lacquer-blade angled health plates + gold hairline, gold shard
  shield pips w/ blood crack when spent, hinomaru round pips. Presentation only.

## 2. Architecture map (learn before touching anything)

- `src/engine/fightEngine.ts` + `fightAi.ts` — **BYTE-FROZEN since phase 1**. Never
  edit; every commit checks `git diff --stat` shows them untouched. The campaign plays
  past their limits by COMPOSITION, never modification.
- `src/engine/fightCampaign.ts` — campaign brain: node registry (ONE row per node:
  roundsToWin/defense/multBps/fighterId/arenaId/reward — new enemy characters drop in
  by editing the row), `applyCampaignExchange` (shared absorb), `evaluateCampaignMatch`
  (round-count judge), `campaignPayout`, exact bigint-rational probabilities +
  displays. `scripts/campaign-rtp-sim.mjs` = the RTP battery (2M matches/node, seed
  0x7a11ce, bit-reproducible, FOREGROUND, band [95.0,96.1] — NOTE the ceiling is tight:
  plain nodes price at ~96.0 and some seeds bust by noise; the P-vs-exact 0.3% check
  pins the model seed-independently). RERUN IT after ANY campaign-math change.
- `src/engine/fightStakes.ts` — pure bigint stake math, TWO economies since phase 18:
  CPU duel house-priced via `CPU_WIN_BPS`/`cpuWinPayout` (1.92x = 96% RTP vs uniform-
  random); friend PvP winner-takes-all `potLamports`/`settle` (2S, no house edge).
- `src/engine/secureRng.ts` — `secureRandom()` = crypto.getRandomValues drop-in
  `() => number` (phase 18c UNPREDICTABILITY LAW): EVERY money-relevant runtime pick
  (CPU, campaign enemy, shot-clock/ghost auto-pick) draws from it. Seeded mulberry32
  is for tests/sims ONLY — never behind money at runtime.
- `src/provider/fightProvider.ts` — the state machine. Module-const timings (RG-C5),
  StrictMode-safe. Quick-duel/friend paths as at phase 15 (resolve windows, pick
  buffering, auto-play, stakeCommittedRef one-shot). Campaign layer: mode 'campaign' +
  phase 'campaignMap'; interception via applyCampaignExchange BEFORE the engine;
  defense buffer refills at match start + every startNextRound; judge after each round,
  'open' -> next round (even past engine matchOver), else round beat plays in
  ROUND_END_MS dwell -> settleCampaign (one-shot campaignSettledRef) -> matchEnd.
  Refund path (enterModeSelect) is GATED to friend+mode phase — campaign can never
  reach it (verified: no quit-mid-fight stake exploit).
- `src/transport/matchTransport.ts` + `src/server/matchRelay.ts` — friend-mode seam +
  dumb ws relay (vite plugin; server edits need a dev-server RESTART, no HMR).
- `src/characters/` + `src/arenas/` — registries; `clipVariants` resolver; facing rule.
- `src/ui/FightExperience.tsx` — zero-prop presentation. CAL block = baked-art
  geometry (values never change; drawn plates EXPAND past the CAL box at render time).
  MAP_CAL = campaign node positions (percent of the rendered map box; NEVER moves).
  MAP_LABEL = per-node {dx,dy} TRANSFORM-ONLY label offsets (phase 19 de-overlap;
  pointer-events:none). Campaign map = scenery layer (art+video+ambient, parallax
  target) UNDER static node pins; node hit boxes pinned to the DISC width (labels
  overflow without inflating the clickable box — no node's hit area may reach a
  neighbour's center; frontier z-top). Pips take `slots`, HealthBar takes
  `total` (bulk bars), ShieldPips re-key per round. fxReducer clipEnd stale-gate;
  victory-chain arm rides FxState; campaign end poses derive from campaignReceipt.met
  (NEVER engine matchOver). FINAL ROUND = round 2R-1; FINISH THEM reads display hp
  (engine hp + defense buffer).
- `src/ui/fight.css` — Swoobz DS tokens (ink #07080c / coal / bone #f2f3ef / fog;
  cyan #29E6FF, accent text <32px #00D0DE, fills #0EA5E9; gold #FFC83D; blood #FF4135
  == the Ronin Zero season red; Space Grotesk / JetBrains Mono / Anton hero). Cover-
  plate law: drawn HUD over baked art = alpha 1.0 + full footprint (0.94 ghosts, 0.97
  STILL ghosts — map scrim is opaque #07080c). Never -webkit-text-stroke with
  background-clip:text.
- `scripts/` — key-idle-clips / edge-feather (prop overflow only) / radial-feather
  (THE effect-clip feather) / magenta-neutralize (re-run inset-ring after ANY
  re-encode) / measure-contacts / campaign-rtp-sim.
- Storage keys ALL keep the historic `frozen-requiem.` prefix FOREVER (balance.v1,
  campaign.v1, arena.v1) — rebranding keys wipes player state. Hard-noted in code.

## 3. Hard-won learnings (26-38 new since phase 15; 39-44 new phases 18-19; 1-25 in
git history of this file @ 9372db9 + project memory — generation/keying/QA/timer laws
all still bind)

The phase 1-15 canon in brief: anchor hygiene, prompts paint what they narrate,
phantom-opponent class, effect clips run off the source frame -> radial-feather
doctrine (learning 23), head-trim free fixes, per-frame QA sweeps over dark AND white,
judge facing by the head, play-hook ground truth, click helpers must verify
registration + randomize picks, measured contacts, hidden videos are live actors,
curl is the dev-server truth, sequential downloads, absolute paths, one builder per
file, success paths must cancel their timeout timers + drives outlast the longest
timeout, isolated incognito contexts + frame-log for multiplayer, cover-plate law,
never live-drive a moving tree.

New (phases 16-17b):
26. **Skill-game RTP pricing law** (global memory `skill-game-rtp-pricing.md`): AI
    personalities are exploitable (MEASURED: anti-brute 88%/176% RTP, anti-warden
    73%/146%); price staked PvE to the uniform-random Nash baseline only. Difficulty
    that can back multipliers = structural handicaps with closed-form odds. Flat
    <=96% per node kills grind exploits structurally — no stake-cap rules needed.
27. **Difficulty knobs vs comprehension**: quest-style objectives (win 2-0, flawless)
    priced beautifully but FAILED Tim's comprehension bar; visible handicaps (longer
    HP bar, shield pips) price identically (+1 HP == 1 shield == P(3+S before 3)) and
    read instantly. Prefer knobs the HUD can SHOW.
28. **Playing past the frozen engine**: matchOver is advisory — the campaign judge
    reads round counts only. TRAP: applyExchange checks p1 first, so its stale
    matchOver can name the LOSER of a first-to-3 match. NEVER read engine matchOver
    in campaign code; end-poses derive from campaignReceipt.met.
29. **The shared-decision pattern**: any rule that must agree between provider, sim
    and tests (the absorb decision) lives in ONE exported pure function all three
    import. This is why the RTP battery is trustworthy.
30. **Moderation false-positives** (global: higgsfield-generation skill): a map
    animation died status:"nsfw" purely from "ember/fire/crimson" wording; sanitized
    re-roll ("warm red lantern glow") clean first try. Rewrite fire/blood-adjacent
    nouns, retry once.
31. **Living-map recipe** (same skill): image-to-video of a full illustrated scene
    with "camera absolutely locked + only ambient life moves + last frame matches
    first" keeps landmarks pinned (~0.8% aspect adaptation only). Ship muted (strip
    the audio track), still image stays as poster + reduced-motion fallback.
32. **Click-target law**: parallax/ambient may move SCENERY ONLY — never interactive
    pins (a 43px disc that drifts from the cursor is "really hard to click"). Give
    small targets enlarged invisible hit areas (::after inset), stack the primary
    target above neighbors, pointer-events:none on decorative siblings. Verify with
    elementFromPoint jitter probes (9 points, +-28px) AND a human-style approach that
    measures pin drift.
33. **Generated-art-for-UI law**: never bake text/numbers/labels into generated art
    (models render gibberish; content becomes uneditable). Nodes/fog/flags/labels are
    code-drawn; MAP_CAL percentages target the rendered image box. Spec estimates
    landed on-path first try; verify by VIEWING a live screenshot.
34. **Rebrand law**: renaming a game = visible brand only; localStorage keys keep the
    old prefix forever or every player's state silently wipes. Prove with seeded
    legacy-key data loading through the renamed build.
35. **Free-tier image gen is cheap** (nano_banana ~1cr/image, 2k) — map candidates and
    reward-card art cost 2-4cr total. Video is the expensive tier (Seedance 1080p 5s
    = 45cr). Preflight both (get_cost), state the number, spend small without
    ceremony when Tim asked for the thing explicitly.
36. **Tim's design-iteration pattern**: big features arrive as a stream of small
    corrective rulings (phase 17: five messages). Keep ONE builder alive, send delta
    briefs, reconcile the math/design yourself BEFORE the builder lands, and answer
    each ruling with what it costs (e.g. "all-normal fights => flat x1.92 unless we
    add a visible handicap").
37. Value-independent celebrations extend to REWARDS: identical fanfare/choreography
    for x1.28 and x8.77 payouts and for standard vs gold packs (RG-C5); reward cards
    are data on the node registry, EV-neutral, and never touch payout math (verified
    to the cent).
38. Sim assert ceilings need headroom: nodes priced at exactly 96.00% + a 96.1% upper
    assert = seed-dependent flakes. Pin the seed (bit-reproducible), keep an exact-P
    cross-check, and don't tighten the band below noise.

New (phases 18-19, 2026-07-21/22):
39. **Runtime-RNG unpredictability law** (global memory
    `runtime-rng-unpredictability.md`): a seeded non-crypto PRNG behind money voids
    the RTP pricing even when perfectly uniform — Date.now seeds are bracketed by the
    attacker's own clock (2-3 observed picks disambiguate the stream = all future
    picks known) and mulberry32's 32-bit state brute-forces from ~40 observed picks.
    CSPRNG (`secureRandom`) behind every money pick; engines taking injected
    `rng: () => number` swap sources with ZERO frozen-code changes. Audit grep:
    `mulberry32|Date\.now|Math\.random` over money paths.
40. **Bake the strongest exploit as a permanent test**: when a pricing claim rests on
    "no strategy beats X%", implement the best known counter-strategy (the
    frequency-counter that beat brute 88%) and pin it in the suite at a pinned seed
    (`quickDuelExploit.test.ts`: 100k matches, winRate in [0.49,0.51]). The claim
    stays enforced forever, not asserted once.
41. **CPU-mode pick reveal is SYNCHRONOUS**: pick() locks + reveals in one React
    commit, so the LOCKED/chosen pickbar state never paints a frame vs CPU (it shows
    only in friend mode where the reveal waits on the wire). Drive click-verify
    observable = the pickbar UNMOUNTS immediately after the click (an ignored click
    leaves it up for the full 5s shot clock) — NOT `.fr-pick-chosen`.
42. **REMATCH returns to the STAKE screen** (manual re-commit, spec: no auto-loop,
    RG-C5) — drivers must re-click "STAKE $x + FIGHT" per match; the stake deducts at
    the COMMIT, not at the rematch click.
43. **Mode-split settles keep the old path byte-provable**: the friend branch still
    calls the original `settle()` (never a hand-rolled equivalent) so "friend
    unchanged" is provable by construction + the mode-split test, not by review.
44. **Small map targets (phase 19)**: label text must never inflate the clickable
    box — pin the button box to the DISC width and let labels overflow
    (pointer-events:none); de-overlap labels via a per-node transform-only offset
    table (MAP_LABEL), never by moving MAP_CAL pins. Prove with an elementFromPoint
    all-nodes self-hit probe across progress states (fresh / mid / full-conquest).

## 4. Credits / generation facts (Higgsfield MCP)

- Balance ~103 (phase 22 spent 247.5cr on 10 arena ambient loops incl 1 nsfw re-roll; maze-runner night session spent ~440; was ~783 (phases 16-17b spent ~51cr: 4 map candidates, 45 living-map video,
  2 reward capsules; phases 18-19 spent ZERO — all engineering). Preflight
  `get_cost:true`; upload path media_upload -> presigned PUT (curl) -> media_confirm.
- Persistent media ids: GORVAK CLEAN anchor `35867470-54cd-4e75-94a6-10b915c61b19`,
  VOLTA anchor `19539771-3ddb-424d-a9af-a5bfc280957a`, black plate 1024
  `b757c6e3-263a-4eb6-a800-d37fd3391c77`, **campaign map source
  `fc814766-c746-479c-83f0-e7409e0d2357`** (2752x1536 sumi-e island — reuse for any
  map re-animation/variant). Job ids live in phase commit messages + project memory
  (map candidates 655e9040/c60a8ea0 + 2 frost spares, living-map b6e5ef74, capsules
  9617803e/a6c81d68).
- Seedance 2.0: 5s 1080p = 45cr, 720p = 22.5cr; nano_banana_2 image ~1cr @2k.

## 5. What to do next (Tim's likely priorities — ask him which)

**ACTIVE (2026-07-23): boss character CLIP GENERATION — see the "## PHASE 23" section
above for the full resume instructions. That is the live task.** Items 0-1 below are the
older framing of it; the phase-23 section supersedes them with the FREE browser-Unlimited
method, Tim's per-character green/magenta rule, the sequential-fire cadence, and the
"don't wire yet" ruling.

0. **Enemy identity done (phase 20)**: all 10 nodes have named enemies + map/card
   art (silhouette tease -> PFP reveal). Animated clip kits per enemy = the PHASE 23 job
   (generating now, browser Unlimited, FREE — no longer the credit-spend framing below).
   Also unused so far: the TCG card art (collection surface?), the empty
   `input/characters/background/` (now used for arenas) + `playable characters/` dirs.
1. **Final-boss real character art**: RULED (Tim, 2026-07-22, `d171988`): the boss
   IS IR-48 HEX PAPER LORD (lore 'Lord of the Zero Citadel'; RONIN ZERO = season
   brand in the map header only). Fight visuals still VOLTA until his clip kit
   ships. One art drop or a
   generation run -> keyed still -> clean anchor plate -> acting table (opponent-free
   acting; samurai kit) -> clip batch (~36cr/clip, per-batch OK) -> per-frame sweep ->
   key -> radial-feather fx -> contacts -> ONE manifest row + node 10 fighterId.
   Pipeline proven twice (GORVAK/VOLTA); CHARACTER-CONTRACT.md is the law.
2. **Per-node ARENAS: DONE phase 21** (10 clean arenas wired per node, code-drawn lacquer portrait frames replace the baked rings, campaign fights show enemy name+PFP; cathedral keeps a small baked-knob residual under the portraits). Per-node enemy CLIP KITS as the roster grows: each new character = manifest + one
   registry-row edit per node. Node arenas likewise (arenaId per node; arena registry
   takes one ArenaDef row per background).
3. **B1/B2 bonus isles**: cosmetic challenges (EV-neutral, swoobz-engagement-layer).
4. **Campaign polish candidates**: label overlap + node hit-area RESOLVED phase 19;
   still open: campaign uses last-confirmed fighter (no charSelect entry in the
   campaign flow — ask Tim if he wants one); real reward claim/delivery once
   cross-game plumbing exists.
5. **Quick-duel economy**: RESOLVED phase 18 (2026-07-21, Tim's ruling "do 1"): CPU
   picks randomMove only, win pays 1.92x = 96% RTP (`cpuWinPayout`); personalities are
   flavor. Exploit-regression test (quickDuelExploit.test.ts) pins the frequency-counter
   strategy at ~50% win / 96.0% RTP over 100k seeded matches. Friend PvP unchanged.
6. **Older backlog still open**: announcer VO (RG-C5), VS splash diagonal split,
   in-room friend rematch protocol, waiting-room tab-close stake loss. (HUD-language
   extension to timer/nameplates/pick buttons: DONE phase 19.)

## 6. Gates before ANY commit (all of them, quote real output)

`npx tsc --noEmit` clean; `npx vitest run` **137/137** (serial suite); `npm run build`
ok; `git diff --stat` shows fightEngine.ts + fightAi.ts untouched; campaign-math
changes ALSO rerun `npx vite-node scripts/campaign-rtp-sim.mjs` (foreground, all 10
nodes in band); live headless drive of the changed surface (randomized picks;
click-verify; screenshots you have VIEWED; money asserted to the cent; two isolated
contexts + frame-log for multiplayer; drives outlast the longest timeout); for
new/changed clips: contract §6-step-4 per-frame sweep + inset-ring profile + radial
feather for effects; no em-dashes in user-facing copy; RG-C5 (zero-param audio,
module-const timings, value-independent celebrations; ALL money picks — CPU, campaign,
auto-play — from randomMove(secureRandom) only: never aiPick, never a seeded PRNG at
runtime). Commit with Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>.
Repo git config: user.name Tim, user.email erstrijbis@gmail.com. DEV-SERVER HYGIENE:
kill only THIS project's stale 5340 vite (check the PID's command line) before
starting yours; kill your own when done.

## 7. Memory locations (SAVE-GLOBAL check before ending any task)

Project memory: `~/.claude/projects/...streetfighter/memory/frozen-requiem-state.md`
(full phase log through 19; the file keeps its historic name). Global
(`~/.claude/memory/` + MEMORY.md index): `skill-game-rtp-pricing.md` (the Nash
baseline + win-condition/handicap pricing law), `runtime-rng-unpredictability.md`
(CSPRNG-behind-money law, phase 18c), `effect-clip-edge-cut.md`,
`swoobz-ds-tokens.md` (+ cover-plate law), `stale-timeout-timer-phantom-events.md`,
`genvideo-character-clip-lessons.md`. Global skills (stormforge source of truth,
junctioned): `higgsfield-generation` (anchor hygiene + nsfw wording law + living-map
recipe, stormforge c6178e0), `character-clip-qa`, `character-assets` Rule 4,
`slot-known-regressions` A15-A18. Artifacts for Tim: `specials-preview.mp4` at the
repo root; CEO ship-readiness one-pager (85% to demo launch, area breakdown, honest
production caveats) at
https://claude.ai/code/artifact/4a85217d-f615-482f-8ba0-1d28179fc0ba — redeploy to the
SAME url (pass it as `url`) when the numbers move. Update project memory + this
handoff at every phase boundary.
