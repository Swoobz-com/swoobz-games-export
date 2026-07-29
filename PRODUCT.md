# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

Mobile and desktop are **equally primary** (Tim, 2026-07-29). Neither is a compromise of the
other: a layout that only holds by degrading one end is not acceptable. Note this is a deliberate
divergence from the rest of the Swoobz Originals catalogue, where mobile is treated as *the*
primary surface — STANDOFF must hold at both ends.

## Users

Players of the **Swoobz Originals** casino catalogue, wagering **real balance**. They arrive
expecting a casino game and are handed a fighting game: the job they are doing is staking on a
match they feel they can read and outplay, then pushing that stake further up a conquest ladder.

The 3-second secret-pick timer means the core loop is played in short, attentive bursts rather
than idled through — the player is present for every exchange.

## Product Purpose

**STANDOFF** is rock-paper-scissors rebuilt as a Mortal Kombat / Street Fighter duel. Each
exchange both sides secretly pick **STRIKE / THROW / BLOCK** on a 3-second timer; the triangle
resolves (strike beats throw, throw beats block, block beats strike, same pick = CLASH); the
loser drops 1 HP from 3; rounds are best-of-3 with full arcade presentation (ROUND 1… FIGHT!,
hit-stop, K.O. slam, victory screen).

Success is a casino game that reads as a real arcade fighter — the player believes they are
fighting, while the house math stays exactly where it was priced.

## Positioning

**The conquest ladder is the product** (Tim, 2026-07-29). Ten hand-built bosses across a
progressive map, each with its own character, arena and escalating difficulty, and each
*independently priced*. Progression is the thing being sold, not a single repeated round —
which is what a competitor shipping one reskinned wheel or card game cannot truthfully copy.

Difficulty escalates through match **format** (first to 2 vs first to 3 round wins) and per-node
enemy **defense** — the enemy absorbs the player's first S decisive hits each round, presented
either as a SHIELD (pips, deflection beat) or as BULK (a visibly longer health bar). Same math,
two presentations.

Supporting, and load-bearing for trust: enemies pick **uniform random**, never an adaptive
personality, so the advertised probabilities hold against any player, skilled or not. The
fighting-game surface can therefore feel like skill without the economy being exploitable.

## Operating Context

- **Campaign / conquest map** — the primary mode. Nodes unlock in sequence; each won fight opens
  the next. Node 10 is the final boss (ZERO CITADEL / IR-48 HEX PAPER LORD).
- **Quick duel** — a single winner-takes-all match outside the ladder.
- Progress persists per player (`src/provider/campaignPersistence`).
- A match relay + websocket transport exist (`src/server/matchRelay`, `src/transport`).
- Bosses are animated characters, not stills: per-state alpha-WebM clip kits (idle, strikes,
  throws, blocks, hit, ko, victory, finishers) keyed from generated footage and composited over
  per-node arenas.

## Capabilities and Constraints

**Economic laws — non-negotiable.**
1. Every node is independently priced at **≤96% RTP** (`multBps = 0.96 / P(match win)`, floored
   to clean bps). Because no node ever pays better than 96%, cheap early bets can never buy
   better-value later bets — the grind/stake-cap exploit is structurally impossible. Bet size is
   free at every unlocked node. Enforced by test: every node inside [95.00%, 96.00%].
2. Campaign enemies use `randomMove` (uniform), **never** `aiPick`. Measured: an adaptive player
   beats the BRUTE personality 88% (176% RTP at 2x) and WARDEN 73% (146%). Personalities are
   exploitable and can never sit behind a real multiplier.
3. All money math is **bigint bps with floor truncation**; `payout = stake * multBps / 10000n`,
   stake deducted at commit, match lost = stake lost.
4. A **CSPRNG** sits behind every money pick (`src/engine/secureRng.ts`). Seeded mulberry32 is
   for tests and sims only.

**Technical.** React 18 + TypeScript + Vite, no UI framework or CSS library. Dev server port
5340 (strictPort). Test suite is vitest (157 passing). `npm run build` typechecks first.

**Compliance.** RG-C5 structural rules apply (zero-param audio functions, module-const animation
timings, settle presentation identical regardless of stake or streak). Referenced across
`fightAudio`, `fightStakes`, `fightCampaign`, `characters/types`.

**Undecided / open.** Playable-character roster beyond the enemy bosses is in progress — the
stated next milestone after the final boss kit lands. Node 2 (kitsune-tanto) is unwired. Demo
rewards were removed from the map "for now" and re-adding is a single registry row.

## Brand Commitments

- **STANDOFF** is the name — Tim's pick 2026-07-20 over CLASH / DUEL ZERO / THROWDOWN. The
  earlier working title *Frozen Requiem* survives only as the package name and in stale doc
  headers; it is not the product name.
- **RONIN ZERO** is the season brand (map header), **not** the boss identity.
- The triangle is expressed in fighting-game vocabulary (STRIKE / THROW / BLOCK), never as
  rock/paper/scissors, and is shown permanently on screen so a new player learns it by looking.
- Tim's art in `input/` is canonical.
- Swoobz house register applies (Geist Sans body / Geist Mono numbers, dark-glass, restrained
  cyan accent, "quiet expert at the table" voice, no em-dashes in user-facing strings).

## Evidence on Hand

- `FIGHT-SPEC.md`, `CAMPAIGN-SPEC.md`, `CHARACTER-CONTRACT.md` — authoritative specs.
- Nine wired boss characters in `src/characters/` plus `volta` as the stand-in fighter; the
  tenth (ir48-hex-paper-lord) is mid-wire.
- Shipped alpha-WebM clip kits under `public/assets/characters/`, enemy stills and PFPs under
  `public/assets/enemies/`.
- Measured economy figures quoted above come from the repo's own simulation harnesses and tests,
  not from marketing.
- **No player-facing evidence exists yet** — no testimonials, no customer names, no live
  performance data, no press. Future work must not fabricate any of these.

## Product Principles

1. **The math is fixed; the feeling is the craft.** Presentation may escalate freely, but never
   in a way that changes or implies a change to the priced outcome.
2. **Every node must be independently priced.** No progression mechanic may create a state where
   playing earlier content buys better value later.
3. **Teach by looking, not by reading.** The triangle, the HP, the defense type and the stake are
   understood from the screen without a manual.
4. **Bosses are characters, not skins.** Each node's opponent has its own arsenal, animation kit
   and identity; a shared generic effect across the roster is a defect, not a saving.
5. **Difficulty comes from format and defense, never from confusing objectives.** Players "just
   play and win the match" — the phase-17 ruling that replaced objective tiers.

## Accessibility & Inclusion

No STANDOFF-specific requirement has been established beyond the Swoobz catalogue baseline
(WCAG 2.1 AA: ≥4.5:1 body contrast, ≥3:1 UI, visible focus, no flashing above 3Hz, and
`prefers-reduced-motion` respected — which the arcade presentation, hit-stop and KO slow-mo make
a live concern here rather than a formality).
