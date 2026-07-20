# CAMPAIGN-SPEC — Frozen Requiem CONQUEST MAP (phase 16, design of record)

Tim's ask (2026-07-20): a campaign mode where each won fight unlocks the next stage on a
progressive map (reference: `input/progressivemap.jpg` — ANOTHER GAME'S map, reference
only, never ship its art or names). ~10 places to unlock, a different enemy per node,
final boss = highest multiplier. Many characters are coming; VOLTA fills every enemy
slot for now. Higher stage = higher return AND harder fight, priced so the economy
cannot be gamed.

## 0. Economic laws (non-negotiable, measured 2026-07-20)

1. **Every node is independently priced at <=96% RTP.** Payout multiplier = 0.96 /
   P(objective), floored to clean bps. Because NO node ever pays better than 96%, there
   is no state where cheap early bets buy better-value later bets: the grind/stake-cap
   exploit Tim worried about is structurally impossible. Bet size is free at every
   unlocked node.
2. **Campaign enemies pick UNIFORM RANDOM (`randomMove`), never `aiPick`.** Measured on
   the frozen engine (200k matches/cell, seeded): an adaptive player beats BRUTE 88%
   (176% RTP at 2x) and WARDEN 73% (146% RTP). Personalities are exploitable and can
   never sit behind a real multiplier. Random is Nash-neutral: exactly the tier
   probabilities below vs ANY player, skilled or not. Personalities stay in quick duel
   (known mockup player-edge, accepted). Same doctrine as phase-14 auto-play.
3. All money math is bigint bps with floor truncation (swoobz-casino-math).
   `payout = stake * multBps / 10000n` on objective met; stake already deducted at
   commit; objective failed = stake lost. Winner-takes-all quick duel is untouched.

## 1. The tier probabilities (EXACT, closed-form, MC-confirmed 200k)

Round outcomes for the player vs a uniform-random enemy (frozen engine: 3 HP,
1 damage/exchange, clash = no damage; decisive exchanges are 50/50):
round win = 1/2; round win FLAWLESS (3-0 HP) = 1/8; round win non-flawless = 3/8.
Rounds are independent; match = first to 2 round wins (max 3 rounds).

| tier id          | objective (player-facing)              | P exact    | P       | multBps | pays  | RTP     |
|------------------|----------------------------------------|------------|---------|---------|-------|---------|
| takeRound        | take at least one round                | 3/4        | 75.00%  | 12800   | x1.28 | 96.00%  |
| winMatch         | win the match                          | 1/2        | 50.00%  | 19200   | x1.92 | 96.00%  |
| flawlessRound    | win any round flawless                 | 9/32       | 28.125% | 34100   | x3.41 | 95.91%  |
| win20            | win the match 2-0                      | 1/4        | 25.00%  | 38400   | x3.84 | 96.00%  |
| winWithFlawless  | win the match with a flawless round    | 7/32       | 21.875% | 43800   | x4.38 | 95.81%  |
| bossRequiem      | win 2-0 with a flawless round          | 7/64       | 10.9375%| 87700   | x8.77 | 95.92%  |

Derivations (regression-test these): winWithFlawless: P(2-0 with >=1 flawless) =
1/4 - (3/8)^2 = 7/64; P(2-1 with flawless among the two wins) = 1/4 * (1 - (3/4)^2) =
7/64; total 7/32. flawlessRound: 1 - E[(3/4)^wins over match paths] = 1 - 23/32 = 9/32.
bossRequiem = 7/64.

## 2. The map (10 nodes + 2 locked bonus isles) — RONIN ZERO season theme

