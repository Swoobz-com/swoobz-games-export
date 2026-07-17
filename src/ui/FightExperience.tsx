// Frozen Requiem — arcade presentation for the STRIKE / THROW / BLOCK duel.
// Presentation-only: ALL game logic/timing lives in useFightController(). This file reads the
// controller's phase + state and renders the stage, the baked-HUD overlays (positioned in
// PERCENT of a fixed 2816x1536 stage box so they track the art at any size), the two keyed
// fighters, and the fight choreography (transform/opacity/filter only — single authored
// flashes, no particle systems). The provider already fires every sound at the right beat, so
// the UI never calls the audio layer (avoids double-firing).

import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useFightController } from '../provider/fightProvider';
import type { AiPersonality } from '../engine/fightAi';
import type { Move } from '../engine/fightEngine';
import './fight.css';

const ASSET_BASE = import.meta.env.BASE_URL;
const BG_URL = `${ASSET_BASE}assets/background.png`;
const F1_URL = `${ASSET_BASE}assets/fighter-1-keyed.png`;
const F2_URL = `${ASSET_BASE}assets/fighter-2-keyed.png`;

// ============================================================================================
// CALIBRATION — every HUD/stage overlay position, in PERCENT of the 2816x1536 stage box.
// Eyeballed from the baked art; nudge these numbers to fine-tune alignment. Nothing else in
// this file hard-codes a layout coordinate — this is the single tuning surface.
// ============================================================================================
const CAL = {
  // Health bar inner fill area (the baked ice bar). x0..x1 horizontal, y0..y1 vertical.
  hpP1: { x0: 13.6, x1: 42.6, y0: 9.4, y1: 13.6 },
  hpP2: { x0: 57.4, x1: 86.4, y0: 9.4, y1: 13.6 },
  // Round-win pip strips (2 pips per side).
  pipP1: { x0: 13.4, x1: 29.4, y0: 15.4, y1: 18.0 },
  pipP2: { x0: 70.6, x1: 86.6, y0: 15.4, y1: 18.0 },
  // Center metal timer plate that covers the baked "03".
  timer: { x0: 45.3, x1: 54.8, y0: 7.8, y1: 18.3 },
  // Name plates covering the baked "PLAYER 1"/"PLAYER 2" text (fully mask it).
  nameP1: { x0: 13.4, x1: 31.0, y0: 4.7, y1: 8.8 },
  nameP2: { x0: 69.0, x1: 86.6, y0: 4.7, y1: 8.8 },
  // Circular portraits inside the baked gold rings. cx/cy = ring centre (% stage), r = radius
  // as % of stage WIDTH. headX/headY = the fighter head centre as a fraction of its PNG, zoom =
  // how far to enlarge the PNG inside the circle so the head fills it.
  portraitP1: { cx: 7.0, cy: 13.3, r: 4.75, headX: 0.45, headY: 0.12, zoom: 4.6 },
  portraitP2: { cx: 93.0, cy: 13.3, r: 4.75, headX: 0.5, headY: 0.16, zoom: 4.2 },
  // Fighters on the cathedral floor. cx = centre of mass (% width), feetY = floor line (% h),
  // h = image height (% of stage height).
  fighterP1: { cx: 24, feetY: 96, h: 58 },
  fighterP2: { cx: 76, feetY: 96, h: 58 },
  // Soft ground shadow under each fighter.
  shadow: { w: 15, h: 2.6, y: 95 },
  // Reveal plates float above each fighter's head.
  revealY: 30,
  // Banner vertical centre.
  bannerY: 45,
  // Contact point (loser chest) for the strike hit-spark.
  contactY: 52,
} as const;

// --- Choreography timings (module-const; RG-C5). All transform-based, single flashes. ---
const CHO = {
  LUNGE_MS: 120,
  LUNGE_X: 6, // % stage width toward opponent
  STEP_X: 3,
  HITSTOP_MS: 100,
  KO_HITSTOP_MS: 120,
  KNOCKBACK_X: 3,
  HURT_TILT: 7, // deg
  SPARK_MS: 130,
  SHAKE_MS: 150,
  CLASH_FREEZE_MS: 200,
  CLASH_LUNGE_X: 9,
  GRAB_JITTER_DEG: 2,
  GRAB_CYCLES: 3,
  GRAB_CYCLE_MS: 70,
  SLAM_DIP_Y: 2,
  BLOCK_REBOUND_X: 4,
  BLOCK_TINK_MS: 90,
  RETURN_MS: 200,
  // KO beat: 120ms hitstop -> ~800ms slow-mo zoom -> snap back.
  KO_ZOOM_IN_MS: 120,
  KO_ZOOM_HOLD_MS: 800,
} as const;

// --- Character identities ---
interface FighterId {
  name: string;
  quotes: string[];
}
const GORVAK: FighterId = {
  name: 'GORVAK',
  quotes: [
    'The cathedral keeps only the standing.',
    'Steel bends. Bone breaks. I do neither.',
    'You picked wrong. That was the whole fight.',
  ],
};
const VOLTA: FighterId = {
  name: 'VOLTA',
  quotes: [
    'Circuit closed. You were the resistance.',
    'Faster than a fist, colder than the ice.',
    'Every read was mine. You just felt it late.',
  ],
};

const MOVE_LABEL: Record<Move, string> = { strike: 'STRIKE', throw: 'THROW', block: 'BLOCK' };
const MOVE_TIP: Record<Move, string> = {
  strike: 'a fist is faster than a grab',
  throw: "you can't block a grab",
  block: 'blocked hits leave them wide open',
};
const MOVE_ORDER: Move[] = ['strike', 'throw', 'block'];

