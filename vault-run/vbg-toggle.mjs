// Toggle VaultExperience.tsx + BetConsole.tsx between the PRE-VBG state and
// the POST-VBG (fixed) state via exact string swaps, so we can capture a
// genuine "before" screenshot for a change already made (no .git in this
// export — see AGENT_MEMORY precedent). Usage: node vbg-toggle.mjs before|after
import fs from 'fs';

const VAULT_PATH = '../originals/vault/VaultExperience.tsx';
const CONSOLE_PATH = '../originals/_shared/BetConsole/BetConsole.tsx';

const mode = process.argv[2];
if (mode !== 'before' && mode !== 'after') {
  console.error('usage: node vbg-toggle.mjs before|after');
  process.exit(1);
}

// Each pair is [OLD (pre-VBG), NEW (post-VBG / current on-disk after our edits)].
const vaultPairs = [
  [
    `  danger: T.danger,
  radius: 12,
}

// Designed hero sprite for the loss "moment to live" (the rug-pull).`,
    `  danger: T.danger,
  radius: 12,
}

// VAULT BOTTOM-BAR GRAMMAR (VBG) — the ONE shared composition system every
// isWide bottom-bar phase (Lobby / Playing / Settled) + the BetEntry
// BetConsole \`columns\` branch draws from, so the four phases read as ONE
// instrument, not four ad-hoc layouts (2026-07-03 definitive composition
// pass). barPadding/gap are the outer row's padding + inter-column gutter;
// divider is the hairline drawn on the TRAILING edge of every non-last
// column; dividerInset (= gap / 2) is the padding that centers that
// hairline inside the gutter. BetConsole.tsx CANNOT import this (shared
// file, no vault import) — it hardcodes the identical literals with a
// comment cross-referencing VBG.
const VBG = {
  barPadding: '22px 32px 26px',
  gap: 32,
  divider: '1px solid rgba(255,255,255,0.07)',
  dividerInset: 16, // = gap / 2, hairline centered in the gutter
} as const

// Designed hero sprite for the loss "moment to live" (the rug-pull).`,
  ],
  [
    `  controlCard: {
    position: 'relative',
    background: 'linear-gradient(180deg, rgba(14, 18, 25, 0.82) 0%, rgba(8, 11, 16, 0.9) 100%)',
    border: 'none',
    borderRadius: 18,
    padding: '16px 18px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    // BOTTOM-BAR PIVOT (2026-07-03): \`flex: 1\` (fill the sidebar to board
    // height) is REMOVED — this is now a full-width bar under the board,
    // sized to its own content on every viewport. See the Lobby() render's
    // isWide column layout (lobbyHero / pulseColumn / lobbyCtaColumn) for
    // the desktop composition.
    justifyContent: 'flex-start',
    backdropFilter: 'blur(18px)',
    WebkitBackdropFilter: 'blur(18px)',
    boxShadow: '0 26px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.04)',
    animation: 'vault-card-enter 260ms cubic-bezier(0.2, 0.8, 0.2, 1) both',
  },`,
    `  controlCard: {
    position: 'relative',
    // VBG STEEL SURFACE MIGRATION (2026-07-03) — the Lobby bottom bar was
    // still on the old translucent-glass material (semi-transparent
    // gradient + backdropFilter blur) while Playing/Settled had already
    // moved to the opaque steel-plinth surface (settledPanel/actionBar).
    // Matching it here is what makes all 4 phases read as ONE instrument
    // (VBG axis — Material & Lighting Cohesion).
    background: 'linear-gradient(180deg, #1B2330 0%, #090F18 100%)',
    borderTop: '1px solid rgba(255, 197, 61, 0.32)',
    borderLeft: '1px solid rgba(255,255,255,0.05)',
    borderRight: '1px solid rgba(255,255,255,0.05)',
    borderBottom: 'none',
    borderRadius: '12px 12px 0 0',
    padding: '16px 18px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    // BOTTOM-BAR PIVOT (2026-07-03): \`flex: 1\` (fill the sidebar to board
    // height) is REMOVED — this is now a full-width bar under the board,
    // sized to its own content on every viewport. See the Lobby() render's
    // isWide column layout (lobbyHero / pulseColumn / lobbyCtaColumn) for
    // the desktop composition.
    justifyContent: 'flex-start',
    boxShadow: '0 -12px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,197,61,0.10)',
    animation: 'vault-card-enter 260ms cubic-bezier(0.2, 0.8, 0.2, 1) both',
  },`,
  ],
  [
    `  const controlCardStyle: CSSProperties = {
    ...styles.controlCard,
    ...(isWide ? { flexDirection: 'row', alignItems: 'stretch', padding: '22px 32px 26px', gap: 0 } : null),
  }
  const lobbyHeroStyle: CSSProperties = {
    ...styles.lobbyHero,
    ...(isWide ? { flex: '1.6 1 0%', minWidth: 0, justifyContent: 'center' } : null),
  }`,
    `  const controlCardStyle: CSSProperties = {
    ...styles.controlCard,
    ...(isWide ? { flexDirection: 'row', alignItems: 'stretch', padding: VBG.barPadding, gap: VBG.gap } : null),
  }
  const lobbyHeroStyle: CSSProperties = {
    ...styles.lobbyHero,
    // VBG col1 — top-aligned (no justifyContent:'center'; \`alignItems:
    // 'stretch'\` on the outer row is what keeps every divider full-height —
    // do NOT change that), trailing hairline on the gutter edge (VBG divider
    // grammar: col1 + col2 bordered, last column clean).
    ...(isWide
      ? { flex: '1.6 1 0%', minWidth: 0, borderRight: VBG.divider, paddingRight: VBG.dividerInset }
      : null),
  }`,
  ],
  [
    `  const actionBarStyle: CSSProperties = {
    ...styles.actionBar,
    ...(isWide ? { flexDirection: 'row', alignItems: 'stretch', padding: '22px 32px 26px', gap: 0 } : null),
  }
  const actionBarLeftStyle: CSSProperties = {
    ...styles.actionBarLeft,
    ...(isWide ? { flex: '1.3 1 0%', minWidth: 0 } : null),
  }
  const actionBarRightStyle: CSSProperties = {
    ...styles.actionBarRight,
    ...(isWide
      ? {
          flex: '1.2 1 0%',
          minWidth: 0,
          justifyContent: 'center',
          borderLeft: '1px solid rgba(255,255,255,0.07)',
          paddingLeft: 28,
        }
      : null),
  }`,
    `  const actionBarStyle: CSSProperties = {
    ...styles.actionBar,
    ...(isWide ? { flexDirection: 'row', alignItems: 'stretch', padding: VBG.barPadding, gap: VBG.gap } : null),
  }
  const actionBarLeftStyle: CSSProperties = {
    ...styles.actionBarLeft,
    // VBG col1 — top-aligned, trailing hairline (see Lobby's \`lobbyHeroStyle\`
    // comment for the shared divider grammar).
    ...(isWide
      ? { flex: '1.3 1 0%', minWidth: 0, borderRight: VBG.divider, paddingRight: VBG.dividerInset }
      : null),
  }
  const actionBarRightStyle: CSSProperties = {
    ...styles.actionBarRight,
    // VBG col3 (LAST) — top-aligned, no border (only col1/col2 carry the
    // trailing hairline in the VBG grammar).
    ...(isWide ? { flex: '1.2 1 0%', minWidth: 0 } : null),
  }`,
  ],
  [
    `  const settledPanelStyle: CSSProperties = {
    ...styles.settledPanel,
    ...(isWide ? { flexDirection: 'row', alignItems: 'stretch', padding: '22px 32px 26px', gap: 0 } : null),
  }
  const resultTierStyle: CSSProperties = {
    ...styles.settledResult,
    ...(isWide ? { flex: '1.4 1 0%', minWidth: 0 } : null),
  }`,
    `  const settledPanelStyle: CSSProperties = {
    ...styles.settledPanel,
    ...(isWide ? { flexDirection: 'row', alignItems: 'stretch', padding: VBG.barPadding, gap: VBG.gap } : null),
  }
  const resultTierStyle: CSSProperties = {
    ...styles.settledResult,
    // VBG col1 — top-aligned, trailing hairline (shared divider grammar,
    // see Lobby's \`lobbyHeroStyle\` comment).
    ...(isWide
      ? { flex: '1.4 1 0%', minWidth: 0, borderRight: VBG.divider, paddingRight: VBG.dividerInset }
      : null),
  }`,
  ],
  [
    `  pulseColumn: {
    flex: '1 1 0%',
    minWidth: 0,
    borderLeft: '1px solid rgba(255,255,255,0.07)',
    paddingLeft: 28,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  // Mirrors \`pulseColumn\`'s border/padding — the fixed-width CTA column that
  // closes the Lobby's 3-column bottom bar (title | session pulse | ape in).
  lobbyCtaColumn: {
    flex: '0 0 240px',
    borderLeft: '1px solid rgba(255,255,255,0.07)',
    paddingLeft: 28,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },`,
    `  // VBG col2 — top-aligned, trailing hairline on the gutter edge (divider
  // FLIPPED from the pre-VBG borderLeft to borderRight so col1+col2 share the
  // same "hairline on my trailing edge" rule; the LAST column of each row
  // carries no border at all — see \`lobbyCtaColumn\` / \`actionBarRight\` /
  // \`settledColNext\`).
  pulseColumn: {
    flex: '1 1 0%',
    minWidth: 0,
    borderRight: '1px solid rgba(255,255,255,0.07)', // VBG.divider
    paddingRight: 16, // VBG.dividerInset
    display: 'flex',
    flexDirection: 'column',
  },
  // VBG col3 (LAST) — the fixed-width CTA column that closes the Lobby's
  // 3-column bottom bar (title | session pulse | ape in). No trailing
  // border (last column in the VBG grammar); top-aligned (no
  // justifyContent:'center') but keeps \`alignItems:'center'\` to horizontally
  // center the CTA button within its own fixed-width column.
  lobbyCtaColumn: {
    flex: '0 0 240px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },`,
  ],
  [
    `  settledColMeta: {
    flex: '1 1 0%',
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 0,
    borderLeft: '1px solid rgba(255,255,255,0.07)',
    paddingLeft: 28,
  },
  settledColNext: {
    flex: '1.15 1 0%',
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    justifyContent: 'center',
    borderLeft: '1px solid rgba(255,255,255,0.07)',
    paddingLeft: 28,
  },`,
    `  // VBG col2 — top-aligned, trailing hairline (see \`pulseColumn\`'s comment —
  // same flipped-to-borderRight divider grammar).
  settledColMeta: {
    flex: '1 1 0%',
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    borderRight: '1px solid rgba(255,255,255,0.07)', // VBG.divider
    paddingRight: 16, // VBG.dividerInset
  },
  // VBG col3 (LAST) — top-aligned, no trailing border (last column in the
  // VBG grammar carries no divider).
  settledColNext: {
    flex: '1.15 1 0%',
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },`,
  ],
];

