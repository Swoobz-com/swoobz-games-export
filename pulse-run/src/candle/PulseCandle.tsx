// Pulse — candle crash. Self-contained rebuild from the `asset pulse` package
// (README + spec/pulse-candle-crash-spec.md + the two layout mockups).
//
// The multiplier moves like a market chart: candles, dips, fake-outs, a rare
// "wick save" fake-rug. You cash out at the CURRENT candle price (not the peak),
// and the round visibly keeps printing after you exit (spectator mode).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Chart } from './Chart'
import { DEFAULT_TUNING, generatePath, type RoundPath } from './path'
import * as sfx from './sound'
import { T } from './theme'
import bgTerminal from './assets/pulse-bg-terminal.png'
import chairman0 from './assets/chairman-0.png'
import chairman1 from './assets/chairman-1.png'
import chairman2 from './assets/chairman-2.png'

// The Chairman's three poses (tightly cropped, transparent): entrance /
// gavel-raised / verdict.
const CHAIRMAN_POSES = [chairman0, chairman1, chairman2]

type Phase = 'bet' | 'live' | 'cashed' | 'settled'

const START_BALANCE = 1000
const QUICK_CHIPS = [5, 10, 25, 50, 100]
const AUTO_CHIPS: Array<number | null> = [null, 1.2, 1.5, 2, 3]
const NEXT_ROUND_S = 4
const ROOM = 'COHERENCE-1'

// A committed seed for a round. Random material is fine — the point is that the
// path is fixed and hashed BEFORE the bet resolves, then revealed at settlement.
function makeSeed(roundNo: number): string {
  const r = Math.floor(Math.random() * 0xffffffff).toString(16)
  return `pulse-${roundNo}-${r}`
}

interface CrashRecord {
  value: number
  early: boolean
}

const money = (n: number) => n.toFixed(2)
const mult = (n: number) => `${n.toFixed(2)}x`
// Ease-out so each candle decelerates into its close — the same smooth,
// settle-at-the-end feel as a bet-size stepper transition.
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

// Target ladder — the next UNREACHED milestone + its live probability.
// P(reach target | at current) = current / target under the crash distribution.
const LADDER = [2, 3, 4, 5, 6, 8, 10, 15, 20, 30, 50, 100]
function nextTarget(cur: number): { target: number; prob: number } {
  const target = LADDER.find((m) => m > cur + 1e-9) ?? 100
  return { target, prob: Math.min(0.99, cur / target) }
}

const FEED_NAMES = ['whale_0x3f', 'shrimp_0x91', 'ape_0x1c', 'degen_0x77', 'hodl_0xab']

// Desktop ≥720px = the two-column layout; below that the chart stacks on top of
// the controls (mobile).
function useIsWide(): boolean {
  const [wide, setWide] = useState(() => (typeof window !== 'undefined' ? window.matchMedia('(min-width: 720px)').matches : true))
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 720px)')
    const on = () => setWide(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return wide
}

