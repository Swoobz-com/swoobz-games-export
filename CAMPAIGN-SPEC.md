# CAMPAIGN-SPEC — STANDOFF CONQUEST MAP (phases 16-17, design of record)

Tim's ask (2026-07-20): a campaign mode where each won fight unlocks the next stage on a
progressive map (reference: `input/progressivemap.jpg` — ANOTHER GAME'S map, reference
only, never ship its art or names). ~10 places to unlock, a different enemy per node,
final boss = highest multiplier. Many characters are coming; VOLTA fills every enemy
slot for now. Higher stage = higher return AND harder fight, priced so the economy
cannot be gamed.

PHASE-17 RULING (Tim, 2026-07-21, replaces the phase-16 objective-tier ladder): the quest
objectives (win 2-0, flawless) were too hard and confusing — players must "just play
normal rock paper scissors" and WIN THE MATCH, nothing else. Difficulty came back via a
follow-up ruling: escalation through match FORMAT (first to 2 vs first to 3 round wins)
and per-node enemy DEFENSE ("more hp for a higher boss or a shield") — the enemy absorbs
the player's first S decisive hits each round, presented either as a SHIELD (pips,
deflection beat) or as BULK (a visibly longer 3+S segment health bar). Same math, two
presentations, priced into RTP exactly as before.

## 0a. ⛔ THE 4.00x PAYOUT CAP SUPERSEDES THE UNIFORM-96% LAW (Tim, 2026-08-07)

**Read this before believing any "96%" in the rest of this document.** Tim capped every payout
at **4.00x** (`MAX_MULT_BPS` in `fightCampaign.ts`) with the instruction, given twice: *"lower the
max win to 4 ... keep the difficulty as it is, dont increase win chance or anything."*

Since **RTP = P(win) x multiplier** and every win chance is UNCHANGED, capping the multiplier
necessarily lowers the return on the five nodes whose fair price exceeded the cap:

| tier | nodes | win % (UNCHANGED) | ceiling | pays (was)     | RTP now | (was)  |
|------|-------|-------------------|---------|----------------|---------|--------|
| A    | 1,2   | 50.0000%          | 1.92x   | x1.92          | 96.00%  | 96.00% |
| B    | 3,4,5 | 27.3254%          | 3.513x  | x3.512         | 95.97%  | 95.97% |
| C    | 6,7   | 22.5546%          | 4.256x  | x3.70 (x4.25)  | 83.45%  | 95.92% |
| D    | 8,9   | 13.0733%          | 7.343x  | x3.85 (x7.34)  | 50.33%  | 96.00% |
| E    | 10    | 2.4025%           | 39.959x | x4.00 (x39.95) |  9.61%  | 96.00% |

The price now ASCENDS 1.92 -> 3.512 -> 3.70 -> 3.85 -> 4.00 ("no i want it in ladder"). Tiers C/D/E
are priced BELOW their ceilings on purpose — that headroom is the only room the ladder has to climb
once the top is pinned at 4.00x. FIVE rungs across ten nodes: ten distinct prices would need ten
distinct win chances, and the win chances are frozen.

Consequences of record:
- **The campaign is no longer a uniform-96% game.** Mean across the ten nodes is 84.4%; the
  finale returns 9.61%. Max win on a $5 stake fell $199.79 -> $20.00, on $25 $998.98 -> $100.00.
  Tiers A and B are UNCHANGED and still return ~96%.
- **Payout is decoupled from odds** on tiers C-E: they pay less than their difficulty is worth. The
  "harder pays more" property SURVIVES (the price still ascends); what is gone is "every node returns
  the same 96%".
- **Every RTP shown to the player is now COMPUTED** (`nodeRtpPercent` / `campaignRtpRange`), never a
  literal. The map's "returns 96% to players over time" and the node card gained a RETURNS stat,
  because shipping the old copy would have made the game state a number its own math contradicts.
