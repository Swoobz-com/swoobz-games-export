# FIGHT-SPEC — "Frozen Requiem" (working title) · RPS-Kombat versus game

Authoritative spec, owned by the orchestrator (Fable 5). Build agents implement THIS —
deviations need an orchestrator decision, not agent creativity. Tim's art in `input/` is
canonical; the baked-HUD background defines the layout.

## 0. One-sentence pitch
Rock-paper-scissors reskinned as a Mortal Kombat / Street Fighter duel: two fighters in a
frozen cathedral, best-of-3 rounds, 3 HP per round — each exchange both players secretly
pick STRIKE / THROW / BLOCK on a 3-second timer, the triangle resolves, loser of the
exchange loses 1 HP, KO at 0, with full arcade presentation (ROUND 1… FIGHT!, hitstop,
K.O. slam, victory screen).

## 1. The triangle (fighting-game canon, not rock/paper/scissors names)
- **STRIKE beats THROW** (you hit them out of the grab attempt)
- **THROW beats BLOCK** (throws are unblockable)
- **BLOCK beats STRIKE** (the hit is blocked and punished)
- Same pick = **CLASH**: no damage, dramatic clash presentation.
This is the strike/throw/block triangle every fighting game player already knows (Yomi,
Footsies formalize it). UI shows the triangle permanently (small diagram) so a fresh
player learns it by looking — self-explanatory-features law.

## 2. Match structure
- **Exchange**: one simultaneous secret pick, 3-second countdown (the baked "03" timer).
  Timer expiry with no pick → auto-pick uniformly at random (both modes, symmetric).
- **Round**: both fighters start at **3 HP**. Exchange loser −1 HP. Clash = no HP change.
  First fighter at 0 HP loses the round. A round therefore lasts 3–5 decisive exchanges.
- **Match**: best-of-3 rounds (first to 2 round wins). Round pips = the baked pip strips.
- **Perfect**: winning a round at 3 HP → "FLAWLESS" callout (value-independent, RG-C5-safe).
- **Final blow**: match-deciding hit gets slow-mo + zoom beat ("K.O." → "PLAYER 1 WINS").

