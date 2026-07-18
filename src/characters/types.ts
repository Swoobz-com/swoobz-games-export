// The fixed animation-state vocabulary and the FighterDef shape that makes characters
// SWAPPABLE (CHARACTER-CONTRACT.md §4). The engine + choreography speak only these state
// names; every character ships the same states with their OWN acting, keyed off a manifest.
// A typo'd state name is a COMPILE error because everything indexes the FighterState union,
// never a bare string.

// §1 state vocabulary. `idle` is the hub; `attack_*`/`hit` drive the exchange beats; `ko`
// and `victory` are optional. CLASH needs no clip (both play their attack clip).
export type FighterState =
  | 'idle'
  | 'attack_strike'
  | 'attack_throw'
  | 'attack_block'
  | 'hit'
  | 'ko'
  | 'victory';

/** Percent placement of a clip inside the square fighter box (of the box's own size), chosen
 *  so the clip's ANCHOR frame lands pixel-on-pixel over the still. EMITTED as JSON by
 *  scripts/key-idle-clips.mjs — never hand-derived (contract §4). */
export interface ClipCal {
  h: number; // clip height as % of the box height
  bottom: number; // clip bottom offset as % of the box height
  left: number; // clip horizontal centre as % of the box width (element is translateX(-50%))
}

export interface FighterClip {
  url: string; // asset path, relative to import.meta.env.BASE_URL (resolved in the Experience)
  cal: ClipCal;
  contactMs?: number; // attack clips: when the blow lands, in CLIP time (pre-CLIP_RATE)
}

/** Attacker-owned emissive impact burst (contract §7). NOT a body state — it is an additive
 *  overlay on PURE BLACK, composited with mix-blend-mode: screen at the defender's contact
 *  point. No alpha, no cal. Absent = no burst (the existing hit flash still fires). */
export interface FighterFxImpact {
  url: string;
  durationMs: number;
}

export interface FighterDef {
  id: string;
  name: string;
  still: string; // anchor-pose PNG (the ultimate fallback, always shipped)
  side: 'left' | 'right'; // which slot the character occupies
  /** Which way the ART looks (judge the HEAD at full res - a body can stance one way while
   *  the head glances the other; the head is what reads). The left slot must face right and
   *  the right slot must face left; when `faces` disagrees with the slot, the game mirrors
   *  the fighter and its portrait (scaleX(-1)), classic fighting-game style. Clips inherit
   *  the art's facing, so they mirror with it - but directional ACTING in a mirrored
   *  character's clips must be prompted in ART space (opposite of screen space). */
  faces: 'left' | 'right';
  clips: Partial<Record<FighterState, FighterClip>>;
  quotes: string[]; // win-screen lines, in character
  fxImpact?: FighterFxImpact; // §7 impact burst; optional, filled when the clip is generated
}