- **The RTP FLOOR was removed** from the test suite and the Monte-Carlo battery (the ceiling stays).
  The battery's real gate — measured P within 0.003 of the exact closed form — still passes on all
  ten nodes, which is what proves the difficulty was untouched.
- The exploit argument in law 1 below **still holds**: no node pays better than 96%, so cheap early
  bets still cannot buy better-value later bets.

## 0. Economic laws (measured 2026-07-20; law 1 amended by §0a)

1. **Every node is independently priced at <=96% RTP.** Payout multiplier = 0.96 /
   P(match win), floored to clean bps, **then capped at 4.00x (§0a)**. Because NO node ever pays
   better than 96%, there
   is no state where cheap early bets buy better-value later bets: the grind/stake-cap
   exploit Tim worried about is structurally impossible. Bet size is free at every
   unlocked node. (Phase 17: pricing follows the format+defense ladder below; the law is
   unchanged. 2026-08-07: the <=96% ceiling survives; the implied uniform 96% does not.)
2. **Campaign enemies pick UNIFORM RANDOM (`randomMove`), never `aiPick`.** Measured on
   the frozen engine (200k matches/cell, seeded): an adaptive player beats BRUTE 88%
   (176% RTP at 2x) and WARDEN 73% (146% RTP). Personalities are exploitable and can
   never sit behind a real multiplier. Random is Nash-neutral: exactly the ladder
   probabilities below vs ANY player, skilled or not. Personalities stay in quick duel
   (known mockup player-edge, accepted). Same doctrine as phase-14 auto-play.
3. All money math is bigint bps with floor truncation (swoobz-casino-math).
   `payout = stake * multBps / 10000n` on a match win; stake already deducted at
   commit; match lost = stake lost. Winner-takes-all quick duel is untouched.

## 1. The ladder probabilities (EXACT, closed-form, MC-confirmed 2M/node)

Every node's objective is WIN THE MATCH. Two escalation knobs, both fully disclosed on
the node card (Glass Box):

- FORMAT R: first to 2 round wins (max 3 rounds) or first to 3 (max 5 rounds). The
  frozen engine hard-codes first-to-2, so first-to-3 nodes play PAST engine matchOver
  (the provider simply keeps starting rounds; proven safe in fightCampaign.test.ts).
- DEFENSE S: the enemy absorbs the player's first S decisive hits EACH ROUND (buffer
  refills at round start; enemy hits on the player are never absorbed; clashes
  unchanged). Presented as 'shield' (pips + deflection beat) or 'bulk' (a 3+S segment
  health bar) — SAME math, presentation only.

Round-win probability q = P(player lands 3+S decisive hits before taking 3), decisive
exchanges 50/50: q(0) = 1/2, q(1) = 11/32, q(2) = 29/128, q(3) = 37/256.
Match win: first-to-2 P = q^2(3-2q); first-to-3 P = q^3(1 + 3(1-q) + 6(1-q)^2).

Closed form for a new rung (the second derivation, and the cheap one): conditioned on
being decisive an exchange is a fair coin, and the race is always settled inside
(3+S)+3-1 = S+5 decisive exchanges, so pad it to exactly S+5 fair tosses and
q(S) = [sum over j = 3+S..S+5 of C(S+5, j)] / 2^(S+5) — three terms, one per enemy life.

The `multBps` / `pays` / `RTP` columns below are POST-CAP (§0a). The `fair` column is what the rung
is worth at 96% and is retained because it is the number the exact fractions actually derive.

| rung        | S | R | q exact | P exact                  | P        | fair    | multBps | pays   | RTP     |
|-------------|---|---|---------|--------------------------|----------|---------|---------|--------|---------|
| plain       | 0 | 2 | 1/2     | 1/2                      | 50.000%  | 19200   | 19200   | x1.92  | 96.00%  |
| defense 1   | 1 | 2 | 11/32   | 4477/16384               | 27.325%  | 35132   | 35120   | x3.51  | 95.97%  |
| defense 1 war | 1 | 3 | 11/32 | 3784033/16777216         | 22.555%  | 42563   | 37000   | x3.70  | 83.45%  |
| defense 2   | 2 | 2 | 29/128  | 137083/1048576           | 13.073%  | 73432   | 38500   | x3.85  | 50.33%  |
| finale      | 3 | 3 | 37/256  | 13207617791/549755813888 | 2.402%   | 399590  | 40000   | x4.00  |  9.61%  |

