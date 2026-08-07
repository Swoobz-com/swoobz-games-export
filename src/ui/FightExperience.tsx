// STANDOFF (formerly Frozen Requiem) — arcade presentation for the STRIKE / THROW / BLOCK duel.
// Presentation-only: ALL game logic/timing lives in useFightController(). This file reads the
// controller's phase + state and renders the stage, the baked-HUD overlays (positioned in
// PERCENT of a fixed 2816x1536 stage box so they track the art at any size), the two keyed
// fighters, and the fight choreography (transform/opacity/filter only — single authored
// flashes, no particle systems). The provider already fires every sound at the right beat, so
// the UI never calls the audio layer (avoids double-firing).

import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from 'react';
import { RESOLVE_HIT_MS, RESOLVE_KO_MS, RESOLVE_MS, useFightController } from '../provider/fightProvider';
import type { AiPersonality } from '../engine/fightAi';
import type { Move } from '../engine/fightEngine';
import { cpuWinPayout, formatUsd, potLamports, STAKE_PRESETS } from '../engine/fightStakes';
import { ATTACK_STATE, FIGHTERS, getFighter } from '../characters';
import { isFighterSelectable } from '../characters/rosterGating';
import type { FighterDef, FighterState } from '../characters';
import { ARENAS, getArena } from '../arenas/arenas';
import {
  CAMPAIGN_NODE_COUNT,
  CAMPAIGN_NODES,
  campaignPayout,
  defenseAmount,
  formatMult,
  formatWinChance,
  nodeRtpPercent,
  campaignRtpRange,
  getCampaignNode,
} from '../engine/fightCampaign';
import type { CampaignNodeDef } from '../engine/fightCampaign';
// clipVariants is imported from the types module directly (the barrel re-exports only the types).
import { clipVariants } from '../characters/types';
// The character-select screen is the ONE place the UI fires its own sound (a UI tick on tile
// selection). This does NOT double-fire: the provider is silent during 'charSelect'. Every
// in-fight sound still comes from the provider at its beat, so the UI never touches audio there.
import { playPickTick } from '../audio/fightAudio';
import { BetConsole, type BetConsoleTheme } from './shared/BetConsole';
import './fight.css';

// BetConsole skin — the shared betting surface, restyled to Frozen Requiem's
// frost-cathedral palette (values mirror the tokens in fight.css). Gold is the
// value family (money + the single CTA); ice-ish stays the game's interactive
// accent elsewhere, so the CTA never has to fight another full-accent element.
const FR_BET_THEME: BetConsoleTheme = {
  fontMono: "'JetBrains Mono', monospace",
  fontBody: "'Space Grotesk', system-ui, sans-serif",
  surfaceTop: '#0d0f15',
  surfaceBottom: '#07080c',
  trim: 'rgba(255, 255, 255, 0.08)',
  trimGlow: 'rgba(41, 230, 255, 0.14)',
  label: '#ffc83d',
  textPrimary: '#f2f3ef',
  textMuted: '#98a1b3',
  textDim: 'rgba(152, 161, 179, 0.6)',
  hintColor: '#00d0de',
  accentSolid: 'linear-gradient(180deg, #ffe08a 0%, #ffc83d 55%, #b8860b 100%)',
  accentInk: '#07080c',
  accentSoftBg: 'rgba(255, 200, 61, 0.16)',
  accentSoftBorder: 'rgba(255, 200, 61, 0.6)',
  accentText: '#ffd873',
  money: '#ffd873',
  danger: '#ff4135',
  radius: 14,
};

const ASSET_BASE = import.meta.env.BASE_URL;

// The selected arena lives in the EXPERIENCE (like playerId), NOT the provider — the provider
// stays identity-agnostic. Persisted to localStorage with the same try/catch pattern as the
// practice-bank balance in the provider; a corrupt/absent/unknown value falls back to the first
// arena. The player only ever changes it on the character-select screen (never via a popup).
const ARENA_STORAGE_KEY = 'frozen-requiem.arena.v1';
function loadArenaId(): string {
  try {
    if (typeof localStorage === 'undefined') return ARENAS[0].id;
    const raw = localStorage.getItem(ARENA_STORAGE_KEY);
    if (raw != null && ARENAS.some((a) => a.id === raw)) return raw;
  } catch {
    /* storage unavailable (private mode / quota) — use the default arena */
  }
  return ARENAS[0].id;
}
function saveArenaId(id: string): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(ARENA_STORAGE_KEY, id);
  } catch {
    /* storage unavailable — arena stays in-memory only */
  }
}

// State clips play at 2x (a 4s clip -> a 2s beat; MK weight) — contract §5. This is GLOBAL
// rhythm and so lives ONLY as a module const; per-character numbers (cal, contactMs) live
// ONLY in the manifests. Idle keeps its natural rate (it is the 5s loop, not a state beat).
const CLIP_RATE = 2.0;
// Fallback attack contact if a clip omits contactMs (40% of a 4s clip, in pre-CLIP_RATE time).
const DEFAULT_CONTACT_MS = 1600;

/**
 * THE VARIANT LAW pick (contract §10). Chooses which interchangeable take of a state plays THIS
 * exchange, from `n` available takes. RG-C5: the choice derives ONLY from Math.random — NEVER from
 * the stake, the streak, the outcome, or any value — so which take you see carries no information
 * about the money. A one-variant state short-circuits to index 0 WITHOUT drawing from Math.random,
 * which is what keeps today's single-clip manifests byte-identical (no RNG is consumed, the render
 * and the timing math both read take 0). Chosen once per exchange, never per contact.
 */
function pickVariant(n: number): number {
  if (n <= 1) return 0;
  return Math.floor(Math.random() * n);
}

/**
 * THE COMBO-STRING LAW (contract §9): derive an attack clip's contact times for the choreography
 * beat. An attack clip is a 1-3 contact STRING: `contacts` (ascending, CLIP-time ms) SUPERSEDES the
 * single-contact `contactMs`; a clip with neither falls back to DEFAULT_CONTACT_MS. Each contact is
 * scaled from CLIP time into beat time (/CLIP_RATE) and clamped into the resolve window with the SAME
 * guard as the pre-combo single-contact form — the latest a blow may land is `resolveWindow - hitstop
 * - 40ms`, so the LAST contact always leaves room for its hitstop and the whole string lands inside
 * 'resolve'. A single-contact clip => a list of one => byte-identical to the pre-combo beat. PURE (no
 * React, no DOM) so the derivation is unit-testable in isolation.
 */
export function deriveContactTimes(
  clip: { contacts?: number[]; contactMs?: number },
  resolveWindow: number,
  hitstopMs: number,
): number[] {
  const raw = clip.contacts ?? (clip.contactMs != null ? [clip.contactMs] : [DEFAULT_CONTACT_MS]);
  const latest = Math.max(0, resolveWindow - hitstopMs - 40);
  return raw.map((c) => Math.min(c / CLIP_RATE, latest));
}

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
  // Circular portrait RINGS baked into the art. cx/cy = ring centre (% stage), r = radius as %
  // of stage WIDTH. These are per-SLOT stage positions and stay here; the per-CHARACTER head
  // crop (headX/headY/zoom) now lives in each FighterDef.portrait and travels with the fighter.
  portraitP1: { cx: 7.0, cy: 13.3, r: 4.75 },
  portraitP2: { cx: 93.0, cy: 13.3, r: 4.75 },
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

// ============================================================================================
// SELECT_CAL — character-select full-body preview geometry, in PERCENT of the stage box, using
// the SAME convention as CAL.fighterP1/P2 (cx = centre of mass % width, feetY = floor line % h,
// h = image height % of stage height). Kept SEPARATE from the CALIBRATION block because these are
// select-screen preview positions, not in-fight stage positions. One obvious TUNABLE block —
// nudged live after a visual drive.
// ============================================================================================
const SELECT_CAL = {
  p1: { cx: 22, feetY: 74, h: 56 },
  p2: { cx: 78, feetY: 74, h: 56 },
} as const;

// ============================================================================================
// MAP_CAL — conquest-map node positions, in PERCENT of the RENDERED MAP-IMAGE BOX
// (public/assets/campaign-map.webp, 2752x1536, drawn in a fixed-aspect frame so the percentages
// track the art at any size — the SAME discipline as the fight CAL block). Every disc must sit ON
// the art's drawn dotted warpath. Values are the CAMPAIGN-SPEC §2 estimates (fine-tune +-2% on a
// live screenshot). The art carries NO baked text: all names/numbers/flags/fog are drawn here.
// ============================================================================================
const MAP_CAL: Record<number, { x: number; y: number }> = {
  1: { x: 27.5, y: 71.5 },
  2: { x: 32.5, y: 64.5 },
  3: { x: 38.5, y: 62.5 },
  4: { x: 44.0, y: 57.5 },
  5: { x: 48.5, y: 48.5 },
  6: { x: 52.5, y: 33.5 },
  7: { x: 58.0, y: 33.0 },
  8: { x: 64.0, y: 31.5 },
  9: { x: 69.5, y: 36.5 },
  10: { x: 74.5, y: 28.5 },
};
// The two locked bonus isles (NW / SE in the art).
const MAP_ISLES: { key: string; x: number; y: number }[] = [
  { key: 'B1', x: 11, y: 18 },
  { key: 'B2', x: 91, y: 83 },
];

// Per-node LABEL placement (B1: conquered-label de-overlap). The disc/pin NEVER moves (MAP_CAL is
// untouched and the label is pointer-events:none, so this only slides the printed name). `dx`/`dy`
// are offsets in sw/sh units applied to the label via transform (layout-neutral); the label's
// baseline sits BELOW the disc, so a large negative `dy` lifts it ABOVE. Tuned on a full-conquest
// live screenshot so no two conquered labels collide along the dense mid/top warpath.
const MAP_LABEL: Record<number, { dx: number; dy: number }> = {
  1: { dx: -1.5, dy: 0 }, // KUROHAMA DOCKS — nudge left, clear of node 2
  2: { dx: 0, dy: -9.2 }, // ASHEN TORII — lift above (clears node 1/3 below-labels)
  3: { dx: 0, dy: 0 }, // WHISPERING BAMBOO (widest) — stays below, flanked by lifted 2 & 4
  4: { dx: -3.2, dy: -9.2 }, // SNOWFANG PASS — lift above, shift left off node 5's disc
  5: { dx: 1.5, dy: 0 }, // KAWA CROSSING — below, nudge right off node 3
  6: { dx: -1.0, dy: 0 }, // HOLLOW SHRINE — below, nudge left (was overlapping BURNED PAGODA)
  7: { dx: 0, dy: -8.6 }, // BURNED PAGODA — lift above, clears HOLLOW SHRINE & RED MIST GORGE
  8: { dx: 0.5, dy: 3.0 }, // RED MIST GORGE — drop below node 9's disc (they sit at a similar y)
  9: { dx: -2.6, dy: -8.9 }, // CRIMSON GATES — lift above, shift left off node 10's disc
  10: { dx: 1.0, dy: 0 }, // ZERO CITADEL — below, nudge right
};

// DEV gate (force-state-hooks law): ?dev=1 exposes the campaign force hooks (conquer next node /
// reset progress) so map progression is inspectable without grinding fights. Module-const, read
// once; invisible to normal players.
const DEV_MODE = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('dev');

/** The ladder's return range, computed ONCE from the shipped node table. Module-const (RG-C5) and
 *  derived, never typed: the 4.00x payout cap made the per-node return vary (96.0% .. 9.6%), so the
 *  map's disclosure line has to follow the math instead of asserting a number. */
const CAMPAIGN_RTP_RANGE = campaignRtpRange();

// Ambient-life consts (module-const; RG-C5). Parallax: how far the SCENERY layer may lean toward
// the cursor, in percent of its own size (the node pins never move - stable click targets). The
// scenery base scale keeps its edges outside the frame while translating.
const MAP_PARALLAX_MAX_PCT = 1.1;
const MAP_SCENERY_SCALE = 1.035;

// The defense one-liner per kind (fresh-player-comprehension law; middle dot separators, never an
// em-dash — RG-C5 copy law). Shared by the node card and the in-fight strip hint.
function defenseLine(node: CampaignNodeDef): string | null {
  const d = node.defense;
  if (!d) return null;
  return d.kind === 'shield'
    ? `HIS SHIELD ABSORBS THE FIRST ${d.amount} ${d.amount === 1 ? 'HIT' : 'HITS'} EACH ROUND`
    : `TOUGHER FOE: HIS HEALTH BAR HAS ${3 + d.amount} SEGMENTS`;
}

// ============================================================================================
// Conquest map — the shipped sumi-e island art (public/assets/campaign-map.webp) as a fixed-aspect
// frame, with a code-drawn node/flag/fog layer on top (the art has no baked text). Node discs are
// placed by MAP_CAL (percent of the frame). States: conquered (gold ring + planted flag), frontier
// (pulsing blood-red ring, the active target — this map's accent), fogged (dim bone "?" disc, name
// hidden: the UNKNOWN is the enemy, not the terrain). B1/B2 isles are always-locked COMING SOON.
// ============================================================================================
function CampaignMap({
  beaten,
  frontier,
  assetBase,
  onSelectNode,
}: {
  beaten: boolean[];
  frontier: number;
  assetBase: string;
  onSelectNode: (nodeId: number) => void;
}): JSX.Element {
  // Pointer parallax (swoobz-aliveness: reactive input + spatial depth). Direct DOM mutation via
  // ref, never state (refs-not-state). CLICK-TARGET LAW (Tim, 2026-07-20: "really hard to click
  // the dot"): the parallax moves the SCENERY LAYER ONLY (art + video + ambient) - the node pins
  // NEVER move, so they are stable click targets. The scenery carries a slight base scale so its
  // edges never pull inside the frame while translating.
  const sceneryRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const reduced = useReducedMotion();
  const onMapPointer = (e: { clientX: number; clientY: number }): void => {
    const el = sceneryRef.current;
    const frame = frameRef.current;
    if (!el || !frame || reduced) return;
    const r = frame.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - 0.5; // -0.5 .. 0.5
    const ny = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `scale(${MAP_SCENERY_SCALE}) translate(${(-nx * MAP_PARALLAX_MAX_PCT).toFixed(3)}%, ${(-ny * MAP_PARALLAX_MAX_PCT).toFixed(3)}%)`;
  };
  const onMapPointerLeave = (): void => {
    const el = sceneryRef.current;
    if (el) el.style.transform = '';
  };
  return (
    <div ref={frameRef} className="fr-map-frame" onMouseMove={onMapPointer} onMouseLeave={onMapPointerLeave}>
      {/* SCENERY LAYER - everything that parallax-drifts lives here; the node/route layer below
          stays put (stable click targets). */}
      <div ref={sceneryRef} className="fr-map-scenery" style={{ backgroundImage: `url(${assetBase}assets/campaign-map.webp)` }} aria-hidden="true">
        {/* THE LIVING MAP: generated ambient loop of the exact map art (trees sway, water flows,
            citadel fire flickers; locked camera so MAP_CAL stays valid). The still bg-image stays
            underneath as poster/fallback; reduced motion never mounts the video. */}
        {!reduced && (
          <video
            className="fr-map-video"
            src={`${assetBase}assets/campaign-map-loop.mp4`}
            autoPlay
            muted
            loop
            playsInline
          />
        )}
        {/* AMBIENT LIFE (swoobz-aliveness; all transform/opacity, module-const CSS timings,
            value-independent, killed by .fr-reduced): the citadel's red glow breathes, a single
            seismic ring ripples out from it (the season page's radar-ring identity), and one soft
            cloud shadow sweeps the island on a long loop. Authored elements, not particles. */}
        <div className="fr-map-ambient">
          <div className="fr-map-citadel-glow" />
          <div className="fr-map-seismic-ring" />
          <div className="fr-map-cloud" />
        </div>
      </div>
      {/* Faint route guide tying the numbered nodes in order. The art already draws the dotted
          warpath; this low-opacity polyline just reinforces the 1..10 sequence over it. */}
      <svg className="fr-map-route" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <polyline
          points={CAMPAIGN_NODES.map((n) => `${MAP_CAL[n.id].x},${MAP_CAL[n.id].y}`).join(' ')}
          fill="none"
          stroke="rgba(242, 243, 239, 0.20)"
          strokeWidth="0.35"
          strokeDasharray="1.1 1.5"
          strokeLinecap="round"
        />
      </svg>
      {/* NEXT-CHALLENGER TEASE (phase 20, re-layered 20c): the FRONTIER enemy rises as an
          ink-black silhouette from behind its disc. Rendered as a STANDALONE layer UNDER every
          node (z 0 vs fogged 1 / conquered 2 / frontier 4) so its opaque body can never black
          out a neighbour's label - an autisk catch: inside the frontier button (z 4) the lion
          silhouette swallowed the BURNED PAGODA label tail at 1280px. Decorative only:
          pointer-events:none, aria-hidden; base anchored to the frontier disc CENTER via
          translate(-50%,-100%) (MAP_CAL untouched; CLICK-TARGET LAW intact). */}
      {frontier >= 0 && frontier < CAMPAIGN_NODES.length && (
        <img
          className="fr-map-sil"
          src={`${assetBase}assets/enemies/${CAMPAIGN_NODES[frontier].enemy.id}.webp`}
          alt=""
          aria-hidden="true"
          draggable={false}
          style={{
            left: `${MAP_CAL[CAMPAIGN_NODES[frontier].id].x}%`,
            // The MAP_CAL point is the BUTTON center (disc + one-line label flex column), so the
            // disc center sits (labelH + gap)/2 = 1.3sh ABOVE it. Anchor the figure's base there.
            top: `calc(${MAP_CAL[CAMPAIGN_NODES[frontier].id].y}% - var(--sh) * 1.3)`,
          }}
        />
      )}
      {CAMPAIGN_NODES.map((node) => {
        const idx = node.id - 1;
        const conquered = beaten[idx];
        const isFrontier = !conquered && idx === frontier;
        const fogged = !conquered && idx > frontier;
        const clickable = conquered || isFrontier;
        const stateClass = conquered ? 'fr-map-conquered' : isFrontier ? 'fr-map-frontier' : 'fr-map-fogged';
        const pos = MAP_CAL[node.id];
        const label = conquered
          ? `${node.name}, conquered`
          : isFrontier
            ? `${node.name}, ${node.title}, ${formatWinChance(defenseAmount(node), node.roundsToWin)} percent win chance, pays ${formatMult(node.multBps)}x`
            : 'Locked node, unknown enemy';
        return (
          <button
            key={node.id}
            type="button"
            className={`fr-map-node ${stateClass}`}
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            onClick={clickable ? () => onSelectNode(node.id) : undefined}
            disabled={!clickable}
            aria-label={label}
          >
            <span className="fr-map-disc">
              {conquered ? (
                <span className="fr-map-flag" aria-hidden="true">
                  &#9873;
                </span>
              ) : fogged ? (
                <span className="fr-map-q" aria-hidden="true">
                  ?
                </span>
              ) : (
                <span className="fr-map-num">{node.id}</span>
              )}
              {/* Cosmetic-reward badge, visible once the node is out of the fog (EV-neutral:
                  the reward never touches the money math). Gold chrome on the gold tier. */}
              {node.reward && !fogged && (
                <span className={`fr-map-gift${node.reward.tier === 'gold' ? ' fr-map-gift-gold' : ''}`} aria-hidden="true">
                  &#10026;
                </span>
              )}
            </span>
            {!fogged && (
              <span
                className="fr-map-label"
                style={{ transform: `translate(calc(var(--sw) * ${MAP_LABEL[node.id].dx}), calc(var(--sh) * ${MAP_LABEL[node.id].dy}))` }}
              >
                {node.name}
              </span>
            )}
          </button>
        );
      })}
      {MAP_ISLES.map((isle) => (
        <div key={isle.key} className="fr-map-node fr-map-isle" style={{ left: `${isle.x}%`, top: `${isle.y}%` }} aria-hidden="true">
          <span className="fr-map-disc">
            <span className="fr-map-lock">&#10022;</span>
          </span>
          <span className="fr-map-coming">COMING SOON</span>
        </div>
      ))}
    </div>
  );
}

