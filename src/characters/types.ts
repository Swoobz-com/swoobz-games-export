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
  /** THE COMBO-STRING LAW (contract §1/§9): an attack clip is a 1-3 contact STRING (one clip,
   *  multiple blows). `contacts` are the blow-landing times, in CLIP time ms (pre-CLIP_RATE),
   *  ASCENDING, each measured off the QA sheet EXACTLY like `contactMs` (never guessed). When
   *  present, `contacts` SUPERSEDES `contactMs`; `contactMs` stays as the single-contact form, so
   *  existing manifests are unchanged. Damage is still 1 per exchange — the string is PRESENTATION
   *  (the defender re-plays one universal hit clip at every contact; the "-1" shows once). */
  contacts?: number[];
}

/** Attacker-owned emissive impact burst (contract §7). NOT a body state — it is an additive
 *  overlay on PURE BLACK, composited with mix-blend-mode: screen at the defender's contact
 *  point. No alpha, no cal. Absent = no burst (the existing hit flash still fires). */
export interface FighterFxImpact {
  url: string;
  durationMs: number;
}

/** Per-character head-crop for the round-HUD medallions AND the character-select tiles.
 *  headX/headY = the head centre as a fraction of the still PNG (0..1); zoom = how far to
 *  enlarge the PNG inside the frame so the head fills it. The SAME numbers drive both the
 *  circular medallion and the select-tile bust, so they travel with the character to whichever
 *  slot it lands in. Slot-specific ring geometry (cx/cy/r) is NOT here — it lives per-slot in
 *  the Experience CAL block, because it is a stage position, not a character property. */
export interface FighterPortrait {
  headX: number;
  headY: number;
  zoom: number;
}

export interface FighterDef {
  id: string;
  name: string;
  still: string; // anchor-pose PNG (the ultimate fallback, always shipped)
  /** Which way the ART looks (judge the HEAD at full res - a body can stance one way while
   *  the head glances the other; the head is what reads). SLOT/side is a RUNTIME assignment,
   *  NOT a character property: the player's pick is always the left slot, the opponent the
   *  right, for any character combination. Whichever slot a fighter lands in, the left slot
   *  must face right and the right slot must face left; when `faces` disagrees with the slot,
   *  the game mirrors the fighter and its portrait (scaleX(-1)), classic fighting-game style.
   *  Clips inherit the art's facing, so they mirror with it - but directional ACTING in a
   *  mirrored character's clips must be prompted in ART space (opposite of screen space). */
  faces: 'left' | 'right';
  portrait: FighterPortrait; // head-crop params for HUD medallions + select tiles
  clips: Partial<Record<FighterState, FighterClip>>;
  quotes: string[]; // win-screen lines, in character
  fxImpact?: FighterFxImpact; // §7 impact burst; optional, filled when the clip is generated
}
