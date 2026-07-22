// Arena registry — the selectable fight backgrounds. Mirrors the character registry pattern
// (data, not code): a new arena is a new ARENAS entry + its art file, zero edits elsewhere.
// The chosen arena lives in the EXPERIENCE (like playerId), persisted to localStorage — the
// provider stays identity-agnostic and never learns which arena is picked. `file` is relative
// to import.meta.env.BASE_URL, resolved in the Experience (same convention as FighterClip.url).

export interface ArenaDef {
  id: string;
  name: string;
  file: string;
}

// The cathedral stays FIRST (the default fallback arena, with its baked HUD chrome). Phase 21
// added Tim's 10 clean per-node RONIN ZERO arenas (input/characters/background/map 1..10 ->
// scripts/prep-arenas.mjs -> assets/arenas/<id>.webp, 2752x1536 q85, NO baked HUD). Each is the
// campaign node's fight background (fightCampaign.ts CampaignNodeDef.arenaId) and is also
// selectable for quick duel in the ARENA picker. The mystery slots on the select screen are drawn
// by the UI (locked '?' tiles), not listed here.
export const ARENAS: ArenaDef[] = [
  { id: 'cathedral', name: 'FROZEN CATHEDRAL', file: 'assets/background.png' },
  { id: 'docks', name: 'LANTERN JETTY', file: 'assets/arenas/docks.webp' },
  { id: 'torii', name: 'ASH GARDEN COURT', file: 'assets/arenas/torii.webp' },
  { id: 'bamboo', name: 'BAMBOO STREAM', file: 'assets/arenas/bamboo.webp' },
  { id: 'snowfang', name: 'TORCHLIT PASS', file: 'assets/arenas/snowfang.webp' },
  { id: 'kawa', name: 'RIVERBANK FORD', file: 'assets/arenas/kawa.webp' },
  { id: 'shrine', name: 'HOLLOW BELL COURT', file: 'assets/arenas/shrine.webp' },
  { id: 'pagoda', name: 'EMBER PAGODA', file: 'assets/arenas/pagoda.webp' },
  { id: 'gorge', name: 'RED MIST BASIN', file: 'assets/arenas/gorge.webp' },
  { id: 'moat', name: 'MOAT BRIDGE', file: 'assets/arenas/moat.webp' },
  { id: 'sanctum', name: 'SCARLET SANCTUM', file: 'assets/arenas/sanctum.webp' },
];

/** Resolve an arena by id, falling back to the first entry (never throws — an unknown/absent
 *  stored id must degrade to the default arena, not break the stage). */
export function getArena(id: string): ArenaDef {
  return ARENAS.find((a) => a.id === id) ?? ARENAS[0];
}