// --- Choreography timings (module-const; RG-C5). All transform-based, single flashes. ---
const CHO = {
  LUNGE_MS: 120,
  // Attacker travel raised ~2.3x (was 6 / 3). Fighters stand at 24%/76% stage width, so the
  // advance now eats a real slice of the 52%-wide gap and reads as a committed lunge, not a twitch.
  LUNGE_X: 14, // % stage width toward opponent
  STEP_X: 7,
  HITSTOP_MS: 100,
  KO_HITSTOP_MS: 120,
  // Defender reaction raised modestly (was 3 / 7): a deeper knock + tilt that then springs home on
  // SETTLE_EASE with a slight overshoot instead of a linear snap — recoil with follow-through.
  KNOCKBACK_X: 5,
  HURT_TILT: 9, // deg
  SPARK_MS: 130,
  // Screenshake lengthened (was 150) into a decaying ripple — big first oscillation, small second
  // (the fr-shake keyframe amplitude mirrors this) — so an impact reads as a ground-ripple, not a buzz.
  SHAKE_MS: 220,
  CLASH_FREEZE_MS: 200,
  CLASH_LUNGE_X: 9,
  // CLIP-DRIVEN CLASH hitstop (contract §1): when both fighters ship the shared attack clip a clash
  // freezes BOTH videos at the meeting point. It is the drama beat (both committed the same move and
  // CLANGED), so it holds LONGER than a hit's 100ms HITSTOP_MS and than the clip-less CSS clash's
  // 200ms CLASH_FREEZE_MS — 260ms so the shock ring + spark read before the rebound. Module-const (RG-C5).
  CLASH_CLIP_FREEZE_MS: 260,
  GRAB_JITTER_DEG: 2,
  GRAB_CYCLES: 3,
  GRAB_CYCLE_MS: 70,
  SLAM_DIP_Y: 2,
  BLOCK_REBOUND_X: 4,
  BLOCK_TINK_MS: 90,
  // Full on-screen lifetime of the block parry arc (CSS fr-shield-arc: ~180ms materialize + hold +
  // ~300ms dissipate). The parry now fires at LUNGE_MS and clears at LUNGE_MS + BLOCK_SHIELD_MS, so
  // it plays its whole dissipate instead of being cut at the counter beat (fits inside RESOLVE_HIT_MS).
  BLOCK_SHIELD_MS: 600,
  RETURN_MS: 220,
  // Motion curves (module-const; RG-C5). WINDUP eases INTO an advance (slow anticipation ->
  // snappy arrival); SETTLE springs a return home with ~10% overshoot instead of a linear snap-back.
  LUNGE_EASE: 'cubic-bezier(0.5, 0, 0.9, 0.3)',
  SETTLE_EASE: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  // KO beat: 120ms hitstop -> ~800ms slow-mo zoom -> snap back.
  KO_ZOOM_IN_MS: 120,
  KO_ZOOM_HOLD_MS: 800,
  // Launched-knockback on a ROUND-ENDING hit (§7.5, MK juggle): the loser flies back with a
  // slight up + rotation, layered on the hit/KO treatment. Module-const; off under reduced motion.
  LAUNCH_X: 8, // % stage width, away from the winner
  LAUNCH_Y: 4, // % stage height, upward
  LAUNCH_ROT: 14, // deg
  LAUNCH_MS: 260,
  // Impact-burst placement (§7): nudge toward the attacker + chest height as a fraction of h.
  IMPACT_NUDGE_X: 4, // % stage width
  IMPACT_CHEST_FRAC: 0.62,
  IMPACT_SIZE: 22, // burst square, % of stage height
  // HITS COUNTER (combo-string, §9): the on-stage "N HITS" tally pops from the 2nd contact on,
  // holds after the last contact, then fades. Timings ONLY — the eased pop curve lives in
  // fight.css. RG-C5: the tally is the CONTACT COUNT, never a stake / win / streak value.
  HITS_HOLD_MS: 600, // linger after the LAST contact before the tally starts fading
  HITS_FADE_MS: 260, // fade-out duration (mirrors the .fr-hits-leaving keyframe in fight.css)
} as const;

const MOVE_LABEL: Record<Move, string> = { strike: 'STRIKE', throw: 'THROW', block: 'BLOCK' };
const MOVE_TIP: Record<Move, string> = {
  strike: 'a fist is faster than a grab',
  throw: "you can't block a grab",
  block: 'blocked hits leave them wide open',
};
const MOVE_ORDER: Move[] = ['strike', 'throw', 'block'];

// ROCK-PAPER-SCISSORS MAPPING (Tim, 2026-08-07: "add the rock paper scissor icon in there to pick so
// you know"). STANDOFF's triangle IS rock-paper-scissors, and showing that on the pick buttons is the
// fastest way for a new player to know what beats what without reading three tips.
//
// DERIVED FROM THE ENGINE, not chosen by taste — fightEngine.ts BEATS is
//   strike -> throw,  throw -> block,  block -> strike
// and RPS is rock -> scissors, scissors -> paper, paper -> rock. Lining the two cycles up gives exactly
// one solution: strike=ROCK, throw=SCISSORS, block=PAPER. Verified as a cycle in fightEngine.test.ts's
// companion assertion — if BEATS is ever re-pointed, that test fails rather than this label going quietly
// wrong. Glyphs are the standard hand emoji so they read instantly at any size, including mobile.
const MOVE_RPS: Record<Move, { glyph: string; name: string }> = {
  strike: { glyph: '✊', name: 'ROCK' },      // ✊ rock crushes scissors  == strike beats throw
  throw: { glyph: '✌️', name: 'SCISSORS' }, // ✌️ scissors cut paper == throw beats block
  block: { glyph: '✋', name: 'PAPER' },      // ✋ paper covers rock      == block beats strike
};

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

/** True when we should NOT eagerly download every character take (phase 283).
 *
 *  WHY: each take is its own <video>, so `preload="auto"` across a kit pulls the fighter's whole kit, and
 *  a fight mounts two. MEASURED on the production build (gargoyle-spear vs the node-1 boss, bytes to the
 *  first punch, real encoded transfer): desktop 36.8MB, of which 26.7MB is character clips — thrifty
 *  mobile 27.3MB / 17.2MB, a 9.5MB (25.9%) saving, with all 26 elements still reaching readyState 4 so
 *  nothing is starved. Desktop keeps the original eager behaviour, so the zero-stutter design the
 *  §10 VARIANT LAW was written for is untouched where bandwidth is cheap.
 *
 *  MEASURING THIS: sum `Network.loadingFinished.encodedDataLength`, NOT the `content-length` header. A
 *  `preload="metadata"` element issues a range request whose 206 still advertises the FULL file length,
 *  so header-summing reports mobile and desktop as identical (36.7MB both) and hides the entire effect.
 *
 *  Signals, in order of authority: the user's explicit Data Saver, then a genuinely slow effective
 *  connection, then a phone-sized viewport as the fallback (coarse pointer AND narrow, so a small
 *  desktop window does not trip it). All feature-detected — `connection` is not in Safari, and this must
 *  not throw during SSR or in a test env. */
function useThriftyMedia(): boolean {
  const [thrifty, setThrifty] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const conn = (navigator as unknown as {
      connection?: { saveData?: boolean; effectiveType?: string; addEventListener?: (t: string, f: () => void) => void; removeEventListener?: (t: string, f: () => void) => void };
    }).connection;
    const narrow = window.matchMedia?.('(max-width: 820px), (pointer: coarse) and (max-width: 1100px)');
    const update = () => {
      const saveData = conn?.saveData === true;
      const slow = typeof conn?.effectiveType === 'string' && /(^|-)(2g|3g)$/.test(conn.effectiveType);
      setThrifty(saveData || slow || narrow?.matches === true);
    };
    update();
    narrow?.addEventListener?.('change', update);
    conn?.addEventListener?.('change', update);
    return () => {
      narrow?.removeEventListener?.('change', update);
      conn?.removeEventListener?.('change', update);
    };
  }, []);
  return thrifty;
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
// The resting transform. Its return rides SETTLE_EASE so a fighter easing back to centre (e.g. a
// knocked-back loser recovering between exchanges) overshoots ~10% then rests, matching the beat.
const IDLE_UNIT: FxUnit = { tx: 0, ty: 0, rot: 0, scale: 1, transition: `transform ${CHO.RETURN_MS}ms ${CHO.SETTLE_EASE}` };

interface FxState {
  p1: FxUnit;
  p2: FxUnit;
  // Which animation state each fighter's stacked clips show (fallback ladder resolves it in
  // the Fighter). Stays 'idle' whenever the pre-clip CSS choreography is driving the beat.
  p1State: FighterState;
  p2State: FighterState;
  // §10 VARIANT LAW: which take (index into clipVariants(def, pXState)) each fighter shows this
  // exchange. The SINGLE source of truth — both the render layer AND all timing math read the same
  // index, so a re-picked variant can never desync the geometry/beats from what is on screen. Set
  // together with pXState (a state that returns to idle resets its var to 0; idle is always single).
  p1Var: number;
  p2Var: number;
  hitstop: boolean; // freezes BOTH state videos during the hitstop window (clip choreography)
  // §7 impact burst: which attacker's fx_impact fires, and where (defender contact point). `final`
  // (§9 COMBO-STRING LAW): true only on the LAST contact of a string — the ring/glow/echo fire at
  // EVERY contact, but the "-1" damage floater renders ONLY when final (damage is 1; three "-1"s
  // would lie about HP — RG-C5 honesty). Single-contact / pre-clip beats always set final: true.
  impact: { side: 'p1' | 'p2'; xPct: number; yPct: number; final: boolean } | null;
  // §9 COMBO-STRING re-contact pulse: bumps at every contact i>=1 of a string so the defender's
  // CURRENT hit clip restarts from frame 0 mid-flow (a state re-set alone would NOT restart it).
  hitRetrigger: number;
  // VICTORY CHAIN arm (contract §1 `victory`). Set by the round-ending clip choreography when the
  // WINNER ships a `victory` take: when that side's FINISHER clip reaches its natural end (the
  // `clipEnd` action), it chains into `victory` (at `varIdx`, §10) instead of idle. Lives IN
  // FxState (not a ref) so the pure reducer can consume it against the LIVE pXState, and so the
  // roundEnd/matchEnd dwell can hold it across the resolve boundary (see phaseReset).
  victoryChain: { side: 'p1' | 'p2'; varIdx: number } | null;
  spark: { xPct: number; yPct: number } | null;
  // BLOCK parry: placed at the BLOCKER's chest. `facing` (toward the attacker) picks the arc's
  // direction so the ice-glass shield always curves into the incoming blow. The campaign SHIELD
  // absorb beat reuses this exact arc at the defended enemy (deflection fx family, no new asset).
  shield: { xPct: number; yPct: number; facing: 'left' | 'right' } | null;
  // Campaign SHIELD absorb floater: "SHIELDED" where the "-1" would have been (a soaked hit
  // deals no damage, so the damage floater must never lie). Null everywhere outside the beat.
  absorbFloat: { xPct: number; yPct: number } | null;
  dust: { xPct: number; yPct: number } | null;
  clash: boolean;
  nonce: number; // bumps to restart flash animations
}
const FX_INIT: FxState = {
  p1: IDLE_UNIT,
  p2: IDLE_UNIT,
  p1State: 'idle',
  p2State: 'idle',
  p1Var: 0,
  p2Var: 0,
  hitstop: false,
  impact: null,
  hitRetrigger: 0,
  victoryChain: null,
  spark: null,
  shield: null,
  absorbFloat: null,
  dust: null,
  clash: false,
  nonce: 0,
};

/** Non-patch reducer actions. Both decide against the LIVE pXState/pXVar, which a dispatching
 *  closure (an effect with intentionally-narrow deps, or a video's onEnded callback created at
 *  render time) cannot reliably see — so the decision lives in the pure reducer, which is also
 *  what makes it StrictMode double-invoke safe (same state in, same state out, no side effects).
 *
 *  `clipEnd` — a one-shot state video reached its natural end. Every preloaded take keeps playing
 *  hidden after it is deactivated (opacity 0, never src-swapped), so onEnded also fires for STALE
 *  clips from earlier exchanges; the reducer acts ONLY when the ended element (state + take) IS
 *  what that fighter currently shows. For the current element: `ko` holds its last frame
 *  (contract §2); a FINISHER with an armed victoryChain for that side chains into `victory` at
 *  the armed take and consumes the arm (§1); everything else returns to idle (frame 0 = anchor).
 *
 *  `phaseReset` — leaving 'resolve'. Clears all transient choreography (transforms, hitstop,
 *  flashes) — but during the roundEnd/matchEnd DWELL the body language persists: the KO'd loser
 *  stays DOWN through the K.O. banner (and behind the match receipt), the winner's victory taunt
 *  keeps playing, and an armed-but-unfired chain survives (race-proofing: the provider's phase
 *  flip and the finisher's onEnded land within ~1ms of each other, in either order). Any other
 *  phase (next round, stake, char select, title) is a FULL reset: both fighters back to idle and
 *  the chain dropped, so a new round never inherits a stale ko/victory/arm. */
type FxAction =
  | Partial<FxState>
  | { kind: 'clipEnd'; side: 'p1' | 'p2'; state: FighterState; varIdx: number }
  | { kind: 'phaseReset'; dwell: boolean };