Tim's redirect (2026-07-20): the campaign is themed to the Swoobz SEASON 0 boss
RONIN ZERO (staging /season page studied live: near-black ink, deep blood-red radial
glow + ember sparks + seismograph rings, ghost kanji texture, heavy condensed display
type). The map ARTWORK is generated and shipped: `public/assets/campaign-map.webp`
(2752x1536 original sumi-e conquest island, harbor SW -> winding dotted warpath ->
red-glowing fortress-pagoda citadel NE, two offshore isles, NO baked text — all
labels/nodes/fog are code-drawn on top). Generation job ids:
chosen c60a8ea0-4ccc-4f... (candidate B), spare 655e9040-b631-4e... (candidate A,
scratchpad map-jp-a.png). Tim's input/progressivemap.jpg stays reference-only.

| node | name              | title (enemy card)           | tier            | fighterId |
|------|-------------------|------------------------------|-----------------|-----------|
| 1    | KUROHAMA DOCKS    | Dockmaster of Kurohama       | takeRound       | volta     |
| 2    | ASHEN TORII       | Keeper of the Ashen Torii    | takeRound       | volta     |
| 3    | WHISPERING BAMBOO | Blade of the Bamboo Sea      | winMatch        | volta     |
| 4    | SNOWFANG PASS     | Sentinel of Snowfang         | winMatch        | volta     |
| 5    | KAWA CROSSING     | Duelist of the Crossing      | winMatch        | volta     |
| 6    | HOLLOW SHRINE     | Phantom of the Hollow Shrine | flawlessRound   | volta     |
| 7    | BURNED PAGODA     | Ash Warden of the Pagoda     | win20           | volta     |
| 8    | RED MIST GORGE    | Tyrant of the Red Mist       | win20           | volta     |
| 9    | CRIMSON GATES     | Warlord of the Crimson Gates | winWithFlawless | volta     |
| 10   | ZERO CITADEL      | RONIN ZERO (season boss)     | bossRequiem     | volta     |
| B1   | (locked NW isle)  | COMING SOON                  | -               | -         |
| B2   | (locked SE isle)  | COMING SOON                  | -               | -         |

Names are originals in a Japanese sengoku register, NOT the reference map's towns.
A node def = { id, name, title, tier, fighterId, arenaId } in ONE registry row —
future characters/arenas drop in by editing the row only. VOLTA fills every enemy
slot until the roster grows; node 10's enemy is presented as RONIN ZERO (title/copy
only this phase; his real character art is a later batch).

MAP_CAL: node positions are percentages of the map image, in a module-const table,
and every node disc must sit ON the drawn dotted warpath (verified visually on a
live screenshot). Starting estimates (builder fine-tunes +-2%):
n1 (27.5,71.5) n2 (32.5,64.5) n3 (38.5,62.5) n4 (44.0,57.5) n5 (48.5,48.5)
n6 (52.5,33.5) n7 (58.0,33.0) n8 (64.0,31.5) n9 (69.5,36.5) n10 (74.5,28.5)
B1 (11,18) B2 (91,83). The screen shows the art letterboxed/cover-fit; MAP_CAL
math must track the rendered image box (same discipline as the fight CAL block).

Progression: objective met at node n permanently unlocks node n+1. Conquered nodes
stay replayable forever (fair at 96%, any bet). Fog-of-war over the real art: nodes
beyond frontier render as dim "?" discs (art stays visible, the UNKNOWN is the enemy,
not the terrain); frontier node pulses blood-red (this map's accent; cyan stays for
interactive chrome elsewhere); conquered nodes show a planted flag glyph. B1/B2
always visible, always locked this phase.

## 3. Objective evaluator (pure, early-exit)

New pure module evaluates after every completed round (NEVER mid-round; reads
MatchState + per-round flawless flags for the PLAYER):
`evaluateObjective(tier, roundsWonP1, roundsWonP2, flawlessWinsP1, matchOver) ->
'met' | 'failed' | 'open'`.

- takeRound: met on first p1 round win; failed if p2 reaches 2 round wins first.
- winMatch: met on matchOver p1; failed on matchOver p2.
- flawlessRound: met on any p1 FLAWLESS round win (even mid-match, even if the match
  would be lost later — the fight ends there); failed at matchOver without one.