export function PulseCandle() {
  const [balance, setBalance] = useState(START_BALANCE)
  const [roundNo, setRoundNo] = useState(1)
  const [round, setRound] = useState<RoundPath>(() => generatePath(makeSeed(1)))
  const [phase, setPhase] = useState<Phase>('bet')
  const [visible, setVisible] = useState(0)
  const [wager, setWager] = useState(10)
  const [autoTarget, setAutoTarget] = useState<number | null>(2)
  const [cashOutIndex, setCashOutIndex] = useState<number | null>(null)
  const [cashedPrice, setCashedPrice] = useState(0)
  const [autoCashed, setAutoCashed] = useState(false)
  const [countdown, setCountdown] = useState(NEXT_ROUND_S)
  const [history, setHistory] = useState<CrashRecord[]>([
    { value: 2.41, early: false },
    { value: 1.08, early: true },
    { value: 5.63, early: false },
  ])
  const [rugFlash, setRugFlash] = useState(false)
  const [wickSaveHit, setWickSaveHit] = useState(false)
  const [gavelFlash, setGavelFlash] = useState(false)
  const [cashFlash, setCashFlash] = useState(false)
  const [lastRound, setLastRound] = useState<{ closes: number[]; crash: number } | null>(null)
  const [muted, setMuted] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  // `visible` = fully-committed candle count; `growth` (0..1) = how far the next
  // candle has formed this tick. rAF interpolates growth for smooth motion.
  const [growth, setGrowth] = useState(0)
  const visibleRef = useRef(0)
  const livePriceRef = useRef(1)
  const slot = useMemo(() => 40 + (roundNo % 60), [roundNo])
  const isWide = useIsWide()
  const dev = useMemo(() => typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('dev'), [])
  const TICK_MS = DEFAULT_TUNING.tickMs

  // ---- smooth ticking: grow the live candle across each tick via rAF --------
  useEffect(() => {
    if (phase !== 'live' && phase !== 'cashed') return
    const L = round.candles.length
    // Anchor the clock so `elapsed` maps to the current committed count (resume-safe).
    const start = performance.now() - visibleRef.current * TICK_MS
    let raf = 0
    let cancelled = false
    const loop = (t: number) => {
      if (cancelled) return
      const elapsed = t - start
      let committed = Math.floor(elapsed / TICK_MS)
      if (committed > L) committed = L
      const frac = committed >= L ? 1 : Math.min(1, (elapsed - committed * TICK_MS) / TICK_MS)
      if (committed !== visibleRef.current) {
        visibleRef.current = committed
        setVisible(committed)
      }
      setGrowth(frac)
      if (committed < L) raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
    }
  }, [phase, round, TICK_MS])

  // ---- per-tick event processing -------------------------------------------
  useEffect(() => {
    if (visible < 1) return
    if (phase !== 'live' && phase !== 'cashed') return
    const idx = visible - 1
    const candle = round.candles[idx]
    if (!candle) return

    if (idx === round.wickSaveIndex) {
      setWickSaveHit(true)
      sfx.playWick()
    }

    // The gavel drops — one flash, identical for pump and dump.
    if (round.fomc && idx === round.fomc.gavelIndex) {
      setGavelFlash(true)
      sfx.playGavel()
      setTimeout(() => setGavelFlash(false), 420)
    }

    // Per-candle cues: spike burst vs a subtle climb tick.
    if (idx !== round.rugIndex) {
      if (candle.kind === 'spike') sfx.playSpike()
      else if (candle.kind === 'up') sfx.playTick()
    }

    // The atomic rug candle: round over for everyone still in.
    if (idx === round.rugIndex) {
      sfx.playRug()
      // Red flash + shake only on an actual rugged LOSS — never stomp a cashed
      // win or a triumphant pump with a punishing shake.
      if (cashOutIndex == null) setRugFlash(true)
      setPhase('settled')
      setCountdown(NEXT_ROUND_S)
      setHistory((h) => [{ value: round.crashPoint, early: round.crashPoint < 1.5 }, ...h].slice(0, 6))
      // Remember this round's shape for the bet-entry ghost sparkline.
      setLastRound({ closes: round.candles.slice(0, round.rugIndex + 1).map((c) => c.close), crash: round.crashPoint })
      return
    }

    // Auto cash-out: fires the first tick the price crosses the target UPWARD.
    // The downward plunge of a wick save never crosses upward, so autos are
    // immune to the fake-out (spec §3.1).
    if (phase === 'live' && cashOutIndex == null && autoTarget != null) {
      const prev = round.candles[idx - 1]?.close ?? 1
      if (prev < autoTarget && candle.close >= autoTarget) {
        // A limit order fills at exactly the set target, not the overshooting
        // candle close — otherwise big steps inflate the payout past the target.
        sfx.playCashout()
        setCashFlash(true)
        setTimeout(() => setCashFlash(false), 550)
        setCashOutIndex(idx)
        setCashedPrice(autoTarget)
        setAutoCashed(true)
        setBalance((b) => b + wager * autoTarget)
        setPhase('cashed')
      }
    }
  }, [visible]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---- settlement → next round countdown -----------------------------------
  useEffect(() => {
    if (phase !== 'settled') return
    if (countdown <= 0) {
      startRound()
      return
    }
    const id = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(id)
  }, [phase, countdown]) // eslint-disable-line react-hooks/exhaustive-deps

  const startRound = useCallback(() => {
    const next = roundNo + 1
    setRoundNo(next)
    setRound(generatePath(makeSeed(next)))
    setPhase('bet')
    visibleRef.current = 0
    setVisible(0)
    setGrowth(0)
    setCashOutIndex(null)
    setCashedPrice(0)
    setAutoCashed(false)
    setRugFlash(false)
    setGavelFlash(false)
    setCashFlash(false)
    setWickSaveHit(false)
    setCountdown(NEXT_ROUND_S)
  }, [roundNo])

  // Keep the wager affordable — after losses drop the balance, re-clamp the
  // wager so COMMIT never silently no-ops (game-flow-qa dead-end).
  useEffect(() => {
    if (phase === 'bet' && wager > balance) setWager(Math.max(1, Math.floor(balance)))
  }, [balance, phase, wager])

  const canCommit = wager <= balance && balance >= 1

  const commit = useCallback(() => {
    if (wager > balance) return
    sfx.primeAudio()
    sfx.playCommit()
    setBalance((b) => b - wager)
    visibleRef.current = 0
    setVisible(0)
    setGrowth(0)
    setPhase('live')
    setCashOutIndex(null)
    setAutoCashed(false)
  }, [wager, balance])

  // Dev-only test hooks (shown only with ?dev=1 in the URL) — force a special
  // round and drop straight into it.
  const testRound = useCallback(
    (opts: { forceFomc?: boolean; forceDir?: 'pump' | 'dump'; forceWick?: boolean; forceSpike?: boolean }) => {
      const next = roundNo + 1
      setRoundNo(next)
      setRound(generatePath(makeSeed(next), undefined, opts))
      if (wager <= balance) setBalance((b) => b - wager)
      visibleRef.current = 0
      setVisible(0)
      setGrowth(0)
      setCashOutIndex(null)
      setCashedPrice(0)
      setAutoCashed(false)
      setRugFlash(false)
      setGavelFlash(false)
      setCashFlash(false)
      setWickSaveHit(false)
      setCountdown(NEXT_ROUND_S)
      sfx.primeAudio()
      setPhase('live')
    },
    [roundNo, wager, balance],
  )

  const cashOut = useCallback(() => {
    if (phase !== 'live') return
    // The rug is atomic — once it starts forming, everyone still in is rugged.
    if (round.candles[visible]?.kind === 'rug') return
    // Cash at the live price shown right now (the forming candle's interpolated
    // value). The path is committed; the player chooses the exit moment.
    const price = livePriceRef.current
    sfx.playCashout()
    setCashFlash(true)
    setTimeout(() => setCashFlash(false), 550)
    setCashOutIndex(visible)
    setCashedPrice(price)
    setBalance((b) => b + wager * price)
    setPhase('cashed')
  }, [phase, visible, round, wager])

  // ---- derived render state (interpolated per animation frame) --------------
  const committed = visible
  const forming = round.candles[committed] // the candle currently forming, if any
  const climbing = phase === 'live' || phase === 'cashed'
  const formingOpen = committed > 0 ? round.candles[committed - 1].close : 1
  const eased = easeOutCubic(growth)
  const rugForming = !!forming && forming.kind === 'rug'
  const formingAnim = forming ? formingOpen + (forming.close - formingOpen) * eased : formingOpen
  const livePrice = phase === 'settled' ? round.crashPoint : climbing && forming ? formingAnim : formingOpen
  livePriceRef.current = livePrice // read by cashOut() to pay the displayed price
  const lastDelta = forming ? formingAnim - formingOpen : 0
  const prevAth = committed > 0 ? round.ath[committed - 1] : 1
  const athValue = phase === 'settled' ? round.crashPoint : Math.max(prevAth, rugForming ? prevAth : formingAnim)
  const cashAmount = wager * livePrice
  const peakAmount = wager * athValue
  const rugged = phase === 'settled' && cashOutIndex == null
  const curIsDown = !!forming && forming.close < formingOpen && !rugForming
  // Target ladder + round telemetry.
  const ladder = nextTarget(livePrice)
  const dips = round.candles.slice(0, visible).filter((c) => c.kind === 'down').length
  const holding = Math.max(1, Math.round(24 / Math.pow(Math.max(1, livePrice), 0.45)))
  // Other players' exit flags (flavour, deterministic from the round).
  const otherFlags = useMemo(() => {
    if (round.rugIndex < 8) return []
    return [0.32, 0.56, 0.78].map((p, i) => {
      const idx = Math.min(round.rugIndex - 1, Math.floor(round.rugIndex * p))
      const c = round.candles[idx]
      return { idx, value: c.close, label: `${FEED_NAMES[(round.rugIndex + i) % FEED_NAMES.length].slice(0, 8)} ${c.close.toFixed(2)}x` }
    })
  }, [round])
  const wickActiveNow = wickSaveHit && round.wickSaveIndex >= 0 && phase !== 'settled' && committed <= round.wickSaveIndex + 3

  // ---- FOMC MEETING sub-phase (owl / countdown / gavel result) --------------
  const f = round.fomc
  let fomcPhase: 'none' | 'hush' | 'result' = 'none'
  let countdownNum = 0
  let fomcPose = 0
  if (f && (phase === 'live' || phase === 'cashed')) {
    const pos = committed
    if (pos >= f.hushStart && pos < f.gavelIndex) {
      fomcPhase = 'hush'
      const frac = (f.gavelIndex - pos) / Math.max(1, f.gavelIndex - f.hushStart) // 1 → 0
      countdownNum = Math.min(3, Math.max(1, Math.ceil(frac * 3)))
      fomcPose = frac > 0.72 ? 0 : 1 // entrance, then gavel-raised
    } else if (pos >= f.gavelIndex && pos <= f.gavelIndex + 8) {
      fomcPhase = 'result'
      fomcPose = 2 // verdict
    }
  }
  const fomcActive = fomcPhase !== 'none'
  const frontRun = fomcPhase === 'hush' // cash-out label swaps to "front-run the Fed"

  // Caption strip narration.
  const caption = (() => {
    if (fomcPhase === 'hush') return { text: 'OOOH… FOMC MEETING? · ', accent: 'FRONT-RUN THE FED OR HODL', col: T.value }
    if (fomcPhase === 'result')
      return f?.direction === 'pump'
        ? { text: 'PRINTER GO BRRR · ', accent: 'RATES CUT · MONEY PRINTER ON', col: T.up }
        : { text: 'THE FED KILLED IT · ', accent: 'RATES HIKED · LIQUIDITY GONE', col: T.down }
    if (phase === 'settled') {
      if (round.wickSaveIndex >= 0)
        return { text: `THIS ROUND HAD A WICK SAVE AT ${mult(round.candles[round.wickSaveIndex].low)} · THE RUG CAME AT `, accent: mult(round.crashPoint), col: T.down }
      return { text: `${dips > 0 ? 'THE DIP WAS A FAKE-OUT · ' : 'RUGGED FAST · '}THE RUG CAME AT `, accent: mult(round.crashPoint), col: T.down }
    }
    if (wickActiveNow) return { text: 'WICK SAVE · IT LOOKED LIKE THE RUG · ', accent: 'GOD CANDLE INCOMING', col: T.up }
    if (curIsDown) return { text: `DIP ${lastDelta.toFixed(2)} · `, accent: 'RECOVERY POSSIBLE · OR THE REAL RUG', col: T.up }
    return { text: 'CLIMBING · ', accent: 'CASH OR HODL', col: T.up }
  })()

  // Spectator delta line (shown in the CASHED panel).
  const spectatorLine = (() => {
    if (cashOutIndex == null) return null
    if (phase === 'settled') return { text: `YOU DODGED THE RUG AT ${mult(round.crashPoint)}`, col: T.up }
    const leftOnTable = wager * (livePrice - cashedPrice)
    if (leftOnTable > 0.01) return { text: `LEFT ON THE TABLE: +${money(leftOnTable)} USDC`, col: T.value }
    return { text: 'WATCHING THE ROUND PLAY OUT', col: T.textMuted }
  })()

  // Screen-reader status — announced on phase change (not per tick, to avoid spam).
  const announce =
    phase === 'bet'
      ? 'Place your bet and commit'
      : phase === 'live'
        ? 'Round live — cash out before the rug'
        : phase === 'cashed'
          ? `Cashed ${money(wager * cashedPrice)} at ${mult(cashedPrice)}, watching`
          : rugged
            ? `Rugged at ${mult(round.crashPoint)}, bet lost`
            : `Dodged the rug — cashed at ${mult(cashedPrice)}`

  return (
    <div style={{ position: 'relative', width: '100%', height: isWide ? '100%' : 'auto', minHeight: '100%', background: T.bgDeep, overflow: isWide ? 'hidden' : 'visible' }}>
      <style>{styles}</style>
      <div className="sr-only" role="status" aria-live="polite">
        {announce}
      </div>
      {showInfo && <InfoOverlay onClose={() => setShowInfo(false)} />}
      {/* Terminal-room background art, chart panel semi-transparent on top. */}
      <div
        className="sw-bg-art"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(${bgTerminal})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.44,
          filter: 'saturate(0.9)',
        }}
      />
      <div
        className={rugFlash ? 'stage shake' : 'stage'}
        style={{
          position: 'relative',
          maxWidth: 1180,
          margin: '0 auto',
          height: isWide ? '100%' : 'auto',
          minHeight: isWide ? undefined : '100dvh',
          display: 'flex',
          flexDirection: 'column',
          padding: isWide ? 14 : 10,
          paddingBottom: isWide ? 14 : 'calc(10px + env(safe-area-inset-bottom))',
          gap: isWide ? 10 : 8,
          fontFamily: 'ui-monospace, Consolas, Menlo, monospace',
          boxSizing: 'border-box',
        }}
      >
        {rugFlash && <div className="rug-flash" />}

        {/* ---- Topbar ---- */}
        <div style={bar(isWide ? 56 : 44)}>
          <span style={{ color: T.text, fontSize: 13, fontWeight: 500, letterSpacing: isWide ? 3 : 1.5 }}>
            SWOOBZ{' '}
            <span style={{ color: T.textMuted, letterSpacing: 1, fontWeight: 400 }}>
              · PULSE{isWide ? ` · R${String(roundNo).padStart(4, '0')} · ${phase === 'settled' ? 'SETTLED' : `SLOT ${String(slot).padStart(3, '0')}`}` : ''}
            </span>{' '}
            {phase !== 'settled' && phase !== 'bet' && <span style={{ color: T.up }}>● LIVE</span>}
          </span>
          {isWide && (
            <span style={{ color: T.textMuted, fontSize: 12, letterSpacing: 1 }}>
              {ROOM} · {roundNo + 37} RDS
              {(phase === 'live' || phase === 'cashed') && (
                <>
                  {' · '}
                  <span style={{ color: T.up }}>{holding} HOLDING</span>
                </>
              )}
            </span>
          )}
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {dev && (
              <>
                <button className="fomc-test" onClick={() => testRound({ forceFomc: true, forceDir: 'pump' })} title="Force FOMC pump">🦉 PUMP</button>
                <button className="fomc-test" onClick={() => testRound({ forceFomc: true, forceDir: 'dump' })} title="Force FOMC dump">🦉 DUMP</button>
                <button className="fomc-test" onClick={() => testRound({ forceWick: true })} title="Force wick-save">🌊 WICK</button>
                <button className="fomc-test" onClick={() => testRound({ forceSpike: true })} title="Force up-spike">📈 SPIKE</button>
              </>
            )}
            <button className="fomc-test" onClick={() => setShowInfo(true)} title="How to play" aria-label="How to play" style={{ padding: '0 8px', minHeight: 44, minWidth: 44, fontSize: 15, fontWeight: 700 }}>
              ?
            </button>
            <button
              className="fomc-test"
              onClick={() => {
                sfx.primeAudio()
                const m = !muted
                setMuted(m)
                sfx.setMuted(m)
              }}
              title={muted ? 'Unmute' : 'Mute'}
              aria-label={muted ? 'Unmute sound' : 'Mute sound'}
              style={{ padding: '0 8px', minHeight: 44, minWidth: 44, fontSize: 15 }}
            >
              {muted ? '🔇' : '🔊'}
            </button>
            <span style={{ color: T.value, fontSize: 13, fontWeight: 500 }}>BALANCE {money(balance)}</span>
          </span>
        </div>

        {/* ---- Main: chart | control column ---- */}
        <div style={isWide ? { flex: 1, display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 240px', gap: 12, minHeight: 0 } : { display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Chart column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>
            {/* HUD zone / result banner (same height — layout never shifts) */}
            {phase === 'settled' ? (
              <ResultBanner rugged={rugged} crash={round.crashPoint} wager={wager} cashedPrice={cashedPrice} auto={autoCashed} />
            ) : (
              <div style={{ height: 48, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '0 4px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                  <span style={{ color: phase === 'bet' ? T.textMuted : wickActiveNow ? T.down : T.up, fontSize: 40, fontWeight: 500, lineHeight: 1 }}>{mult(livePrice)}</span>
                  {phase !== 'bet' && (
                    <span style={{ color: lastDelta < 0 ? T.down : T.up, fontSize: 12, letterSpacing: 1 }}>
                      {lastDelta < 0 ? '▼' : '▲'} {lastDelta >= 0 ? '+' : ''}
                      {lastDelta.toFixed(2)} LAST
                    </span>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  {phase !== 'bet' && (
                    <div style={{ color: T.text, fontSize: 12, letterSpacing: 1 }}>
                      ATH <span style={{ color: T.value }}>{mult(athValue)}</span>
                    </div>
                  )}
                  {/* Target ladder — always the next UNREACHED milestone */}
                  <div style={{ color: T.textMuted, fontSize: 12, letterSpacing: 1 }}>
                    {phase === 'bet' ? 'NEXT TARGET ' : 'NEXT '}
                    <span style={{ color: T.text }}>{mult(ladder.target)}</span> · <span style={{ color: T.up }}>{Math.round(ladder.prob * 100)}%</span> CHANCE
                  </div>
                </div>
              </div>
            )}

            {/* Chart panel — a centered square box, as large as the space allows */}
            <div style={isWide ? { flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' } : { display: 'flex', justifyContent: 'center' }}>
              <div
                className={rugFlash ? 'collapse' : undefined}
                style={{
                  aspectRatio: '1 / 1',
                  height: isWide ? '100%' : 'auto',
                  width: isWide ? undefined : '100%',
                  maxWidth: isWide ? '100%' : '43vh',
                  maxHeight: isWide ? undefined : '43vh',
                  background: 'rgba(10,16,25,.86)',
                  border: `1px solid ${T.panelBorder}`,
                  borderRadius: 12,
                  padding: 12,
                  boxSizing: 'border-box',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                {phase === 'bet' ? (
                  <BetChartPlaceholder ghost={lastRound} />
                ) : (
                  <Chart
                    candles={round.candles}
                    visible={visible}
                    growth={phase === 'settled' ? 1 : growth}
                    athValue={athValue}
                    cashOutIndex={cashOutIndex}
                    cashedPrice={cashedPrice}
                    otherFlags={otherFlags}
                    wickSaveIndex={round.wickSaveIndex}
                    rugFlash={rugFlash}
                  />
                )}
                {/* Light hush-dim during FOMC — signals the event without hiding the price */}
                {fomcActive && <div style={{ position: 'absolute', inset: 0, borderRadius: 12, background: 'rgba(3,7,13,0.22)', pointerEvents: 'none' }} />}
                {gavelFlash && <div className="gavel-flash" />}
                {cashFlash && <div className="cash-flash" />}
              </div>
            </div>

            {/* Caption strip */}
            <div style={{ color: '#8fb0c4', fontSize: 12, letterSpacing: 1, textAlign: 'center', background: 'rgba(6,11,18,.8)', borderRadius: 6, padding: '3px 10px' }}>
              {phase === 'bet' ? (
                <span>COMMIT TO PRINT THE FIRST CANDLE · YOU CASH THE CANDLE, NOT THE TOP</span>
              ) : (
                <span>
                  {caption.text}
                  <span style={{ color: caption.col }}>{caption.accent}</span>
                </span>
              )}
            </div>
          </div>

          {/* Control column — the Chairman takes it over (big) during a FOMC event */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>
            {fomcActive && f ? (
              <FomcPanel
                pose={fomcPose}
                fomcPhase={fomcPhase as 'hush' | 'result'}
                countdown={countdownNum}
                direction={f.direction}
                isLive={phase === 'live'}
                isCashed={phase === 'cashed'}
                cashAmount={cashAmount}
                cashAmountCashed={wager * cashedPrice}
                livePrice={livePrice}
                isWide={isWide}
                onCashOut={cashOut}
              />
            ) : (
              <>
                <WagerPanel wager={wager} setWager={setWager} balance={balance} locked={phase !== 'bet'} />

                <ActionCluster
                  phase={phase}
                  canCommit={canCommit}
                  autoTarget={autoTarget}
                  setAutoTarget={setAutoTarget}
                  hash={round.hash}
                  cashAmount={cashAmount}
                  peakAmount={peakAmount}
                  livePrice={livePrice}
                  cashAmountCashed={wager * cashedPrice}
                  cashedPrice={cashedPrice}
                  spectatorLine={spectatorLine}
                  curIsDown={curIsDown}
                  frontRun={frontRun}
                  rugged={rugged}
                  wager={wager}
                  crash={round.crashPoint}
                  countdown={countdown}
                  onCommit={commit}
                  onCashOut={cashOut}
                  onBetAgain={startRound}
                />

                {phase !== 'bet' && <RoundTelemetry ath={athValue} dips={dips} target={ladder.target} prob={ladder.prob} />}

                <LiveFeed phase={phase} holding={holding} />

                {phase !== 'bet' && <div style={{ textAlign: 'center', color: T.textFaint, fontSize: 11, letterSpacing: 1 }}>HASH {round.hash.slice(0, 6)} ✓ · RECEIPT</div>}
              </>
            )}
          </div>
        </div>

        {/* ---- Statusbar ---- */}
        <div style={bar(40)}>
          <span style={{ color: T.textMuted, fontSize: 12, letterSpacing: 1 }}>
            {phase === 'bet' && 'AWAITING COMMIT · SEED COMMITTED & HASHED'}
            {phase === 'live' && 'CLIMBING · CRASH POINT REVEALED AT SETTLEMENT'}
            {phase === 'cashed' && 'CASHED · SPECTATING UNTIL THE RUG'}
            {phase === 'settled' && `SETTLED · CRASH POINT WAS ${mult(round.crashPoint)} · NEXT ROUND IN ${countdown}s`}
          </span>
          <span style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            <span style={{ color: T.textFaint, fontSize: 10, letterSpacing: 1, marginRight: 2 }}>LAST ROUNDS</span>
            {history.slice(0, 4).map((h, i) => (
              <span
                key={i}
                style={{
                  height: 22,
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '0 9px',
                  borderRadius: 999,
                  background: h.early ? T.downBg : T.upDeep,
                  border: `1px solid ${h.early ? T.downBorder : T.upBorder}`,
                  color: h.early ? T.down : T.up,
                  fontSize: 12,
                }}
              >
                {mult(h.value)}
              </span>
            ))}
          </span>
        </div>
      </div>
    </div>
  )
}

// ---- sub-components ---------------------------------------------------------

function bar(h: number): React.CSSProperties {
  return {
    minHeight: h, // grows instead of clipping if content wraps on a narrow screen
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
    background: T.panel,
    border: `1px solid ${T.panelBorder}`,
    borderRadius: 8,
    padding: '4px 12px',
  }
}

function panel(extra?: React.CSSProperties): React.CSSProperties {
  return { background: T.panel, border: `1px solid ${T.panelBorder}`, borderRadius: 10, padding: '10px 12px', ...extra }
}

// One-screen rules — reachable any time from the "?" in the topbar. A proper
// keyboard modal: focus moves in on open, Escape closes, Tab is trapped, and
// focus returns to the trigger on close.
function InfoOverlay({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null
    const node = ref.current
    const focusable = () => Array.from(node?.querySelectorAll<HTMLElement>('button, [tabindex="0"]') ?? [])
    focusable()[0]?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'Tab') {
        const f = focusable()
        if (!f.length) return
        const first = f[0]
        const last = f[f.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      trigger?.focus?.()
    }
  }, [onClose])
  const rules: [string, string][] = [
    ['COMMIT', 'Place a wager. A price then climbs like a candlestick chart.'],
    ['CASH OUT', 'Grab the CURRENT price before the RUG (the crash). You cash the candle, not the peak.'],
    ['AUTO CASH-OUT', 'Fires the moment the price first hits your set multiplier.'],
    ['SPECTATE', 'After you cash, the round keeps printing — see what you left on the table or the rug you dodged.'],
    ['WICK SAVE', 'A fake crash that dives toward zero then rockets back. Cash stays open the whole way down.'],
    ['FOMC MEETING', 'The Chairman interrupts: front-run the Fed (cash now) or hold through a violent PUMP or DUMP.'],
    ['PROVABLY FAIR', 'Every candle path is seeded and hashed before the round — verifiable, never steered.'],
  ]
  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label="How to play Pulse"
      onClick={onClose}
      style={{ position: 'absolute', inset: 0, zIndex: 20, background: 'rgba(3,7,13,.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420, width: '100%', maxHeight: '88%', overflowY: 'auto', background: T.panel, border: `1px solid ${T.up}`, borderRadius: 12, padding: 18, fontFamily: 'ui-monospace, Consolas, Menlo, monospace' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ color: T.text, fontSize: 14, letterSpacing: 2, fontWeight: 500 }}>HOW TO PLAY</span>
          <button className="fomc-test" aria-label="Close how to play" onClick={onClose} style={{ minHeight: 36, minWidth: 36, fontSize: 14 }}>
            ✕
          </button>
        </div>
        {rules.map(([k, v]) => (
          <div key={k} style={{ marginBottom: 9 }}>
            <div style={{ color: T.up, fontSize: 11, letterSpacing: 1.5, marginBottom: 1 }}>{k}</div>
            <div style={{ color: T.textMuted, fontSize: 12, lineHeight: 1.4 }}>{v}</div>
          </div>
        ))}
        <div style={{ color: T.textFaint, fontSize: 11, marginTop: 8 }}>MIN 1.00 · RTP 95.5% · cyan = up · red = down · gold = value.</div>
      </div>
    </div>
  )
}

// Bet-entry chart: a ghost sparkline of the last round behind the "awaiting
// commit" prompt.
function BetChartPlaceholder({ ghost }: { ghost: { closes: number[]; crash: number } | null }) {
  let poly = ''
  let crashX = 0
  if (ghost && ghost.closes.length > 1) {
    const top = Math.max(2, ghost.crash * 1.05)
    const n = ghost.closes.length
    const yFor = (v: number) => 232 - (Math.log(Math.max(1, v)) / Math.log(top)) * 210
    poly = ghost.closes.map((c, i) => `${18 + (i / (n - 1)) * 404},${yFor(c).toFixed(1)}`).join(' ')
    crashX = 18 + 404
  }
  return (
    <div style={{ position: 'absolute', inset: 12 }}>
      <svg viewBox="0 0 440 250" preserveAspectRatio="none" aria-hidden="true" style={{ width: '100%', height: '100%', display: 'block' }}>
        {ghost && poly && (
          <>
            <polyline points={poly} fill="none" stroke="#2c5a66" strokeWidth={1.5} strokeDasharray="3 3" opacity={0.5} />
            <line x1={crashX} y1={20} x2={crashX} y2={236} stroke={T.down} strokeWidth={2} opacity={0.3} />
            <text x={crashX - 130} y={16} fill={T.textFaint} fontSize={11} fontFamily="monospace">
              LAST ROUND · {ghost.crash.toFixed(2)}x
            </text>
          </>
        )}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
        <span style={{ color: T.text, fontSize: 22, fontWeight: 500, letterSpacing: 2 }}>1.00x</span>
        <span style={{ color: T.textMuted, fontSize: 11, letterSpacing: 2 }}>SEED COMMITTED · AWAITING FIRST CANDLE</span>
      </div>
    </div>
  )
}

// FOMC set-piece — takes over the control column with the BIG Chairman, the
// countdown, and the front-run CTA. Deliberately NOT over the chart, so the
// moving price stays fully visible.
function FomcPanel({
  pose,
  fomcPhase,
  countdown,
  direction,
  isLive,
  isCashed,
  cashAmount,
  cashAmountCashed,
  livePrice,
  isWide,
  onCashOut,
}: {
  pose: number
  fomcPhase: 'hush' | 'result'
  countdown: number
  direction: 'pump' | 'dump'
  isLive: boolean
  isCashed: boolean
  cashAmount: number
  cashAmountCashed: number
  livePrice: number
  isWide: boolean
  onCashOut: () => void
}) {
  return (
    <>
      <div style={{ color: T.value, fontSize: 12, letterSpacing: 3, textAlign: 'center' }}>⚖ FOMC MEETING</div>
      {/* Big Chairman — capped small on mobile so the countdown + CTA stay on screen. */}
      <div style={{ flex: isWide ? 1 : '0 0 auto', minHeight: 0, maxHeight: isWide ? undefined : '13vh', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', position: 'relative' }}>
        <img
          src={CHAIRMAN_POSES[pose]}
          alt="The Chairman"
          className="owl-in"
          style={{ maxHeight: isWide ? '100%' : '13vh', maxWidth: '100%', objectFit: 'contain', objectPosition: 'bottom', filter: 'drop-shadow(0 8px 20px rgba(0,0,0,.6))' }}
        />
      </div>
      {/* Countdown or verdict */}
      <div style={{ textAlign: 'center', minHeight: 60 }}>
        {fomcPhase === 'hush' ? (
          <>
            <div key={countdown} className="count-pop" style={{ color: '#fff', fontSize: 58, fontWeight: 700, lineHeight: 1, textShadow: '0 0 24px rgba(240,181,66,.6)' }}>
              {countdown}
            </div>
            <div style={{ color: T.textMuted, fontSize: 11, letterSpacing: 1, marginTop: 2 }}>FRONT-RUN THE FED OR HODL</div>
          </>
        ) : (
          <div className="count-pop" style={{ color: direction === 'pump' ? T.up : T.down, fontSize: 30, fontWeight: 700, letterSpacing: 2 }}>
            {direction === 'pump' ? 'PUMP! 🚀' : 'DUMP! 💀'}
          </div>
        )}
      </div>
      {/* CTA */}
      {isLive && (
        <button className="cta cta-cyan cta-pulse" style={{ marginTop: 'auto', flexDirection: 'column' }} onClick={onCashOut}>
          {fomcPhase === 'hush' ? (
            <>
              <span style={{ fontSize: 12 }}>FRONT-RUN THE FED?</span>
              <span style={{ fontSize: 11 }}>CASH {money(cashAmount)} NOW</span>
            </>
          ) : (
            <>
              <span style={{ fontSize: 12 }}>CASH OUT</span>
              <span style={{ fontSize: 11 }}>
                {money(cashAmount)} USDC AT {mult(livePrice)}
              </span>
            </>
          )}
        </button>
      )}
      {isCashed && (
        <button className="cta cta-outline" style={{ marginTop: 'auto' }} disabled>
          CASHED {money(cashAmountCashed)} · WATCHING
        </button>
      )}
    </>
  )
}

function ResultBanner({ rugged, crash, wager, cashedPrice, auto }: { rugged: boolean; crash: number; wager: number; cashedPrice: number; auto: boolean }) {
  if (rugged) {
    return (
      <div style={{ height: 48, background: T.downBg, border: `1px solid ${T.down}`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px' }}>
        <span style={{ color: T.down, fontSize: 12, letterSpacing: 2 }}>▼ PULSE RUGGED</span>
        <span style={{ color: '#fff', fontSize: 16, fontWeight: 500 }}>
          CRASHED AT {mult(crash)} <span style={{ color: T.down, fontSize: 12 }}>−{money(wager)} USDC</span>
        </span>
      </div>
    )
  }
  const profit = wager * cashedPrice - wager
  return (
    <div style={{ height: 48, background: T.upDeep, border: `1px solid ${T.up}`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px' }}>
      <span style={{ color: T.upText, fontSize: 12, letterSpacing: 2 }}>✓ {auto ? 'AUTO ' : ''}CASHED · DODGED THE RUG</span>
      <span style={{ color: '#fff', fontSize: 16, fontWeight: 500 }}>
        {money(wager * cashedPrice)} AT {mult(cashedPrice)} <span style={{ color: T.up, fontSize: 12 }}>+{money(profit)} USDC</span>
      </span>
    </div>
  )
}

// P1 — Wager panel. Locked (dimmed) once the round is live.
function WagerPanel({ wager, setWager, balance, locked }: { wager: number; setWager: (n: number) => void; balance: number; locked: boolean }) {
  if (locked) {
    return (
      <div style={panel({ opacity: 0.5 })}>
        <div style={{ color: T.textMuted, fontSize: 11, letterSpacing: 2, marginBottom: 3 }}>YOUR WAGER · LOCKED</div>
        <div style={{ color: T.text, fontSize: 15, fontWeight: 500 }}>
          {money(wager)} <span style={{ color: T.textMuted, fontSize: 11 }}>USDC</span>
        </div>
      </div>
    )
  }
  return (
    <div style={panel()}>
      <div style={{ color: T.textMuted, fontSize: 11, letterSpacing: 2, marginBottom: 6 }}>YOUR WAGER</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <button className="step" aria-label="Decrease wager by 5" onClick={() => setWager(Math.max(1, Math.round((wager - 5) * 100) / 100))}>−</button>
        <span style={{ color: T.text, fontSize: 16, fontWeight: 500 }}>
          {money(wager)} <span style={{ color: T.textMuted, fontSize: 11 }}>USDC</span>
        </span>
        <button className="step" aria-label="Increase wager by 5" onClick={() => setWager(Math.min(balance, wager + 5))}>+</button>
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {QUICK_CHIPS.map((c) => (
          <button key={c} className="chip" aria-label={`Set wager to ${c} USDC`} onClick={() => setWager(Math.min(balance, c))} style={wager === c ? chipGold : undefined}>
            {c}
          </button>
        ))}
      </div>
    </div>
  )
}

function Divider() {
  return <div style={{ height: 1, background: T.panelBorder }} />
}

function ClusterFooter({ filled, pulse, disabled, onClick, children, ariaLabel }: { filled?: boolean; pulse?: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode; ariaLabel?: string }) {
  return (
    <button
      onClick={() => !disabled && onClick()}
      disabled={disabled}
      aria-label={ariaLabel}
      className={pulse && !disabled ? 'cta-pulse' : undefined}
      style={{
        height: 46,
        width: '100%',
        border: 'none',
        cursor: disabled ? 'default' : 'pointer',
        touchAction: 'manipulation',
        fontFamily: 'inherit',
        fontWeight: 500,
        letterSpacing: 0.5,
        whiteSpace: 'nowrap', // never let the CTA (e.g. the "→") wrap to a 2nd line
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        opacity: disabled ? 0.5 : 1,
        background: filled ? T.up : 'transparent',
        color: filled ? '#042220' : T.up,
      }}
    >
      {children}
    </button>
  )
}

function AutoChips({ autoTarget, setAutoTarget }: { autoTarget: number | null; setAutoTarget: (n: number | null) => void }) {
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {AUTO_CHIPS.map((a, i) => (
        <button key={i} className="chip" aria-label={a == null ? 'Auto cash-out off' : `Auto cash out at ${a.toFixed(1)}x`} onClick={() => setAutoTarget(a)} style={autoTarget === a ? chipOn : undefined}>
          {a == null ? 'OFF' : `${a.toFixed(1)}x`}
        </button>
      ))}
    </div>
  )
}

// P2 — the ACTION CLUSTER: config + info + CTA footer fused into one panel.
function ActionCluster(props: {
  phase: Phase
  canCommit?: boolean
  autoTarget: number | null
  setAutoTarget: (n: number | null) => void
  hash: string
  cashAmount: number
  peakAmount: number
  livePrice: number
  cashAmountCashed: number
  cashedPrice: number
  spectatorLine: { text: string; col: string } | null
  curIsDown: boolean
  frontRun: boolean
  rugged: boolean
  wager: number
  crash: number
  countdown: number
  onCommit: () => void
  onCashOut: () => void
  onBetAgain: () => void
}) {
  const { phase, canCommit, autoTarget, setAutoTarget, hash, cashAmount, peakAmount, livePrice, cashAmountCashed, cashedPrice, spectatorLine, curIsDown, frontRun, rugged, wager, crash, countdown, onCommit, onCashOut, onBetAgain } = props
  const cyan = phase === 'live' || phase === 'cashed'
  const border = phase === 'settled' && rugged ? T.down : cyan ? T.up : T.panelBorder
  return (
    <div style={{ background: T.panel, border: `1px solid ${border}`, borderRadius: 10, overflow: 'hidden' }}>
      {phase === 'bet' && (
        <>
          <div style={{ padding: '9px 11px 8px' }}>
            <div style={{ color: T.textMuted, fontSize: 11, letterSpacing: 2, marginBottom: 5 }}>AUTO CASH-OUT</div>
            <AutoChips autoTarget={autoTarget} setAutoTarget={setAutoTarget} />
          </div>
          <Divider />
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 11px' }}>
            <span style={{ color: T.textMuted, fontSize: 11, letterSpacing: 1 }}>MIN 1.00 · RTP 95.5%</span>
            <span style={{ color: T.textFaint, fontSize: 11 }}>{hash.slice(0, 6)} ✓</span>
          </div>
          <ClusterFooter filled disabled={canCommit === false} onClick={onCommit} ariaLabel="Commit your bet">
            {canCommit === false ? 'WAGER EXCEEDS BALANCE' : 'COMMIT →'}
          </ClusterFooter>
        </>
      )}
      {phase === 'live' && (
        <>
          <div style={{ padding: '9px 11px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <span style={{ color: T.textMuted, fontSize: 11, letterSpacing: 2 }}>CASH OUT AT</span>
              {/* Peak shown in a fixed slot (never wraps) so the button never shifts. */}
              <span style={{ color: T.textMuted, fontSize: 10 }}>PEAK {money(peakAmount)}</span>
            </div>
            <div style={{ color: T.up, fontSize: 18, fontWeight: 500 }}>
              {money(cashAmount)} <span style={{ fontSize: 11 }}>USDC</span>
            </div>
          </div>
          <Divider />
          <ClusterFooter filled pulse={curIsDown || frontRun} onClick={onCashOut} ariaLabel={`Cash out ${money(cashAmount)} at ${mult(livePrice)}`}>
            {frontRun ? `FRONT-RUN THE FED? · CASH ${money(cashAmount)}` : `CASH OUT ${money(cashAmount)} AT ${mult(livePrice)}`}
          </ClusterFooter>
        </>
      )}
      {phase === 'cashed' && (
        <>
          <div style={{ padding: '9px 11px' }}>
            <div style={{ color: T.up, fontSize: 11, letterSpacing: 2, marginBottom: 3 }}>CASHED</div>
            <div style={{ color: T.up, fontSize: 17, fontWeight: 500 }}>
              {money(cashAmountCashed)} <span style={{ fontSize: 11 }}>AT {mult(cashedPrice)}</span>
            </div>
            {spectatorLine && (
              <div style={{ color: spectatorLine.col, fontSize: 11, marginTop: 3 }}>
                {spectatorLine.text} <span style={{ color: T.textFaint }}>· LIVE</span>
              </div>
            )}
          </div>
          <Divider />
          <ClusterFooter onClick={onBetAgain} ariaLabel="Bet again">BET AGAIN · {countdown}s →</ClusterFooter>
        </>
      )}
      {phase === 'settled' && (
        <>
          <div style={{ padding: '9px 11px' }}>
            {rugged ? (
              <>
                <div style={{ color: T.down, fontSize: 11, letterSpacing: 2, marginBottom: 3 }}>▼ PULSE RUGGED</div>
                <div style={{ color: '#fff', fontSize: 15, fontWeight: 500 }}>
                  CRASHED AT {mult(crash)} <span style={{ color: T.down, fontSize: 11 }}>−{money(wager)}</span>
                </div>
              </>
            ) : (
              <>
                <div style={{ color: T.up, fontSize: 11, letterSpacing: 2, marginBottom: 3 }}>✓ DODGED THE RUG</div>
                <div style={{ color: T.up, fontSize: 15, fontWeight: 500 }}>
                  {money(cashAmountCashed)} AT {mult(cashedPrice)}
                </div>
              </>
            )}
          </div>
          <Divider />
          <ClusterFooter filled onClick={onBetAgain} ariaLabel="Bet again">BET AGAIN · {countdown}s →</ClusterFooter>
        </>
      )}
    </div>
  )
}

// P4 — round telemetry: ATH · DIPS · next target %.
function RoundTelemetry({ ath, dips, target, prob }: { ath: number; dips: number; target: number; prob: number }) {
  const Tele = ({ label, value, col }: { label: string; value: string; col: string }) => (
    <div>
      <div style={{ color: T.textMuted, fontSize: 11 }}>{label}</div>
      <div style={{ color: col, fontSize: 12, fontWeight: 500 }}>{value}</div>
    </div>
  )
  return (
    <div style={panel()}>
      <div style={{ color: T.textMuted, fontSize: 11, letterSpacing: 2, marginBottom: 4 }}>ROUND TELEMETRY</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
        <Tele label="ATH" value={mult(ath)} col={T.value} />
        <Tele label="RED CANDLES" value={String(dips)} col={T.down} />
        <Tele label={`${mult(target)} CHANCE`} value={`${Math.round(prob * 100)}%`} col={T.up} />
      </div>
    </div>
  )
}

// P5 — live feed. Flexes to fill the remaining column height.
function LiveFeed({ phase, holding }: { phase: Phase; holding: number }) {
  const rows: [string, string, string][] =
    phase === 'bet'
      ? [
          ['whale_0x3f', 'committed', '50.00'],
          ['shrimp_0x91', 'committed', '5.00'],
        ]
      : [
          ['whale_0x3f', 'cashed', '2.41x'],
          ['shrimp_0x91', 'cashed', '3.05x'],
        ]
  const footer = phase === 'bet' ? '23 IN THE NEXT ROUND' : `${holding} STILL HOLDING`
  return (
    <div style={panel({ flex: 1, minHeight: 0, overflow: 'hidden' })}>
      <div style={{ color: T.textMuted, fontSize: 11, letterSpacing: 2, marginBottom: 2 }}>LIVE FEED</div>
      <div style={{ fontSize: 11, lineHeight: 1.9 }}>
        {rows.map((r, i) => (
          <div key={i}>
            <span style={{ color: T.up }}>{r[0]}</span> <span style={{ color: T.textMuted }}>{r[1]}</span> <span style={{ color: T.text }}>{r[2]}</span>
          </div>
        ))}
        <div style={{ color: T.textMuted }}>{footer}</div>
      </div>
    </div>
  )
}

const chipOn: React.CSSProperties = { background: T.upDeep, borderColor: T.up, color: T.upText }
const chipGold: React.CSSProperties = { background: '#2a2410', borderColor: T.value, color: T.value }

const styles = `
.stage button { touch-action: manipulation; }
/* Inset outline so an overflow:hidden ancestor (the action cluster) can't clip it. */
.stage button:focus-visible { outline: 2px solid #ffffff; outline-offset: -3px; }
.stage .step {
  width: 34px; height: 34px; border-radius: 7px; border: 1px solid ${T.panelBorder};
  background: rgba(6,11,18,.6); color: ${T.text}; font-size: 18px; cursor: pointer;
}
.stage .step:hover { border-color: ${T.up}; color: ${T.up}; }
.stage .chip {
  flex: 1; height: 24px; border-radius: 6px; border: 1px solid ${T.panelBorder};
  background: transparent; color: ${T.textMuted}; font-size: 11px; cursor: pointer;
  font-family: inherit; letter-spacing: .5px;
}
.stage .chip:hover:not(:disabled) { border-color: ${T.up}; color: ${T.up}; }
.stage .chip:disabled { opacity: .55; cursor: default; }
.stage .cta {
  height: 46px; border-radius: 8px; border: none; cursor: pointer; font-family: inherit;
  display: flex; align-items: center; justify-content: center; font-weight: 500;
  letter-spacing: 2px; width: 100%;
}
.stage .cta-cyan { background: ${T.up}; color: #042220; }
.stage .cta-cyan:hover { filter: brightness(1.08); }
.stage .cta-outline { background: transparent; border: 1px solid ${T.up}; color: ${T.up}; letter-spacing: 1px; }
.stage .cta-pulse { animation: ctaPulse 0.7s ease-in-out infinite; }
@keyframes ctaPulse { 0%,100% { filter: brightness(1); } 50% { filter: brightness(1.25); } }
/* All bursts scale via transform (works on iOS Safari; SVG r-animation does not).
   non-scaling-stroke (set on the elements) keeps ring thickness constant. */
.pulse-dot, .spike-burst, .spike-burst2, .spike-flash, .rug-burst, .rug-burst2, .rug-blast, .cash-burst, .cash-burst2, .cash-blast {
  transform-box: fill-box; transform-origin: center;
}
.pulse-dot { animation: dotPulse 1.1s ease-out infinite; }
@keyframes dotPulse { from { transform: scale(1); opacity: 1; } to { transform: scale(2.4); opacity: 0; } }
/* Up-spike rejection burst — an expanding double ring + a quick flash. */
.spike-burst  { animation: spikeBurst .7s ease-out forwards; }
.spike-burst2 { animation: spikeBurst2 .7s .06s ease-out forwards; }
.spike-flash  { animation: spikeFlash .35s ease-out forwards; }
@keyframes spikeBurst  { from { transform: scale(1); opacity: .95; } to { transform: scale(8.7); opacity: 0; } }
@keyframes spikeBurst2 { from { transform: scale(1); opacity: .8; } to { transform: scale(7.5); opacity: 0; } }
@keyframes spikeFlash  { from { transform: scale(1); opacity: .8; } to { transform: scale(0); opacity: 0; } }
/* Bigger, heavier rug explosion. */
.rug-burst  { animation: rugBurst .85s cubic-bezier(.15,.7,.3,1) forwards; }
.rug-burst2 { animation: rugBurst2 .85s .08s cubic-bezier(.15,.7,.3,1) forwards; }
.rug-blast  { animation: rugBlast .45s ease-out forwards; }
@keyframes rugBurst  { from { transform: scale(1); opacity: 1; } to { transform: scale(12.4); opacity: 0; } }
@keyframes rugBurst2 { from { transform: scale(1); opacity: .9; } to { transform: scale(13.3); opacity: 0; } }
@keyframes rugBlast  { from { transform: scale(1); opacity: .85; } to { transform: scale(0); opacity: 0; } }
/* Cash-out celebration — cyan burst at the exit + a soft cyan wash. */
.cash-burst  { animation: cashBurst .6s ease-out forwards; }
.cash-burst2 { animation: cashBurst2 .6s .05s ease-out forwards; }
.cash-blast  { animation: cashBlast .4s ease-out forwards; }
@keyframes cashBurst  { from { transform: scale(1); opacity: 1; } to { transform: scale(8.5); opacity: 0; } }
@keyframes cashBurst2 { from { transform: scale(1); opacity: .85; } to { transform: scale(7.3); opacity: 0; } }
@keyframes cashBlast  { from { transform: scale(1); opacity: .8; } to { transform: scale(0); opacity: 0; } }
.cash-flash { position: absolute; inset: 0; border-radius: 12px; pointer-events: none; z-index: 5;
  background: radial-gradient(circle, rgba(53,224,210,.28), rgba(53,224,210,0) 68%); animation: cashWash .55s ease-out; }
@keyframes cashWash { 0% { opacity: .9; } 100% { opacity: 0; } }
.stage.shake { animation: shake 0.6s cubic-bezier(.36,.07,.19,.97); }
@keyframes shake {
  10%,90% { transform: translate(-2px,1px); } 20%,80% { transform: translate(4px,-1px); }
  30%,50%,70% { transform: translate(-7px,2px); } 40%,60% { transform: translate(7px,-2px); }
}
.rug-flash { position: absolute; inset: 0; background: ${T.down}; opacity: 0; pointer-events: none;
  animation: flash 0.55s ease-out; z-index: 5; border-radius: 12px; }
@keyframes flash { 0% { opacity: .5; } 30% { opacity: .18; } 55% { opacity: .34; } 100% { opacity: 0; } }
/* Price collapse — the whole chart desaturates + slams down and recovers. */
.collapse { animation: collapse 0.6s cubic-bezier(.36,.07,.19,.97); transform-origin: center 40%; }
@keyframes collapse {
  0%   { filter: grayscale(0) brightness(1); transform: translateY(0) scale(1); }
  14%  { filter: grayscale(.9) brightness(.62); transform: translateY(9px) scale(.972); }
  46%  { filter: grayscale(.5) brightness(.85); transform: translateY(2px) scale(.99); }
  100% { filter: grayscale(0) brightness(1); transform: translateY(0) scale(1); }
}
.stage .fomc-test {
  height: 22px; padding: 0 8px; border-radius: 6px; border: 1px solid ${T.panelBorder};
  background: rgba(6,11,18,.6); color: ${T.textMuted}; font-size: 10px; letter-spacing: 1px;
  cursor: pointer; font-family: inherit;
}
.stage .fomc-test:hover { border-color: ${T.value}; color: ${T.value}; }
.gavel-flash {
  position: absolute; inset: 0; border-radius: 12px; pointer-events: none; z-index: 6;
  background: radial-gradient(circle, rgba(240,181,66,.5), rgba(240,181,66,0) 70%);
  animation: gavelF .42s ease-out;
}
@keyframes gavelF { 0% { opacity: .95; transform: scale(.9); } 100% { opacity: 0; transform: scale(1.12); } }
.count-pop { animation: countPop .5s cubic-bezier(.2,1.4,.4,1); }
@keyframes countPop { 0% { transform: scale(.4); opacity: 0; } 40% { transform: scale(1.15); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
.owl-in { animation: owlIn .35s cubic-bezier(.2,1.3,.4,1); }
@keyframes owlIn { 0% { transform: translateX(60%); opacity: 0; } 100% { transform: translateX(0); opacity: 1; } }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
/* Mobile — bump tap targets to a thumb-friendly size. */
@media (max-width: 719px) {
  .stage .step { width: 44px; height: 44px; }
  .stage .chip { height: 44px; font-size: 12px; }
  .stage .fomc-test { min-height: 40px; }
}
.owl-breathe { animation: owlBreathe 3.6s ease-in-out infinite; transform-origin: bottom center; }
@keyframes owlBreathe { 0%,100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-2px) scale(1.012); } }
@media (prefers-reduced-motion: reduce) {
  /* Keep candle GROWTH (it is information); drop decorative motion. */
  .pulse-dot, .cta-pulse, .owl-breathe { animation: none !important; }
  .stage.shake, .collapse { animation: none !important; }
  .rug-flash, .gavel-flash { animation-duration: .01s !important; }
  .count-pop, .owl-in { animation-duration: .01s !important; }
  .spike-burst, .spike-burst2, .spike-flash { animation-duration: .01s !important; }
  .rug-burst, .rug-burst2, .rug-blast { animation-duration: .01s !important; }
  .cash-burst, .cash-burst2, .cash-blast, .cash-flash { animation-duration: .01s !important; }
}
`
