// Zero-parameter WebAudio synth stabs. RG-C5: all HZ/VOL/MS are module consts, the
// victory fanfare is identical every time regardless of streak/session value. No samples.

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const AudioContextCtor: typeof AudioContext | undefined =
    window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) {
    return null;
  }
  if (!audioCtx) {
    audioCtx = new AudioContextCtor();
  }
  if (audioCtx.state === 'suspended') {
    void audioCtx.resume();
  }
  return audioCtx;
}

type OscType = OscillatorType;

interface Stab {
  type: OscType;
  freqHz: number;
  endFreqHz?: number;
  startAtMs: number;
  durationMs: number;
  peakVol: number;
}

const MASTER_VOL = 0.22;

function playStab(ctx: AudioContext, stab: Stab): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = stab.type;
  const startTime = ctx.currentTime + stab.startAtMs / 1000;
  const endTime = startTime + stab.durationMs / 1000;
  osc.frequency.setValueAtTime(stab.freqHz, startTime);
  if (stab.endFreqHz !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, stab.endFreqHz), endTime);
  }
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, stab.peakVol * MASTER_VOL), startTime + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, endTime);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(endTime + 0.02);
}

function playNoiseBurst(ctx: AudioContext, startAtMs: number, durationMs: number, peakVol: number): void {
  const startTime = ctx.currentTime + startAtMs / 1000;
  const durationSec = durationMs / 1000;
  const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * durationSec));
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i += 1) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(peakVol * MASTER_VOL, startTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + durationSec);
  noise.connect(gain);
  gain.connect(ctx.destination);
  noise.start(startTime);
  noise.stop(startTime + durationSec + 0.02);
}

// --- Module-const timing/pitch tables per sound ---

const PICK_TICK_HZ = 900;
const PICK_TICK_MS = 40;
const PICK_TICK_VOL = 0.5;

const LOCK_IN_HZ = 520;
const LOCK_IN_END_HZ = 700;
const LOCK_IN_MS = 90;
const LOCK_IN_VOL = 0.6;

const CLASH_HZ = 260;
const CLASH_END_HZ = 90;
const CLASH_MS = 220;
const CLASH_VOL = 0.8;
const CLASH_NOISE_MS = 140;
const CLASH_NOISE_VOL = 0.5;

const HIT_STRIKE_HZ = 180;
const HIT_STRIKE_END_HZ = 60;
const HIT_STRIKE_MS = 130;
const HIT_STRIKE_VOL = 0.85;

const HIT_THROW_HZ = 140;
const HIT_THROW_END_HZ = 40;
const HIT_THROW_MS = 220;
const HIT_THROW_VOL = 0.85;
const HIT_THROW_NOISE_MS = 160;
const HIT_THROW_NOISE_VOL = 0.6;

const HIT_BLOCK_TINK_HZ = 1400;
const HIT_BLOCK_TINK_MS = 60;
const HIT_BLOCK_TINK_VOL = 0.55;
const HIT_BLOCK_SMACK_DELAY_MS = 90;
const HIT_BLOCK_SMACK_HZ = 200;
const HIT_BLOCK_SMACK_END_HZ = 70;
const HIT_BLOCK_SMACK_MS = 110;
const HIT_BLOCK_SMACK_VOL = 0.75;

const KO_HZ = 110;
const KO_END_HZ = 30;
const KO_MS = 500;
const KO_VOL = 0.9;

const ROUND_BANNER_HZ = 440;
const ROUND_BANNER_END_HZ = 660;
const ROUND_BANNER_MS = 200;
const ROUND_BANNER_VOL = 0.5;

const FIGHT_BANNER_HZ = 600;
const FIGHT_BANNER_END_HZ = 900;
const FIGHT_BANNER_MS = 140;
const FIGHT_BANNER_VOL = 0.7;

const FLAWLESS_NOTES_HZ = [660, 880, 1100];
const FLAWLESS_NOTE_MS = 120;
const FLAWLESS_NOTE_GAP_MS = 90;
const FLAWLESS_VOL = 0.6;

const VICTORY_NOTES_HZ = [523, 659, 784, 1046];
const VICTORY_NOTE_MS = 180;
const VICTORY_NOTE_GAP_MS = 130;
const VICTORY_VOL = 0.65;

const CLOCK_TICK_HZ = 1000;
const CLOCK_TICK_MS = 30;
const CLOCK_TICK_VOL = 0.35;

export function playPickTick(): void {
  const ctx = getCtx();
  if (!ctx) return;
  playStab(ctx, { type: 'square', freqHz: PICK_TICK_HZ, startAtMs: 0, durationMs: PICK_TICK_MS, peakVol: PICK_TICK_VOL });
}