const consolePairs = [
  [
    `            <div style={s.columnSlot}>
              {/* Game-specific choices (world select, auto-cashout, gear …). */}
              {children && <div style={s.slot}>{children}</div>}
            </div>

            <div style={s.columnToWin}>
              {/* TO WIN — the clarity line: what you're playing for, before you commit. */}
              {toWin && (
                <div style={s.toWin}>
                  <span style={s.toWinLabel}>{toWin.label}</span>
                  <span style={s.toWinValue}>{toWin.value}</span>
                  {toWin.sub && <span style={s.toWinSub}>{toWin.sub}</span>}
                </div>
              )}
            </div>
          </div>`,
    `            <div style={s.columnSlot}>
              {/* Game-specific choices (world select, auto-cashout, gear …). */}
              {children && <div style={s.slot}>{children}</div>}
              {/* TO WIN REGROUP (2026-07-03, VBG Finding #4) — the clarity line
                  used to live in its own 3rd column (\`columnToWin\`), where a
                  flex-column with no alignItems defaulted to \`stretch\` and
                  ballooned the pill to the full column width, reading as a
                  hollow floating card centered far-right. It's now a SIBLING
                  block under the world-pick cards inside the SAME column
                  (\`columnSlot\`, now the LAST column) — grouped under what it's
                  the payoff FOR, and \`alignSelf:'flex-start'\` on the element
                  itself (NOT on columnSlot, which must keep default stretch
                  for the world-card grid) keeps the pill content-sized. */}
              {toWin && (
                <div style={{ ...s.toWin, alignSelf: 'flex-start' }}>
                  <span style={s.toWinLabel}>{toWin.label}</span>
                  <span style={s.toWinValue}>{toWin.value}</span>
                  {toWin.sub && <span style={s.toWinSub}>{toWin.sub}</span>}
                </div>
              )}
            </div>
          </div>`,
  ],
  [
    `    columnsRow: { display: 'flex', width: '100%', alignItems: 'stretch' },
    columnWager: {
      display: 'flex',
      flexDirection: 'column',
      flex: '1 1 0%',
      minWidth: 0,
      justifyContent: 'center',
    },
    columnSlot: {
      display: 'flex',
      flexDirection: 'column',
      flex: '2 1 0%',
      minWidth: 0,
      justifyContent: 'center',
      borderLeft: '1px solid rgba(255,255,255,0.07)',
      paddingLeft: 28,
    },
    columnToWin: {
      display: 'flex',
      flexDirection: 'column',
      flex: '1 1 0%',
      minWidth: 0,
      justifyContent: 'center',
      // Unlike col1/col2 (whose content — the wager stepper, the mode
      // cards — wants to fill the column), col3's content is a single
      // compact info pill. Left-align instead of the flex default
      // stretch so the pill stays content-sized (fixes the wide-gap
      // "empty column" read at 1920+ residual flagged 2026-07-03 — the
      // pill was stretching to the full column width, then
      // \`toWinSub\`'s marginLeft:'auto' shoved the sub far right).
      alignItems: 'flex-start',
      borderLeft: '1px solid rgba(255,255,255,0.07)',
      paddingLeft: 28,
    },`,
    `    // gap:32 == vault's \`VBG.gap\` (VaultExperience.tsx) — this file cannot
    // import that shared const (BetConsole has no vault import), so the
    // literal is hardcoded here; keep it numerically identical if VBG ever
    // changes. This is what makes the BetEntry columns row match the
    // gutter width of the other 3 bottom-bar phases (2026-07-03 VBG pass).
    columnsRow: { display: 'flex', width: '100%', alignItems: 'stretch', gap: 32 },
    // VBG col1 — top-aligned (no justifyContent:'center'; \`alignItems:
    // 'stretch'\` on columnsRow keeps the divider full-height). Trailing
    // hairline == VBG.divider/dividerInset hardcoded (see columnsRow comment).
    columnWager: {
      display: 'flex',
      flexDirection: 'column',
      flex: '1 1 0%',
      minWidth: 0,
      borderRight: '1px solid rgba(255,255,255,0.07)', // == VBG.divider
      paddingRight: 16, // == VBG.dividerInset
    },
    // VBG col2 (LAST) — wager 1 | (world cards -> RUGS tuner -> TO WIN) 2.4.
    // TO WIN REGROUP (2026-07-03, Finding #4): the world-pick cards
    // (\`children\`/\`s.slot\`) and the TO WIN pill are now SIBLINGS inside this
    // one column (see the JSX below) instead of TO WIN owning its own 3rd
    // column — gap:12 seats them as a related group. This is now the LAST
    // column of the row, so it carries NO trailing border (VBG grammar:
    // only non-last columns get the divider). No justifyContent:'center'
    // (top-align); default \`stretch\` cross-axis is kept (NOT \`alignItems\`
    // here) so the world-card grid still fills the column width — the
    // TO WIN pill opts OUT of stretch individually via its own
    // \`alignSelf:'flex-start'\` (see JSX), not by fighting this column's
    // cross-axis default.
    columnSlot: {
      display: 'flex',
      flexDirection: 'column',
      flex: '2.4 1 0%',
      minWidth: 0,
      gap: 12,
    },`,
  ],
];

function apply(path, pairs, toMode) {
  let content = fs.readFileSync(path, 'utf8');
  for (const [oldS, newS] of pairs) {
    const from = toMode === 'before' ? newS : oldS;
    const to = toMode === 'before' ? oldS : newS;
    if (!content.includes(from)) {
      console.error(`MISS in ${path}: could not find expected "${toMode === 'before' ? 'NEW' : 'OLD'}" block (len ${from.length})`);
      process.exit(2);
    }
    content = content.split(from).join(to);
  }
  fs.writeFileSync(path, content, 'utf8');
}

apply(VAULT_PATH, vaultPairs, mode);
apply(CONSOLE_PATH, consolePairs, mode);
console.log(`toggled to: ${mode}`);