interface PersonalityInfo {
  key: AiPersonality;
  name: string;
  diff: string;
  hint: string;
}
const PERSONALITIES: PersonalityInfo[] = [
  { key: 'brute', name: 'BRUTE', diff: 'EASY', hint: 'Swings first, thinks never.' },
  { key: 'warden', name: 'WARDEN', diff: 'MEDIUM', hint: 'Counters your favourite move.' },
  { key: 'oracle', name: 'ORACLE', diff: 'HARD', hint: 'Reads the pattern in your picks.' },
];

// ============================================================================================
// Move icons — inline chunky SVGs, ice-blue via currentColor.
// ============================================================================================
function MoveIcon({ move }: { move: Move }): JSX.Element {
  if (move === 'strike') {
    // A fist.
    return (
      <svg className="fr-move-icon" viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <path
          d="M13 20c0-2 1.6-3.4 3.5-3.4S20 18 20 20v-3.2c0-2 1.6-3.4 3.5-3.4S27 14.8 27 16.8V20c0-1.9 1.6-3.2 3.4-3.2s3.4 1.3 3.4 3.2v2.2c1-1.4 2.4-2 3.6-1.4 1.5.7 1.9 2.4 1.2 4.2l-2.6 6.6C38 36 34.6 40 28 40h-4c-5.6 0-8.8-2.4-10.8-6.6L10 26c-.8-1.8-.3-3.6 1.2-4.3 1.2-.6 2.7 0 3.6 1.4"
          fill="currentColor"
          fillOpacity="0.9"
        />
        <path d="M20 20v-4M27 20v-5M33.8 22v-2.5" stroke="#0a1018" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    );
  }
  if (move === 'throw') {
    // Two grasping hands.
    return (
      <svg className="fr-move-icon" viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <path
          d="M6 30c3-1 5-3 8-3 2.5 0 4 1.4 6 1.4M6 30l3 6c1.4 2.6 3.6 3.6 6.4 3l4-1"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M42 18c-3 1-5 3-8 3-2.5 0-4-1.4-6-1.4M42 18l-3-6c-1.4-2.6-3.6-3.6-6.4-3l-4 1"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M19 26c2-1 4-1 6 0M23 22c2 1 4 1 6 0" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }
  // Block — crossed forearms.
  return (
    <svg className="fr-move-icon" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path d="M12 12l24 24M36 12L12 36" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
      <path d="M12 12l24 24M36 12L12 36" stroke="#0a1018" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

// ============================================================================================
// Hooks
// ============================================================================================
function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);
  return reduced;
}

// Keep --sw / --sh (stage width/height per 1%) in sync so all sizing scales with the stage box.
function useStageMetrics(ref: React.RefObject<HTMLDivElement>): void {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const apply = () => {
      const rect = el.getBoundingClientRect();
      el.style.setProperty('--sw', `${rect.width / 100}px`);
      el.style.setProperty('--sh', `${rect.height / 100}px`);
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
}

// ============================================================================================
// Choreography state — transient visual transforms/effects during resolve.
// ============================================================================================
interface FxUnit {
  tx: number; // % stage width
  ty: number; // % stage height
  rot: number;
  scale: number;
  transition: string;
}
const IDLE_UNIT: FxUnit = { tx: 0, ty: 0, rot: 0, scale: 1, transition: `transform ${CHO.RETURN_MS}ms ease` };

interface FxState {
  p1: FxUnit;
  p2: FxUnit;
  spark: { xPct: number; yPct: number } | null;
  shield: { xPct: number; yPct: number } | null;
  dust: { xPct: number; yPct: number } | null;
  clash: boolean;
  nonce: number; // bumps to restart flash animations
}
const FX_INIT: FxState = { p1: IDLE_UNIT, p2: IDLE_UNIT, spark: null, shield: null, dust: null, clash: false, nonce: 0 };

function fxReducer(state: FxState, patch: Partial<FxState>): FxState {
  return { ...state, ...patch, nonce: patch.nonce ?? state.nonce };
}

function transformFor(u: FxUnit): string {
  return `translate(-50%, -100%) translate(calc(var(--sw) * ${u.tx}), calc(var(--sh) * ${u.ty})) rotate(${u.rot}deg) scale(${u.scale})`;
}

// ============================================================================================
// Sub-components
// ============================================================================================
function pctRect(r: { x0: number; x1: number; y0: number; y1: number }): React.CSSProperties {
  return {
    left: `${r.x0}%`,
    top: `${r.y0}%`,
    width: `${r.x1 - r.x0}%`,
    height: `${r.y1 - r.y0}%`,
  };
}

function HealthBar({ hp, side, reduced }: { hp: number; side: 'p1' | 'p2'; reduced: boolean }): JSX.Element {
  const rect = side === 'p1' ? CAL.hpP1 : CAL.hpP2;
  const prevHp = useRef(hp);
  const [flashIndex, setFlashIndex] = useState<number | null>(null);

  useEffect(() => {
    if (hp < prevHp.current) {
      // Newly-lost segment index for this side (see engine mapping in the CLAUDE notes above).
      const lost = side === 'p1' ? hp : 2 - hp;
      setFlashIndex(lost);
      const t = setTimeout(() => setFlashIndex(null), 520);
      prevHp.current = hp;
      return () => clearTimeout(t);
    }
    prevHp.current = hp;
    return undefined;
  }, [hp, side]);

  return (
    <div className="fr-hpbar" style={pctRect(rect)}>
      {[0, 1, 2].map((i) => {
        const present = side === 'p1' ? i < hp : i >= 3 - hp;
        const critical = hp === 1 && present;
        const flashing = flashIndex === i && !reduced;
        const collapsing = flashIndex === i && !reduced;
        const cls = [
          'fr-hpseg',
          present ? 'fr-hp-present' : '',
          !present && collapsing ? 'fr-hp-collapsing' : '',
          flashing ? 'fr-hp-flashing' : '',
          critical ? 'fr-hp-critical' : '',
        ]
          .filter(Boolean)
          .join(' ');
        return (
          <div key={`${i}-${flashing ? flashIndex : 'x'}`} className={cls}>
            <div className="fr-hpseg-cover" />
            <div className="fr-hpseg-flash" />
            {critical && <div className="fr-hpseg-crit" />}
          </div>
        );
      })}
    </div>
  );
}

function Pips({ won, side }: { won: number; side: 'p1' | 'p2' }): JSX.Element {
  const rect = side === 'p1' ? CAL.pipP1 : CAL.pipP2;
  const prev = useRef(won);
  const [popIndex, setPopIndex] = useState<number | null>(null);
  useEffect(() => {
    if (won > prev.current) {
      setPopIndex(won - 1);
      const t = setTimeout(() => setPopIndex(null), 240);
      prev.current = won;
      return () => clearTimeout(t);
    }
    prev.current = won;
    return undefined;
  }, [won]);
  return (
    <div
      className="fr-pips"
      style={{
        ...pctRect(rect),
        justifyContent: side === 'p1' ? 'flex-start' : 'flex-end',
        gap: 'calc(var(--sw) * 0.6)',
      }}
    >
      {[0, 1].map((i) => {
        const filled = i < won;
        const cls = ['fr-pip', filled ? 'fr-pip-won' : '', popIndex === i ? 'fr-pip-pop' : ''].filter(Boolean).join(' ');
        return <div key={i} className={cls} style={{ width: 'calc(var(--sh) * 1.8)', height: 'calc(var(--sh) * 1.8)' }} />;
      })}
    </div>
  );
}

function TimerPlate({ seconds, danger }: { seconds: number; danger: boolean }): JSX.Element {
  return (
    <div className={`fr-timer${danger ? ' fr-timer-danger' : ''}`} style={pctRect(CAL.timer)}>
      <span className="fr-timer-digit" style={{ fontSize: 'calc(var(--sh) * 7.2)' }}>
        {Math.max(0, seconds)}
      </span>
    </div>
  );
}

function NamePlate({ id, side }: { id: FighterId; side: 'p1' | 'p2' }): JSX.Element {
  const rect = side === 'p1' ? CAL.nameP1 : CAL.nameP2;
  return (
    <div
      className="fr-nameplate"
      style={{ ...pctRect(rect), justifyContent: side === 'p1' ? 'flex-start' : 'flex-end', fontSize: 'calc(var(--sh) * 1.9)' }}
    >
      {id.name}
    </div>
  );
}

function Portrait({
  url,
  cfg,
}: {
  url: string;
  cfg: { cx: number; cy: number; r: number; headX: number; headY: number; zoom: number };
}): JSX.Element {
  const size = `calc(var(--sw) * ${cfg.r * 2})`;
  return (
    <div className="fr-portrait" style={{ left: `${cfg.cx}%`, top: `${cfg.cy}%`, width: size, height: size }}>
      <img
        src={url}
        alt=""
        style={{
          width: `${cfg.zoom * 100}%`,
          height: 'auto',
          left: `${50 - cfg.headX * cfg.zoom * 100}%`,
          top: `${50 - cfg.headY * cfg.zoom * 100}%`,
        }}
      />
    </div>
  );
}

function Fighter({
  url,
  cfg,
  fx,
  poseClass,
}: {
  url: string;
  cfg: { cx: number; feetY: number; h: number };
  fx: FxUnit;
  poseClass: string;
}): JSX.Element {
  return (
    <div
      className={`fr-fighter ${poseClass}`}
      style={{
        left: `${cfg.cx}%`,
        top: `${cfg.feetY}%`,
        height: `${cfg.h}%`,
        aspectRatio: '1 / 1',
        transform: transformFor(fx),
        transition: fx.transition,
      }}
    >
      <div className="fr-fighter-breathe">
        <img src={url} alt="" draggable={false} />
      </div>
    </div>
  );
}

function Banner({ text, kind, slamMs }: { text: string; kind?: 'danger' | 'gold'; slamMs: number }): JSX.Element {
  const cls = ['fr-banner', 'fr-banner-slam', kind === 'danger' ? 'fr-banner-danger' : '', kind === 'gold' ? 'fr-banner-gold' : '']
    .filter(Boolean)
    .join(' ');
  return (
    <div className="fr-banner-layer" style={{ alignItems: 'center' }}>
      <div
        className={cls}
        style={{ fontSize: 'calc(var(--sh) * 12)', ['--fr-slam-ms' as string]: `${slamMs}ms` }}
      >
        {text}
      </div>
    </div>
  );
}

function RevealPlate({ move, cx, faceDown }: { move: Move | null; cx: number; faceDown: boolean }): JSX.Element {
  return (
    <div className="fr-reveal-plate" style={{ left: `${cx}%`, top: `${CAL.revealY}%` }}>
      <div className="fr-reveal-plate-inner">
        {faceDown || !move ? (
          <span className="fr-reveal-plate-label" style={{ fontSize: 'calc(var(--sh) * 3.4)' }}>
            ?
          </span>
        ) : (
          <>
            <MoveIcon move={move} />
            <span className="fr-reveal-plate-label" style={{ fontSize: 'calc(var(--sh) * 2.1)' }}>
              {MOVE_LABEL[move]}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================================================
// Main
// ============================================================================================
export function FightExperience(): JSX.Element {
  const ctl = useFightController();
  const reduced = useReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  useStageMetrics(stageRef);

  const [joinCode, setJoinCode] = useState('');
  const [quoteIndex] = useState(() => Math.floor(Math.random() * 3));

  const [fx, dispatchFx] = useReducer(fxReducer, FX_INIT);
  const [koZoom, setKoZoom] = useState<{ active: boolean; spotX: number } | null>(null);
  const [shake, setShake] = useState(false);
  const choTimers = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const shakeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCho = useCallback(() => {
    for (const t of choTimers.current) clearTimeout(t);
    choTimers.current = [];
  }, []);

  // Restart the screenshake by toggling the class off then on (no remount) so consecutive
  // hits re-trigger the CSS animation cleanly.
  const triggerShake = useCallback(() => {
    setShake(false);
    requestAnimationFrame(() => setShake(true));
    if (shakeTimer.current) clearTimeout(shakeTimer.current);
    shakeTimer.current = setTimeout(() => setShake(false), CHO.SHAKE_MS + 40);
  }, []);
  const at = useCallback((fn: () => void, ms: number) => {
    choTimers.current.push(setTimeout(fn, ms));
  }, []);

  const { phase, matchState, lastOutcome, playerPick, mode, aiPersonality, friend, shotClockSeconds } = ctl;

  // Reconstruct both picks for the reveal plates from the just-committed history record.
  const lastRecord = matchState.history[matchState.history.length - 1];
  const isResolveLike = phase === 'resolve' || phase === 'roundEnd';

  // Drive the resolve choreography when we enter 'resolve'.
  useEffect(() => {
    if (phase !== 'resolve' || !lastOutcome) {
      clearCho();
      if (phase !== 'resolve') {
        dispatchFx({ p1: IDLE_UNIT, p2: IDLE_UNIT, spark: null, shield: null, dust: null, clash: false });
        setKoZoom(null);
      }
      return undefined;
    }
    clearCho();
    const roundEnding = Boolean(matchState.roundOver);
    const freeze = 'transform 0ms linear';
    const snappy = (ms: number) => `transform ${ms}ms cubic-bezier(0.2, 0.9, 0.2, 1)`;

    const winnerSide: 'p1' | 'p2' | null = lastOutcome.kind === 'hit' ? lastOutcome.winner : null;
    // toward-opponent sign: p1 lunges +x (right), p2 lunges -x (left).
    const sign = (s: 'p1' | 'p2') => (s === 'p1' ? 1 : -1);
    const loserSide: 'p1' | 'p2' | null = winnerSide ? (winnerSide === 'p1' ? 'p2' : 'p1') : null;
    const contactX = loserSide === 'p1' ? CAL.fighterP1.cx : CAL.fighterP2.cx;

    const set = (p1: FxUnit, p2: FxUnit, extra: Partial<FxState> = {}) =>
      dispatchFx({ p1, p2, nonce: fx.nonce + 1, spark: null, shield: null, dust: null, clash: false, ...extra });

    if (reduced) {
      // Reduced motion: no lunges/shake/zoom, keep information (banners still show via phase).
      dispatchFx({ p1: IDLE_UNIT, p2: IDLE_UNIT, spark: null, shield: null, dust: null, clash: false });
      return () => clearCho();
    }

    if (lastOutcome.kind === 'clash') {
      // Both lunge to near-centre, freeze, white radial flash + CLASH pop, rebound.
      set(
        { tx: CHO.CLASH_LUNGE_X, ty: 0, rot: 0, scale: 1, transition: snappy(CHO.LUNGE_MS) },
        { tx: -CHO.CLASH_LUNGE_X, ty: 0, rot: 0, scale: 1, transition: snappy(CHO.LUNGE_MS) },
      );
      at(() => {
        dispatchFx({ clash: true, nonce: fx.nonce + 2 });
        triggerShake();
      }, CHO.LUNGE_MS);
      at(() => {
        dispatchFx({
          p1: { tx: 0, ty: 0, rot: 0, scale: 1, transition: snappy(CHO.RETURN_MS) },
          p2: { tx: 0, ty: 0, rot: 0, scale: 1, transition: snappy(CHO.RETURN_MS) },
        });
      }, CHO.LUNGE_MS + CHO.CLASH_FREEZE_MS);
      return () => clearCho();
    }

    // hit
    const w = winnerSide as 'p1' | 'p2';
    const l = loserSide as 'p1' | 'p2';
    const winnerUnit = (u: FxUnit): { p1: FxUnit; p2: FxUnit } => (w === 'p1' ? { p1: u, p2: IDLE_UNIT } : { p1: IDLE_UNIT, p2: u });
    const bothUnits = (wu: FxUnit, lu: FxUnit): { p1: FxUnit; p2: FxUnit } =>
      w === 'p1' ? { p1: wu, p2: lu } : { p1: lu, p2: wu };

    if (lastOutcome.move === 'strike') {
      const lunge: FxUnit = { tx: sign(w) * CHO.LUNGE_X, ty: 0, rot: 0, scale: 1, transition: snappy(CHO.LUNGE_MS) };
      const wu = winnerUnit(lunge);
      set(wu.p1, wu.p2);
      const hitstop = roundEnding ? CHO.KO_HITSTOP_MS : CHO.HITSTOP_MS;
      at(() => {
        // Contact: spark, hitstop freeze, knockback + tilt, screenshake.
        const frozenW: FxUnit = { tx: sign(w) * CHO.LUNGE_X, ty: 0, rot: 0, scale: 1, transition: freeze };
        const frozenL: FxUnit = {
          tx: sign(w) * CHO.KNOCKBACK_X,
          ty: 0,
          rot: sign(w) * CHO.HURT_TILT,
          scale: 1,
          transition: freeze,
        };
        const u = bothUnits(frozenW, frozenL);
        dispatchFx({ p1: u.p1, p2: u.p2, spark: { xPct: contactX, yPct: CAL.contactY }, nonce: fx.nonce + 3 });
        if (roundEnding) setKoZoom({ active: false, spotX: contactX });
        else triggerShake();
      }, CHO.LUNGE_MS);
      at(() => {
        const wu2: FxUnit = { ...IDLE_UNIT, transition: snappy(CHO.RETURN_MS) };
        const lu2: FxUnit = {
          tx: sign(w) * CHO.KNOCKBACK_X,
          ty: 0,
          rot: sign(w) * CHO.HURT_TILT,
          scale: 1,
          transition: snappy(CHO.RETURN_MS),
        };
        const u = bothUnits(wu2, lu2);
        dispatchFx({ p1: u.p1, p2: u.p2, spark: null });
      }, CHO.LUNGE_MS + hitstop);
    } else if (lastOutcome.move === 'throw') {
      const step: FxUnit = { tx: sign(w) * CHO.STEP_X, ty: 0, rot: 0, scale: 1, transition: snappy(CHO.LUNGE_MS) };
      const su = winnerUnit(step);
      set(su.p1, su.p2);
      // Grab shake on the victim.
      for (let c = 0; c < CHO.GRAB_CYCLES; c += 1) {
        at(() => {
          const jitter: FxUnit = {
            tx: 0,
            ty: 0,
            rot: (c % 2 === 0 ? 1 : -1) * CHO.GRAB_JITTER_DEG,
            scale: 1,
            transition: snappy(CHO.GRAB_CYCLE_MS),
          };
          const u = bothUnits(step, jitter);
          dispatchFx({ p1: u.p1, p2: u.p2 });
        }, CHO.LUNGE_MS + c * CHO.GRAB_CYCLE_MS);
      }
      at(() => {
        // Slam dip + squash + dust at floor.
        const slam: FxUnit = { tx: 0, ty: CHO.SLAM_DIP_Y, rot: 0, scale: 1, transition: snappy(120) };
        const u = bothUnits(step, slam);
        dispatchFx({ p1: u.p1, p2: u.p2, dust: { xPct: l === 'p1' ? CAL.fighterP1.cx : CAL.fighterP2.cx, yPct: CAL.shadow.y }, nonce: fx.nonce + 4 });
        if (roundEnding) setKoZoom({ active: false, spotX: l === 'p1' ? CAL.fighterP1.cx : CAL.fighterP2.cx });
        else triggerShake();
      }, CHO.LUNGE_MS + CHO.GRAB_CYCLES * CHO.GRAB_CYCLE_MS);
      at(() => {
        dispatchFx({ p1: IDLE_UNIT, p2: IDLE_UNIT, dust: null });
      }, CHO.LUNGE_MS + CHO.GRAB_CYCLES * CHO.GRAB_CYCLE_MS + 260);
    } else {
      // block wins over strike: attacker (loser) lunges, shield flare on winner, attacker rebounds.
      const attackerLunge: FxUnit = { tx: sign(l) * CHO.LUNGE_X, ty: 0, rot: 0, scale: 1, transition: snappy(CHO.LUNGE_MS) };
      const u0 = bothUnits(IDLE_UNIT, attackerLunge);
      set(u0.p1, u0.p2);
      at(() => {
        const wx = w === 'p1' ? CAL.fighterP1.cx : CAL.fighterP2.cx;
        dispatchFx({ shield: { xPct: wx, yPct: CAL.contactY }, nonce: fx.nonce + 5 });
      }, CHO.LUNGE_MS);
      at(() => {
        // tink pause, then counter-smack knockback of the attacker.
        const rebound: FxUnit = { tx: sign(w) * CHO.BLOCK_REBOUND_X, ty: 0, rot: sign(w) * CHO.HURT_TILT, scale: 1, transition: snappy(140) };
        const u = bothUnits(IDLE_UNIT, rebound);
        dispatchFx({ p1: u.p1, p2: u.p2, shield: null });
        if (roundEnding) setKoZoom({ active: false, spotX: l === 'p1' ? CAL.fighterP1.cx : CAL.fighterP2.cx });
        else triggerShake();
      }, CHO.LUNGE_MS + CHO.BLOCK_TINK_MS);
      at(() => dispatchFx({ p1: IDLE_UNIT, p2: IDLE_UNIT }), CHO.LUNGE_MS + CHO.BLOCK_TINK_MS + 260);
    }

    // KO zoom timeline (round/match-ending hit).
    if (roundEnding) {
      at(() => setKoZoom((z) => (z ? { ...z, active: true } : z)), CHO.KO_ZOOM_IN_MS);
      at(() => setKoZoom((z) => (z ? { ...z, active: false } : z)), CHO.KO_ZOOM_IN_MS + CHO.KO_ZOOM_HOLD_MS);
    }

    return () => clearCho();
    // fx.nonce intentionally excluded — we snapshot it at schedule time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, lastOutcome, reduced]);

  // ------- keyboard: pick with 1/2/3 during picking -------
  useEffect(() => {
    if (phase !== 'picking' || playerPick.locked) return undefined;
    const onKey = (e: KeyboardEvent) => {
      const idx = ['1', '2', '3'].indexOf(e.key);
      if (idx >= 0) ctl.pick(MOVE_ORDER[idx]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, playerPick.locked, ctl]);

  // ------- derived flags -------
  const inFight =
    phase === 'roundIntro' ||
    phase === 'fightBanner' ||
    phase === 'picking' ||
    phase === 'reveal' ||
    phase === 'resolve' ||
    phase === 'roundEnd';
  const showFighters = inFight || phase === 'vsIntro' || phase === 'matchEnd';

  const roundWinner = matchState.roundOver; // set during resolve/roundEnd
  const matchWinner = matchState.matchOver;

  // Winner/loser pose classes for roundEnd + matchEnd.
  const poseClass = (side: 'p1' | 'p2'): string => {
    if (phase === 'roundEnd' && roundWinner) return side === roundWinner ? 'fr-winner' : 'fr-loser';
    if (phase === 'matchEnd' && matchWinner) return side === matchWinner ? 'fr-winner' : 'fr-loser';
    return '';
  };

  // Match point / FINISH THEM (presentation-only, derived from matchState during picking).
  const matchPoint =
    phase === 'picking' &&
    (matchState.p1.roundsWon === 1 || matchState.p2.roundsWon === 1) &&
    (matchState.p1.hp === 1 || matchState.p2.hp === 1);
  const finishSpotX = matchState.p1.hp === 1 ? CAL.fighterP1.cx : CAL.fighterP2.cx;

  const timerDanger = phase === 'picking' && shotClockSeconds <= 2;

  // Banner text per phase.
  const bannerNode = useMemo(() => {
    if (phase === 'roundIntro') {
      const text = matchState.round >= 3 ? 'FINAL ROUND' : `ROUND ${matchState.round}`;
      return <Banner key={`round-${matchState.round}`} text={text} slamMs={150} />;
    }
    if (phase === 'fightBanner') return <Banner key="fight" text="FIGHT!" slamMs={100} />;
    if (phase === 'resolve' && lastOutcome?.kind === 'clash') return <Banner key={`clash-${fx.nonce}`} text="CLASH!" slamMs={120} />;
    if (phase === 'resolve' && matchState.roundOver) return <Banner key="ko" text="K.O." kind="danger" slamMs={140} />;
    if (phase === 'roundEnd') {
      if (matchState.flawless) return <Banner key="flawless" text="FLAWLESS" kind="gold" slamMs={150} />;
      const wn = roundWinner === 'p1' ? GORVAK.name : VOLTA.name;
      return <Banner key="roundwin" text={`${wn} WINS THE ROUND`} slamMs={150} />;
    }
    return null;
  }, [phase, matchState.round, matchState.roundOver, matchState.flawless, lastOutcome, roundWinner, fx.nonce]);

  const stageClasses = ['fr-stage', reduced ? 'fr-reduced' : '', koZoom ? 'fr-ko-zoom' : '', koZoom?.active ? 'fr-ko-zoom-active' : '', shake && !reduced ? 'fr-shake' : '']
    .filter(Boolean)
    .join(' ');

  const stageStyle: React.CSSProperties = {
    backgroundImage: inFight ? `url(${BG_URL})` : `url(${BG_URL})`,
    transformOrigin: koZoom ? `${koZoom.spotX}% ${CAL.contactY}%` : 'center',
  };

  return (
    <div className="fr-viewport">
      <div ref={stageRef} className={stageClasses} style={stageStyle}>
        {/* Fighters */}
        {showFighters && (
          <>
            <div
              className="fr-ground-shadow"
              style={{ left: `${CAL.fighterP1.cx}%`, top: `${CAL.shadow.y}%`, width: `${CAL.shadow.w}%`, height: `${CAL.shadow.h}%` }}
            />
            <div
              className="fr-ground-shadow"
              style={{ left: `${CAL.fighterP2.cx}%`, top: `${CAL.shadow.y}%`, width: `${CAL.shadow.w}%`, height: `${CAL.shadow.h}%` }}
            />
            <Fighter url={F1_URL} cfg={CAL.fighterP1} fx={fx.p1} poseClass={poseClass('p1')} />
            <Fighter url={F2_URL} cfg={CAL.fighterP2} fx={fx.p2} poseClass={poseClass('p2')} />
          </>
        )}

        {/* Effects layer */}
        {inFight && (
          <div className="fr-fx-layer">
            {fx.spark && (
              <svg
                key={`spark-${fx.nonce}`}
                className="fr-hitspark"
                style={{ left: `${fx.spark.xPct}%`, top: `${fx.spark.yPct}%`, width: 'calc(var(--sw) * 6)', height: 'calc(var(--sw) * 6)' }}
                viewBox="0 0 100 100"
                aria-hidden="true"
              >
                <path d="M50 0 L60 40 L100 50 L60 60 L50 100 L40 60 L0 50 L40 40 Z" fill="#fffbe0" stroke="#fff" strokeWidth="2" />
              </svg>
            )}
            {fx.clash && (
              <div
                key={`clashfx-${fx.nonce}`}
                className="fr-clash-flash"
                style={{ width: 'calc(var(--sw) * 20)', height: 'calc(var(--sw) * 20)' }}
              />
            )}
            {fx.shield && (
              <div
                key={`shield-${fx.nonce}`}
                className="fr-shield-flare"
                style={{ left: `${fx.shield.xPct}%`, top: `${fx.shield.yPct}%`, width: 'calc(var(--sw) * 10)', height: 'calc(var(--sw) * 10)' }}
              />
            )}
            {fx.dust && (
              <div
                key={`dust-${fx.nonce}`}
                className="fr-dust-flash"
                style={{ left: `${fx.dust.xPct}%`, top: `${fx.dust.yPct}%`, width: 'calc(var(--sw) * 14)', height: 'calc(var(--sh) * 6)' }}
              />
            )}
          </div>
        )}

        {/* Reveal plates */}
        {(phase === 'reveal' || phase === 'resolve') && (
          <>
            <RevealPlate move={phase === 'reveal' ? playerPick.move : lastRecord?.p1 ?? null} cx={CAL.fighterP1.cx} faceDown={false} />
            <RevealPlate move={isResolveLike ? lastRecord?.p2 ?? null : null} cx={CAL.fighterP2.cx} faceDown={phase === 'reveal'} />
          </>
        )}

        {/* Baked-HUD overlays */}
        {inFight && (
          <>
            <NamePlate id={GORVAK} side="p1" />
            <NamePlate id={VOLTA} side="p2" />
            <HealthBar hp={matchState.p1.hp} side="p1" reduced={reduced} />
            <HealthBar hp={matchState.p2.hp} side="p2" reduced={reduced} />
            <Pips won={matchState.p1.roundsWon} side="p1" />
            <Pips won={matchState.p2.roundsWon} side="p2" />
            <TimerPlate seconds={shotClockSeconds} danger={timerDanger} />
            <Portrait url={F1_URL} cfg={CAL.portraitP1} />
            <Portrait url={F2_URL} cfg={CAL.portraitP2} />
          </>
        )}

        {/* Match-point spotlight + FINISH THEM */}
        {matchPoint && (
          <>
            <div className="fr-finish-vignette" style={{ ['--fr-spot-x' as string]: `${finishSpotX}%` }} />
            <div className="fr-banner-layer" style={{ alignItems: 'flex-start', paddingTop: 'calc(var(--sh) * 24)' }}>
              <div className="fr-banner fr-banner-danger" style={{ fontSize: 'calc(var(--sh) * 8)' }}>
                FINISH THEM!
              </div>
            </div>
          </>
        )}

        {/* Banners */}
        {bannerNode}

        {/* Pick controls */}
        {phase === 'picking' && (
          <div className="fr-pickbar">
            <div className="fr-legend">
              <b>STRIKE</b>
              <span className="fr-arrow">&gt;</span>
              <b>THROW</b>
              <span className="fr-arrow">&gt;</span>
              <b>BLOCK</b>
              <span className="fr-arrow">&gt;</span>
              <b>STRIKE</b>
            </div>
            <div className="fr-picks">
              {MOVE_ORDER.map((m) => {
                const chosen = playerPick.locked && playerPick.move === m;
                const dim = playerPick.locked && playerPick.move !== m;
                return (
                  <button
                    key={m}
                    type="button"
                    className={`fr-pick${chosen ? ' fr-pick-chosen' : ''}${dim ? ' fr-pick-dim' : ''}`}
                    disabled={playerPick.locked}
                    onClick={() => ctl.pick(m)}
                    title={MOVE_TIP[m]}
                    aria-label={`${MOVE_LABEL[m]}: ${MOVE_TIP[m]}`}
                  >
                    {chosen && <span className="fr-locked-tag">LOCKED</span>}
                    <MoveIcon move={m} />
                    <span className="fr-pick-label">{MOVE_LABEL[m]}</span>
                    <span className="fr-pick-tip">{MOVE_TIP[m]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ---------------- Non-fight screens ---------------- */}
        {phase === 'title' && (
          <button type="button" className="fr-overlay" onClick={ctl.enterModeSelect} style={{ cursor: 'pointer', background: 'none', border: 'none', color: 'inherit' }}>
            <div className="fr-scrim" />
            <div className="fr-overlay-content">
              <div className="fr-logo" style={{ fontSize: 'calc(var(--sh) * 13)' }}>
                FROZEN
                <br />
                REQUIEM
              </div>
              <div className="fr-logo-sub" style={{ fontSize: 'calc(var(--sh) * 1.7)' }}>
                STRIKE · THROW · BLOCK
              </div>
              <div className="fr-press" style={{ fontSize: 'calc(var(--sh) * 2.2)', marginTop: 'calc(var(--sh) * 5)' }}>
                PRESS TO BEGIN
              </div>
            </div>
          </button>
        )}

        {phase === 'mode' && (
          <div className="fr-overlay">
            <div className="fr-scrim" />
            <button type="button" className="fr-btn fr-back" onClick={ctl.backToTitle} style={{ fontSize: 'calc(var(--sh) * 1.4)', padding: 'calc(var(--sh) * 0.6) calc(var(--sw) * 1)' }}>
              BACK
            </button>
            <div className="fr-overlay-content">
              {mode !== 'friend' ? (
                <>
                  <div className="fr-section-title" style={{ fontSize: 'calc(var(--sh) * 3.4)', marginBottom: 'calc(var(--sh) * 2)' }}>
                    CHOOSE YOUR FIGHT
                  </div>
                  <div className="fr-cards">
                    <div className="fr-card">
                      <h3 style={{ fontSize: 'calc(var(--sh) * 2.4)' }}>VERSUS CPU</h3>
                      <div className="fr-plaques">
                        {PERSONALITIES.map((p) => (
                          <button
                            key={p.key}
                            type="button"
                            className="fr-btn fr-plaque"
                            onClick={() => ctl.startCpu(p.key)}
                            style={{ fontSize: 'calc(var(--sh) * 1.9)' }}
                          >
                            <span className="fr-plaque-name">
                              {p.name} <span className="fr-plaque-diff">{p.diff}</span>
                            </span>
                            <span className="fr-plaque-hint">{p.hint}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="fr-card">
                      <h3 style={{ fontSize: 'calc(var(--sh) * 2.4)' }}>INVITE A FRIEND</h3>
                      <button
                        type="button"
                        className="fr-btn fr-btn-primary"
                        onClick={ctl.startFriendCreate}
                        style={{ fontSize: 'calc(var(--sh) * 1.9)', padding: 'calc(var(--sh) * 0.9) calc(var(--sw) * 1.4)', width: '100%' }}
                      >
                        CREATE ROOM
                      </button>
                      <div style={{ color: 'var(--fr-steel-2)', fontFamily: 'Geist Mono, monospace', fontSize: 'calc(var(--sh) * 1.3)' }}>
                        or join with a code
                      </div>
                      <input
                        className="fr-input"
                        value={joinCode}
                        maxLength={6}
                        onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                        placeholder="ROOM CODE"
                        style={{ fontSize: 'calc(var(--sh) * 1.7)' }}
                      />
                      <button
                        type="button"
                        className="fr-btn"
                        disabled={joinCode.length < 3}
                        onClick={() => ctl.startFriendJoin(joinCode)}
                        style={{ fontSize: 'calc(var(--sh) * 1.7)', padding: 'calc(var(--sh) * 0.7) calc(var(--sw) * 1.2)', width: '100%' }}
                      >
                        JOIN
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'calc(var(--sh) * 1.6)' }}>
                  <div className="fr-section-title" style={{ fontSize: 'calc(var(--sh) * 3) ' }}>SHARE THIS CODE</div>
                  <div className="fr-roomcode" style={{ fontSize: 'calc(var(--sh) * 5) ' }}>
                    {ctl.friend.roomCode ?? '. . .'}
                  </div>
                  {!friend.connected && !friend.joinFailed && (
                    <div className="fr-waiting" style={{ fontSize: 'calc(var(--sh) * 1.7)' }}>
                      waiting for opponent
                    </div>
                  )}
                  {friend.joinFailed && (
                    <div className="fr-danger-text" style={{ fontSize: 'calc(var(--sh) * 1.7)' }}>
                      could not join that room, try again
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {phase === 'vsIntro' && (
          <div className="fr-overlay">
            <div className="fr-scrim" />
            <div className="fr-overlay-content">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'calc(var(--sw) * 2)' }}>
                <div className="fr-nameplate" style={{ position: 'relative', fontSize: 'calc(var(--sh) * 3.4)', padding: '0 calc(var(--sw) * 1.4)', height: 'calc(var(--sh) * 6)' }}>
                  {GORVAK.name}
                </div>
                <div className="fr-banner" style={{ fontSize: 'calc(var(--sh) * 12)' }}>VS</div>
                <div className="fr-nameplate" style={{ position: 'relative', fontSize: 'calc(var(--sh) * 3.4)', padding: '0 calc(var(--sw) * 1.4)', height: 'calc(var(--sh) * 6)' }}>
                  {mode === 'cpu' ? PERSONALITIES.find((p) => p.key === aiPersonality)?.name ?? VOLTA.name : VOLTA.name}
                </div>
              </div>
            </div>
          </div>
        )}

        {phase === 'matchEnd' && matchWinner && (
          <div className="fr-overlay">
            <div className="fr-scrim" />
            <div className="fr-overlay-content" style={{ gap: 'calc(var(--sh) * 2)' }}>
              <div className="fr-banner fr-banner-gold" style={{ fontSize: 'calc(var(--sh) * 11)' }}>
                {(matchWinner === 'p1' ? GORVAK : VOLTA).name} WINS
              </div>
              <div className="fr-victory-quote" style={{ fontSize: 'calc(var(--sh) * 2) ' }}>
                {(matchWinner === 'p1' ? GORVAK : VOLTA).quotes[quoteIndex]}
              </div>
              <div className="fr-menu" style={{ marginTop: 'calc(var(--sh) * 1.5)' }}>
                <button
                  type="button"
                  className="fr-btn fr-btn-primary"
                  autoFocus
                  onClick={ctl.rematch}
                  style={{ fontSize: 'calc(var(--sh) * 2)', padding: 'calc(var(--sh) * 0.9) calc(var(--sw) * 1.8)' }}
                >
                  REMATCH
                </button>
                <button
                  type="button"
                  className="fr-btn"
                  disabled
                  style={{ fontSize: 'calc(var(--sh) * 2)', padding: 'calc(var(--sh) * 0.9) calc(var(--sw) * 1.8)' }}
                >
                  CHARACTER SELECT<span className="fr-soon-tag">SOON</span>
                </button>
                <button
                  type="button"
                  className="fr-btn"
                  onClick={ctl.backToTitle}
                  style={{ fontSize: 'calc(var(--sh) * 2)', padding: 'calc(var(--sh) * 0.9) calc(var(--sw) * 1.8)' }}
                >
                  QUIT
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
