// Candle chart renderer. Uses the exact grammar from the mockups: green/red
// candlesticks (open = previous close), gold dashed ATH line, teal dashed
// current-price line with a pulse dot on the live candle, gridlines at the
// round multiples. The newest candle is drawn *forming* — interpolated by
// `growth` (0..1) each animation frame — so the chart grows smoothly instead of
// popping one candle per tick.
import type { Candle } from './path'
import { T } from './theme'

const VW = 460
const VH = 460 // square chart box
const TOP = 26
const BOT = 430 // baseline for 1.00x
const LEFTPAD = 20
const RIGHTPAD = 18
const WINDOW = 50 // most recent candles kept in view — denser, closer candles

interface DrawCandle {
  i: number
  open: number
  close: number
  high: number
  low: number
  kind: Candle['kind']
  forming: boolean
}

export interface ChartProps {
  candles: Candle[]
  visible: number // count of fully-committed candles; candles[visible] is forming
  growth: number // 0..1 growth of the forming candle
  athValue: number
  cashOutIndex: number | null
  cashedPrice?: number
  otherFlags?: { idx: number; value: number; label: string }[]
  wickSaveIndex: number
  rugFlash: boolean
}

export function Chart({ candles, visible, growth, athValue, cashOutIndex, cashedPrice, otherFlags, wickSaveIndex, rugFlash }: ChartProps) {
  // Index of the last candle to draw: the forming one if a round is climbing,
  // else the final committed candle.
  const forming = visible < candles.length
  const end = forming ? visible : visible - 1
  if (end < 0) return <svg viewBox={`0 0 ${VW} ${VH}`} style={{ width: '100%', height: '100%', display: 'block' }} />

  // Adaptive window: start narrow so the first candles fill the box (denser),
  // widen up to WINDOW as the round grows.
  const awin = Math.min(WINDOW, Math.max(20, end + 2))
  const startIdx = Math.max(0, end - awin + 1)
  const ez = 1 - Math.pow(1 - growth, 3) // ease-out for the vertical body
  const items: DrawCandle[] = []
  for (let i = startIdx; i <= end; i++) {
    const c = candles[i]
    if (!c) continue
    if (i === visible && forming) {
      const open = i > 0 ? candles[i - 1].close : 1
      const close = open + (c.close - open) * ez
      const bodyHi = Math.max(open, close)
      const bodyLo = Math.min(open, close)
      // Wick reaches its extent proportionally as the candle forms.
      const upWick = (c.high - Math.max(c.open, c.close)) * ez
      const dnWick = (Math.min(c.open, c.close) - c.low) * ez
      items.push({ i, open, close, high: bodyHi + upWick, low: bodyLo - dnWick, kind: c.kind, forming: true })
    } else {
      items.push({ i, open: c.open, close: c.close, high: c.high, low: c.low, kind: c.kind, forming: false })
    }
  }

  const lastItem = items[items.length - 1]
  const lastPrice = lastItem ? lastItem.close : 1

  // Logarithmic vertical scale: a constant % move is a constant pixel height, so
  // candles stay readable from 1x to 100x and never compress into a sliver (how
  // real crash charts scale). Fits 1.00x .. above the ATH AND any visible wick
  // spike (so uncashable up-spikes stay on-screen).
  const maxHi = items.reduce((m, c) => Math.max(m, c.high), athValue)
  // Tighter zoom on tiny insta-rug rounds so the box isn't a near-empty void.
  const base = athValue < 1.5 ? Math.max(1.35, athValue * 1.25) : 2.2
  const top = Math.max(base, athValue * 1.1, maxHi * 1.04)
  const logTop = Math.log(top)
  const yFor = (v: number) => BOT - (Math.log(Math.max(1, v)) / logTop) * (BOT - TOP)
  const step = (VW - LEFTPAD - RIGHTPAD) / Math.max(1, awin - 1)
  // Continuous horizontal pan: once the window is full, scroll left by one step
  // as the forming candle grows in, so the chart glides instead of stepping.
  // Linear (not eased) so the scroll velocity stays constant across commits.
  const pan = startIdx > 0 && forming ? growth * step : 0
  const xFor = (i: number) => LEFTPAD + (i - startIdx) * step - pan
  const bodyW = Math.max(3.5, Math.min(9, step * 0.82)) // wider bodies → less gap between candles
  const hw = bodyW / 2

  const gridLevels = [1.0, 1.5, 2.0, 3.0, 4.0, 6.0, 10.0, 20.0, 50.0, 100.0].filter((g) => g <= top + 0.001)
  const els: JSX.Element[] = []
  // Everything on this layer is drawn AFTER every candle, so candles never paint
  // over the gutter labels, the ATH label, or the exit flags.
  const flagEls: JSX.Element[] = []

  gridLevels.forEach((g) => {
    const gy = yFor(g)
    els.push(<line key={`g${g}`} x1={0} y1={gy} x2={VW} y2={gy} stroke="#1c3044" />)
    // Suppress a gridline label that would collide with the ATH label.
    if (Math.abs(g - athValue) / athValue < 0.03) return
    flagEls.push(<rect key={`glb${g}`} x={0} y={gy - 12} width={34} height={12} fill="rgba(6,11,18,.85)" rx={2} />)
    flagEls.push(
      <text key={`gt${g}`} x={3} y={gy - 3} fill={T.textFaint} fontSize={10} fontFamily="monospace">
        {g.toFixed(2)}x
      </text>,
    )
  })

  // ATH dashed line (gold) — line under candles, label on the top layer.
  const athY = yFor(athValue)
  els.push(<line key="ath" x1={0} y1={athY} x2={VW} y2={athY} stroke={T.value} strokeDasharray="3 4" opacity={0.5} />)
  flagEls.push(<rect key="athbg" x={0} y={athY - 12} width={62} height={12} fill="rgba(6,11,18,.85)" rx={2} />)
  flagEls.push(
    <text key="atht" x={3} y={athY - 3} fill={T.value} fontSize={10} fontFamily="monospace" opacity={0.95}>
      {rugFlash ? 'CRASH' : 'ATH'} {athValue.toFixed(2)}x
    </text>,
  )
  const clampX = (x: number, w: number) => Math.max(2, Math.min(VW - w - 2, x))

  // Candles.
  items.forEach((c) => {
    const x = xFor(c.i)
    const rug = c.kind === 'rug'
    const up = c.kind === 'spike' || c.close >= c.open
    const col = up ? T.up : T.down
    // Explosion burst where an up-spike is rejected (the wick top). Keyed by
    // index so it mounts + plays its animation once when the candle commits.
    if (c.kind === 'spike' && !c.forming) {
      const sy = yFor(c.high)
      els.push(<circle key={`sb1${c.i}`} className="spike-burst" vectorEffect="non-scaling-stroke" cx={x} cy={sy} r={3} fill="none" stroke={T.value} strokeWidth={2.2} />)
      els.push(<circle key={`sb2${c.i}`} className="spike-burst2" vectorEffect="non-scaling-stroke" cx={x} cy={sy} r={2} fill="none" stroke={T.upText} strokeWidth={1.4} />)
      els.push(<circle key={`sb3${c.i}`} className="spike-flash" cx={x} cy={sy} r={5} fill={T.value} />)
    }
    // Bigger, heavier explosion where the price rugs — anchored at the crash
    // point (top of the drop). Fires on every rug (on a win it shows the crash
    // you dodged); the punishing screen shake/flash is loss-only elsewhere.
    if (rug && !c.forming) {
      const ry = yFor(c.open)
      els.push(<circle key={`rb1${c.i}`} className="rug-burst" vectorEffect="non-scaling-stroke" cx={x} cy={ry} r={5} fill="none" stroke={T.down} strokeWidth={3.5} />)
      els.push(<circle key={`rb2${c.i}`} className="rug-burst2" vectorEffect="non-scaling-stroke" cx={x} cy={ry} r={3} fill="none" stroke="#ff9d9d" strokeWidth={2} />)
      els.push(<circle key={`rb3${c.i}`} className="rug-blast" cx={x} cy={ry} r={10} fill={T.down} />)
    }
    const bodyTop = Math.min(yFor(c.open), yFor(c.close))
    const bodyBot = Math.max(yFor(c.open), yFor(c.close))
    // Soft glow on the live forming candle for depth/juice.
    if (c.forming) {
      els.push(<rect key={`bg${c.i}`} x={x - hw - 2.5} y={bodyTop - 2.5} width={bodyW + 5} height={Math.max(1.6, bodyBot - bodyTop) + 5} rx={3} fill={col} opacity={0.2} />)
    }
    els.push(<line key={`w${c.i}`} x1={x} y1={yFor(c.high)} x2={x} y2={yFor(c.low)} stroke={col} strokeWidth={1.4} />)
    els.push(
      <rect key={`b${c.i}`} x={x - hw} y={bodyTop} width={bodyW} height={Math.max(1.6, bodyBot - bodyTop)} fill={col} opacity={rug ? 0.95 : 1} />,
    )
    // Wick-save callout — marked reversal wick (drawn on the flag layer).
    if (c.i === wickSaveIndex && !c.forming) {
      const wy = yFor(candles[c.i].low)
      const wx = clampX(x - 24, 48)
      flagEls.push(<circle key={`wsc${c.i}`} cx={x} cy={wy} r={9} fill="none" stroke={T.up} strokeWidth={1.5} opacity={0.6} />)
      flagEls.push(<rect key={`wsbg${c.i}`} x={wx} y={wy + 12} width={48} height={12} rx={2} fill="rgba(6,11,18,.85)" />)
      flagEls.push(
        <text key={`wst${c.i}`} x={wx + 24} y={wy + 21} fill={T.upText} fontSize={8.5} fontFamily="monospace" textAnchor="middle" fontWeight={700}>
          WICK SAVE
        </text>,
      )
    }
    // Other players' faint exit flags (on the flag layer, with a backdrop).
    const other = otherFlags?.find((o) => o.idx === c.i)
    if (other && !rug && c.i !== cashOutIndex) {
      const fy = yFor(other.value)
      const w = other.label.length * 4.6 + 6
      const bx = clampX(x + 1, w)
      flagEls.push(<line key={`ol${c.i}`} x1={x} y1={fy} x2={x} y2={fy - 13} stroke={T.textFaint} strokeWidth={1} opacity={0.6} />)
      flagEls.push(<rect key={`obg${c.i}`} x={bx} y={fy - 25} width={w} height={11} rx={2} fill="rgba(6,11,18,.8)" />)
      flagEls.push(
        <text key={`ot${c.i}`} x={bx + 3} y={fy - 17} fill={T.textFaint} fontSize={7.5} fontFamily="monospace">
          {other.label}
        </text>,
      )
    }
    // Player's pinned exit flag (cyan, always on top, opaque backdrop).
    if (cashOutIndex != null && c.i === cashOutIndex && !rug) {
      const fy = yFor(cashedPrice ?? c.close)
      // Celebratory cyan burst at the exit point (one-shot, keyed to the exit).
      flagEls.push(<circle key={`cb1${c.i}`} className="cash-burst" vectorEffect="non-scaling-stroke" cx={x} cy={fy} r={4} fill="none" stroke={T.up} strokeWidth={3} />)
      flagEls.push(<circle key={`cb2${c.i}`} className="cash-burst2" vectorEffect="non-scaling-stroke" cx={x} cy={fy} r={3} fill="none" stroke={T.upText} strokeWidth={1.6} />)
      flagEls.push(<circle key={`cb3${c.i}`} className="cash-blast" cx={x} cy={fy} r={7} fill={T.up} />)
      const label = `YOU ${(cashedPrice ?? c.close).toFixed(2)}x`
      const w = label.length * 5 + 8
      const bx = clampX(x, w)
      flagEls.push(<line key={`fl${c.i}`} x1={x} y1={fy} x2={x} y2={fy - 22} stroke={T.text} strokeWidth={1} opacity={0.8} />)
      flagEls.push(<rect key={`fb${c.i}`} x={bx} y={fy - 32} width={w} height={13} rx={2} fill="#0a1019" stroke={T.up} />)
      flagEls.push(
        <text key={`ft${c.i}`} x={bx + 4} y={fy - 22.5} fill={T.up} fontSize={8.5} fontFamily="monospace">
          {label}
        </text>,
      )
    }
  })
  // Draw the collected flags on top of every candle.
  els.push(...flagEls)

  // Current-price dashed line + pulse dot on the live candle.
  if (lastItem && lastItem.kind !== 'rug') {
    const ly = yFor(lastPrice)
    const lx = xFor(lastItem.i)
    els.push(<line key="curglow" x1={0} y1={ly} x2={VW} y2={ly} stroke={T.up} strokeWidth={3} opacity={0.12} />)
    els.push(<line key="cur" x1={0} y1={ly} x2={VW} y2={ly} stroke={T.up} strokeDasharray="2 4" opacity={0.6} />)
    els.push(<circle key="pd0" cx={lx} cy={ly} r={5} fill="none" stroke={T.up} strokeWidth={2} className="pulse-dot" vectorEffect="non-scaling-stroke" />)
    els.push(<circle key="pd1" cx={lx} cy={ly} r={2} fill={T.up} />)
  }

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true" style={{ width: '100%', height: '100%', display: 'block' }}>
      {els}
    </svg>
  )
}