## 3. Modes
- **VS CPU**: 3 opponents/difficulties with exploitable personalities:
  - *Brute* (easy): heavily biased to STRIKE (55/25/20), 25% chance to repeat its last pick.
  - *Warden* (medium): frequency-counter — tracks player's pick histogram, picks the
    counter to the player's most frequent move with 60% probability, else uniform.
  - *Oracle* (hard): mixes Nash-uniform with a 1-step pattern predictor (counters the
    player's most common follow-up to their own last move). Never reads the current pick —
    NO cheating; AI decides from history only, before reveal.
- **VS FRIEND (invite)**: room-code flow. Architecture: `MatchTransport` interface
  (`createRoom() → code`, `join(code)`, `sendPick`, `onOpponentPick`, `onPresence`). For
  the mockup ship a `LocalSimTransport` (fake remote opponent with human-like delays) so
  the whole invite → lobby → fight flow is playable today; a real WebSocket/WebRTC
  transport slots in later without touching the engine or provider.

## 4. Architecture (Swoobz framework quartet, self-contained like `assay`)
No money/wager in v1 — versus mini-game. Keep the quartet discipline anyway:

```
streetfighter/
  src/engine/fightEngine.ts      pure TS, no DOM. Move, ExchangeOutcome, RoundState,
                                 MatchState, resolveExchange(), applyExchange(),
                                 seeded RNG (mulberry32) injected — fully deterministic.
  src/engine/fightAi.ts          the 3 CPU personalities, pure fns of (history, rng).
  src/engine/fightEngine.test.ts vitest: triangle truth-table (all 9 pairs), HP/round/match
                                 progression, timer auto-pick, AI determinism from seed,
                                 AI never reads current opponent pick (API makes it
                                 impossible: ai(history) not ai(history, currentPick)).
  src/provider/fightProvider.ts  state machine hook useFightController(). Phases:
                                 title → mode → vsIntro → roundIntro → picking → reveal →
                                 resolve → roundEnd → matchEnd. Module-const timings.
  src/transport/matchTransport.ts  the seam + LocalSimTransport.
  src/audio/fightAudio.ts        zero-param play*() WebAudio synth (RG-C5: module-const
                                 HZ/VOL/MS; identical win fanfare regardless of anything).
  src/ui/FightExperience.tsx     zero-prop Experience; full-bleed stage + overlays.
  public/assets/                 background.png, fighter-1.png (orc), fighter-2.png (cyber)
```
Vite + React 18, TypeScript, vitest. **Port 5340, strictPort.** No `_shared` imports.

## 5. Presentation (the baked-HUD background is the layout truth)
`background.png` (2816×1536) already contains: portrait rings top-left/right, name plates
("PLAYER 1/2" baked — cover with live name plates), ice health bars, segmented pip strips,
center timer plate "03" (cover digits with live countdown). Strategy:
- Full-bleed cover background; all HUD overlays positioned in **percent of the background
  box** (not viewport) so alignment holds at any size. Approximate fractions (CALIBRATE
  against a live screenshot before sign-off — these are eyeballed):
  - P1 health bar inner: x 13.4%→42.9%, y 9.3%→13.9%. P2 mirrored (57.1%→86.6%).
  - Health drain = right-anchored (P1) / left-anchored (P2) darkening overlay div on top
    of the baked ice bar, so the art shows through the remaining-HP portion. 3 HP = thirds,
    with a trailing damage-flash segment (SF-style) on hit.
  - Pip strips: P1 x 13.4%→29.4%, y 15.4%→18.0%; overlay 2 round-win pips per side.
  - Timer digits: centered x 50%, y ~6%→18% — live 3-2-1 countdown, monospace, metallic.
  - Portraits: circular crops of the two fighter heads inside the baked gold rings.
- Fighters: `character.png` (orc, faces right) at stage left; `character 2.png` (cyber
  brawler, faces left) at stage right. Bottom-anchored, ~55-65% of stage height, standing
  on the cathedral floor line. Idle: subtle breathing scale/bob (CSS, module-const).
- Attack beats (no sprite anim in v1 — choreograph with transforms):
  - STRIKE: lunge toward opponent (translateX) + hit spark at contact + hitstop 90ms +
    screenshake on the loser + red damage flash on loser bar.
  - THROW: step-in + grab shake on victim (small rotation jitter) + slam dust flash.
  - BLOCK: brace pose (slight scale-down + white shield flare) — on a won BLOCK the
    attacker rebounds back.
  - CLASH: both lunge, freeze 200ms at center-ish with a big spark, rebound.
- Announcer beats as text banners (no voice): "ROUND 1" → "FIGHT!" slam-in; "K.O."; 
  "FLAWLESS"; "PLAYER 1 WINS". Timings from the research report; defaults:
  banner slam-in 150ms, hold 700ms, out 200ms. All module-const.
- Pick UI: 3 large buttons bottom-center (STRIKE / THROW / BLOCK icon + label) + the
  triangle legend. Picks are SECRET: buttons show "locked in" state, never which one, when
  in VS FRIEND hotseat-adjacent contexts; vs CPU it can highlight the player's own pick.
- Reveal: both picks flip up simultaneously as MK-style plates, then the attack plays.
- `prefers-reduced-motion`: no screenshake/slow-mo, instant banners.
- Fonts: Geist + Geist Mono are Swoobz law; the arcade flavor comes from weight/spacing/
  metallic gradients, not a new font.

## 6. RG-C5 / Swoobz discipline (applies even without money)
- Zero-param audio, module-const timings, victory fanfare identical whatever the streak.
- No particle-slop: hit sparks are single authored flashes (clip-path/opacity), not
  particle systems. Screenshake ≤ 6px, ≤ 180ms, module-const.
- Deterministic engine: same seed + same picks → same match. Engine unit-tested.
- em-dash ban in user-facing copy. No "jackpot"/gambling words. It's a versus game.

## 7. Verification gates (orchestrator runs these, not the builders)
1. `npm run typecheck` + `npm test` green (engine truth-table complete: 9/9 pairs).
2. Live server on 5340; Playwright/browser screenshot of: title, VS splash, ROUND 1/FIGHT,
   a full exchange reveal, K.O., victory screen. HUD overlays aligned to baked art
   (calibration proof: screenshot with overlay debug outlines toggled).
3. Full playthrough vs CPU to match end; full VS FRIEND flow via LocalSimTransport.
4. AI fairness probe: 1000-exchange sim per personality — Oracle beats a biased scripted
   player >50%, but vs uniform random lands 33±3% win rate (no cheating possible).
5. Reduced-motion pass.
```

## 8. Research deltas (from the SF/MK research dossier, 2026-07-17 — these override §1-5 where they differ)
- Names are exactly **STRIKE / THROW / BLOCK** (not GUARD). Triangle direction is genre
  canon: strike>throw, throw>block, block>strike. One-line tooltips: "a fist is faster
  than a grab" / "you can't block a grab" / "blocked hits leave them wide open".
- Shot clock is **5s** per pick (live digits cover the baked "03"); digits flash red +
  accelerating tick under 3s. Expiry → uniform random auto-pick.
- ROUND banner: slam-in 150ms (scale 3→1 overshoot), hold 900ms, out 150ms; then a
  300-400ms silence beat; then FIGHT! slam-in 100ms, hold 600ms, out 200ms. Picking
  unlocks the frame FIGHT! lands.
- Health drain direction: damage eats the CENTER-facing end first; remaining HP hugs the
  outer corners. Lost segment: flash white 2x (~80ms each) then collapse 300ms. Last
  segment pulses red ~2Hz.
- Hitstop 80-120ms normal, 200-300ms on round-ending hit. KO beat: 120ms hitstop →
  ~800ms at 0.4x speed with 1.15x zoom toward the loser → snap back → K.O. banner.
- CLASH (tie): both lunge → 200ms freeze + white radial flash + "CLASH!" text pop +
  metallic clang; no damage. This is the highest-frequency animation after hits.
- Match point: before the final exchange resolves, darken stage ~30%, "FINISH THEM!"
  banner, loser sways; the winning pick plays an over-the-top NON-GORY finisher beat.
- Win differentiation (Yomi lesson): all wins = 1 dmg, but STRIKE win = flashy hit,
  THROW win = slam (biggest humiliation), BLOCK win = two-stage block-tink then
  counter-punish smack. Announcer core four: FIGHT! / K.O.! / FLAWLESS / [NAME] WINS.
- Victory: winner pose ~1.5-2s + "[NAME] WINS" + rotating win quote; rematch menu with
  default cursor on REMATCH (zero-friction replay, but manual confirm — no auto-loop).