export function playLockIn(): void {
  const ctx = getCtx();
  if (!ctx) return;
  playStab(ctx, {
    type: 'triangle',
    freqHz: LOCK_IN_HZ,
    endFreqHz: LOCK_IN_END_HZ,
    startAtMs: 0,
    durationMs: LOCK_IN_MS,
    peakVol: LOCK_IN_VOL,
  });
}

export function playClash(): void {
  const ctx = getCtx();
  if (!ctx) return;
  playStab(ctx, {
    type: 'sawtooth',
    freqHz: CLASH_HZ,
    endFreqHz: CLASH_END_HZ,
    startAtMs: 0,
    durationMs: CLASH_MS,
    peakVol: CLASH_VOL,
  });
  playNoiseBurst(ctx, 0, CLASH_NOISE_MS, CLASH_NOISE_VOL);
}

export function playHitStrike(): void {
  const ctx = getCtx();
  if (!ctx) return;
  playStab(ctx, {
    type: 'square',
    freqHz: HIT_STRIKE_HZ,
    endFreqHz: HIT_STRIKE_END_HZ,
    startAtMs: 0,
    durationMs: HIT_STRIKE_MS,
    peakVol: HIT_STRIKE_VOL,
  });
}

export function playHitThrow(): void {
  const ctx = getCtx();
  if (!ctx) return;
  playStab(ctx, {
    type: 'sawtooth',
    freqHz: HIT_THROW_HZ,
    endFreqHz: HIT_THROW_END_HZ,
    startAtMs: 0,
    durationMs: HIT_THROW_MS,
    peakVol: HIT_THROW_VOL,
  });
  playNoiseBurst(ctx, 20, HIT_THROW_NOISE_MS, HIT_THROW_NOISE_VOL);
}

export function playHitBlock(): void {
  const ctx = getCtx();
  if (!ctx) return;
  // Two-stage: tink (block) then smack (punish).
  playStab(ctx, {
    type: 'sine',
    freqHz: HIT_BLOCK_TINK_HZ,
    startAtMs: 0,
    durationMs: HIT_BLOCK_TINK_MS,
    peakVol: HIT_BLOCK_TINK_VOL,
  });
  playStab(ctx, {
    type: 'square',
    freqHz: HIT_BLOCK_SMACK_HZ,
    endFreqHz: HIT_BLOCK_SMACK_END_HZ,
    startAtMs: HIT_BLOCK_SMACK_DELAY_MS,
    durationMs: HIT_BLOCK_SMACK_MS,
    peakVol: HIT_BLOCK_SMACK_VOL,
  });
}

export function playKo(): void {
  const ctx = getCtx();
  if (!ctx) return;
  playStab(ctx, { type: 'sawtooth', freqHz: KO_HZ, endFreqHz: KO_END_HZ, startAtMs: 0, durationMs: KO_MS, peakVol: KO_VOL });
}

export function playRoundBanner(): void {
  const ctx = getCtx();
  if (!ctx) return;
  playStab(ctx, {
    type: 'triangle',
    freqHz: ROUND_BANNER_HZ,
    endFreqHz: ROUND_BANNER_END_HZ,
    startAtMs: 0,
    durationMs: ROUND_BANNER_MS,
    peakVol: ROUND_BANNER_VOL,
  });
}

export function playFightBanner(): void {
  const ctx = getCtx();
  if (!ctx) return;
  playStab(ctx, {
    type: 'square',
    freqHz: FIGHT_BANNER_HZ,
    endFreqHz: FIGHT_BANNER_END_HZ,
    startAtMs: 0,
    durationMs: FIGHT_BANNER_MS,
    peakVol: FIGHT_BANNER_VOL,
  });
}

export function playFlawless(): void {
  const ctx = getCtx();
  if (!ctx) return;
  FLAWLESS_NOTES_HZ.forEach((hz, i) => {
    playStab(ctx, {
      type: 'triangle',
      freqHz: hz,
      startAtMs: i * FLAWLESS_NOTE_GAP_MS,
      durationMs: FLAWLESS_NOTE_MS,
      peakVol: FLAWLESS_VOL,
    });
  });
}

export function playVictory(): void {
  const ctx = getCtx();
  if (!ctx) return;
  VICTORY_NOTES_HZ.forEach((hz, i) => {
    playStab(ctx, {
      type: 'triangle',
      freqHz: hz,
      startAtMs: i * VICTORY_NOTE_GAP_MS,
      durationMs: VICTORY_NOTE_MS,
      peakVol: VICTORY_VOL,
    });
  });
}

export function playClockTick(): void {
  const ctx = getCtx();
  if (!ctx) return;
  playStab(ctx, { type: 'square', freqHz: CLOCK_TICK_HZ, startAtMs: 0, durationMs: CLOCK_TICK_MS, peakVol: CLOCK_TICK_VOL });
}
