// Pulse — candle crash: seeded price-path generator.
//
// Fairness constraint (spec §5): the crash multiplier AND the entire candle
// path are derived from a committed seed BEFORE the first bet resolves. Nothing
// is generated reactively — the house can never steer a dip against an open
// position. Verification = regenerate the path from the revealed seed and check
// it matches what rendered (see `regenerate`).

export type CandleKind = 'up' | 'down' | 'doji' | 'wicksave' | 'rug' | 'spike'

export interface Candle {
  open: number
  close: number
  high: number
  low: number
  kind: CandleKind
}

// FOMC MEETING — the seeded macro set-piece (see input/artbird/README.md).
// The Chairman interrupts mid-round: the chart goes sideways, a countdown runs
// with cash-out open, then the gavel drops into a violent pump or dump.
export interface FomcEvent {
  hushStart: number // first sideways candle (owl entrance / countdown begins here)
  gavelIndex: number // candle where the gavel drops (result begins)
  direction: 'pump' | 'dump'
  endValue: number // multiplier the event resolves to (pump target, or ~1.0 dump)
}

export interface RoundPath {
  seed: string
  hash: string
  candles: Candle[]
  crashPoint: number // ATH reached just before the rug
  rugIndex: number // index of the atomic rug candle
  wickSaveIndex: number // index of the fake-rug reversal candle, or -1
  ath: number[] // running all-time-high after each candle
  fomc: FomcEvent | null // the macro event, or null
}

export interface GenOpts {
  forceFomc?: boolean // test hook: guarantee a FOMC event this round
  forceDir?: 'pump' | 'dump' // test hook: force the gavel outcome
  forceWick?: boolean // test hook: guarantee a wick-save this round
  forceSpike?: boolean // test hook: guarantee an uncashable up-spike this round
}

// FOMC tuning (module consts — RG-C5 structural discipline).
// Applied only to rounds that climb into the window (crash ≥ ~2.3, ≈41% of
// rounds), so 0.24 conditional ≈ 10% of ALL rounds carry the event.
const FOMC_CHANCE = 0.24
const FOMC_PUMP_PROB = 0.2 // pump is the minority outcome (not 50%) — dump-heavy, toward 0
const FOMC_COUNTDOWN_MS = 3000
const FOMC_PUMP_MIN = 3 // pump multiplies the current value by 3…10x
const FOMC_PUMP_MAX = 10
const FOMC_WINDOW_LO = 2.0 // event only fires while the multiplier is in this band
const FOMC_WINDOW_HI = 8.0

// Per-room tuning knobs (spec §8). Defaults = COHERENCE-1.
export interface Tuning {
  tickMs: number // candle width in ms — controls granularity/smoothness
  timeTo2xMs: number // wall-clock time to reach 2.00x — the crash "speed"
  noiseSd: number
  dipChance: number
  pullbackChance: number
  trapDipChance: number
  upSpikeChance: number // uncashable upward wick spikes
  wickSaveChance: number
  floorRatio: number
  houseEdge: number // 0.045 → RTP 95.5%
}

export const DEFAULT_TUNING: Tuning = {
  tickMs: 150,
  // The multiplier grows exponentially in time like Stake / Roobet Rocket /
  // bustabit: 2.00x in ~5s, accelerating from there (10x ≈ 16s, capped at 100x).
  timeTo2xMs: 5000,
  noiseSd: 0.024, // amplitude variance per candle → market structure (green-dominant)
  dipChance: 0.1, // occasional single red candle, for "alive" — not sideways
  pullbackChance: 0.08,
  trapDipChance: 0.03,
  upSpikeChance: 0.02, // a spike up that retraces — the wick top is uncashable
  wickSaveChance: 0.02,
  floorRatio: 0.55,
  houseEdge: 0.045,
}

// Max-win cap. Real crash games cap the top multiplier; here it also bounds the
// candle count so the committed crash point is always actually reached (no
// guard truncation), keeping the stated RTP honest.
export const MAX_CRASH = 100

// ---- deterministic RNG -----------------------------------------------------

// xmur3 string hash → 32-bit seed material (also reused as the display hash).
function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    h ^= h >>> 16
    return h >>> 0
  }
}