(The retired boss rung, S=2 R=3, was P = 1380490567/17179869184 = 8.035% at x11.94. Its
math is still exercised by the tests; no node stands on it.)

All exact fractions are regression-tested against TWO independent first-principles
derivations (fightCampaign.test.ts: a (need, lives) recursion and the binomial closed
form above), and every rung satisfies multBps * P <= 0.96 in exact bigint arithmetic.

PRICE IS DERIVED, NEVER CHOSEN. For a rung with exact P: maxBps = floor(0.96 * den / num),
then floor to the ladder's multiple-of-10 convention. The finale: maxBps = 399591 (399592
breaks the ceiling, so the bound is tight) -> 399590, RTP 95.9996%. Two traps recorded so
nobody "fixes" them back:
- `formatMult` FLOORS to cents, so 399590 displays **x39.95**. `(399590/10000).toFixed(2)`
  ROUNDS and says "39.96"; 399600 (the bps that would honestly display 39.96) returns
  96.0020% and is OUT of band. x39.96 is unreachable at this P.
- P renders as 2.4024% truncated to 4dp (2.4025% rounded); `formatWinChance` shows "2.4".

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

**LADDER RE-SHAPED (Tim, 2026-08-03).** The old curve spent FOUR of ten nodes on the easiest rung
(1-4 all to2 / no defense / 50% win), so the first 40% of the campaign was flat. Nodes 3-9 each moved
up one rung; node 10 was already at the engine's ceiling. **Prices are unchanged per configuration** —
each rung kept the multiplier it already carried, so RTP stays 96% everywhere and no new number was
invented. Verified: `npx vite-node scripts/campaign-rtp-sim.mjs`, 2,000,000 matches/node, all 10 in
[95.85%, 96.03%].

**BATTERY RE-RUN FOR THE DEFENCE +3 FINALE (2026-08-04).** Same command, 2,000,000 matches/node
(20,000,000 matches), 61s, PASS on the sim's own [95.0%, 96.1%] gate for all ten nodes. Node 10
measured P = 2.397% against the exact 2.402%, RTP 95.800%; nodes 1-9 landed in 95.902% .. 96.027%.

READ THE NODE-10 NUMBER CORRECTLY — this is the trap this rung introduces. **95.800% is outside the
[95.85%, 96.03%] band quoted above, and that is Monte-Carlo noise, not a mispricing.** RTP is
measured P times a 39.959x multiplier, so the multiplier magnifies the sampling error: at
N = 2,000,000 the standard error of node 10's RTP is +/- 0.4327 percentage points, while that band
is only 0.18 points WIDE. The band was calibrated on a ladder whose rarest node was 8.04% (SE
+/- 0.23 pts) and it does not transfer to a 2.40% node at the same sample size. 95.800% is -0.46
sigma from exact. Re-run at N = 100,000,000 (398s): P = 2.40182% vs exact 2.40245%, **RTP 95.9742%,
inside the band, -0.42 sigma** — the same noise level with a 7x tighter error bar. The EXACT RTP is
95.9996%, proven in bigint by the test suite; the battery can only ever corroborate it. To judge
node 10 from the battery alone, use the sim's own [95.0%, 96.1%] gate, or raise N.

