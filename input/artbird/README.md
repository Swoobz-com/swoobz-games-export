# FOMC MEETING — macro event for Pulse

The set-piece moment of Pulse (candle crash, Swoobz Original Games Framework). Mid-round, the market itself interrupts the game: a character announces a macro event, counts down, and the price violently pumps or dumps. Everyone in the room gets the exact same second to decide.

Parent docs: `asset pulse/spec/pulse-candle-crash-spec.md` (§3.2 mirrors this file) · `Swoobz Original Games Framework/` (shell, sound, motion, social, verifier).

---

## 1. Concept in one line

At a random committed moment in ~10% of rounds, the chart freezes, **The Chairman** walks in, a 3-second countdown runs while cash-out stays open, then the gavel drops: 50% violent pump, 50% violent dump. Front-run the Fed, or fight the Fed.

## 2. Trigger & fairness (non-negotiable)

- **Everything is seed-determined at commit**: whether the event happens (~10% of rounds, max once), at which candle (eligibility window 2.0x–8.0x, weighted toward higher multipliers), and the direction (pump/dump, 50/50). Nothing is decided reactively — the house can never aim a dump at open positions.
- The countdown gives every player identical reaction time; there is no information asymmetry.
- **Audio and visuals are identical for pump and dump until the reveal frame.** The gavel crack is one sound. Any tell breaks the game.
- The event is part of the committed candle path, so the verifier page regenerates it (timing, direction, magnitude) from the seed like everything else.

## 3. Sequence & timeline

| Phase | Duration | What happens |
|---|---|---|
| **The hush** | ~1.5s | Drift dies; 2–3 doji candles print sideways. Ambience ducks −6dB. The market holds its breath. |
| **The entrance** | ~1s | Scene dims 20%, spotlight in the chart corner. The Chairman slides in behind his podium (300ms, overshoot ease). Caption strip: `OOOH… FOMC MEETING?` |
| **The countdown** | 3s | Big center-chart `3 · 2 · 1`, numerals scale-pop each second, metronome tick at 1Hz. Gavel raised. Cash-out button pulses hard, label swaps live: `FRONT-RUN THE FED? CASH <amount> NOW`. Cash-out open the entire time. |
| **The gavel** | 120ms | Dry gavel crack — identical for both outcomes. Accelerate-in drop (danger easing). |
| **PUMP (50%)** | 6–10 candles | +40% to +200% total. Dollar-bill confetti 1.2s, Chairman gives a tiny nod. Statusbar: `RATES CUT · MONEY PRINTER ON`. |
| **DUMP (50%)** | 4–6 candles | −30% to −60% retrace, red cascade. Chairman's disappointed stare. Statusbar: `RATES HIKED · LIQUIDITY GONE`. |
| **Exit** | ~1s | Chairman slides out. The event's candle range stays tagged `FOMC` on the chart for the rest of the round. |

**The dump respects the crash point.** If the committed crash multiplier falls inside the dump's range, the dump IS the rug — the round ends in the cascade. Brutal, and fully fair: that round was always going to end there. Otherwise the price bases and the climb resumes.

## 4. Rules

- Cashing during the countdown pays the current tick, as always. Front-running the Fed is always allowed — that's the point.
- Cash-out stays open during the pump/cascade candles at tick price (only the true rug candle is atomic).
- **Auto cash-outs only fire on upward crossings** — a dump blows straight through auto targets. Onboarding warns once: `AUTOS DON'T SAVE YOU FROM THE FED`.
- Max one macro event per round, regardless of type.

## 5. The Chairman (character asset)

Flat-vector stern owl in a grey suit, round glasses, tiny wooden podium with a golden SWOOBZ parody seal, gavel. Three poses (sprite set):

1. **Entrance** — folder under one wing, neutral stern face
2. **Countdown** — gavel raised high, intense stare
3. **Verdict** — gavel down; tiny confident nod (pump) / disappointed stare (dump)

![Chairman sprite sheet](https://d8j0ntlcm91z4.cloudfront.net/user_3FLbEdg3frPqTTQKyUf3xpB0P8k/hf_20260706_094353_0444f429-1173-49ad-b18e-3f7208bcf406.png)

The moment itself, art direction:

![FOMC countdown moment](https://d8j0ntlcm91z4.cloudfront.net/user_3FLbEdg3frPqTTQKyUf3xpB0P8k/hf_20260706_094355_eb2f0995-49e6-452b-8a27-0924dc03d2f1.png)

Download into `art/`: `bash art/get-assets.sh`

## 6. Sound & motion hooks (extend the framework specs)

| Event | Sound | Motion |
|---|---|---|
| `fomc.hush` | ambience duck, doji silence (no candle clicks — price visibly isn't moving, nothing leaks) | drift flattens, no animation |
| `fomc.enter` | two wing flaps + podium thunk | slide-in 300ms overshoot, scene dim 20% |
| `fomc.count` | metronome 1Hz | numeral scale-pop per second, CTA pulse |
| `fomc.gavel` | one dry gavel crack — IDENTICAL for pump and dump | 120ms accelerate-in drop |
| pump | `candle.up` chain takes over, brighter layer | confetti 1.2s, nod |
| dump | `candle.down` chain, lowpass creeping in | cascade, disappointed stare |

## 7. Social & share cards

Three triggers, all auto-generated cards (1200×630, chart shape + your flag + hash footer, links to `/verify/<roundId>`):

- **`front-ran the Fed`** — cashed during the countdown, then the dump hit
- **`fought the Fed`** — held through a dump and survived to cash higher
- **`printer went brrr`** — rode a pump of +100% or more

Feed lines (system-generated): `FOMC MEETING · 12 players cashed the countdown · 31 held`.

## 8. Variant events (same skeleton, ship later)

| Event | Behavior | Notes |
|---|---|---|
| `CPI PRINT?` | smaller move (±15–40%), more frequent | the everyday version |
| `WHALE ALERT` | one single mega candle, either direction | shortest event, no countdown — just a shadow passing over the chart |
| `RUG PULL RUMOR?` | full entrance + countdown… nothing happens | pure psyop; cheapest to build, funniest in the feed |

## 9. Tuning knobs

`fomc_chance` (0.10) · `fomc_window` (2.0x–8.0x) · `fomc_weighting` (bias toward high multipliers) · `fomc_pump_range` (+0.4…+2.0 of current) · `fomc_dump_range` (−0.3…−0.6) · `fomc_countdown_s` (3) · per-room overrides allowed (degen rooms: higher chance, wider ranges).