// mulberry32 PRNG — small, fast, fully deterministic from a 32-bit seed.
function mulberry32(a: number): () => number {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// A short deterministic hash string for the receipt line ("f8b2b2_407e9a").
export function seedHash(seed: string): string {
  const s = xmur3(seed)
  const a = s().toString(16).padStart(8, '0').slice(0, 6)
  const b = s().toString(16).padStart(8, '0').slice(0, 6)
  return `${a}_${b}`
}

// ---- crash distribution ----------------------------------------------------

// Provably-fair crash point. Standard formula with a house edge: for uniform
// u in [0,1), crash = (1 - edge) / (1 - u), floored to the house's favour.
// With edge 0.045 the long-run RTP of a hold-to-crash bet is ~95.5%.
export function crashPointFromRng(rng: () => number, edge: number): number {
  const u = rng()
  const raw = (1 - edge) / (1 - u)
  return Math.min(MAX_CRASH, Math.max(1.0, Math.floor(raw * 100) / 100))
}

// Conditional survival shown in the HUD: given the price is at `current`, the
// odds it still reaches `target` before rugging. Under the crash distribution
// P(crash≥k) ∝ 1/k, so P(reach target | at current) = current / target.
export function holdsTo(current: number, target: number): number {
  if (current >= target) return 1
  return Math.min(1, current / target)
}

// ---- path generation -------------------------------------------------------

// Box–Muller gaussian in [-~3,3] scaled by sd.
function gauss(rng: () => number, sd: number): number {
  const u1 = Math.max(1e-9, rng())
  const u2 = rng()
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * sd
}

export function generatePath(seed: string, tuning: Tuning = DEFAULT_TUNING, opts: GenOpts = {}): RoundPath {
  const seedFn = xmur3(seed)
  const rng = mulberry32(seedFn())

  let crashPoint = crashPointFromRng(rng, tuning.houseEdge)

  // FOMC decision (seeded, or forced by the test hook). Needs headroom to climb
  // into the eligibility window before it would otherwise rug.
  const wantFomc = opts.forceFomc || (crashPoint >= FOMC_WINDOW_LO + 0.3 && rng() < FOMC_CHANCE)
  if (opts.forceFomc) crashPoint = Math.max(crashPoint, 3.0) // guarantee the window is reached
  if (opts.forceWick) crashPoint = Math.max(crashPoint, 2.2) // room for the fake-rug reversal
  if (opts.forceSpike) crashPoint = Math.max(crashPoint, 2.2) // room for the up-spike
  let spikePlanned = opts.forceSpike ? 0.35 + rng() * 0.2 : -1 // fraction of progress
  const fomcDir: 'pump' | 'dump' = opts.forceDir ?? (rng() < FOMC_PUMP_PROB ? 'pump' : 'dump')
  const pumpMult = FOMC_PUMP_MIN + rng() * (FOMC_PUMP_MAX - FOMC_PUMP_MIN)
  // Event value: within the window, weighted toward higher multipliers.
  const hiCap = Math.min(FOMC_WINDOW_HI, Math.max(FOMC_WINDOW_LO + 0.2, crashPoint * 0.9))
  const eventValue = wantFomc ? FOMC_WINDOW_LO + Math.pow(rng(), 0.6) * (hiCap - FOMC_WINDOW_LO) : -1

  // Wick save and FOMC never share a round (one set-piece each).
  const hasWickSave = !wantFomc && crashPoint >= 1.5 && (opts.forceWick || rng() < tuning.wickSaveChance)
  let wickSavePlanned = hasWickSave ? 0.35 + rng() * 0.3 : -1

  const candles: Candle[] = []
  const ath: number[] = []
  let value = 1.0
  let high = 1.0
  let wickSaveIndex = -1
  let dipRun = 0
  let guard = 0
  const GUARD_MAX = 1200
  const growthPerTick = (Math.log(2) / tuning.timeTo2xMs) * tuning.tickMs
  const trendAt = (k: number) => Math.exp(growthPerTick * k)
  let k = 0

  const pushCandle = (open: number, close: number, hi: number, lo: number, kind: CandleKind) => {
    candles.push({ open, close, high: hi, low: lo, kind })
    // ATH tracks the highest CLOSE (a cashable price), so uncashable upward wick
    // spikes never inflate the peak / the "PEAK WAS" figure.
    high = Math.max(high, close)
    ath.push(high)
  }

  // One organic climb candle toward `target`, with dips/wick-save woven in. Uses
  // the exponential trend so pacing matches Stake / Roobet Rocket / bustabit.
  const climbCandle = (target: number) => {
    k++
    const open = value
    const trendClose = trendAt(k)
    const floor = Math.max(1.0, high * tuning.floorRatio)
    const progress = Math.log(Math.max(1, open)) / Math.log(target)

    if (wickSavePlanned >= 0 && progress >= wickSavePlanned && value > 1.15) {
      wickSavePlanned = -1
      wickSaveIndex = candles.length
      // Plunge almost to the floor (≈1.0, "to zero") on a long lower wick, then
      // reverse and close as a strong green god candle. Cash stays open the whole
      // way down (only the true rug is atomic).
      const bottom = 1.01 + rng() * 0.05
      const close = Math.min(target - 0.01, trendClose * (1.06 + rng() * 0.1))
      pushCandle(open, close, close + 0.02, bottom, 'wicksave')
      value = close
      dipRun = 0
      return
    }

    // Forced (test-hook) up-spike: a tall uncashable upward wick.
    if (spikePlanned >= 0 && progress >= spikePlanned && value > 1.15) {
      spikePlanned = -1
      const c = trendClose * (1 + gauss(rng, tuning.noiseSd))
      const bh = Math.max(open, c)
      pushCandle(open, c, bh + bh * (0.18 + rng() * 0.22), Math.min(open, c) - open * 0.005, 'spike')
      value = c
      return
    }

    let close: number
    let kind: CandleKind
    let spikeUp = false
    if (dipRun > 0) {
      dipRun--
      close = Math.max(floor, open * (1 - (0.012 + rng() * 0.02)))
      kind = 'down'
    } else {
      const roll = rng()
      if (roll < tuning.trapDipChance && progress > 0.3) {
        const depth = 0.3 + rng() * 0.25
        close = Math.max(floor, open - (open - floor) * depth)
        kind = 'down'
      } else if (roll < tuning.trapDipChance + tuning.pullbackChance && progress > 0.2) {
        dipRun = Math.floor(rng() * 2)
        close = Math.max(floor, open * (1 - (0.015 + rng() * 0.025)))
        kind = 'down'
      } else if (roll < tuning.trapDipChance + tuning.pullbackChance + tuning.dipChance && progress > 0.12) {
        close = Math.max(floor, open * (1 - (0.004 + rng() * 0.012)))
        kind = 'down'
      } else if (roll < tuning.trapDipChance + tuning.pullbackChance + tuning.dipChance + tuning.upSpikeChance && progress > 0.15) {
        // Up-spike: the price stabs sharply UP then closes back near the trend.
        // The wick top is never a cashable price (you cash the close), so it's a
        // tease — a spike people can't grab.
        close = Math.max(floor, trendClose * (1 + gauss(rng, tuning.noiseSd)))
        spikeUp = true
        kind = 'spike'
      } else if (rng() < 0.16 && progress > 0.1) {
        // Impulse candle — a big decisive green move (breaks the uniform climb).
        close = trendClose * (1 + 0.03 + rng() * 0.09)
        kind = 'up'
      } else {
        // Normal candle: varies around the time-locked trend (can be a small red
        // consolidation candle) — this is what gives the chart market structure.
        close = Math.max(floor, trendClose * (1 + gauss(rng, tuning.noiseSd)))
        kind = close >= open ? 'up' : 'down'
      }
    }
    if (close >= target) {
      close = target
      if (!spikeUp) kind = 'up'
    }
    const bodyHi = Math.max(open, close)
    const bodyLo = Math.min(open, close)
    const wick = open * (0.003 + rng() * 0.006)
    const topWick = spikeUp ? bodyHi * (0.07 + rng() * 0.3) : wick * (0.5 + rng()) // varied uncashable spike
    pushCandle(open, close, bodyHi + topWick, bodyLo - wick * (0.5 + rng()), kind)
    value = close
  }

  // ---- Phase 1: climb toward the crash point (or the FOMC event value) -------
  const climbTarget = wantFomc ? eventValue : crashPoint
  while (value < climbTarget && guard < GUARD_MAX) {
    guard++
    climbCandle(climbTarget)
  }

  let fomc: FomcEvent | null = null

  if (wantFomc) {
    // ---- The hush: sideways doji candles for the length of the countdown ----
    const hushStart = candles.length
    const hushLen = Math.max(6, Math.round(FOMC_COUNTDOWN_MS / tuning.tickMs))
    for (let i = 0; i < hushLen; i++) {
      const open = value
      const close = Math.max(1.0, open * (1 + gauss(rng, 0.003))) // barely moving
      pushCandle(open, close, Math.max(open, close) + 0.01, Math.min(open, close) - 0.01, 'doji')
      value = close
    }

    // ---- The gavel: violent pump or dump ------------------------------------
    const gavelIndex = candles.length
    if (fomcDir === 'dump') {
      // Cascade toward the floor (~1.0) — a near-total wipe. Cash stays open on
      // the falling candles; the final candle is the atomic rug.
      const from = value
      const steps = 4 + Math.floor(rng() * 3)
      for (let i = 1; i <= steps; i++) {
        const open = value
        const t = i / steps
        const close = Math.max(1.0, from * (1 - t) + 1.0 * t) * (i === steps ? 1 : 1 - 0.03 * rng())
        const atomic = i === steps
        pushCandle(open, atomic ? 1.0 : Math.max(1.0, close), open + 0.01, 1.0, atomic ? 'rug' : 'down')
        value = atomic ? 1.0 : Math.max(1.0, close)
      }
      fomc = { hushStart, gavelIndex, direction: 'dump', endValue: 1.0 }
      crashPoint = high // peak was the event value
      return {
        seed,
        hash: seedHash(seed),
        candles,
        crashPoint,
        rugIndex: candles.length - 1,
        wickSaveIndex,
        ath,
        fomc,
      }
    } else {
      // Pump: a run of big green candles to a random pumped target, then the rug.
      const pumpTarget = Math.min(MAX_CRASH, value * pumpMult)
      const from = value
      const steps = 4 + Math.floor(rng() * 3)
      for (let i = 1; i <= steps; i++) {
        const open = value
        const t = i / steps
        const close = from + (pumpTarget - from) * t
        pushCandle(open, close, close + 0.02, open - 0.01, 'up')
        value = close
      }
      fomc = { hushStart, gavelIndex, direction: 'pump', endValue: pumpTarget }
      // Plateau: after the pump the price holds and keeps drifting UP for a
      // stretch — a real window to cash the pumped value — before it finally
      // rugs from the (higher) peak.
      const plateauLen = 9 + Math.floor(rng() * 6)
      for (let i = 0; i < plateauLen; i++) {
        const open = value
        const close = Math.max(open * 0.99, open * (1 + 0.004 + gauss(rng, 0.012))) // gentle net-up
        pushCandle(open, close, close + 0.02, Math.min(open, close) - 0.02, close >= open ? 'up' : 'down')
        value = close
      }
      crashPoint = high
    }
  }

  // The rug: one atomic, uncashable full-height red candle to the floor (~1.0).
  const rugOpen = value
  const rugIndex = candles.length
  pushCandle(rugOpen, 1.0, rugOpen + 0.01, 1.0, 'rug')

  return {
    seed,
    hash: seedHash(seed),
    candles,
    crashPoint: high,
    rugIndex,
    wickSaveIndex,
    ath,
    fomc,
  }
}

// Fairness verification (spec §5): regenerate from the revealed seed and confirm
// byte-for-byte identity with what the player saw.
export function regenerate(seed: string, tuning: Tuning = DEFAULT_TUNING): RoundPath {
  return generatePath(seed, tuning)
}

export function pathsIdentical(a: RoundPath, b: RoundPath): boolean {
  if (a.candles.length !== b.candles.length) return false
  return a.candles.every((c, i) => {
    const d = b.candles[i]
    return c.open === d.open && c.close === d.close && c.high === d.high && c.low === d.low && c.kind === d.kind
  })
}
