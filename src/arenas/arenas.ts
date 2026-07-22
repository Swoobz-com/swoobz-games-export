// Arena registry — the selectable fight backgrounds. Mirrors the character registry pattern
// (data, not code): a new arena is a new ARENAS entry + its art file, zero edits elsewhere.
// The chosen arena lives in the EXPERIENCE (like playerId), persisted to localStorage — the
// provider stays identity-agnostic and never learns which arena is picked. `file` is relative
// to import.meta.env.BASE_URL, resolved in the Experience (same convention as FighterClip.url).

export interface ArenaDef {
  id: string;
  name: string;
  file: string;
  // Optional ambient video loop (phase 22): `assets/arenas/<id>-loop.mp4`, a 4.5s seamless h264
  // loop of the SAME framing as `file`, layered UNDER the fight as a living background (the still
  // stays as poster/fallback). Data, not code: an arena without a loop simply renders its still.
  // The cathedral (baked-HUD default) stays loop-less.
  loop?: string;
  /** Native pixel size of `file` (phase 22b). The STAGE BOX takes this aspect so the art shows
   *  UNCROPPED (cover == contain when box aspect == art aspect). Tim's report "backgrounds are
   *  getting cropped when entering the map [node]": the box was hard-coded to the cathedral's
   *  2816/1536, silently cover-cropping the 2752-wide arenas ~2.3% vertically. CAL percentages
   *  keep working: they target the BOX, and only the cathedral has baked geometry to register
   *  against (its aspect is unchanged). */
  width: number;
  height: number;
}

// The cathedral stays FIRST (the default fallback arena, with its baked HUD chrome). Phase 21
// added Tim's 10 clean per-node RONIN ZERO arenas (input/characters/background/map 1..10 ->
// scripts/prep-arenas.mjs -> assets/arenas/<id>.webp, 2752x1536 q85, NO baked HUD). Each is the
// campaign node's fight background (fightCampaign.ts CampaignNodeDef.arenaId) and is also
// selectable for quick duel in the ARENA picker. The mystery slots on the select screen are drawn
// by the UI (locked '?' tiles), not listed here.
export const ARENAS: ArenaDef[] = [
  { id: 'cathedral', name: 'FROZEN CATHEDRAL', file: 'assets/background.png', width: 2816, height: 1536 },
  { id: 'docks', name: 'LANTERN JETTY', file: 'assets/arenas/docks.webp', loop: 'assets/arenas/docks-loop.mp4', width: 2752, height: 1536 },
  { id: 'torii', name: 'ASH GARDEN COURT', file: 'assets/arenas/torii.webp', loop: 'assets/arenas/torii-loop.mp4', width: 2752, height: 1536 },
  { id: 'bamboo', name: 'BAMBOO STREAM', file: 'assets/arenas/bamboo.webp', loop: 'assets/arenas/bamboo-loop.mp4', width: 2752, height: 1536 },
  { id: 'snowfang', name: 'TORCHLIT PASS', file: 'assets/arenas/snowfang.webp', loop: 'assets/arenas/snowfang-loop.mp4', width: 2752, height: 1536 },
  { id: 'kawa', name: 'RIVERBANK FORD', file: 'assets/arenas/kawa.webp', loop: 'assets/arenas/kawa-loop.mp4', width: 2752, height: 1536 },
  { id: 'shrine', name: 'HOLLOW BELL COURT', file: 'assets/arenas/shrine.webp', loop: 'assets/arenas/shrine-loop.mp4', width: 2752, height: 1536 },
  { id: 'pagoda', name: 'EMBER PAGODA', file: 'assets/arenas/pagoda.webp', loop: 'assets/arenas/pagoda-loop.mp4', width: 2752, height: 1536 },
  { id: 'gorge', name: 'RED MIST BASIN', file: 'assets/arenas/gorge.webp', loop: 'assets/arenas/gorge-loop.mp4', width: 2752, height: 1536 },
  { id: 'moat', name: 'MOAT BRIDGE', file: 'assets/arenas/moat.webp', loop: 'assets/arenas/moat-loop.mp4', width: 2752, height: 1536 },
  { id: 'sanctum', name: 'SCARLET SANCTUM', file: 'assets/arenas/sanctum.webp', loop: 'assets/arenas/sanctum-loop.mp4', width: 2752, height: 1536 },
];

/** Resolve an arena by id, falling back to the first entry (never throws — an unknown/absent
 *  stored id must degrade to the default arena, not break the stage). */
export function getArena(id: string): ArenaDef {
  return ARENAS.find((a) => a.id === id) ?? ARENAS[0];
}
