import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CAMPAIGN_NODES, CAMPAIGN_NODE_COUNT } from './fightCampaign';

// Repo root, resolved from this file (src/engine/ -> ../../).
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ENEMY_DIR = join(ROOT, 'public', 'assets', 'enemies');

// Phase 20: every CONQUEST-MAP node names a real keyed enemy whose cutout + PFP webp exist on disk.
// (The fight VISUALS still ride fighterId=VOLTA; enemy.id drives the map/nodecard reveal art.)
describe('phase-20 enemy roster', () => {
  it('has all 10 nodes wired to an enemy', () => {
    expect(CAMPAIGN_NODES).toHaveLength(10);
    expect(CAMPAIGN_NODE_COUNT).toBe(10);
  });

  it('every node carries a kebab-case unique enemy id and a non-empty name', () => {
    const kebab = /^[a-z0-9]+(-[a-z0-9]+)*$/;
    const ids = new Set<string>();
    for (const node of CAMPAIGN_NODES) {
      expect(node.enemy, `node ${node.id} enemy`).toBeDefined();
      expect(node.enemy.id, `node ${node.id} id`).toMatch(kebab);
      expect(node.enemy.name.trim().length, `node ${node.id} name`).toBeGreaterThan(0);
      expect(ids.has(node.enemy.id), `duplicate id ${node.enemy.id}`).toBe(false);
      ids.add(node.enemy.id);
    }
    expect(ids.size).toBe(10);
  });

  it('every enemy cutout and PFP webp exists on disk', () => {
    for (const node of CAMPAIGN_NODES) {
      const cutout = join(ENEMY_DIR, `${node.enemy.id}.webp`);
      const pfp = join(ENEMY_DIR, `${node.enemy.id}-pfp.webp`);
      expect(existsSync(cutout), cutout).toBe(true);
      expect(existsSync(pfp), pfp).toBe(true);
    }
  });
});
