// Pulse sound — self-contained WebAudio synth (no asset files). RG-C5 discipline:
// every cue is a zero-parameter function with module-const timings/levels, so a
// win/cash-out never sounds bigger for a longer streak or a larger balance.

let ctx: AudioContext | null = null
let muted = false

export function isMuted(): boolean {
  return muted
}
export function setMuted(m: boolean): void {
  muted = m
}

// Lazily create/resume the context — browsers require a user gesture first.
function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    try {
      ctx = new Ctor()
    } catch {
      return null
    }
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

// Call once from the first user gesture so audio is unlocked.
export function primeAudio(): void {
  ac()
}

function tone(freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number): void {
  if (muted) return
  const c = ac()
  if (!c) return
  const t = c.currentTime
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(vol, t + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g)
  g.connect(c.destination)
  o.start(t)
  o.stop(t + dur + 0.02)
}

// Short filtered noise burst (for the crash impact).
function noise(dur: number, vol: number, cutoff: number): void {
  if (muted) return
  const c = ac()
  if (!c) return
  const t = c.currentTime
  const len = Math.floor(c.sampleRate * dur)
  const buf = c.createBuffer(1, len, c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len)
  const src = c.createBufferSource()
  src.buffer = buf
  const f = c.createBiquadFilter()
  f.type = 'lowpass'
  f.frequency.setValueAtTime(cutoff, t)
  const g = c.createGain()
  g.gain.setValueAtTime(vol, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(f)
  f.connect(g)
  g.connect(c.destination)
  src.start(t)
  src.stop(t + dur)
}

// ---- cues (all zero-param, fixed level) -----------------------------------
export function playTick(): void {
  tone(1100, 0.03, 'square', 0.02)
}
export function playCommit(): void {
  tone(360, 0.12, 'sawtooth', 0.1, 640)
}
export function playCashout(): void {
  tone(660, 0.12, 'sine', 0.16)
  setTimeout(() => tone(990, 0.18, 'sine', 0.16), 90)
}
export function playSpike(): void {
  tone(720, 0.12, 'triangle', 0.1, 1500)
}
export function playWick(): void {
  // dive then rescue
  tone(520, 0.16, 'sine', 0.12, 150)
  setTimeout(() => tone(300, 0.28, 'sine', 0.14, 1000), 150)
}
export function playGavel(): void {
  tone(200, 0.08, 'square', 0.22, 90)
  noise(0.06, 0.18, 2200)
}
export function playRug(): void {
  tone(240, 0.55, 'sawtooth', 0.22, 55)
  noise(0.4, 0.28, 900)
}