- win20: failed the moment p1 LOSES any round; met at 2-0.
- winWithFlawless: failed on matchOver p2; at matchOver p1 met iff flawlessWinsP1 >= 1;
  open otherwise (a future round can still be flawless).
- bossRequiem: failed the moment p1 loses any round; at 2-0 met iff flawlessWinsP1 >= 1
  else failed.

The fight ENDS as soon as the evaluator leaves 'open' (early settle: snappy retry loop
on the 2-0 tiers; takeRound fights average ~1.6 rounds). Presentation: 'met' plays the
normal round-win beat (ko/special/victory chain if the final exchange was a KO) then
the campaign receipt; 'failed' plays the loss beat then the receipt. Engine is NEVER
edited: the provider simply stops starting new rounds and settles.

## 4. Player-facing surfaces

- MODE screen gains CAMPAIGN (alongside CPU / VS FRIEND).
- MAP screen: DS-styled dark-parchment placeholder (SVG/code, ZERO credits, real map
  art is a later approved Higgsfield batch): winding dotted path, numbered nodes,
  flags on conquered, "?" fog beyond frontier, locked B-isles, SWOOBZ wordmark,
  PLAY SAFE pill. Node click -> NODE CARD: enemy portrait + title, objective line,
  WIN CHANCE % (Glass Box: the exact tier percentage), PAYS xN.NN, stake console
  (existing BetConsole flow), FIGHT.
- During the fight an OBJECTIVE STRIP is always visible (e.g. "OBJECTIVE: WIN 2-0 -
  PAYS x3.84" under the timer, drawn per cover-plate law) and updates state
  (e.g. rounds needed) so a fresh player always knows what completes the node
  (fresh-player-comprehension law).
- CAMPAIGN RECEIPT: OBJECTIVE COMPLETE / OBJECTIVE FAILED, node name, stake, mult,
  payout, net; buttons: [NEXT NODE] (on met, if a next node exists) / [RETRY] /
  [MAP]. Value-independent celebration (RG-C5): identical fanfare for x1.28 and x8.77.
- Map + receipt disclose RTP ("each trial returns 96% to players over time" line or
  the existing PLAY SAFE surface).

## 5. Persistence

localStorage `frozen-requiem.campaign.v1`:
`{ v: 1, beaten: boolean[10] }` (frontier = first unbeaten index). Corrupt/missing =
fresh. Balance stays the existing shared practice bank `frozen-requiem.balance.v1`.

## 6. Constraints (the standing laws, restated for this phase)

- `fightEngine.ts` + `fightAi.ts` BYTE-FROZEN (git diff must show untouched).
- Campaign enemy picks: `randomMove(rng)` ONLY, module-scope seeded rng per match.
- Module-const timings; zero-param audio; no em-dashes in user-facing copy; DS tokens
  from fight.css only (ink/coal/glass/line/bone/fog, cyan accent economy, gold for
  money moments, Anton hero type / Space Grotesk UI / JetBrains Mono numbers).
- StrictMode-safe provider additions; one-shot settle guard on the campaign payout
  path (same pattern as stakeCommittedRef).
- Tests: evaluator unit tests on scripted round sequences (every tier x met/failed/
  early-exit), exact-probability regression tests (the section-1 fractions), payout
  bps math incl floor, persistence corrupt-input recovery. Suite stays serial.
- Monte-Carlo RTP battery: `scripts/campaign-rtp-sim.mjs` runs every node >=200k
  matches vs the REAL evaluator + randomMove enemy and asserts measured RTP in
  [95.0%, 96.1%]. Runs in FOREGROUND (foreground-sims law).

## 7. Out of scope this phase (recorded, not forgotten)

Real map artwork (Higgsfield batch, Tim-approved credits); per-node enemy characters
beyond VOLTA + per-node arenas; B1/B2 bonus-isle challenges (cosmetic, EV-neutral,
swoobz-engagement-layer); campaign-specific music/VO; a ride-the-pot "streak" variant
(cash-out gauntlet) as a possible later mode on top of the same tier math.
