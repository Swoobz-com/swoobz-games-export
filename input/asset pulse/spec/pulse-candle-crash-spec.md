# Pulse — candle crash: price behavior spec

Crash game where the multiplier moves like a market chart: candles, pullbacks, fake-outs. You cash out at the **current** price, not the peak. One predetermined rug ends the round.

## 1. Round lifecycle

1. **Commit**: at round start the server derives everything from a committed seed (hash shown in UI): the crash multiplier AND the full candle path. Nothing about the path is generated reactively — this is critical, see §5.
2. **Climb**: candles print at a fixed tick (default 500ms). Trend is up with noise and scripted pullbacks.
3. **Rug**: at the predetermined candle index, one giant red candle drops to the floor. Round over for everyone still in.
4. **Settle**: crash point + seed revealed, receipts verifiable.

## 2. Candle generation (from the seed)

- Each candle: `open = previous close`, `close = open × (1 + drift + noise)`, wicks extend slightly past body extremes.
- **Drift**: starts ~+1.5% per candle, accelerates with the multiplier (higher = faster) so late rounds feel parabolic.
- **Noise**: small random component per candle; some candles are red even during climbs.
- **Floor**: price never dips below `max(1.00, ATH × 0.55)`. Dips are theater — deep enough to hurt, never deep enough to zero someone out before the real rug.

## 3. Fake-out vocabulary (scripted into the path)

| Pattern | Shape | Frequency | Purpose |
|---|---|---|---|
| Micro-dip | 1 small red candle | common (~1 in 6 candles) | keeps the chart "alive" |
| Pullback | 2–3 red candles retracing 20–40% of the recent run, then V-recovery | ~1–2 per round | the core cash-or-hold decision |
| Stall | 2–4 doji candles sideways | occasional | tension without movement |
| Trap dip | deep fast dip (up to 60% retrace) immediately followed by the hardest pump of the round | ~rare | teaches players dips can be buys — makes the REAL rug (which starts identically) hit harder |
| **Fake rug (wick save)** | see §3.1 — a candle that plunges like the real rug, then violently reverses | very rare (1–2% of rounds) | the legendary moment; clips people share |
| The rug | one full-height red candle to the floor | exactly once | round end |

The rug's first frames are visually identical to a trap dip. Nobody can tell them apart until the candle keeps falling. That ambiguity is the game.

### 3.1 The fake rug ("wick save")

Once in a while — seed-determined like everything else, roughly 1–2% of rounds, never more than once per round — the price appears to crash for real:

- A red candle starts printing straight down, **piercing the normal dip floor** (this is the only pattern allowed below `ATH × 0.55`), wicking as deep as ~1.05x. For 3–6 ticks it is frame-for-frame indistinguishable from the true rug: same speed, same screen shake, same red flash starting up.
- Then the candle reverses inside its own range and closes as a massive green candle — often launching the hardest pump of the round toward a new ATH ("god candle").
- **Cash-out stays open the entire way down.** This is the crucial difference from the true rug (which is atomic and uncashable). Players who panic-sell into the fake rug lock in the falling tick price — they get out cheap and then watch the god candle without them. Players who hold through it get the story of a lifetime. Both could not distinguish it in the moment; the seed already decided.
- Auto cash-out targets do NOT trigger during the plunge (they only fire on upward crossings), so autos are immune to the fake-out — a reason to use them, and a fairness pressure-valve.
- UI: the rug treatment starts (shake, red flash, chart desaturating) and then snaps back with a `WICK SAVE` callout on the chart at the reversal wick, a green shockwave, and the wick permanently marked for the rest of the round. Track it as a stat/badge (`survived a wick save`, `sold the bottom of a wick save`) — both are share-bait.
- The result banner acknowledges it at settlement: `THIS ROUND HAD A WICK SAVE AT 1.09x` under the crash line, so spectators and late viewers understand the chart shape.

## 4. Cash-out rules

- Cash-out pays `wager × current tick price` — the live candle value, NOT your peak. During a dip you cash less. The UI must always show both: `CASH OUT 16.26 AT 1.62x` and muted `PEAK WAS 17.10`.
- Auto cash-out fires the first tick the price crosses the target upward.
- Cashing out during the rug candle is impossible (the candle is atomic — once it starts printing, everyone still in is rugged).

## 5. Fairness constraint (non-negotiable)

Because players cash at current price, the dip path affects payouts. Therefore the entire path — every dip, every fake-out — must be derived from the committed seed, fixed before the first bet resolves. The house can never steer a dip in response to open positions. Verification reveals the seed → anyone can regenerate the full candle series and check it matches what rendered.

## 6. After cash-out: the round keeps playing (spectator mode)

When a player cashes out, they do NOT leave the round. This is the retention core:

- Their exit is pinned on the chart: a small flag at their cash-out candle, `YOU · 1.62x`.
- Candles keep printing live until the real rug. The player watches what happens after their exit.
- The column panel flips to spectator state: `CASHED 16.26 USDC AT 1.62x` plus a **live delta line** that updates every tick:
  - price above their exit → `LEFT ON THE TABLE: +0.79x` (amber, ouch)
  - rug hits below what they'd have reached → `YOU DODGED THE RUG AT 1.78x` (teal, hero moment)
- At settlement the result banner is personalized: winners who cashed see dodge/left-on-table framing; rugged players see `CRASHED AT 1.78x · −wager`.
- Optional social layer: other players' cash-out flags appear on the chart in muted color as they exit — the board empties as the price climbs, dramatizing "who blinks first".
- The CTA slot during spectator mode shows a countdown: `NEXT ROUND IN 4s · BET AGAIN →`.

Both outcomes feed the next bet: "left on the table" pushes players to hold longer, "dodged the rug" rewards the cash — either way the story only exists because the round visibly continues after exit.

## 7. UI reactions per tick

- HUD multiplier updates every tick; last-candle delta shown beside it (`▼ −0.06` red / `▲ +0.09` teal).
- ATH dashed line (gold) tracks the round high; current-price dashed line (teal) tracks the tick.
- During any red candle the cash-out button pulses subtly (decision moment); it never disables during dips.
- Rug candle: screen shake, red flash, chart desaturates, banner slides into the HUD zone (same height — layout never shifts).

## 8. Tuning knobs (per room / "coherence" variant)

`tick_ms` (500), `base_drift` (0.015), `drift_accel`, `noise_sd`, `dip_chance`, `dip_depth_max` (0.6), `trap_dip_chance`, `wick_save_chance` (0.01–0.02), `wick_save_depth` (down to 1.05x), `floor_ratio` (0.55), crash distribution (house edge 4.5%, RTP 95.5%). Faster ticks + deeper dips = degen rooms; slow ticks + shallow dips = casual rooms.