| node | name              | title (enemy card)           | format | defense   | P(win)  | pays   | fighterId |
|------|-------------------|------------------------------|--------|-----------|---------|--------|-----------|
| 1    | KUROHAMA DOCKS    | Dockmaster of Kurohama       | to 2   | none      | 50.00%  | x1.92  | volta     |
| 2    | ASHEN TORII       | Keeper of the Ashen Torii    | to 2   | none      | 50.00%  | x1.92  | volta     |
| 3    | WHISPERING BAMBOO | Blade of the Bamboo Sea      | to 2   | bulk +1   | 27.33%  | x3.51  | volta     |
| 4    | SNOWFANG PASS     | Sentinel of Snowfang         | to 2   | shield 1  | 27.33%  | x3.51  | volta     |
| 5    | KAWA CROSSING     | Duelist of the Crossing      | to 2   | bulk +1   | 27.33%  | x3.51  | volta     |
| 6    | HOLLOW SHRINE     | Phantom of the Hollow Shrine | to 3   | shield 1  | 22.56%  | x4.25  | volta     |
| 7    | BURNED PAGODA     | Ash Warden of the Pagoda     | to 3   | bulk +1   | 22.56%  | x4.25  | volta     |
| 8    | RED MIST GORGE    | Tyrant of the Red Mist       | to 2   | shield 2  | 13.07%  | x7.34  | volta     |
| 9    | CRIMSON GATES     | Warlord of the Crimson Gates | to 2   | bulk +2   | 13.07%  | x7.34  | volta     |
| 10   | ZERO CITADEL      | RONIN ZERO (season boss)     | to 3   | shield 3  | 2.40%   | x39.95 | volta     |

**DEFENCE +3 FINALE (Tim, 2026-08-04).** Map 10 used to share maps 8-9's rung shape — the same
defense (+2), differing only by format — so the ladder's top was one rung wearing two hats. It now
owns rung six: defense 3 / first-to-3 / 2.4024% / x39.95. This is the sixth rung the note that used
to stand here called impossible: `defense.amount` was typed `1 | 2` and `matchWinProbability` threw
on 3. Both were widened, `ROUND_Q` gained `q(3) = 37/256`, and the price was derived from P and the
96% ceiling (see §1). Nothing else on the ladder moved — maps 1-9 keep their exact configs and
prices, and node 10's stake console, arena and enemy are untouched.

**The engine supports six rungs** — defense 0/1/2/3 x to2/to3, of which the ladder stands on
50.00 / 27.33 / 22.56 / 13.07 / 2.40%. (`to3` with NO defense is still exactly 50%: the match is
symmetric, so more rounds cannot help — rounds-to-win is a difficulty AMPLIFIER on an existing
asymmetry, never a source.) A seventh rung is now a one-row job: add `ROUND_Q[4]` (the binomial
closed form in §1 gives it in one line), widen `amount`, derive the price, re-run the battery.
| B1   | (locked NW isle)  | COMING SOON                  | -      | -         | -      | -         |
| B2   | (locked SE isle)  | COMING SOON                  | -      | -         | -      | -         |

Names are originals in a Japanese sengoku register, NOT the reference map's towns.
A node def = { id, name, title, roundsToWin, defense?, multBps, fighterId, arenaId } in
ONE registry row — future characters/arenas drop in by editing the row only. VOLTA fills
every enemy slot until the roster grows; node 10's enemy is presented as RONIN ZERO
(title/copy only this phase; his real character art is a later batch). Cosmetic rewards
(EV-neutral, swoobz-engagement-layer) stay on nodes 2 (AUTOMAT pack) + 8 (gold pack).

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

## 3. Match judge + defense interception (pure; phase 17)

`evaluateCampaignMatch(p1Rounds, p2Rounds, roundsToWin) -> 'met' | 'failed' | 'open'`:
met when the player reaches roundsToWin first, failed when the enemy does, judged after
every completed round (never mid-round) on ROUND-WIN COUNTS ONLY. It deliberately
IGNORES engine matchOver: the frozen engine hard-codes first-to-2, so first-to-3 nodes
keep starting rounds past the engine's own "match over" (applyExchange/startNextRound
recompute per-round state from hp/roundsWon and stay correct past it — unit-proven,
including the trap where the engine's stale matchOver names the LOSER of the campaign
match).