function fxReducer(state: FxState, action: FxAction): FxState {
  if ('kind' in action && action.kind === 'clipEnd') {
    const cur = action.side === 'p1' ? state.p1State : state.p2State;
    const curVar = action.side === 'p1' ? state.p1Var : state.p2Var;
    // Stale end (a hidden, previously-deactivated clip ran out): ignore. This is what stops an
    // old hit/attack clip's late onEnded consuming the victory arm mid-finisher or cutting a
    // live clip — only the element actually on screen may drive a transition.
    if (action.state !== cur || action.varIdx !== curVar) return state;
    if (cur === 'ko') return state; // ko holds its last frame off-anchor (contract §2)
    const chain = state.victoryChain;
    if (chain && chain.side === action.side && cur !== 'victory') {
      // FINISHER end -> chain into the armed victory take (state + take dispatched together, §10).
      return action.side === 'p1'
        ? { ...state, p1State: 'victory', p1Var: chain.varIdx, victoryChain: null }
        : { ...state, p2State: 'victory', p2Var: chain.varIdx, victoryChain: null };
    }
    return action.side === 'p1'
      ? { ...state, p1State: 'idle', p1Var: 0 }
      : { ...state, p2State: 'idle', p2Var: 0 };
  }
  if ('kind' in action && action.kind === 'phaseReset') {
    // Hold a side through the dwell when it is mid-death (ko), mid-taunt (victory), or its
    // finisher is still playing with the chain armed (the arm fires on the clip's natural end).
    const hold = (side: 'p1' | 'p2', s: FighterState): boolean =>
      action.dwell && (s === 'ko' || s === 'victory' || side === state.victoryChain?.side);
    const holdP1 = hold('p1', state.p1State);
    const holdP2 = hold('p2', state.p2State);
    return {
      ...state,
      p1: IDLE_UNIT,
      p2: IDLE_UNIT,
      p1State: holdP1 ? state.p1State : 'idle',
      p1Var: holdP1 ? state.p1Var : 0,
      p2State: holdP2 ? state.p2State : 'idle',
      p2Var: holdP2 ? state.p2Var : 0,
      hitstop: false,
      impact: null,
      victoryChain: action.dwell ? state.victoryChain : null,
      spark: null,
      shield: null,
      absorbFloat: null,
      dust: null,
      clash: false,
    };
  }
  const patch = action as Partial<FxState>;
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

/** COVER-PLATE expansion. The CAL boxes map the baked art's inner footprint; the drawn Swoobz
 *  plates must cover the baked chrome COMPLETELY (CAL box + a small margin) so no baked pixels
 *  ghost out around them on the current background. Expands a CAL rect symmetrically WITHOUT
 *  touching the CAL values themselves — padX in % of stage width, padY in % of stage height. */
function pctRectPad(
  r: { x0: number; x1: number; y0: number; y1: number },
  padX: number,
  padY: number,
): React.CSSProperties {
  return {
    left: `${r.x0 - padX}%`,
    top: `${r.y0 - padY}%`,
    width: `${r.x1 - r.x0 + padX * 2}%`,
    height: `${r.y1 - r.y0 + padY * 2}%`,
  };
}

// BULK-DEFENSE bar extension (campaign 'bulk' nodes): the enemy bar grows PAST its CAL box so a
// 4/5-segment bar reads visibly LONGER than the player's 3. Bounded by the neighbours: center
// reach stops short of the timer plate (padded to ~55.4%), outer reach short of the portrait ring
// (~88.25%). CAL values themselves never change (cover-plate discipline).
const BULK_REACH_CENTER = 1.7; // % stage width, toward screen center
const BULK_REACH_OUTER = 1.4; // % stage width, toward the stage edge

function HealthBar({
  hp,
  side,
  reduced,
  total = 3,
}: {
  hp: number;
  side: 'p1' | 'p2';
  reduced: boolean;
  /** Segment count. 3 everywhere except the campaign bulk-defense enemy bar (3+amount): the
   *  absorb buffer renders as extra leading segments of ONE seamless longer bar. */
  total?: number;
}): JSX.Element {
  const rect = side === 'p1' ? CAL.hpP1 : CAL.hpP2;
  const prevHp = useRef(hp);
  const [flashIndex, setFlashIndex] = useState<number | null>(null);

  useEffect(() => {
    if (hp < prevHp.current) {
      // Newly-lost segment index for this side (p1 fills left-to-right, p2 right-to-left).
      const lost = side === 'p1' ? hp : total - 1 - hp;
      setFlashIndex(lost);
      const t = setTimeout(() => setFlashIndex(null), 520);
      prevHp.current = hp;
      return () => clearTimeout(t);
    }
    prevHp.current = hp;
    return undefined;
  }, [hp, side, total]);

  // Extended footprint for the longer bulk bar (p2 only ever gets total > 3).
  const style: React.CSSProperties =
    total > 3
      ? side === 'p2'
        ? { ...pctRect(rect), left: `${rect.x0 - BULK_REACH_CENTER}%`, width: `${rect.x1 - rect.x0 + BULK_REACH_CENTER + BULK_REACH_OUTER}%` }
        : { ...pctRect(rect), left: `${rect.x0 - BULK_REACH_OUTER}%`, width: `${rect.x1 - rect.x0 + BULK_REACH_CENTER + BULK_REACH_OUTER}%` }
      : pctRect(rect);

  return (
    <div className={`fr-hpbar fr-hpbar-${side}`} style={style}>
      {Array.from({ length: total }, (_, i) => {
        const present = side === 'p1' ? i < hp : i >= total - hp;
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

function Pips({ won, side, slots = 2 }: { won: number; side: 'p1' | 'p2'; slots?: number }): JSX.Element {
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
    // Cover strip: expanded past the CAL box and given a near-opaque glass background (CSS) so
    // the baked icy pip strip is fully covered — the drawn pip dots render on top of our strip,
    // never double-chromed against the baked one. `slots` = round wins needed to take the match
    // (2 everywhere; 3 on the campaign's first-to-3 nodes so the format is readable at a glance).
    <div
      className="fr-pips"
      style={{
        ...pctRectPad(rect, 0.6, 0.5),
        justifyContent: side === 'p1' ? 'flex-start' : 'flex-end',
        gap: 'calc(var(--sw) * 0.6)',
      }}
    >
      {Array.from({ length: slots }, (_, i) => {
        const filled = i < won;
        const cls = ['fr-pip', filled ? 'fr-pip-won' : '', popIndex === i ? 'fr-pip-pop' : ''].filter(Boolean).join(' ');
        return <div key={i} className={cls} style={{ width: 'calc(var(--sh) * 1.8)', height: 'calc(var(--sh) * 1.8)' }} />;
      })}
    </div>
  );
}

// CAMPAIGN SHIELD PIPS ('shield' defense nodes): the enemy's absorb buffer as small diamond
// outlines ABOVE his HP bar — a distinct shape from HP segments so "shield" reads as its own
// resource. Refills at every round start (re-keyed by round for the refill pop); a soaked hit
// empties one diamond at the absorb beat. Cover-plate law: the row sits on an opaque coal chip.
function ShieldPips({ remaining, total, round }: { remaining: number; total: number; round: number }): JSX.Element {
  return (
    <div className="fr-shieldpips" aria-label={`Enemy shield: ${remaining} of ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={`${round}-${i}`}
          className={`fr-shieldpip${i < remaining ? ' fr-shieldpip-filled' : ''}`}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

function TimerPlate({ seconds, danger }: { seconds: number; danger: boolean }): JSX.Element {
  return (
    // Cover plate: expanded past the CAL box so the baked '03' plate is fully covered
    // (opaque coal bg in CSS) — the big baked digits never show behind the live digit.
    <div className={`fr-timer${danger ? ' fr-timer-danger' : ''}`} style={pctRectPad(CAL.timer, 0.6, 1.0)}>
      {/* Lacquer-blade inner face (17b HUD language). The face is CLIPPED to an angled plate
          silhouette; the OUTER .fr-timer stays a fully-opaque rectangle (cover-plate law) so the
          chamfer corners reveal lacquer backing, never the baked '03'. */}
      <span className="fr-timer-face" aria-hidden="true" />
      <span className="fr-timer-digit" style={{ fontSize: 'calc(var(--sh) * 7.2)' }}>
        {Math.max(0, seconds)}
      </span>
    </div>
  );
}

function NamePlate({ name, side }: { name: string; side: 'p1' | 'p2' }): JSX.Element {
  const rect = side === 'p1' ? CAL.nameP1 : CAL.nameP2;
  // Cover plate: expanded past the CAL box so the baked 'PLAYER 1'/'PLAYER 2' plate is fully
  // covered (opaque coal bg in CSS). The baked label runs PAST the CAL box toward the screen
  // center, so the center-facing edge gets extra reach (asymmetric: the name itself, anchored
  // at the outer edge by justifyContent, never shifts).
  const CENTER_REACH = 2.4; // % stage width past the symmetric pad, toward screen center
  const padded = pctRectPad(rect, 0.7, 0.6);
  const width = `${rect.x1 - rect.x0 + 0.7 * 2 + CENTER_REACH}%`;
  const style: React.CSSProperties =
    side === 'p1'
      ? { ...padded, width, justifyContent: 'flex-start' }
      : { ...padded, left: `${rect.x0 - 0.7 - CENTER_REACH}%`, width, justifyContent: 'flex-end' };
  return (
    <div className={`fr-nameplate fr-nameplate-${side}`} style={{ ...style, fontSize: 'calc(var(--sh) * 1.9)' }}>
      {/* Lacquer-blade face, mirrored lean toward screen center (17b HUD language). The OUTER
          .fr-nameplate stays a fully-opaque rectangle (cover-plate law) covering the baked label;
          the angled face + name ride on top of that opaque backing. */}
      <span className="fr-nameplate-face" aria-hidden="true" />
      <span className="fr-nameplate-name">{name}</span>
    </div>
  );
}

/** THE FACING RULE (contract §4), now slot-DYNAMIC. The player's pick is always the p1/left
 *  slot and the opponent the p2/right slot; the left slot must face right and the right slot
 *  must face left. When the art's own `faces` disagrees with the slot it landed in, that
 *  fighter (and its portrait) renders mirrored (scaleX(-1)). Holds for any character in any
 *  slot, forever — the only input is the def's art facing plus its runtime slot. */
function isMirrored(def: FighterDef, slot: 'p1' | 'p2'): boolean {
  return def.faces !== (slot === 'p1' ? 'right' : 'left');
}

// Phase 21: the drawn portrait FRAME extends this factor past the CAL portrait radius so its
// opaque lacquer ring fully COVERS the baked gold portrait ring on the cathedral (a few px larger
// than CAL.r) — cover-plate law. The clean phase-21 arenas have no baked ring; the same drawn frame
// renders on every arena (HUD completeness: the ring is code, not art, everywhere).
const PORTRAIT_FRAME_RATIO = 1.36;

function Portrait({
  url,
  cfg,
  mirrored,
  fit = 'crop',
}: {
  url: string;
  // crop mode consumes headX/headY/zoom (per-character head window); cover mode ignores them.
  cfg: { cx: number; cy: number; r: number; headX?: number; headY?: number; zoom?: number };
  mirrored: boolean;
  fit?: 'crop' | 'cover';
}): JSX.Element {
  const inner = `calc(var(--sw) * ${cfg.r * 2})`;
  const frame = `calc(var(--sw) * ${cfg.r * 2 * PORTRAIT_FRAME_RATIO})`;
  // crop = per-character head window (fighter stills); cover = fill the circle (enemy PFPs).
  const imgStyle: React.CSSProperties =
    fit === 'cover'
      ? { width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', left: 0, top: 0 }
      : {
          width: `${(cfg.zoom ?? 1) * 100}%`,
          height: 'auto',
          left: `${50 - (cfg.headX ?? 0.5) * (cfg.zoom ?? 1) * 100}%`,
          top: `${50 - (cfg.headY ?? 0.5) * (cfg.zoom ?? 1) * 100}%`,
        };
  return (
    <div
      className="fr-portrait-frame"
      // The frame is the positioned element (CAL cx/cy); its opaque lacquer disc + gold hairline
      // ring + blood accent mask the baked ring. Symmetric, so it is NOT mirrored — only the head
      // window inside flips (same rule as the fighter: the medallion looks INTO the fight).
      style={{ left: `${cfg.cx}%`, top: `${cfg.cy}%`, width: frame, height: frame }}
    >
      <div
        className="fr-portrait"
        style={{ width: inner, height: inner, transform: `translate(-50%, -50%)${mirrored ? ' scaleX(-1)' : ''}` }}
      >
        <img src={url} alt="" style={imgStyle} />
      </div>
    </div>
  );
}

function Fighter({
  def,
  assetBase,
  cfg,
  fx,
  poseClass,
  activeState,
  activeVar,
  paused,
  hitRetrigger,
  reduced,
  mirrored,
  onClipEnd,
}: {
  def: FighterDef;
  assetBase: string;
  cfg: { cx: number; feetY: number; h: number };
  fx: FxUnit;
  poseClass: string;
  activeState: FighterState;
  activeVar: number; // §10 VARIANT LAW: which take of activeState to show (chosen by the parent)
  paused: boolean; // hitstop: freeze the current state video
  hitRetrigger: number; // §9 combo-string re-contact pulse (restarts a CURRENT 'hit' clip mid-flow)
  reduced: boolean;
  mirrored: boolean; // THE FACING RULE result for this fighter's runtime slot (computed by the parent)
  // Natural end of a one-shot take. Reports (state, take index) so the parent's reducer can tell
  // the CURRENTLY-SHOWN element from a stale hidden one (deactivated takes keep playing at
  // opacity 0 and their onEnded still fires — acting on those would cut live clips).
  onClipEnd: (state: FighterState, varIdx: number) => void;
}): JSX.Element {
  // Mobile/metered clients defer the non-critical takes instead of downloading the whole kit.
  const thriftyMedia = useThriftyMedia();
  // The still stays underneath until the idle loop is actually rendering frames, so a
  // slow decode (or a browser without VP9 alpha) never shows an empty fighter slot — it is
  // also the ultimate fallback when a character has no clips at all (contract §4 ladder).
  const [live, setLive] = useState(false);
  // Keyed by `${state}-${variantIndex}` — every take of every state has its own preloaded element.
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const states = Object.keys(def.clips) as FighterState[];

  // Fallback ladder: show the requested state's clip if the character ships it, else fall
  // back to idle, else the breathing still (no clips at all). Reads through clipVariants so a
  // state counts as "shipped" only when it has >=1 take (an empty list is not a clip).
  const displayState: FighterState = clipVariants(def, activeState).length > 0
    ? activeState
    : clipVariants(def, 'idle').length > 0
      ? 'idle'
      : activeState;
  // §10 VARIANT LAW: the take shown for displayState. When displayState is the requested activeState
  // the parent's chosen index applies; when the ladder fell back to idle (always a single take) the
  // clamp collapses it to 0. So a fallback never indexes past a state's take list.
  const displayVariants = clipVariants(def, displayState);
  const activeIdx = displayVariants.length > 0 ? Math.min(activeVar, displayVariants.length - 1) : 0;
  const activeKey = `${displayState}-${activeIdx}`;

  // Drive playback when the displayed state changes. One-shots restart from frame 0 and play
  // once (at CLIP_RATE); returning to idle restarts it at frame 0 too — its frame 0 IS the
  // anchor pose (contract §2), so the handoff is seamless.
  useEffect(() => {
    if (reduced) return;
    const v = videoRefs.current[activeKey];
    if (!v) return;
    v.playbackRate = displayState === 'idle' ? 1 : CLIP_RATE;
    v.currentTime = 0;
    const p = v.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
    // activeKey folds in both displayState and the chosen take, so a same-state variant swap across
    // exchanges (e.g. two strike wins with different takes) also restarts the newly-active clip.
  }, [activeKey, displayState, reduced]);

  // Hitstop: pause/resume the CURRENT state+take video (the parent freezes both fighters together).
  useEffect(() => {
    if (reduced) return;
    const v = videoRefs.current[activeKey];
    if (!v) return;
    if (paused) {
      v.pause();
    } else {
      const p = v.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    }
  }, [paused, activeKey, reduced]);

  // §9 COMBO-STRING re-contact restart. On contacts i>=1 of an attack string the defender is ALREADY
  // in its 'hit' state, so the displayState-change effect above does NOT fire (re-setting the same
  // state is a no-op) — this watches the parent's hitRetrigger pulse instead and restarts the CURRENT
  // clip from frame 0 so each blow re-plays the whole flinch. Guarded to 'hit' ONLY: idle must keep
  // looping (a restart would stutter it) and 'ko' holds its last frame off-anchor (contract §2).
  useEffect(() => {
    if (reduced) return;
    if (displayState !== 'hit') return;
    const v = videoRefs.current[activeKey];
    if (!v) return;
    v.currentTime = 0;
    const p = v.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
    // Fires ONLY on the hitRetrigger pulse; displayState/reduced are read as current values (the
    // displayState effect owns state-change restarts). Excluded deps are intentional.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hitRetrigger]);

  // Mirror when the art's facing disagrees with the slot's required facing (left slot must
  // face right, right slot must face left) — decided by the parent from the runtime slot. The
  // flip wraps the WHOLE box content (still + every state video) so the anchor-over-still
  // alignment and cals survive unchanged; the fx lunge transforms stay on the outer box and
  // keep their screen-space direction.
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
      <div style={{ position: 'absolute', inset: 0, transform: mirrored ? 'scaleX(-1)' : undefined }}>
      <div className="fr-fighter-breathe" style={live ? { animation: 'none' } : undefined}>
        <img src={`${assetBase}${def.still}`} alt="" draggable={false} style={{ opacity: live ? 0 : 1 }} />
      </div>
      {/* §10 VARIANT LAW: one stacked <video> PER TAKE of every shipped state, ALL preloaded and
          opacity-toggled — never a src swap mid-fight (that decode-blanks). The active element is
          the chosen take of displayState. Only idle loops/autoplays; other takes play once, driven
          by the parent's state/variant pick. A single-clip manifest yields exactly one take per
          state, so this stack is element-for-element the same as before (keys gain a `-0` suffix). */}
      {states.map((state) => {
        const isIdle = state === 'idle';
        return clipVariants(def, state).map((clip, i) => {
          const key = `${state}-${i}`;
          return (
            <video
              key={key}
              ref={(el) => {
                videoRefs.current[key] = el;
              }}
              className="fr-state-video"
              src={`${assetBase}${clip.url}`}
              muted
              loop={isIdle}
              autoPlay={isIdle}
              playsInline
              // Eager only where a stall would be VISIBLE, lazy elsewhere. Costs measured in the
              // `useThriftyMedia` doc block above — 36.8MB desktop vs 27.3MB thrifty to the first punch.
              //  · idle — always eager. It is the state on screen at fight start and the ladder's only
              //    fallback, so a stall here shows as an empty stage.
              //  · hit  — always eager. It fires on nearly every exchange and gates the clip beat.
              //  · everything else — 'metadata' on a data-saving/narrow client, 'auto' otherwise.
              // `metadata` still fetches headers, so cal/duration are known and the element is ready to
              // buffer the moment its state is picked; only the payload is deferred.
              preload={isIdle || state === 'hit' || !thriftyMedia ? 'auto' : 'metadata'}
              onPlaying={isIdle ? () => setLive(true) : undefined}
              onEnded={isIdle ? undefined : () => onClipEnd(state, i)}
              style={{
                height: `${clip.cal.h}%`,
                bottom: `${clip.cal.bottom}%`,
                left: `${clip.cal.left}%`,
                opacity: !reduced && key === activeKey ? 1 : 0,
              }}
            />
          );
        });
      })}
      </div>
    </div>
  );
}

// §7 impact overlay — a stage-level sibling ABOVE the fighters, BELOW the banners. Preloads
// BOTH fighters' emissive fx_impact bursts (stacked, opacity/play-toggled, never src-swapped),
// composited on PURE BLACK with mix-blend-mode: screen. A right-slot attacker fires leftward,
// so its burst art is mirrored. Absent fx_impact = nothing renders (existing hit flash only).
function ImpactLayer({
  p1Def,
  p2Def,
  assetBase,
  impact,
  reduced,
}: {
  p1Def: FighterDef;
  p2Def: FighterDef;
  assetBase: string;
  impact: FxState['impact'];
  reduced: boolean;
}): JSX.Element | null {
  const p1Ref = useRef<HTMLVideoElement>(null);
  const p2Ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (reduced || !impact) return;
    const v = (impact.side === 'p1' ? p1Ref : p2Ref).current;
    if (!v) return;
    v.currentTime = 0;
    const p = v.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  }, [impact, reduced]);
  if (reduced) return null;
  const burst = (side: 'p1' | 'p2', def: FighterDef, ref: React.RefObject<HTMLVideoElement>) => {
    const fxImpact = def.fxImpact;
    if (!fxImpact) return null;
    const active = impact?.side === side;
    const mirror = side === 'p2'; // right-slot attacker fires leftward -> mirror the burst
    return (
      <video
        key={side}
        ref={ref}
        className="fr-impact-fx"
        src={`${assetBase}${fxImpact.url}`}
        muted
        playsInline
        preload="auto"
        style={{
          left: `${impact?.xPct ?? 50}%`,
          top: `${impact?.yPct ?? 50}%`,
          width: `calc(var(--sh) * ${CHO.IMPACT_SIZE})`,
          height: `calc(var(--sh) * ${CHO.IMPACT_SIZE})`,
          opacity: active ? 1 : 0,
          transform: `translate(-50%, -50%) scaleX(${mirror ? -1 : 1})`,
        }}
      />
    );
  };
  return (
    <div className="fr-impact-layer" aria-hidden="true">
      {burst('p1', p1Def, p1Ref)}
      {burst('p2', p2Def, p2Ref)}
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
  // Re-key the inner on the shown face so its entrance flip re-runs ONCE when a face-down "?" swaps
  // to the revealed move (a single eased card-flip, no multi-bounce) instead of an instant pop.
  const faceKey = faceDown || !move ? 'down' : move;
  return (
    <div className="fr-reveal-plate" style={{ left: `${cx}%`, top: `${CAL.revealY}%` }}>
      <div className="fr-reveal-plate-inner" key={faceKey}>
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
// Character select — reference language (MK1 select plate), our frost-cathedral skin.
// ============================================================================================
// The fixed size of the charSelect roster grid (MK1-style: two rows of 11). Selectable tiles fill
// it FIRST; the remainder are locked mystery "?" tiles. A newly-unlocked boss takes the place of a
// mystery slot so the total never changes and no locked boss leaks its name/art.
const SELECT_ROSTER_SIZE = 22;

// A roster tile: a bust crop of the fighter's still, cropped with the SAME math as the Portrait
// medallion but framed square-ish (3:4). The crop params come from the def, so a new manifest
// needs zero edits here. Busts are mirrored as if in the p1/left slot so the whole roster
// consistently faces the fight.
function CharacterTile({
  def,
  assetBase,
  selected,
  onSelect,
}: {
  def: FighterDef;
  assetBase: string;
  selected: boolean;
  onSelect: () => void;
}): JSX.Element {
  return (
    <button
      type="button"
      className={`fr-select-tile${selected ? ' fr-select-selected' : ''}`}
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={def.name}
    >
      {/* THE TILE USES THE PURPOSE-BUILT PFP, not a hand-tuned crop of the full-body still.
          It used to scale `def.still` by def.portrait {zoom, headX, headY} — a per-character head
          guess that has to be re-tuned by eye for every fighter, and four of twelve were wrong:
          ir37 showed a pink fan with no face, ir48's head sat above the frame, ir56 read as a green
          blob, lady-kurotachi as dark shoulders. `assets/enemies/<id>-pfp.webp` is a 512-square
          head-and-shoulders crop produced by scripts/key-enemies.mjs and already used by the node
          card, so every character is framed correctly BY CONSTRUCTION and a new fighter needs no
          tuning at all. `def.portrait` still drives the in-fight HUD medallion, which is a circular
          mask over the live still and genuinely does need the per-character centre.
          Not mirrored: the PFP is authored facing the viewer, so a flip would only mirror the face. */}
      <div className="fr-select-crop">
        <img className="fr-select-pfp" src={`${assetBase}assets/enemies/${def.id}-pfp.webp`} alt="" draggable={false} />
      </div>
      {selected && <span className="fr-p1-chip">P1</span>}
    </button>
  );
}

// A locked "mystery" tile (reference's "?" plates): dark plate, a single big "?" glyph. At 20
// tiles the bare glyph IS the mystery — an extra "SOON" label would just be noise — matching the
// MK1 reference where empty roster slots are unlabeled question marks.
function LockedTile(): JSX.Element {
  return (
    <div className="fr-select-tile fr-select-locked" aria-hidden="true">
      <span className="fr-select-qmark">?</span>
    </div>
  );
}

// ============================================================================================
// Arena picker — SAME tile mechanics as fighter selection (real tiles + locked mystery tiles),
// but the choice PERSISTS across matches/sessions (localStorage) and is only ever changed here on
// the character-select screen (never a popup). Clicking a real tile sets the arena instantly, so
// the select-screen stage backdrop switches live behind the scrim.
// ============================================================================================
// A real arena tile: a wide 16:9 thumb of its background art + a name label. Selected = cyan-soft
// border + label in the small-accent cyan.
function ArenaTile({
  name,
  thumbUrl,
  selected,
  onSelect,
}: {
  name: string;
  thumbUrl: string;
  selected: boolean;
  onSelect: () => void;
}): JSX.Element {
  return (
    <button
      type="button"
      className={`fr-arena-tile${selected ? ' fr-arena-selected' : ''}`}
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`Arena: ${name}`}
    >
      <div className="fr-arena-thumb">
        <img src={thumbUrl} alt="" draggable={false} />
      </div>
      <span className="fr-arena-name">{name}</span>
    </button>
  );
}

// A locked "mystery" arena tile — same visual language as the fighter LockedTile, not clickable.
function ArenaLockedTile(): JSX.Element {
  return (
    <div className="fr-arena-tile fr-arena-locked" aria-hidden="true">
      <span className="fr-arena-qmark">?</span>
    </div>
  );
}

// The full-body select preview: on the character-select screen the highlighted fighter (left
// slot) and the derived opponent (right slot) stand playing their LIVE idle loop, mirroring the
// MK1 select plate. It reuses the Fighter media stack in miniature — still underneath, idle
// <video> on top with the SAME ClipCal placement and the same still->video handoff — but is a
// STANDALONE overlay element: it never joins the stage fighter layer (showFighters / Fighter stay
// untouched). THE FACING RULE (contract §4) mirrors the WHOLE stack on ONE inner wrapper, exactly
// like the stage fighter, so the anchor-over-still alignment survives the flip. The parent keys
// this by def.id: a character NEW to the screen mounts fresh and its idle starts at frame 0 (the
// anchor pose, contract §2, pixel-perfect on the still); when a pick just SWAPS the two on-screen
// fighters, React matches the sibling keys and MOVES the instances instead of remounting (verified
// live: currentTime carries over), so both loops continue seamlessly with no restart snap. Both
// paths are safe because the loop is anchor-locked.
function SelectPreview({
  def,
  slot,
  assetBase,
  reduced,
  cfg,
}: {
  def: FighterDef;
  slot: 'p1' | 'p2';
  assetBase: string;
  reduced: boolean;
  cfg: { cx: number; feetY: number; h: number };
}): JSX.Element {
  // The still stays visible until the idle loop is actually rendering frames (same handoff as
  // Fighter); it is also the ultimate fallback when a def ships no idle clip (contract §4 ladder).
  const [live, setLive] = useState(false);
  const mirrored = isMirrored(def, slot);
  // §10: idle is always a single take (the anchor hub is never varied) — read it through the
  // variant accessor so the select preview stays a pure still+idle surface, untouched by variants.
  const idle = clipVariants(def, 'idle')[0];
  return (
    <div
      className="fr-select-preview"
      style={{ left: `${cfg.cx}%`, top: `${cfg.feetY}%`, height: `${cfg.h}%`, aspectRatio: '1 / 1' }}
    >
      {/* THE FACING RULE: one wrapper flips the whole stack (still + video) together. */}
      <div className="fr-select-preview-inner" style={{ transform: mirrored ? 'scaleX(-1)' : undefined }}>
        <img
          className="fr-select-preview-still"
          src={`${assetBase}${def.still}`}
          alt=""
          draggable={false}
          style={{ opacity: !reduced && live ? 0 : 1 }}
        />
        {/* Reduced motion never mounts the video (still-only, contract §4). */}
        {!reduced && idle && (
          <video
            className="fr-select-preview-video"
            src={`${assetBase}${idle.url}`}
            muted
            loop
            autoPlay
            playsInline
            preload="auto"
            onPlaying={() => setLive(true)}
            style={{
              height: `${idle.cal.h}%`,
              bottom: `${idle.cal.bottom}%`,
              left: `${idle.cal.left}%`,
              opacity: live ? 1 : 0,
            }}
          />
        )}
      </div>
    </div>
  );
}

// ============================================================================================
// Stage living layer (phase 22) — the arena's ambient loop, layered UNDER the fight. Mirrors the
// campaign-map living-layer contract: the still stays visible as poster/fallback (the stage's own
// bg-image), this <video> opacity-fades in only after onPlaying fires so there is never a flash or
// blank; muted/loop/autoPlay, decorative (aria-hidden, pointer-events:none). object-fit:cover +
// center matches the still's background-size:cover/center, so the framing does not jump at fade-in.
// KEYED by arena id at the call site: an arena change remounts this, resetting `live` to false so a
// stale frame from the previous arena can never show through. Only mounts when the arena HAS a loop
// and motion is allowed; .fr-reduced also hard-hides it in CSS (belt + braces).
function StageVideo({ src }: { src: string }): JSX.Element {
  const [live, setLive] = useState(false);
  return (
    <video
      className={`fr-stage-video${live ? ' fr-stage-video-live' : ''}`}
      src={src}
      muted
      loop
      autoPlay
      playsInline
      preload="auto"
      aria-hidden="true"
      draggable={false}
      onPlaying={() => setLive(true)}
    />
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

  // DYNAMIC SLOTS. The player's picked fighter is ALWAYS the p1/left slot; the opponent is
  // ALWAYS the p2/right slot. `playerId` is the only named id in this file (the session default
  // + the character-select state); the opponent is DERIVED from the registry — never a
  // hardcoded pair. With N characters the CPU opponent is simply the first OTHER registry entry,
  // so adding a third manifest needs zero edits here. Everything character-specific below
  // (stills, clips, cals, names, quotes, fx bursts, mirroring) flows from these two defs + slot.
  // phase 283: was 'gorvak', a placeholder house fighter Tim removed. This id MUST exist in FIGHTERS —
  // getFighter() throws on an unknown id by contract, so a stale default here is a hard crash on boot,
  // not a soft fallback.
  const [playerId, setPlayerId] = useState<string>('gargoyle-spear');
  // Selected arena (background). Read from localStorage ONCE at init; persisted on change. Lives
  // HERE in the Experience (never the provider — the provider stays identity-agnostic, like it
  // never learns the picked fighter). The stage background everywhere resolves from this.
  const [arenaId, setArenaId] = useState<string>(loadArenaId);
  useEffect(() => {
    saveArenaId(arenaId);
  }, [arenaId]);
  const p1Def = getFighter(playerId);
  // The opponent is DERIVED (first OTHER registry entry) for CPU and until a friend's profile
  // lands. In friend mode, once the peer relays its opaque fighter id (a known registry key), that
  // is the real opponent — INCLUDING a mirror match (same id both slots), which the two distinct
  // Fighter slots render fine (right slot mirrored by isMirrored). The profile only arrives after
  // both sides commit, so the charSelect previews still show the derived opponent (distinct keys).
  const derivedOpponentId = Object.keys(FIGHTERS).find((id) => id !== playerId) ?? playerId;
  // PLAYABLE-AFTER-BEATEN roster gate (presentation only): the charSelect PICK grid + arrow-nav
  // offer the always-available fighters plus any boss whose campaign node is beaten. Boss tiles
  // stay locked (mystery "?") until conquered. Reads ctl.campaign.beaten — the SAME corrupt-safe
  // beaten[] the campaign persists (frozen-requiem.campaign.v1), live-reactive so a node beaten
  // this session unlocks its boss on return to charSelect. RENDERING a boss (campaign fight, a
  // friend peer's opaque id) stays unconditional — only this PICK list is gated.
  const selectableFighters = Object.values(FIGHTERS).filter((def) =>
    isFighterSelectable(def.id, ctl.campaign.beaten),
  );
  const friendOpponentId = ctl.friend.opponentFighterId;
  // The active campaign node (campaign mode only): drives the enemy identity, the match format,
  // the defense presentation and the node-card copy. VOLTA fills every slot this phase.
  const campaignNode = ctl.mode === 'campaign' ? getCampaignNode(ctl.campaign.nodeId) : undefined;
  // Stage background. A CAMPAIGN fight (from its node card / stake screen on) renders the NODE's
  // arena; quick duel + friend render the player's PERSISTED pick. The campaign override is
  // effective-only — it NEVER writes `arenaId` (frozen-requiem.arena.v1 stays the player's quick-
  // duel choice untouched), so returning to quick duel restores their arena.
  const effectiveArenaId = campaignNode ? campaignNode.arenaId : arenaId;
  const effectiveArena = getArena(effectiveArenaId);
  const stageBgUrl = `${ASSET_BASE}${effectiveArena.file}`;
  // The arena's ambient loop (phase 22), if it has one. The still (stageBgUrl) always renders as
  // the CSS bg; this url only drives the optional living <video> layer over it.
  const stageLoopUrl = effectiveArena.loop ? `${ASSET_BASE}${effectiveArena.loop}` : null;
  // Round wins needed to take the match on the current surface (2 outside campaign; the node's
  // format inside). Drives the pip count, the FINAL ROUND banner and the FINISH THEM gate.
  const roundsNeeded: 2 | 3 = campaignNode ? campaignNode.roundsToWin : 2;
  // The enemy's DISPLAYED hp: for a 'bulk' defense the absorb buffer renders as extra health-bar
  // segments (engine hp + buffer, over 3+amount segments — one seamless longer bar); shield nodes
  // and every non-campaign fight show the engine's 3-segment bar untouched.
  const bulkAmount = campaignNode?.defense?.kind === 'bulk' ? campaignNode.defense.amount : 0;
  const p2BarTotal = 3 + bulkAmount;
  const p2BarHp = ctl.matchState.p2.hp + (bulkAmount > 0 ? ctl.campaign.defenseRemaining : 0);
  const opponentId =
    ctl.mode === 'campaign' && campaignNode
      ? campaignNode.fighterId
      : ctl.mode === 'friend' && friendOpponentId != null && friendOpponentId in FIGHTERS
        ? friendOpponentId
        : derivedOpponentId;
  const p2Def = getFighter(opponentId);
  const p1Still = `${ASSET_BASE}${p1Def.still}`;
  const p2Still = `${ASSET_BASE}${p2Def.still}`;
  const p1Mirrored = isMirrored(p1Def, 'p1');
  const p2Mirrored = isMirrored(p2Def, 'p2');

  const [joinCode, setJoinCode] = useState('');
  const [quoteIndex] = useState(() => Math.floor(Math.random() * 3));

  const [fx, dispatchFx] = useReducer(fxReducer, FX_INIT);
  const [koZoom, setKoZoom] = useState<{ active: boolean; spotX: number } | null>(null);
  // §9 COMBO-STRING hits tally. `count` = blows landed so far (>=2); `key` = the contact index that
  // last updated it (re-keys the pop so it re-fires per update); `leaving` flips to fade it out. Text
  // derives ONLY from the choreography contact index — never a stake / win value (RG-C5).
  const [hitsCounter, setHitsCounter] = useState<{ count: number; key: number; leaving: boolean } | null>(null);
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

  // A one-shot state clip ended (or was interrupted): return that fighter to idle so the idle
  // video restarts at frame 0 (the anchor). KO is the exception — it holds its last frame off
  // the anchor (contract §2), so it never returns to idle here.
  // A one-shot state clip reached its natural end. ALL policy lives in the fxReducer's `clipEnd`
  // action (see its doctrine comment): stale hidden clips are ignored, ko holds, an armed
  // victoryChain fires the finisher->victory swap, everything else returns to idle. Deliberately
  // NO phase guard: the finisher's onEnded races the resolve->roundEnd flip within ~1ms
  // (measured), and the arm survives into the dwell, so the chain fires on either side of the
  // boundary. The (state, varIdx) pair identifies exactly WHICH element ended.
  const handleClipEnd = useCallback(
    (side: 'p1' | 'p2', state: FighterState, varIdx: number) => {
      dispatchFx({ kind: 'clipEnd', side, state, varIdx });
    },
    [dispatchFx],
  );

  const { phase, matchState, lastOutcome, playerPick, mode, aiPersonality, friend, shotClockSeconds } = ctl;

  // Relay OUR fighter id to the peer once we're in a room (creator has a roomCode; either side
  // once connected). Re-sends if the player changes fighter; the transport queues before open and
  // the server relays the latest, so duplicate sends are harmless.
  useEffect(() => {
    if (mode === 'friend' && (friend.roomCode !== null || friend.connected)) {
      ctl.sendFighterProfile(playerId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, friend.roomCode, friend.connected, playerId]);

  // Reconstruct both picks for the reveal plates from the just-committed history record.
  const lastRecord = matchState.history[matchState.history.length - 1];
  const isResolveLike = phase === 'resolve' || phase === 'roundEnd';

  // Drive the resolve choreography when we enter 'resolve'.
  useEffect(() => {
    if (phase !== 'resolve' || !lastOutcome) {
      clearCho();
      if (phase !== 'resolve') {
        // POST-RESOLVE DWELL: on the roundEnd/matchEnd phases the ko body stays down and the
        // victory taunt keeps playing (or still chains off the finisher); everything transient
        // (transforms, hitstop, impact, spark) resets exactly as before. On ANY other phase this
        // is the full both-to-idle reset (chain dropped), so the next round always starts clean.
        // The hold decision lives in the pure fxReducer (it needs the LIVE pXState/victoryChain,
        // not this effect's possibly-stale closure).
        dispatchFx({ kind: 'phaseReset', dwell: phase === 'roundEnd' || phase === 'matchEnd' });
        setKoZoom(null);
        setHitsCounter(null); // §9: the combo tally never survives leaving 'resolve'.
      }
      return undefined;
    }
    clearCho();
    const roundEnding = Boolean(matchState.roundOver);
    const freeze = 'transform 0ms linear';
    const snappy = (ms: number) => `transform ${ms}ms cubic-bezier(0.2, 0.9, 0.2, 1)`;
    // Wind-up (ease-in: slow anticipation -> snappy arrival) for advances; settle (spring
    // overshoot) for returns home. Both read their curve from CHO — one module-const tuning surface.
    const windup = (ms: number) => `transform ${ms}ms ${CHO.LUNGE_EASE}`;
    const settle = (ms: number) => `transform ${ms}ms ${CHO.SETTLE_EASE}`;

    const winnerSide: 'p1' | 'p2' | null = lastOutcome.kind === 'hit' ? lastOutcome.winner : null;
    // toward-opponent sign: p1 lunges +x (right), p2 lunges -x (left).
    const sign = (s: 'p1' | 'p2') => (s === 'p1' ? 1 : -1);
    const loserSide: 'p1' | 'p2' | null = winnerSide ? (winnerSide === 'p1' ? 'p2' : 'p1') : null;
    const contactX = loserSide === 'p1' ? CAL.fighterP1.cx : CAL.fighterP2.cx;

    // CAMPAIGN SHIELD ABSORB BEAT: the exchange resolving now was soaked by a 'shield' defense
    // (provider fact, set with this resolve). The attacker still plays the full attack; at contact
    // the deflection family fires (the frost parry arc + "SHIELDED" floater) INSTEAD of the impact
    // family (ring/glow/"-1") and the defender never plays a hit reaction — no damage happened.
    // A 'bulk' absorb deliberately takes NO branch here: it looks like a normal hit draining the
    // longer bar, which is the entire point of the bulk presentation.
    const shieldAbsorb = mode === 'campaign' && ctl.campaign.absorbed && campaignNode?.defense?.kind === 'shield';

    const defForSide = (s: 'p1' | 'p2') => (s === 'p1' ? p1Def : p2Def);
    // §7 impact burst at the defender's contact point: chest height, nudged toward the attacker.
    // `final: true` by default so the single-contact / pre-clip beats show the "-1" exactly as
    // before; the §9 multi-contact loop overrides `final` per contact (only the last is final).
    const impactAt = (winner: 'p1' | 'p2', loser: 'p1' | 'p2'): NonNullable<FxState['impact']> => {
      const d = loser === 'p1' ? CAL.fighterP1 : CAL.fighterP2;
      return { side: winner, xPct: d.cx - sign(winner) * CHO.IMPACT_NUDGE_X, yPct: d.feetY - CHO.IMPACT_CHEST_FRAC * d.h, final: true };
    };
    // The contact-moment fx patch: the impact family normally, the deflection family (frost arc at
    // the defended enemy + SHIELDED floater on the final blow) when a shield soaked the exchange.
    const contactFx = (winner: 'p1' | 'p2', loser: 'p1' | 'p2', final: boolean): Partial<FxState> => {
      if (!shieldAbsorb) return { impact: { ...impactAt(winner, loser), final } };
      const at = impactAt(winner, loser);
      return {
        shield: { xPct: at.xPct, yPct: at.yPct, facing: loser === 'p1' ? 'right' : 'left' },
        absorbFloat: final ? { xPct: at.xPct, yPct: at.yPct } : null,
      };
    };
    const scheduleImpactClear = (winner: 'p1' | 'p2', atMs: number) => {
      const dur = defForSide(winner).fxImpact?.durationMs;
      if (dur) at(() => dispatchFx({ impact: null }), atMs + dur);
    };
    // §7.5 launched-knockback: the loser flies away from the winner with a slight up + rotation.
    const launchUnit = (winner: 'p1' | 'p2'): FxUnit => ({
      tx: sign(winner) * CHO.LAUNCH_X,
      ty: -CHO.LAUNCH_Y,
      rot: sign(winner) * CHO.LAUNCH_ROT,
      scale: 1,
      transition: snappy(CHO.LAUNCH_MS),
    });

    const set = (p1: FxUnit, p2: FxUnit, extra: Partial<FxState> = {}) =>
      dispatchFx({ p1, p2, nonce: fx.nonce + 1, spark: null, shield: null, absorbFloat: null, dust: null, clash: false, ...extra });

    if (reduced) {
      // Reduced motion: no lunges/shake/zoom/launch/videos, keep information (banners via phase).
      dispatchFx({
        p1: IDLE_UNIT,
        p2: IDLE_UNIT,
        p1State: 'idle',
        p2State: 'idle',
        p1Var: 0,
        p2Var: 0,
        hitstop: false,
        impact: null,
        victoryChain: null,
        spark: null,
        shield: null,
        absorbFloat: null,
        dust: null,
        clash: false,
      });
      return () => clearCho();
    }

    if (lastOutcome.kind === 'clash') {
      // A clash = both fighters picked the SAME move, so both play the SAME attack STATE clip (strike
      // vs strike, throw vs throw, block vs block). The clashed move is read off the just-committed
      // history record (both picks are equal in a clash); its attack state is the exact-match key.
      const clashMove: Move | null = lastRecord?.p1 ?? null;
      const clashAtk = clashMove ? ATTACK_STATE[clashMove] : null;
      // CLIP-DRIVEN CLASH GATE (contract §1): fires ONLY when BOTH defs ship clips[attack_<move>]
      // (exact-match via clipVariants — a state counts only with >=1 take). If either lacks it, the
      // pre-clip CSS lunge clash below runs BYTE-IDENTICALLY — zero change for future clip-less chars.
      const clashUseClips =
        clashAtk != null && clipVariants(p1Def, clashAtk).length > 0 && clipVariants(p2Def, clashAtk).length > 0;

      if (clashUseClips) {
        const atk = clashAtk!;
        // §10 VARIANT LAW: each fighter picks its OWN take of the shared attack state, independently
        // and uniform-random (RG-C5). These indices feed BOTH the clash-timing math below AND the
        // dispatched p1Var/p2Var the render reads — one source of truth, so a StrictMode re-run just
        // re-picks both together (the render always reads the take the timers were scheduled from).
        const p1ClashVar = pickVariant(clipVariants(p1Def, atk).length);
        const p2ClashVar = pickVariant(clipVariants(p2Def, atk).length);
        // The shared CLASH MOMENT: each fighter's FIRST contact (contract §9 COMBO-STRING form) of ITS
        // chosen take, scaled into beat time (/CLIP_RATE). T = the LATER of the two — the frame at which
        // BOTH weapons have reached extension. Clamped into the resolve window (same guard style as
        // deriveContactTimes) so the freeze + rebound always fit before 'resolve' hands off.
        const firstContact = (d: FighterDef, vi: number): number => {
          const clip = clipVariants(d, atk)[vi];
          const raw = clip.contacts?.[0] ?? clip.contactMs ?? DEFAULT_CONTACT_MS;
          return raw / CLIP_RATE;
        };
        const latestT = Math.max(0, RESOLVE_MS - CHO.CLASH_CLIP_FREEZE_MS - CHO.RETURN_MS - 40);
        const clashT = Math.min(Math.max(firstContact(p1Def, p1ClashVar), firstContact(p2Def, p2ClashVar)), latestT);
        // Both fighters: switch to their chosen attack take (the state CHANGE restarts each from frame 0
        // via the Fighter effect) AND drive toward centre, easing to full CLASH_LUNGE_X extension exactly
        // at the clash moment (windup(clashT) matches the clip's swing-in).
        set(
          { tx: CHO.CLASH_LUNGE_X, ty: 0, rot: 0, scale: 1, transition: windup(clashT) },
          { tx: -CHO.CLASH_LUNGE_X, ty: 0, rot: 0, scale: 1, transition: windup(clashT) },
          { p1State: atk, p2State: atk, p1Var: p1ClashVar, p2Var: p2ClashVar },
        );
        at(() => {
          // CLASH MOMENT: hitstop-freeze BOTH videos at extension, fire the upgraded clash fx (flash +
          // double shock ring + spark, all keyed by this nonce), and shake. Transform held frozen.
          dispatchFx({
            clash: true,
            hitstop: true,
            p1: { tx: CHO.CLASH_LUNGE_X, ty: 0, rot: 0, scale: 1, transition: freeze },
            p2: { tx: -CHO.CLASH_LUNGE_X, ty: 0, rot: 0, scale: 1, transition: freeze },
            nonce: fx.nonce + 2,
          });
          triggerShake();
        }, clashT);
        at(() => {
          // After the freeze: CUT both back to idle (restarts idle at its anchor frame 0) and settle
          // home from the CLASH_LUNGE_X positions on SETTLE_EASE. The combo strings are NOT played out
          // — no damage happened, so post-freeze whiffing swings would read as noise. Both knocked to guard.
          dispatchFx({
            p1State: 'idle',
            p2State: 'idle',
            p1Var: 0,
            p2Var: 0,
            hitstop: false,
            p1: { tx: 0, ty: 0, rot: 0, scale: 1, transition: settle(CHO.RETURN_MS) },
            p2: { tx: 0, ty: 0, rot: 0, scale: 1, transition: settle(CHO.RETURN_MS) },
          });
        }, clashT + CHO.CLASH_CLIP_FREEZE_MS);
        return () => clearCho();
      }

      // §7.4 FALLBACK (clip-less characters): CLASH plays NO impact burst — the pre-clip CSS
      // presentation stays. Both lunge to near-centre, freeze, white radial flash + CLASH pop, rebound.
      set(
        { tx: CHO.CLASH_LUNGE_X, ty: 0, rot: 0, scale: 1, transition: windup(CHO.LUNGE_MS) },
        { tx: -CHO.CLASH_LUNGE_X, ty: 0, rot: 0, scale: 1, transition: windup(CHO.LUNGE_MS) },
      );
      at(() => {
        dispatchFx({ clash: true, nonce: fx.nonce + 2 });
        triggerShake();
      }, CHO.LUNGE_MS);
      at(() => {
        dispatchFx({
          p1: { tx: 0, ty: 0, rot: 0, scale: 1, transition: settle(CHO.RETURN_MS) },
          p2: { tx: 0, ty: 0, rot: 0, scale: 1, transition: settle(CHO.RETURN_MS) },
        });
      }, CHO.LUNGE_MS + CHO.CLASH_FREEZE_MS);
      return () => clearCho();
    }

    // hit
    const w = winnerSide as 'p1' | 'p2';
    const l = loserSide as 'p1' | 'p2';
    const move = lastOutcome.move;
    const winnerUnit = (u: FxUnit): { p1: FxUnit; p2: FxUnit } => (w === 'p1' ? { p1: u, p2: IDLE_UNIT } : { p1: IDLE_UNIT, p2: u });
    const bothUnits = (wu: FxUnit, lu: FxUnit): { p1: FxUnit; p2: FxUnit } =>
      w === 'p1' ? { p1: wu, p2: lu } : { p1: lu, p2: wu };
    // §10 VARIANT LAW: sets winner/loser states AND their chosen take indices together, mapped to the
    // p1/p2 slots the same way. State + take are ALWAYS dispatched as a pair so render and timing never
    // read a stale variant for a fresh state.
    const setStates = (wState: FighterState, lState: FighterState, wVar: number, lVar: number, extra: Partial<FxState> = {}) =>
      dispatchFx(
        w === 'p1'
          ? { p1State: wState, p1Var: wVar, p2State: lState, p2Var: lVar, ...extra }
          : { p1State: lState, p1Var: lVar, p2State: wState, p2Var: wVar, ...extra },
      );

    // Fallback ladder (contract §4): play clips only when the attacker ships attack_<move> AND
    // the defender ships hit; otherwise the pre-clip CSS choreography below runs UNCHANGED
    // (pixel-identical to today, where no character has attack clips yet).
    const atkState = ATTACK_STATE[move];
    const attackerHasClip = clipVariants(defForSide(w), atkState).length > 0;
    const defenderHasHit = clipVariants(defForSide(l), 'hit').length > 0;
    const loserHasKo = clipVariants(defForSide(l), 'ko').length > 0;
    const useClipChoreo = attackerHasClip && defenderHasHit;

    if (useClipChoreo) {
      // §11 THE SPECIAL LAW (finisher swap). On a ROUND-ENDING win, if the WINNER ships a `special`
      // signature clip (>=1 take), the attacker plays `special` in place of its normal attack state
      // — value-independent, driven purely by round state (RG-C5). It is the ONLY divergence from the
      // normal clip beat: `special` is variant-picked and its contacts/cal drive the choreography
      // EXACTLY like an attack clip (multi-contact machinery, KO hitstop on the final contact, KO
      // zoom spot, loser launch — all the round-ending behavior below reads the special clip's
      // contacts). Absent (no round end, or no special shipped) -> attackerState stays atkState, so
      // the whole path is byte-identical to the normal attack-clip beat.
      const winnerHasSpecial = roundEnding && clipVariants(defForSide(w), 'special').length > 0;
      const attackerState: FighterState = winnerHasSpecial ? 'special' : atkState;
      // VICTORY CHAIN (§1 `victory`): on a ROUND-ENDING win, if the winner ships a `victory` take,
      // arm the finisher->victory chain (dispatched WITH the attacker's state below, one source of
      // truth). The trigger is ROUND STATE only (RG-C5 — never stake / streak / value); the take is
      // Math.random only (§10). The reducer's `clipEnd` action consumes the arm when the finisher's
      // natural end fires and swaps the winner into `victory`; victory then returns to idle on its
      // own end like any one-shot. Absent (no round end, or no victory take) the arm stays null and
      // the winner returns straight to idle — byte-identical to the pre-victory beat.
      const victoryTakes = roundEnding ? clipVariants(defForSide(w), 'victory').length : 0;
      const chainArm = victoryTakes > 0 ? { side: w, varIdx: pickVariant(victoryTakes) } : null;
      // §10 VARIANT LAW: the attacker picks a uniform-random take of its played state THIS exchange
      // (RG-C5 — from Math.random only). The SAME index drives the contact/cal timing below AND the
      // dispatched p1Var/p2Var the render reads, so the beats always match the take on screen.
      const pickedAtkVar = pickVariant(clipVariants(defForSide(w), attackerState).length);
      // Attacker plays its chosen take from resolve (its normal attack, or its special finisher when
      // §11 applies); at each contact the blow lands (defender hit/ko + spark + impact burst + hitstop
      // freeze of BOTH videos). Clips return to idle on their own end (handleClipEnd); ko holds its
      // last frame off-anchor.
      const clip = clipVariants(defForSide(w), attackerState)[pickedAtkVar];
      const hitstopMs = roundEnding ? CHO.KO_HITSTOP_MS : CHO.HITSTOP_MS;
      // THE COMBO-STRING LAW (contract §9). An attack clip is a 1-3 contact STRING; each blow lands
      // at its own contact time, scaled + clamped into the resolve window (RESOLVE_HIT_MS /
      // RESOLVE_KO_MS, sized to fit the whole beat). A single-contact clip => a list of ONE => this
      // is byte-identical to the pre-combo beat. Damage stays 1 per exchange — the string is pure
      // PRESENTATION: the defender re-plays ONE universal hit clip at every contact.
      const resolveWindow = roundEnding ? RESOLVE_KO_MS : RESOLVE_HIT_MS;
      const contactList = deriveContactTimes(clip, resolveWindow, hitstopMs);
      const lastIdx = contactList.length - 1;
      // The defender's reaction state is decided ONCE, at the first contact (as the single beat did).
      // SHIELD ABSORB: the defended enemy never plays a hit reaction — no damage happened; the
      // deflection arc carries the beat while he holds his stance (idle).
      const loserState: FighterState = shieldAbsorb ? 'idle' : roundEnding && loserHasKo ? 'ko' : 'hit';
      // §10: the defender's reaction take (of whichever state it resolves to — hit, or ko when
      // round-ending) is also picked uniform-random this exchange. Single-take states force index 0.
      const pickedLoserVar = shieldAbsorb ? 0 : pickVariant(clipVariants(defForSide(l), loserState).length);
      const multi = contactList.length >= 2;
      // Attacker to its chosen take (attack or §11 special); defender stays idle (its var is 0)
      // until first contact. The victory arm rides the same dispatch (explicitly null when not
      // round-ending, so a fresh exchange can never inherit a stale arm).
      setStates(attackerState, 'idle', pickedAtkVar, 0, { victoryChain: chainArm });
      contactList.forEach((contactAt, i) => {
        const isFinal = i === lastIdx;
        at(() => {
          // Fresh fx per contact (distinct, ascending nonce). Normal hits: ring/glow/echo, with the
          // "-1" only on the final contact — three "-1"s would lie about HP (RG-C5 honesty). Shield
          // absorb: the deflection family instead (frost arc + SHIELDED on the final contact).
          const fxPatch = contactFx(w, l, isFinal);
          if (i === 0) {
            // First contact: defender switches to its chosen hit/ko take — this state CHANGE restarts
            // its clip. Attacker keeps its chosen take (pickedAtkVar) through the whole string.
            setStates(attackerState, loserState, pickedAtkVar, pickedLoserVar, {
              spark: { xPct: contactX, yPct: CAL.contactY },
              hitstop: true,
              ...fxPatch,
              nonce: fx.nonce + 3 + i,
            });
          } else {
            // Re-contact (i>=1): the defender is already in its hit clip, so bump hitRetrigger to
            // RESTART it from frame 0 mid-flow (a same-state re-set would not). No state change here.
            dispatchFx({
              spark: { xPct: contactX, yPct: CAL.contactY },
              hitstop: true,
              ...fxPatch,
              nonce: fx.nonce + 3 + i,
              hitRetrigger: fx.hitRetrigger + i,
            });
          }
          // HITS COUNTER: from the 2nd contact on, pop "N HITS" (N = blows landed). Text derives ONLY
          // from the contact index — never a stake / win value (RG-C5). Multi-contact strings only;
          // never on a shield absorb (no blows landed — the tally must not lie).
          if (multi && i >= 1 && !shieldAbsorb) setHitsCounter({ count: i + 1, key: i, leaving: false });
          // Screenshake per contact (NOT on round-ending contacts — same rule as the single beat).
          // The KO zoom spot is armed ONLY on the FINAL contact when round-ending (it is the finisher).
          if (roundEnding) {
            if (isFinal) setKoZoom({ active: false, spotX: contactX });
          } else {
            triggerShake();
          }
        }, contactAt);
        scheduleImpactClear(w, contactAt);
        at(() => dispatchFx({ hitstop: false }), contactAt + hitstopMs);
      });
      const finalAt = contactList[lastIdx];
      if (roundEnding) {
        // Launch the loser back only after the FINAL contact's hitstop (§7.5, MK juggle).
        const u = bothUnits(IDLE_UNIT, launchUnit(w));
        at(() => dispatchFx({ p1: u.p1, p2: u.p2 }), finalAt + hitstopMs);
      }
      if (multi) {
        // Hold the tally after the last contact, then fade it (functional updaters only — no side
        // effects in the updater, StrictMode-safe; mirrors the koZoom pattern).
        at(() => setHitsCounter((h) => (h ? { ...h, leaving: true } : h)), finalAt + CHO.HITS_HOLD_MS);
        at(() => setHitsCounter(null), finalAt + CHO.HITS_HOLD_MS + CHO.HITS_FADE_MS);
      }
    } else if (move === 'strike') {
      const lunge: FxUnit = { tx: sign(w) * CHO.LUNGE_X, ty: 0, rot: 0, scale: 1, transition: windup(CHO.LUNGE_MS) };
      const wu = winnerUnit(lunge);
      set(wu.p1, wu.p2);
      const hitstop = roundEnding ? CHO.KO_HITSTOP_MS : CHO.HITSTOP_MS;
      at(() => {
        // Contact: spark, impact burst, hitstop freeze, knockback + tilt, screenshake.
        const frozenW: FxUnit = { tx: sign(w) * CHO.LUNGE_X, ty: 0, rot: 0, scale: 1, transition: freeze };
        const frozenL: FxUnit = {
          tx: sign(w) * CHO.KNOCKBACK_X,
          ty: 0,
          rot: sign(w) * CHO.HURT_TILT,
          scale: 1,
          transition: freeze,
        };
        const u = bothUnits(frozenW, frozenL);
        dispatchFx({ p1: u.p1, p2: u.p2, spark: { xPct: contactX, yPct: CAL.contactY }, ...contactFx(w, l, true), nonce: fx.nonce + 3 });
        if (roundEnding) setKoZoom({ active: false, spotX: contactX });
        else triggerShake();
      }, CHO.LUNGE_MS);
      scheduleImpactClear(w, CHO.LUNGE_MS);
      at(() => {
        const wu2: FxUnit = { ...IDLE_UNIT, transition: settle(CHO.RETURN_MS) };
        // Round-ending hit: launch the loser back (§7.5); otherwise the held knockback + tilt, settled.
        const lu2: FxUnit = roundEnding
          ? launchUnit(w)
          : { tx: sign(w) * CHO.KNOCKBACK_X, ty: 0, rot: sign(w) * CHO.HURT_TILT, scale: 1, transition: settle(CHO.RETURN_MS) };
        const u = bothUnits(wu2, lu2);
        dispatchFx({ p1: u.p1, p2: u.p2, spark: null });
      }, CHO.LUNGE_MS + hitstop);
    } else if (move === 'throw') {
      const step: FxUnit = { tx: sign(w) * CHO.STEP_X, ty: 0, rot: 0, scale: 1, transition: windup(CHO.LUNGE_MS) };
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
      const slamAt = CHO.LUNGE_MS + CHO.GRAB_CYCLES * CHO.GRAB_CYCLE_MS;
      at(() => {
        // Slam dip + squash + dust + impact burst at the floor.
        const slam: FxUnit = { tx: 0, ty: CHO.SLAM_DIP_Y, rot: 0, scale: 1, transition: snappy(120) };
        const u = bothUnits(step, slam);
        dispatchFx({
          p1: u.p1,
          p2: u.p2,
          dust: { xPct: l === 'p1' ? CAL.fighterP1.cx : CAL.fighterP2.cx, yPct: CAL.shadow.y },
          ...contactFx(w, l, true),
          nonce: fx.nonce + 4,
        });
        if (roundEnding) setKoZoom({ active: false, spotX: l === 'p1' ? CAL.fighterP1.cx : CAL.fighterP2.cx });
        else triggerShake();
      }, slamAt);
      scheduleImpactClear(w, slamAt);
      at(() => {
        const end = roundEnding ? bothUnits(IDLE_UNIT, launchUnit(w)) : { p1: IDLE_UNIT, p2: IDLE_UNIT };
        dispatchFx({ p1: end.p1, p2: end.p2, dust: null });
      }, slamAt + 260);
    } else {
      // block wins over strike: attacker (loser) lunges, shield flare on winner, attacker rebounds.
      const attackerLunge: FxUnit = { tx: sign(l) * CHO.LUNGE_X, ty: 0, rot: 0, scale: 1, transition: windup(CHO.LUNGE_MS) };
      const u0 = bothUnits(IDLE_UNIT, attackerLunge);
      set(u0.p1, u0.p2);
      at(() => {
        const wx = w === 'p1' ? CAL.fighterP1.cx : CAL.fighterP2.cx;
        // Parry arc at the blocker, facing the attacker on the opposite slot (p1 blocker faces
        // right, p2 blocker faces left). It runs its own materialize->hold->dissipate lifetime.
        dispatchFx({ shield: { xPct: wx, yPct: CAL.contactY, facing: w === 'p1' ? 'right' : 'left' }, nonce: fx.nonce + 5 });
      }, CHO.LUNGE_MS);
      const counterAt = CHO.LUNGE_MS + CHO.BLOCK_TINK_MS;
      at(() => {
        // tink pause, then counter-smack knockback of the attacker + impact burst on the attacker.
        // The parry is deliberately NOT cleared here (it kept getting cut mid-materialize); it clears
        // on its own full-lifetime timer below so the arc plays its whole eased dissipate.
        const rebound: FxUnit = { tx: sign(w) * CHO.BLOCK_REBOUND_X, ty: 0, rot: sign(w) * CHO.HURT_TILT, scale: 1, transition: snappy(140) };
        const u = bothUnits(IDLE_UNIT, rebound);
        dispatchFx({ p1: u.p1, p2: u.p2, ...contactFx(w, l, true) });
        if (roundEnding) setKoZoom({ active: false, spotX: l === 'p1' ? CAL.fighterP1.cx : CAL.fighterP2.cx });
        else triggerShake();
      }, counterAt);
      scheduleImpactClear(w, counterAt);
      // Clear the parry only after its full CSS lifetime (beat ORDER unchanged: this fires last, after
      // the return beat, and is a no-op if the phase-change reset already cleared it).
      at(() => dispatchFx({ shield: null }), CHO.LUNGE_MS + CHO.BLOCK_SHIELD_MS);
      at(() => {
        const end = roundEnding ? bothUnits(IDLE_UNIT, launchUnit(w)) : { p1: IDLE_UNIT, p2: IDLE_UNIT };
        dispatchFx({ p1: end.p1, p2: end.p2 });
      }, counterAt + 260);
    }

    // KO zoom timeline (round/match-ending hit).
    if (roundEnding) {
      at(() => setKoZoom((z) => (z ? { ...z, active: true } : z)), CHO.KO_ZOOM_IN_MS);
      at(() => setKoZoom((z) => (z ? { ...z, active: false } : z)), CHO.KO_ZOOM_IN_MS + CHO.KO_ZOOM_HOLD_MS);
    }

    return () => clearCho();
    // fx.nonce intentionally excluded — snapshotted at schedule time. p1Def/p2Def are stable
    // registry refs.
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

  // ------- keyboard: character select (arrows move, Enter confirms) -------
  useEffect(() => {
    if (phase !== 'charSelect') return undefined;
    // Only SELECTABLE fighters (always-available + beaten bosses) — arrow-nav never lands on a
    // locked boss, matching the visible grid (rosterGating, gated by ctl.campaign.beaten).
    const ids = Object.keys(FIGHTERS).filter((id) => isFighterSelectable(id, ctl.campaign.beaten));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const dir = e.key === 'ArrowRight' ? 1 : -1;
        const cur = ids.indexOf(playerId);
        const nextId = ids[(cur + dir + ids.length) % ids.length];
        if (nextId !== playerId) {
          playPickTick(); // side effect kept OUT of the setState updater (StrictMode-safe)
          setPlayerId(nextId);
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        ctl.confirmFighter();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, playerId, ctl]);

  // ------- derived flags -------
  const inFight =
    phase === 'roundIntro' ||
    phase === 'fightBanner' ||
    phase === 'picking' ||
    phase === 'reveal' ||
    phase === 'resolve' ||
    phase === 'roundEnd';
  const showFighters = inFight || phase === 'vsIntro' || phase === 'matchEnd' || phase === 'stake';

  const roundWinner = matchState.roundOver; // set during resolve/roundEnd
  const matchWinner = matchState.matchOver;
  // Robustness fallback: matchEnd normally means a real engine KO (auto-play finishes a
  // disconnected match to a natural matchOver), but if the overlay ever renders at matchEnd
  // without one, the winner falls back to the settled receipt. Engine result wins when both
  // exist (they can't disagree: settle and matchOver are set together on a KO).
  const endWinner: 'p1' | 'p2' | null =
    matchWinner ?? (phase === 'matchEnd' && ctl.receipt ? (ctl.receipt.playerWon ? 'p1' : 'p2') : null);

  // Winner/loser pose classes for roundEnd + matchEnd. CAMPAIGN matchEnd derives the winner from
  // the settled receipt, NEVER from engine matchOver: on first-to-3 nodes the engine's matchOver
  // is a stale first-to-2 claim (it can even name the LOSER of the campaign match — see
  // fightCampaign.test.ts), so only the campaign verdict may drive the poses.
  const poseClass = (side: 'p1' | 'p2'): string => {
    if (phase === 'roundEnd' && roundWinner) return side === roundWinner ? 'fr-winner' : 'fr-loser';
    if (phase === 'matchEnd') {
      const w: 'p1' | 'p2' | null =
        mode === 'campaign' ? (ctl.campaignReceipt ? (ctl.campaignReceipt.met ? 'p1' : 'p2') : null) : matchWinner ?? null;
      if (w) return side === w ? 'fr-winner' : 'fr-loser';
    }
    return '';
  };

  // Match point / FINISH THEM (presentation-only, derived from matchState during picking).
  // Format-aware: fires only when a fighter is ONE round from taking the MATCH (roundsNeeded - 1)
  // and someone is one hit from losing the round. The enemy's "one hit" reads DISPLAY hp (bulk
  // defense counts as health: a buffered enemy is not on the ropes yet).
  const matchPoint =
    phase === 'picking' &&
    (matchState.p1.roundsWon === roundsNeeded - 1 || matchState.p2.roundsWon === roundsNeeded - 1) &&
    (matchState.p1.hp === 1 || p2BarHp === 1);
  const finishSpotX = matchState.p1.hp === 1 ? CAL.fighterP1.cx : CAL.fighterP2.cx;

  const timerDanger = phase === 'picking' && shotClockSeconds <= 2;

  // Banner text per phase.
  const bannerNode = useMemo(() => {
    if (phase === 'roundIntro') {
      // FINAL ROUND = the last possible round of the CURRENT format (2R-1: round 3 first-to-2,
      // round 5 first-to-3) — never the engine's fixed 3 on the campaign's longer nodes.
      const text = matchState.round >= 2 * roundsNeeded - 1 ? 'FINAL ROUND' : `ROUND ${matchState.round}`;
      return <Banner key={`round-${matchState.round}`} text={text} slamMs={150} />;
    }
    if (phase === 'fightBanner') return <Banner key="fight" text="FIGHT!" slamMs={100} />;
    if (phase === 'resolve' && lastOutcome?.kind === 'clash') return <Banner key={`clash-${fx.nonce}`} text="CLASH!" slamMs={120} />;
    if (phase === 'resolve' && matchState.roundOver) return <Banner key="ko" text="K.O." kind="danger" slamMs={140} />;
    if (phase === 'roundEnd') {
      if (matchState.flawless) return <Banner key="flawless" text="FLAWLESS" kind="gold" slamMs={150} />;
      const wn = roundWinner === 'p1' ? p1Def.name : p2Def.name;
      return <Banner key="roundwin" text={`${wn} WINS THE ROUND`} slamMs={150} />;
    }
    return null;
  }, [phase, matchState.round, matchState.roundOver, matchState.flawless, lastOutcome, roundWinner, fx.nonce, roundsNeeded]);

  const stageClasses = ['fr-stage', reduced ? 'fr-reduced' : '', koZoom ? 'fr-ko-zoom' : '', koZoom?.active ? 'fr-ko-zoom-active' : '', shake && !reduced ? 'fr-shake' : '']
    .filter(Boolean)
    .join(' ');

  const stageStyle: React.CSSProperties = {
    // The stage backdrop is the SELECTED arena's art, everywhere the stage renders (fight +
    // every screen: title, mode, char-select, stake, vsIntro, matchEnd). Changing arenaId on the
    // char-select screen switches this live.
    backgroundImage: `url(${stageBgUrl})`,
    transformOrigin: koZoom ? `${koZoom.spotX}% ${CAL.contactY}%` : 'center',
    // Phase 22b: the STAGE BOX takes the arena art's native aspect, so cover == contain and the
    // art renders UNCROPPED (Tim: "backgrounds are getting cropped when entering the map [node]").
    // The cathedral keeps its historic 2816/1536 (baked-art CAL registration unchanged); the ten
    // 2752-wide arenas stop losing ~2.3% of their sky/floor. fight.css derives width/height/
    // aspect-ratio from this var.
    ['--stage-ar' as never]: `${(effectiveArena.width / effectiveArena.height).toFixed(5)}`,
  };

  return (
    <div className="fr-viewport">
      <div ref={stageRef} className={stageClasses} style={stageStyle}>
        {/* STAGE LIVING LAYER (phase 22): the arena's ambient loop, over the still bg and under
            everything else (fighters, fx, HUD, overlays — all later in DOM). Gated OFF on the
            campaign MAP (its overlay has its OWN fr-map-video; never decode two stage videos at
            once) and under reduced motion. Keyed by arena id so a picker/node change hard-remounts
            it (no stale previous-arena frame; the fade resets). */}
        {!reduced && stageLoopUrl && phase !== 'campaignMap' && (
          <StageVideo key={effectiveArenaId} src={stageLoopUrl} />
        )}
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
            <Fighter
              def={p1Def}
              assetBase={ASSET_BASE}
              cfg={CAL.fighterP1}
              fx={fx.p1}
              poseClass={poseClass('p1')}
              activeState={fx.p1State}
              activeVar={fx.p1Var}
              paused={fx.hitstop}
              hitRetrigger={fx.hitRetrigger}
              reduced={reduced}
              mirrored={p1Mirrored}
              onClipEnd={(s, vi) => handleClipEnd('p1', s, vi)}
            />
            <Fighter
              def={p2Def}
              assetBase={ASSET_BASE}
              cfg={CAL.fighterP2}
              fx={fx.p2}
              poseClass={poseClass('p2')}
              activeState={fx.p2State}
              activeVar={fx.p2Var}
              paused={fx.hitstop}
              hitRetrigger={fx.hitRetrigger}
              reduced={reduced}
              mirrored={p2Mirrored}
              onClipEnd={(s, vi) => handleClipEnd('p2', s, vi)}
            />
          </>
        )}

        {/* §7 impact-burst overlay — above the fighters, below the banners. Nothing renders
            until a fighter ships an fx_impact clip. */}
        {inFight && <ImpactLayer p1Def={p1Def} p2Def={p2Def} assetBase={ASSET_BASE} impact={fx.impact} reduced={reduced} />}

        {/* Effects layer */}
        {inFight && (
          <div className="fr-fx-layer">
            {/* Contact fx — a soft radial glow, an expanding shockwave ring, and the damage floater
                — all DERIVED from the single impact dispatch (fires on every damage-dealing hit:
                strike/throw/block/clip, never a clash) and anchored at the defender's chest via
                impactAt. Keyed by nonce so they restart per exchange. Being CSS animations they keep
                swelling / drifting THROUGH the video hitstop freeze: the resolve moment never fully
                stops moving. Derived from impact, not spark, because spark is cleared at hitstop-end
                (it would truncate the 700ms floater) and never fires on throw/block. */}
            {fx.impact && (
              <div
                key={`iglow-${fx.nonce}`}
                className="fr-impact-glow"
                aria-hidden="true"
                style={{ left: `${fx.impact.xPct}%`, top: `${fx.impact.yPct}%`, width: 'calc(var(--sw) * 12)', height: 'calc(var(--sw) * 12)' }}
              />
            )}
            {fx.impact && (
              <div
                key={`iring-${fx.nonce}`}
                className="fr-impact-ring"
                aria-hidden="true"
                style={{ left: `${fx.impact.xPct}%`, top: `${fx.impact.yPct}%`, width: 'calc(var(--sw) * 7)', height: 'calc(var(--sw) * 7)' }}
              />
            )}
            {/* Echo ripple — a tighter second ring trailing the main one by 80ms (CSS delay), so the
                hit reads LAYERED. Same impact + nonce source as the main ring (deterministic, RG-C5). */}
            {fx.impact && (
              <div
                key={`iring2-${fx.nonce}`}
                className="fr-impact-ring-echo"
                aria-hidden="true"
                style={{ left: `${fx.impact.xPct}%`, top: `${fx.impact.yPct}%`, width: 'calc(var(--sw) * 5)', height: 'calc(var(--sw) * 5)' }}
              />
            )}
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
            {/* Damage floater: a constant "-1" (steel/HP palette). The value is FIXED by design
                (RG-C5) — identical for both sides, never scaled by hit / stake / streak. §9: on a
                combo STRING the ring/glow/echo fire at EVERY contact, but this "-1" shows ONLY on
                the final contact (impact.final) — three "-1"s would lie about HP (damage is 1). */}
            {fx.impact && fx.impact.final && (
              <div
                key={`dmg-${fx.nonce}`}
                className="fr-damage-floater"
                aria-hidden="true"
                style={{ left: `${fx.impact.xPct}%`, top: `${fx.impact.yPct - 6}%`, fontSize: 'calc(var(--sh) * 3.2)' }}
              >
                -1
              </div>
            )}
            {/* CAMPAIGN SHIELD absorb floater: "SHIELDED" where the "-1" would have been — a soaked
                hit deals no damage, so the damage floater must never show. Frost family, same drift
                animation, keyed by nonce (RG-C5: fixed text, value-independent). */}
            {fx.absorbFloat && (
              <div
                key={`absorb-${fx.nonce}`}
                className="fr-absorb-floater"
                aria-hidden="true"
                style={{ left: `${fx.absorbFloat.xPct}%`, top: `${fx.absorbFloat.yPct - 6}%`, fontSize: 'calc(var(--sh) * 2.2)' }}
              >
                SHIELDED
              </div>
            )}
            {fx.clash && (
              <div
                key={`clashfx-${fx.nonce}`}
                className="fr-clash-flash"
                style={{ width: 'calc(var(--sw) * 20)', height: 'calc(var(--sw) * 20)' }}
              />
            )}
            {/* CLASH shock ring + echo — the hit fx's frost language, but LARGER and CENTRED at the
                meeting point (same 50% / 62% anchor as .fr-clash-flash). Both CSS animations, keyed by
                nonce so they keep swelling THROUGH the clip hitstop freeze. No gold, no fire (RG-C5). */}
            {fx.clash && (
              <div
                key={`clashring-${fx.nonce}`}
                className="fr-clash-ring"
                aria-hidden="true"
                style={{ width: 'calc(var(--sw) * 16)', height: 'calc(var(--sw) * 16)' }}
              />
            )}
            {fx.clash && (
              <div
                key={`clashring2-${fx.nonce}`}
                className="fr-clash-ring-echo"
                aria-hidden="true"
                style={{ width: 'calc(var(--sw) * 11)', height: 'calc(var(--sw) * 11)' }}
              />
            )}
            {/* CLASH spark star — the glint at the meeting point (same star path as the hit spark,
                centred, frost/white). Keyed by nonce; runs through the freeze. */}
            {fx.clash && (
              <svg
                key={`clashspark-${fx.nonce}`}
                className="fr-clash-spark"
                style={{ width: 'calc(var(--sw) * 9)', height: 'calc(var(--sw) * 9)' }}
                viewBox="0 0 100 100"
                aria-hidden="true"
              >
                <path d="M50 0 L60 40 L100 50 L60 60 L50 100 L40 60 L0 50 L40 40 Z" fill="#fffbe0" stroke="#fff" strokeWidth="2" />
              </svg>
            )}
            {/* BLOCK parry — a frost ice-glass arc + deflection ripple AT the blocker, facing the
                attacker. Distinct from the HIT beat (which lands ring + echo + glow + "-1" on the
                victim). Keyed by nonce so it restarts per exchange. */}
            {fx.shield && (
              <div
                key={`shield-${fx.nonce}`}
                className={`fr-shield-parry${fx.shield.facing === 'left' ? ' fr-shield-left' : ''}`}
                aria-hidden="true"
                style={{ left: `${fx.shield.xPct}%`, top: `${fx.shield.yPct}%`, width: 'calc(var(--sw) * 11)', height: 'calc(var(--sw) * 11)' }}
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

        {/* §9 COMBO-STRING hits tally — near the stage centre-top, above the fighters. Re-keyed by
            the contact index so the eased pop re-fires per update ("2 HITS" -> "3 HITS"); fades after
            the last contact. Text is the contact COUNT only, never a stake / win value (RG-C5). */}
        {inFight && hitsCounter && (
          <div
            key={`hits-${hitsCounter.key}`}
            className={`fr-hits-counter${hitsCounter.leaving ? ' fr-hits-leaving' : ''}`}
            aria-hidden="true"
          >
            {hitsCounter.count} HITS
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
            <NamePlate name={p1Def.name} side="p1" />
            {/* Campaign: the P2 side is the NODE ENEMY (name + PFP), not the fighter clip's own
                identity (the animated body stays the fighterId clip set, VOLTA — identity layer
                only). Quick duel + friend keep the FighterDef name (unchanged). */}
            <NamePlate name={mode === 'campaign' && campaignNode ? campaignNode.enemy.name : p2Def.name} side="p2" />
            <HealthBar hp={matchState.p1.hp} side="p1" reduced={reduced} />
            {/* Enemy bar: on campaign BULK nodes the absorb buffer renders as extra segments of one
                seamless longer bar (display hp = engine hp + buffer); everywhere else this is the
                exact 3-segment bar as before. */}
            <HealthBar hp={p2BarHp} side="p2" reduced={reduced} total={p2BarTotal} />
            {/* Enemy SHIELD pips (campaign 'shield' nodes): the absorb buffer as its own resource,
                distinct in shape from HP; refills each round. */}
            {mode === 'campaign' && campaignNode?.defense?.kind === 'shield' && (
              <ShieldPips
                remaining={ctl.campaign.defenseRemaining}
                total={campaignNode.defense.amount}
                round={matchState.round}
              />
            )}
            <Pips won={matchState.p1.roundsWon} side="p1" slots={roundsNeeded} />
            <Pips won={matchState.p2.roundsWon} side="p2" slots={roundsNeeded} />
            <TimerPlate seconds={shotClockSeconds} danger={timerDanger} />
            {/* CAMPAIGN STRIP: one minimal line under the timer — the format + the price — plus the
                defense hint on defended nodes (fresh-player comprehension; the pips above carry the
                live score). Cover-plate law: an OPAQUE coal plate, own footprint, over the baked
                background. Space Grotesk copy, JetBrains Mono numbers, no em-dashes. */}
            {mode === 'campaign' && campaignNode && (
              <div className="fr-objective-strip" style={{ fontSize: 'calc(var(--sh) * 1.5)' }}>
                <span className="fr-objective-main">
                  FIRST TO {campaignNode.roundsToWin} ROUNDS · PAYS x{formatMult(campaignNode.multBps)}
                </span>
                {campaignNode.defense && <span className="fr-objective-hint">{defenseLine(campaignNode)}</span>}
              </div>
            )}
            {/* One banner slot, two states. GRACE (connectionLost): the rival's socket dropped
                and the server holds the room open — pulsing danger text. AUTO PLAY (autoPlay):
                the rival is gone for good; the match continues with the ghost's picks generated
                locally — persistent steady text. */}
            {mode === 'friend' && (friend.connectionLost || friend.autoPlay) && (
              <div
                className={`fr-connlost${friend.autoPlay ? ' fr-connlost-auto' : ''}`}
                style={{ fontSize: 'calc(var(--sh) * 1.7)' }}
              >
                {friend.autoPlay ? 'RIVAL LEFT, AUTO PLAY' : 'RIVAL CONNECTION LOST'}
              </div>
            )}
            {/* Slot ring geometry (CAL) + per-character head crop (def.portrait) — merged so the
                medallion frames each fighter's head wherever they land. */}
            <Portrait url={p1Still} cfg={{ ...CAL.portraitP1, ...p1Def.portrait }} mirrored={p1Mirrored} />
            {mode === 'campaign' && campaignNode ? (
              // Enemy PFP, cover-fit in the circular frame (the head crop belongs to the fighter
              // still, not the enemy portrait art). Not mirrored: the PFP is authored facing in.
              <Portrait
                url={`${ASSET_BASE}assets/enemies/${campaignNode.enemy.id}-pfp.webp`}
                cfg={CAL.portraitP2}
                mirrored={false}
                fit="cover"
              />
            ) : (
              <Portrait url={p2Still} cfg={{ ...CAL.portraitP2, ...p2Def.portrait }} mirrored={p2Mirrored} />
            )}
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
                    title={`${MOVE_LABEL[m]} = ${MOVE_RPS[m].name} · ${MOVE_TIP[m]}`}
                    aria-label={`${MOVE_LABEL[m]}, ${MOVE_RPS[m].name}: ${MOVE_TIP[m]}`}
                  >
                    {chosen && <span className="fr-locked-tag">LOCKED</span>}
                    <MoveIcon move={m} />
                    <span className="fr-pick-label">{MOVE_LABEL[m]}</span>
                    {/* The RPS badge: the glyph is decorative (the name next to it carries the meaning
                        for a screen reader, and the whole button's aria-label states it too). */}
                    <span className="fr-pick-rps">
                      <span className="fr-pick-rps-glyph" aria-hidden="true">{MOVE_RPS[m].glyph}</span>
                      {MOVE_RPS[m].name}
                    </span>
                    <span className="fr-pick-tip">{MOVE_TIP[m]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ---------------- Character select ---------------- */}
        {phase === 'charSelect' && (
          <div className="fr-overlay">
            <div className="fr-scrim" />
            <button
              type="button"
              className="fr-btn fr-back"
              // In campaign mode charSelect is a DETOUR off the node card, so BACK must return to the
              // run, not to mode select — that would drop the player out of the campaign entirely.
              // No stake is committed during charSelect, so there is nothing to refund either way.
              onClick={mode === 'campaign' ? ctl.backToMap : ctl.enterModeSelect}
              style={{ fontSize: 'calc(var(--sh) * 1.4)', padding: 'calc(var(--sh) * 0.6) calc(var(--sw) * 1)' }}
            >
              BACK
            </button>
            {/* Title tucked to the top-centre so it never fights the two full-body previews. */}
            <div className="fr-select-title fr-section-title" style={{ fontSize: 'calc(var(--sh) * 2.6)' }}>
              CHOOSE YOUR FIGHTER
            </div>
            {/* Left = the player's pick (p1 slot), right = the derived opponent (p2 slot) — the SAME
                p1Def/p2Def slots the whole file uses, not re-derived. Keyed by def.id: a newly
                picked character mounts fresh at the frame-0 anchor; when the pick merely swaps the
                two fighters on screen, React moves the keyed instances and both idle loops continue
                seamlessly (see SelectPreview doctrine). */}
            <SelectPreview key={p1Def.id} def={p1Def} slot="p1" assetBase={ASSET_BASE} reduced={reduced} cfg={SELECT_CAL.p1} />
            <SelectPreview key={p2Def.id} def={p2Def} slot="p2" assetBase={ASSET_BASE} reduced={reduced} cfg={SELECT_CAL.p2} />
            {/* Highlighted fighter's name, big, at the lower-left near the left preview's feet
                (MK1). left/top come from SELECT_CAL.p1 so the plate tracks the preview when tuned. */}
            <div
              className="fr-select-name"
              style={{
                left: `${SELECT_CAL.p1.cx - 15}%`,
                top: `${SELECT_CAL.p1.feetY - 2}%`,
                fontSize: 'calc(var(--sh) * 5.2)',
              }}
            >
              {p1Def.name}
            </div>
            {/* Bottom stack: the ARENA row sits directly above the roster strip. */}
            <div className="fr-select-bottom">
              {/* ARENA picker — same tile mechanics as the roster, but the pick PERSISTS
                  (localStorage) and switching it live-previews the stage backdrop behind the
                  scrim. Real arenas render a cropped 16:9 thumb; the rest are locked "?" tiles.
                  Five wide slots total. */}
              <div className="fr-arena-section">
                <span className="fr-arena-heading">ARENA</span>
                <div className="fr-arena-row">
                  {ARENAS.map((arena) => (
                    <ArenaTile
                      key={arena.id}
                      name={arena.name}
                      thumbUrl={`${ASSET_BASE}${arena.file}`}
                      selected={arena.id === arenaId}
                      onSelect={() => {
                        if (arena.id !== arenaId) {
                          playPickTick();
                          setArenaId(arena.id);
                        }
                      }}
                    />
                  ))}
                  {Array.from({ length: Math.max(0, 5 - ARENAS.length) }, (_, i) => (
                    <ArenaLockedTile key={`arena-locked-${i}`} />
                  ))}
                </div>
              </div>
              {/* Roster strip. SELECTABLE tiles FIRST (registry order — always-available fighters +
                  any boss whose campaign node is beaten; a boss is unlocked as PLAYABLE only after
                  its node falls, gated by ctl.campaign.beaten via rosterGating). Not-yet-beaten
                  bosses stay hidden inside the mystery "?" pool so the grid always totals
                  SELECT_ROSTER_SIZE (22) — no name/art leak. Two rows of 11 (see .fr-select-grid). */}
              <div className="fr-select-grid">
                {selectableFighters.map((def) => (
                  <CharacterTile
                    key={def.id}
                    def={def}
                    assetBase={ASSET_BASE}
                    selected={def.id === playerId}
                    onSelect={() => {
                      if (def.id !== playerId) {
                        playPickTick();
                        setPlayerId(def.id);
                      }
                    }}
                  />
                ))}
                {Array.from({ length: Math.max(0, SELECT_ROSTER_SIZE - selectableFighters.length) }, (_, i) => (
                  <LockedTile key={`locked-${i}`} />
                ))}
              </div>
            </div>
            <button
              type="button"
              className="fr-btn fr-select-confirm"
              onClick={ctl.confirmFighter}
              style={{ fontSize: 'calc(var(--sh) * 2.2)', padding: 'calc(var(--sh) * 0.9) calc(var(--sw) * 2.4)' }}
            >
              CONFIRM
            </button>
          </div>
        )}

        {/* ---------------- Stake screen (quick duel / friend) ---------------- */}
        {phase === 'stake' && mode !== 'campaign' && (
          <div className="fr-overlay fr-stake-overlay">
            <div className="fr-scrim fr-stake-scrim" />
            <button
              type="button"
              className="fr-btn fr-back"
              onClick={ctl.enterCharSelect}
              style={{ fontSize: 'calc(var(--sh) * 1.4)', padding: 'calc(var(--sh) * 0.6) calc(var(--sw) * 1)' }}
            >
              BACK
            </button>
            <div className="fr-stake-inner">
              <div className="fr-stake-disclosure">
                {mode === 'friend'
                  ? 'skill match · even stakes · winner takes the pot'
                  : 'skill match · win pays 1.92x · 96.0% RTP to player'}
              </div>
              <BetConsole
                theme={FR_BET_THEME}
                eyebrow="STAKE YOUR FIGHT"
                hint={
                  mode === 'friend'
                    ? 'WINNER TAKES ALL. YOUR RIVAL MATCHES YOUR STAKE.'
                    : `BEAT ${p2Def.name}. WIN PAYS 1.92x YOUR STAKE.`
                }
                wagerLabel="YOUR STAKE"
                wagerDisplay={<span>{formatUsd(ctl.stakeLamports)}</span>}
                onStepDown={() => ctl.stepStake('down')}
                onStepUp={() => ctl.stepStake('up')}
                presets={STAKE_PRESETS}
                activeWager={ctl.stakeLamports}
                onPreset={(v) => ctl.setStake(v)}
                toWin={
                  mode === 'friend'
                    ? {
                        label: 'WINNER TAKES',
                        value: formatUsd(potLamports(ctl.stakeLamports)),
                        sub: 'even stakes, 2.00x pot',
                      }
                    : {
                        label: 'WIN PAYS',
                        value: formatUsd(cpuWinPayout(ctl.stakeLamports)),
                        sub: '1.92x payout · 96.0% RTP',
                      }
                }
                balanceLabel="BANK"
                balanceValue={formatUsd(ctl.balanceLamports)}
                commitLabel={`STAKE ${formatUsd(ctl.stakeLamports)} + FIGHT`}
                onCommit={ctl.commitStake}
                commitDisabled={!ctl.canStake}
                disabledLabel="NOT ENOUGH IN BANK"
                optionsLabel="OPTIONS"
                options={
                  <div className="fr-reset-wrap">
                    <span className="fr-reset-note">Practice bank · not real funds. Restore it any time.</span>
                    <button type="button" className="fr-reset-bank" onClick={ctl.resetBank}>
                      RESET PRACTICE BANK
                    </button>
                  </div>
                }
              />
            </div>
          </div>
        )}

        {/* ---------------- Campaign node card (stake) ---------------- */}
        {phase === 'stake' && mode === 'campaign' && campaignNode && (
          <div className="fr-overlay fr-stake-overlay">
            <div className="fr-scrim fr-stake-scrim" />
            <button
              type="button"
              className="fr-btn fr-back"
              onClick={ctl.backToMap}
              style={{ fontSize: 'calc(var(--sh) * 1.4)', padding: 'calc(var(--sh) * 0.6) calc(var(--sw) * 1)' }}
            >
              BACK
            </button>
            <div className="fr-stake-inner">
              {/* NODE CARD: enemy portrait (same crop as the select tile) + title, objective line,
                  WIN CHANCE (the exact tier %, Glass Box), PAYS xN.NN. */}
              <div className="fr-nodecard">
                {/* ENEMY PORTRAIT (Tim's ruling 2026-07-22, input/darkhub.jpg): the stake screen
                    IS the confrontation - you are standing across from the enemy - so the card
                    always shows the full-colour PFP, beaten or not. The mystery silhouette tease
                    lives on the MAP only (frontier node). */}
                <div className="fr-nodecard-portrait">
                  <img
                    className="fr-nodecard-pfp"
                    src={`${ASSET_BASE}assets/enemies/${campaignNode.enemy.id}-pfp.webp`}
                    alt=""
                    draggable={false}
                  />
                </div>
                <div className="fr-nodecard-info">
                  <div className="fr-nodecard-node">
                    NODE {campaignNode.id} · {campaignNode.name}
                  </div>
                  <div className="fr-nodecard-title">{campaignNode.enemy.name}</div>
                  <div className="fr-nodecard-lore">{campaignNode.title}</div>
                  <div className="fr-nodecard-objective">WIN THE MATCH</div>
                  <div className="fr-nodecard-format">FIRST TO {campaignNode.roundsToWin} ROUNDS</div>
                  {/* Defense preview (Glass Box: the handicap is fully disclosed before staking).
                      Shield = diamond pips; bulk = a mini 3+N segment bar, visibly longer. */}
                  {campaignNode.defense && (
                    <div className="fr-nodecard-defense">
                      <span className="fr-nodecard-defense-line">{defenseLine(campaignNode)}</span>
                      {campaignNode.defense.kind === 'shield' ? (
                        <span className="fr-nodecard-defense-pips" aria-hidden="true">
                          {Array.from({ length: campaignNode.defense.amount }, (_, i) => (
                            <span key={i} className="fr-shieldpip fr-shieldpip-filled" />
                          ))}
                        </span>
                      ) : (
                        <span className="fr-nodecard-defense-bar" aria-hidden="true">
                          {Array.from({ length: 3 + campaignNode.defense.amount }, (_, i) => (
                            <span key={i} className="fr-nodecard-defense-seg" />
                          ))}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="fr-nodecard-stats">
                    <div className="fr-nodecard-stat">
                      <span className="fr-nodecard-stat-label">WIN CHANCE</span>
                      <span className="fr-nodecard-stat-value">{formatWinChance(defenseAmount(campaignNode), campaignNode.roundsToWin)}%</span>
                    </div>
                    <div className="fr-nodecard-stat">
                      <span className="fr-nodecard-stat-label">PAYS</span>
                      <span className="fr-nodecard-stat-value fr-nodecard-pays">x{formatMult(campaignNode.multBps)}</span>
                    </div>
                    {/* RETURNS — this node's actual RTP, computed from the same rationals that price
                        it (nodeRtpPercent). Added with the 4.00x payout cap, which made the return
                        vary per node (96.0% down to 9.6%): the card already disclosed WIN CHANCE and
                        PAYS honestly, but a player should not have to multiply them himself to learn
                        what a node gives back. Glass Box. */}
                    <div className="fr-nodecard-stat">
                      <span className="fr-nodecard-stat-label">RETURNS</span>
                      <span className="fr-nodecard-stat-value">{nodeRtpPercent(campaignNode)}%</span>
                    </div>
                  </div>
                  {/* YOUR FIGHTER. The campaign had NO character pick anywhere in its flow —
                      `enterCampaign` goes straight to the map and `startCampaignNode` straight to the
                      stake screen, so the run silently used whichever fighter was last confirmed in the
                      VERSUS CPU flow (default GARGOYLE SPEAR) with no way to change it. That also made
                      the playable-after-beaten unlock useless in the very mode that grants it: you beat a
                      boss, unlock them, and could only play them in a quick duel. The provider already
                      supports this — `enterCharSelect` only sets the phase and the armed campaign
                      PendingStart survives it, so CONFIRM lands right back on this card. */}
                  <div className="fr-nodecard-yours">
                    <img
                      className="fr-nodecard-yours-pfp"
                      src={`${ASSET_BASE}assets/enemies/${playerId}-pfp.webp`}
                      alt=""
                      draggable={false}
                    />
                    <span className="fr-nodecard-yours-copy">
                      <span className="fr-nodecard-yours-label">YOUR FIGHTER</span>
                      <span className="fr-nodecard-yours-name">{p1Def.name}</span>
                    </span>
                    <button
                      type="button"
                      className="fr-btn fr-nodecard-change"
                      onClick={ctl.enterCharSelect}
                      aria-label={`Change fighter. Currently ${p1Def.name}.`}
                    >
                      CHANGE
                    </button>
                  </div>
                  {/* Cosmetic bonus unlock riding on this node (never changes the payout). */}
                  {campaignNode.reward && (
                    <div className={`fr-nodecard-reward${campaignNode.reward.tier === 'gold' ? ' fr-reward-gold' : ''}`}>
                      <img src={`${ASSET_BASE}${campaignNode.reward.art}`} alt="" draggable={false} />
                      <div className="fr-nodecard-reward-copy">
                        <span className="fr-nodecard-reward-eyebrow">
                          {ctl.campaign.beaten[campaignNode.id - 1] ? 'BONUS REWARD · UNLOCKED' : 'BONUS REWARD'}
                        </span>
                        <span className="fr-nodecard-reward-label">{campaignNode.reward.label}</span>
                        <span className="fr-nodecard-reward-sub">{campaignNode.reward.sub}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <BetConsole
                theme={FR_BET_THEME}
                eyebrow="STAKE THIS NODE"
                hint="WIN THE MATCH TO GET PAID. LOSE AND THE STAKE IS GONE."
                wagerLabel="YOUR STAKE"
                wagerDisplay={<span>{formatUsd(ctl.stakeLamports)}</span>}
                onStepDown={() => ctl.stepStake('down')}
                onStepUp={() => ctl.stepStake('up')}
                presets={STAKE_PRESETS}
                activeWager={ctl.stakeLamports}
                onPreset={(v) => ctl.setStake(v)}
                toWin={{
                  label: 'PAYS ON WIN',
                  value: formatUsd(campaignPayout(ctl.stakeLamports, campaignNode.multBps)),
                  sub: `x${formatMult(campaignNode.multBps)} · win payout`,
                }}
                balanceLabel="BANK"
                balanceValue={formatUsd(ctl.balanceLamports)}
                commitLabel={`STAKE ${formatUsd(ctl.stakeLamports)} + FIGHT`}
                onCommit={ctl.commitStake}
                commitDisabled={!ctl.canStake}
                disabledLabel="NOT ENOUGH IN BANK"
                optionsLabel="OPTIONS"
                options={
                  <div className="fr-reset-wrap">
                    <span className="fr-reset-note">Practice bank · not real funds. Restore it any time.</span>
                    <button type="button" className="fr-reset-bank" onClick={ctl.resetBank}>
                      RESET PRACTICE BANK
                    </button>
                  </div>
                }
              />
            </div>
          </div>
        )}

        {/* ---------------- Non-fight screens ---------------- */}
        {phase === 'title' && (
          <button type="button" className="fr-overlay" onClick={ctl.enterModeSelect} style={{ cursor: 'pointer', background: 'none', border: 'none', color: 'inherit' }}>
            <div className="fr-scrim" />
            <div className="fr-overlay-content">
              <div className="fr-logo" style={{ fontSize: 'calc(var(--sh) * 13)' }}>
                STANDOFF
              </div>
              <div className="fr-logo-sub" style={{ fontSize: 'calc(var(--sh) * 1.7)' }}>
                STRIKE · THROW · BLOCK
              </div>
              {/* "by SWOOBZ" maker's mark — the official wordmark, subtle (fog-level). */}
              <img className="fr-title-wordmark" src={`${ASSET_BASE}assets/swoobz-logo.svg`} alt="by SWOOBZ" draggable={false} />
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
                  <div className="fr-section-title" style={{ fontSize: 'calc(var(--sh) * 3.4)', marginBottom: 'calc(var(--sh) * 1.4)' }}>
                    CHOOSE YOUR FIGHT
                  </div>
                  {/* CONQUEST MAP entry (spec §4): the staked campaign against RONIN ZERO. */}
                  <button
                    type="button"
                    className="fr-btn fr-btn-primary fr-campaign-enter"
                    onClick={ctl.enterCampaign}
                    style={{ fontSize: 'calc(var(--sh) * 2)', padding: 'calc(var(--sh) * 0.9) calc(var(--sw) * 2.4)', marginBottom: 'calc(var(--sh) * 2)' }}
                  >
                    CONQUEST MAP
                    <span className="fr-campaign-enter-sub">Ronin Zero season · unlock the island</span>
                  </button>
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
                      <div style={{ color: 'var(--fr-steel-2)', fontFamily: 'JetBrains Mono, monospace', fontSize: 'calc(var(--sh) * 1.3)' }}>
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
                      could not connect, stake refunded, try again
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ---------------- Conquest map ---------------- */}
        {phase === 'campaignMap' && (
          <div className="fr-overlay fr-map-overlay">
            <div className="fr-scrim" />
            <button
              type="button"
              className="fr-btn fr-back"
              onClick={ctl.enterModeSelect}
              style={{ fontSize: 'calc(var(--sh) * 1.4)', padding: 'calc(var(--sh) * 0.6) calc(var(--sw) * 1)' }}
            >
              BACK
            </button>
            <div className="fr-map-title fr-section-title" style={{ fontSize: 'calc(var(--sh) * 2.4)' }}>
              CONQUEST · RONIN ZERO
            </div>
            <CampaignMap
              beaten={ctl.campaign.beaten}
              frontier={ctl.campaign.frontier}
              assetBase={ASSET_BASE}
              onSelectNode={ctl.startCampaignNode}
            />
            {/* THE RUN RESET, AND THE PLAYER IS TOLD WHY. Raising the stake above the one a run was
                played at wipes it (see applyCampaignStakeLock). That used to happen SILENTLY — the
                player simply found their conquered islands fogged again with no explanation. The
                stake was refunded because the match never started, so say that too. */}
            {ctl.campaign.stakeReset && (
              <div className="fr-map-reset" role="status" style={{ fontSize: 'calc(var(--sh) * 1.5)' }}>
                RUN RESTARTED · you raised your stake above the one this run was played at, so the
                island is locked again from the first node. Your stake was not taken.
              </div>
            )}
            <div className="fr-map-rtp" style={{ fontSize: 'calc(var(--sh) * 1.3)' }}>
              {/* COMPUTED, never a literal. This used to read "returns 96% to players over time",
                  which was true only while every node sat on the 96% line. The 4.00x payout cap
                  (fightCampaign MAX_MULT_BPS) made the return per-node, so the copy is derived from
                  the same exact rationals that price the ladder and cannot go stale. */}
              nodes return {CAMPAIGN_RTP_RANGE.min}% to {CAMPAIGN_RTP_RANGE.max}% to players over time · each node shows its own · practice bank, not real funds
            </div>
            {DEV_MODE && (
              <div className="fr-map-devbar">
                <span className="fr-map-devtag">DEV</span>
                <button type="button" className="fr-btn" onClick={ctl.devConquerNext}>
                  CONQUER NEXT
                </button>
                <button type="button" className="fr-btn" onClick={ctl.devConquerAll}>
                  CONQUER ALL
                </button>
                <button type="button" className="fr-btn" onClick={ctl.devResetCampaign}>
                  RESET PROGRESS
                </button>
              </div>
            )}
          </div>
        )}

        {phase === 'vsIntro' && (
          <div className="fr-overlay">
            <div className="fr-scrim" />
            <div className="fr-overlay-content">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'calc(var(--sw) * 2)' }}>
                <div className="fr-nameplate fr-nameplate-p1" style={{ position: 'relative', fontSize: 'calc(var(--sh) * 3.4)', padding: '0 calc(var(--sw) * 1.4)', height: 'calc(var(--sh) * 6)' }}>
                  <span className="fr-nameplate-face" aria-hidden="true" />
                  <span className="fr-nameplate-name">{p1Def.name}</span>
                </div>
                <div className="fr-banner" style={{ fontSize: 'calc(var(--sh) * 12)' }}>VS</div>
                <div className="fr-nameplate fr-nameplate-p2" style={{ position: 'relative', fontSize: 'calc(var(--sh) * 3.4)', padding: '0 calc(var(--sw) * 1.4)', height: 'calc(var(--sh) * 6)' }}>
                  <span className="fr-nameplate-face" aria-hidden="true" />
                  <span className="fr-nameplate-name">
                    {mode === 'campaign' && campaignNode
                      ? campaignNode.enemy.name
                      : mode === 'cpu'
                        ? PERSONALITIES.find((p) => p.key === aiPersonality)?.name ?? p2Def.name
                        : p2Def.name}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {phase === 'matchEnd' && mode !== 'campaign' && endWinner && (
          <div className="fr-overlay">
            <div className="fr-scrim" />
            <div className="fr-overlay-content" style={{ gap: 'calc(var(--sh) * 2)' }}>
              <div className="fr-banner fr-banner-gold" style={{ fontSize: 'calc(var(--sh) * 11)' }}>
                {(endWinner === 'p1' ? p1Def : p2Def).name} WINS
              </div>
              {mode === 'friend' && friend.autoPlay && (
                <div className="fr-autoplay-note" style={{ fontSize: 'calc(var(--sh) * 1.7)' }}>
                  rival disconnected, auto play finished the match
                </div>
              )}
              {ctl.receipt && (
                <div className={`fr-receipt${ctl.receipt.playerWon ? ' fr-receipt-win' : ' fr-receipt-loss'}`}>
                  <div className="fr-receipt-title">MATCH RECEIPT</div>
                  <div className="fr-receipt-rows">
                    <div className="fr-receipt-row">
                      <span>YOUR STAKE</span>
                      <b>{formatUsd(ctl.receipt.stakeLamports)}</b>
                    </div>
                    {ctl.receipt.duelMode === 'friend' ? (
                      <>
                        <div className="fr-receipt-row">
                          <span>RIVAL STAKE</span>
                          <b>{formatUsd(ctl.receipt.opponentStakeLamports)}</b>
                        </div>
                        <div className="fr-receipt-row">
                          <span>POT</span>
                          <b>{formatUsd(ctl.receipt.potLamports)}</b>
                        </div>
                      </>
                    ) : (
                      <div className="fr-receipt-row">
                        <span>WIN PAYS</span>
                        <b>{formatUsd(cpuWinPayout(ctl.receipt.stakeLamports))}</b>
                      </div>
                    )}
                    <div className="fr-receipt-row fr-receipt-result">
                      <span>RESULT</span>
                      <b className={ctl.receipt.playerWon ? 'fr-receipt-victory' : 'fr-receipt-defeat'}>
                        {ctl.receipt.playerWon ? 'VICTORY' : 'DEFEAT'}
                      </b>
                    </div>
                    <div className="fr-receipt-row">
                      <span>PAYOUT</span>
                      <b>{formatUsd(ctl.receipt.payoutLamports)}</b>
                    </div>
                    <div className="fr-receipt-row">
                      <span>BANK</span>
                      <b>{formatUsd(ctl.receipt.balanceAfterLamports)}</b>
                    </div>
                  </div>
                </div>
              )}
              <div className="fr-victory-quote" style={{ fontSize: 'calc(var(--sh) * 2) ' }}>
                {(matchWinner === 'p1' ? p1Def : p2Def).quotes[quoteIndex]}
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
                  onClick={ctl.changeFighter}
                  style={{ fontSize: 'calc(var(--sh) * 2)', padding: 'calc(var(--sh) * 0.9) calc(var(--sw) * 1.8)' }}
                >
                  CHARACTER SELECT
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

        {/* ---------------- Campaign receipt ---------------- */}
        {phase === 'matchEnd' && mode === 'campaign' && ctl.campaignReceipt && (
          <div className="fr-overlay">
            <div className="fr-scrim" />
            <div className="fr-overlay-content" style={{ gap: 'calc(var(--sh) * 1.8)' }}>
              {/* Value-INDEPENDENT celebration (RG-C5): identical banner for x1.92 and x39.95. */}
              <div
                className={`fr-banner ${ctl.campaignReceipt.met ? 'fr-banner-gold' : 'fr-banner-danger'}`}
                style={{ fontSize: 'calc(var(--sh) * 8.5)' }}
              >
                {ctl.campaignReceipt.met ? 'VICTORY' : 'DEFEAT'}
              </div>
              <div className="fr-campaign-node-line" style={{ fontSize: 'calc(var(--sh) * 2)' }}>
                NODE {ctl.campaignReceipt.nodeId} · {ctl.campaignReceipt.nodeName}
              </div>
              {/* Cosmetic unlock card on a MET objective (demo cross-game reward). Identical
                  choreography for every tier and every stake (RG-C5 value-independence). */}
              {ctl.campaignReceipt.met && getCampaignNode(ctl.campaignReceipt.nodeId)?.reward && (() => {
                const reward = getCampaignNode(ctl.campaignReceipt.nodeId)!.reward!;
                return (
                  <div className={`fr-reward-card${reward.tier === 'gold' ? ' fr-reward-gold' : ''}`}>
                    <div className="fr-reward-card-art">
                      <img src={`${ASSET_BASE}${reward.art}`} alt="" draggable={false} />
                      <div className="fr-reward-shine" aria-hidden="true" />
                    </div>
                    <div className="fr-reward-card-copy">
                      <span className="fr-reward-card-eyebrow">REWARD UNLOCKED</span>
                      <span className="fr-reward-card-label">{reward.label}</span>
                      <span className="fr-reward-card-sub">{reward.sub}</span>
                    </div>
                  </div>
                );
              })()}
              <div className={`fr-receipt${ctl.campaignReceipt.met ? ' fr-receipt-win' : ' fr-receipt-loss'}`}>
                <div className="fr-receipt-title">{ctl.campaignReceipt.objective}</div>
                <div className="fr-receipt-rows">
                  <div className="fr-receipt-row">
                    <span>YOUR STAKE</span>
                    <b>{formatUsd(ctl.campaignReceipt.stakeLamports)}</b>
                  </div>
                  <div className="fr-receipt-row">
                    <span>MULTIPLIER</span>
                    <b>x{formatMult(ctl.campaignReceipt.multBps)}</b>
                  </div>
                  <div className="fr-receipt-row fr-receipt-result">
                    <span>RESULT</span>
                    <b className={ctl.campaignReceipt.met ? 'fr-receipt-victory' : 'fr-receipt-defeat'}>
                      {ctl.campaignReceipt.met ? 'VICTORY' : 'DEFEAT'}
                    </b>
                  </div>
                  <div className="fr-receipt-row">
                    <span>PAYOUT</span>
                    <b>{formatUsd(ctl.campaignReceipt.payoutLamports)}</b>
                  </div>
                  <div className="fr-receipt-row">
                    <span>NET</span>
                    <b>{formatUsd(ctl.campaignReceipt.netLamports)}</b>
                  </div>
                  <div className="fr-receipt-row">
                    <span>BANK</span>
                    <b>{formatUsd(ctl.campaignReceipt.balanceAfterLamports)}</b>
                  </div>
                </div>
              </div>
              <div className="fr-menu" style={{ marginTop: 'calc(var(--sh) * 1)' }}>
                {ctl.campaignReceipt.met && ctl.campaignReceipt.nodeId < CAMPAIGN_NODE_COUNT && (
                  <button
                    type="button"
                    className="fr-btn fr-btn-primary"
                    autoFocus
                    onClick={ctl.nextNode}
                    style={{ fontSize: 'calc(var(--sh) * 2)', padding: 'calc(var(--sh) * 0.9) calc(var(--sw) * 1.8)' }}
                  >
                    NEXT NODE
                  </button>
                )}
                <button
                  type="button"
                  className={`fr-btn${ctl.campaignReceipt.met ? '' : ' fr-btn-primary'}`}
                  autoFocus={!ctl.campaignReceipt.met}
                  onClick={ctl.retryNode}
                  style={{ fontSize: 'calc(var(--sh) * 2)', padding: 'calc(var(--sh) * 0.9) calc(var(--sw) * 1.8)' }}
                >
                  RETRY
                </button>
                <button
                  type="button"
                  className="fr-btn"
                  onClick={ctl.backToMap}
                  style={{ fontSize: 'calc(var(--sh) * 2)', padding: 'calc(var(--sh) * 0.9) calc(var(--sw) * 1.8)' }}
                >
                  MAP
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quiet SWOOBZ maker's-mark — the official wordmark SVG, DOM-level, corner,
          low-opacity. Decorative chrome, not interactive. */}
      <img className="fr-wordmark" src={`${ASSET_BASE}assets/swoobz-logo.svg`} alt="SWOOBZ" aria-hidden="true" draggable={false} />


      {/* Page-fixed PLAY SAFE pill (bottom-right, >=44px touch target). No-op
          href for this mockup — it never navigates. */}
      <a
        className="fr-playsafe"
        href="#"
        onClick={(e) => e.preventDefault()}
        aria-label="Play safe. Even stakes, winner takes the pot. This is a practice bank, not real funds."
      >
        PLAY SAFE
      </a>
    </div>
  );
}