`applyCampaignExchange(state, p1Move, p2Move, absorbRemaining)` is THE shared absorb
decision — the ONE function the provider, the Monte-Carlo sim and the tests all route
campaign exchanges through (no drift possible): when the PLAYER wins a decisive exchange
while the enemy has absorb buffer left, the buffer decrements and the FROZEN ENGINE
never processes the exchange (a synthetic history record carries the presentation);
enemy hits and clashes pass straight through to the engine. The buffer refills to the
node's defense amount at every round start (provider + sim both do this externally).

Presentation of an absorbed hit (self-explanatory law, cause -> effect in one motion):
- 'shield': the deflection family — frost parry arc at the enemy + "SHIELDED" floater
  instead of "-1", shield pip empties, NO hit reaction, block-tink audio, no HP drain.
- 'bulk': indistinguishable from a normal hit — the enemy's LONGER bar (3+S segments,
  visibly wider than the player's) drains a segment with the standard hit beat; the
  player never senses a seam between the extra and real segments.

The fight ends the moment the judge leaves 'open'; 'met' plays the round-win beat
(ko/special/victory chain) then the campaign receipt; 'failed' the loss beat then the
receipt. Engine is NEVER edited: the provider stops starting new rounds and settles
once.

## 4. Player-facing surfaces

- MODE screen gains CAMPAIGN (alongside CPU / VS FRIEND).
- MAP screen: the shipped living-map art + code-drawn node layer (flags on conquered,
  "?" fog beyond frontier, locked B-isles, SWOOBZ wordmark, PLAY SAFE pill). Node
  click -> NODE CARD: enemy portrait + title, "WIN THE MATCH" + "FIRST TO R ROUNDS"
  format line, defense disclosure per kind (shield pips preview / longer-bar preview +
  one-line copy), WIN CHANCE % (Glass Box: the exact ladder percentage), PAYS xN.NN,
  stake console (existing BetConsole flow), FIGHT.
- During the fight: round pips show the node's REAL format (3 slots per side on
  first-to-3 nodes); shield nodes draw the enemy's shield lames above his HP bar (refill
  each round; node 10 carries THREE — the kabuto strip grows rightward, the lames never
  shrink, measured in src/ui/fight.css); bulk nodes draw his longer 3+S segment bar. A minimal strip under the
  timer reads "FIRST TO R ROUNDS - PAYS xM.MM" (+ the defense hint on defended nodes)
  per cover-plate law (fresh-player-comprehension law).
- CAMPAIGN RECEIPT: VICTORY (gold) / DEFEAT (blood), node name, stake, mult, payout,
  net, bank; buttons: [NEXT NODE] (on win, if a next node exists) / [RETRY] / [MAP];
  reward-unlocked card on winning a reward node. Value-independent celebration (RG-C5):
  identical fanfare for x1.92 and x39.95.
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
- Tests: judge unit tests (met/failed/open orderings for BOTH formats, including
  play-past-engine-matchOver for first-to-3, proven on the real engine), absorb-ordering
  tests on the shared applyCampaignExchange (buffer before HP, enemy hits never
  absorbed, clash passthrough, zero-buffer byte-equivalence), exact q/P regression
  (the section-1 fractions vs first-principles enumeration), payout bps math incl
  floor, persistence corrupt-input recovery. Suite stays serial.
- Monte-Carlo RTP battery: `scripts/campaign-rtp-sim.mjs` runs every node 2M matches
  through the REAL applyCampaignExchange + evaluateCampaignMatch + randomMove enemy,
  asserts measured RTP in [95.0%, 96.1%], measured P within 0.3% of the closed form,
  and that the bulk/shield pairs of the same defense measure equal P. Runs in
  FOREGROUND (foreground-sims law).

## 7. Out of scope this phase (recorded, not forgotten)

Real map artwork (Higgsfield batch, Tim-approved credits); per-node enemy characters
beyond VOLTA + per-node arenas; B1/B2 bonus-isle challenges (cosmetic, EV-neutral,
swoobz-engagement-layer); campaign-specific music/VO; a ride-the-pot "streak" variant
(cash-out gauntlet) as a possible later mode on top of the same tier math.
