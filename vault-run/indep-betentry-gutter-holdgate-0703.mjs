// INDEPENDENT holdgate driver for the "remove BetEntry bottom-bar console on
// desktop, relocate into transparent gutter cards" structural change to
// Rug or Riches (slug `vault`). Written FRESH by swoobz-visual-regression-qa
// — deliberately NOT based on (or reusing any code from) the maker's own
// `betentry-gutter-verify.mjs`. Selectors, the board-rect re-derivation, and
// the cyan probe are all independently authored.
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5196';
const BASE = `http://localhost:${PORT}/`;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const SHOTS = path.join(process.cwd(), 'shots');
fs.mkdirSync(SHOTS, { recursive: true });

// ---- independent DOM helpers (own selectors, own logic) -------------------

async function clickButtonContaining(page, needle) {
  const handle = await page.evaluateHandle((needle) => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const lower = needle.toLowerCase();
    return buttons.find(
      (b) => b.offsetParent !== null && b.textContent.trim().toLowerCase().includes(lower)
    ) || null;
  }, needle);
  const el = handle.asElement();
  if (!el) throw new Error(`Button containing "${needle}" not found`);
  await el.click();
}

// (a) Independent "bottom panel is empty" check. Selector strategy: derive
// the panel node STRUCTURALLY (next sibling of the vault-canvas-shell node,
// per VaultExperience.tsx's cabinetStyle column: boardStyle div then panel
// div) rather than trusting `[aria-live="polite"]` (there are 5 of those in
// the tree; the maker's driver also happened to rely on document order
// matching the first one — cross-checked here, not copied).
async function bottomPanelState(page) {
  return page.evaluate(() => {
    const shell = document.querySelector('[data-testid="vault-canvas-shell"]');
    const panelByStructure = shell ? shell.nextElementSibling : null;
    const panelByAriaLive = document.querySelector('[aria-live="polite"]');
    const sameNode = panelByStructure === panelByAriaLive;
    const target = panelByStructure;
    return {
      shellFound: !!shell,
      sameNodeCrossCheck: sameNode,
      panelFound: !!target,
      childElementCount: target ? target.childElementCount : null,
      innerHTMLLength: target ? target.innerHTML.length : null,
      textContentLength: target ? target.textContent.length : null,
      hasSetYourPlay: document.body.textContent.includes('SET YOUR PLAY'),
      betConsoleNodes: document.querySelectorAll('[data-testid="bet-console"]').length,
    };
  });
}

function rectAndStyle(sel) {
  const el = document.querySelector(sel);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  return {
    top: r.top,
    left: r.left,
    right: r.right,
    bottom: r.bottom,
    width: r.width,
    height: r.height,
    backdropFilter: cs.backdropFilter,
    backgroundImage: cs.backgroundImage,
  };
}

// (c) Independent re-derivation of computeGridLayout (VaultGridCanvas.tsx
// L842-863), transcribed straight from source (NOT the maker's approximated
// gridEdges helper). Because `full === available` always (tile = (available
// - gap*(n-1))/n  =>  full = tile*n + gap*(n-1) = available - gap*(n-1) +
// gap*(n-1) = available exactly), gridSize cancels out of x, so the board's
// left/right edges do not depend on gridSize at all.
function computeGridLayoutEdges(W, H) {
  const wide = W / H > 1.2;
  const topReserved = H * (wide ? 0.12 : 0.15);
  const bottomReserved = H * (wide ? 0.14 : 0.18);
  const sideFrac = 0.08;
  const safeW = W * (1 - sideFrac * 2);
  const safeH = (H - topReserved - bottomReserved) * 0.96;
  const available = Math.min(safeW, safeH);
  const full = available; // proven equal above
  const x = (W - full) / 2;
  return { boardLeftLocal: x, boardRightLocal: x + full, full };
}

async function boardEdgesPage(page) {
  return page.evaluate(
    ([fnSrc]) => {
      // eslint-disable-next-line no-new-func
      const fn = new Function(`return (${fnSrc})`)();
      const shell = document.querySelector('[data-testid="vault-canvas-shell"]');
      const r = shell.getBoundingClientRect();
      const { boardLeftLocal, boardRightLocal, full } = fn(r.width, r.height);
      return {
        shellLeft: r.left,
        shellWidth: r.width,
        shellHeight: r.height,
        boardLeftPage: r.left + boardLeftLocal,
        boardRightPage: r.left + boardRightLocal,
        full,
      };
    },
    [computeGridLayoutEdges.toString()]
  );
}

// (d) overflow probe — own, page-level.
async function overflowProbe(page) {
  return page.evaluate(() => ({
    docScrollWidth: document.documentElement.scrollWidth,
    docClientWidth: document.documentElement.clientWidth,
    bodyScrollWidth: document.body.scrollWidth,
    bodyClientWidth: document.body.clientWidth,
  }));
}

// (g) independent cyan probe — computed against volt #00F0FF reference (own
// hue-distance rule, not the maker's rgb-band heuristic). Flags any element
// whose color/backgroundColor/borderColor is within a tight distance of
// #00F0FF OR the deleted #00D0DE, EXCLUDING the header tape's own game-green
// (RoR's own accent has no cyan per its header comment) unless found there.
function hex(n) {
  return n.toString(16).padStart(2, '0');
}
async function cyanProbe(page) {
  return page.evaluate(() => {
    const VOLT = [0x00, 0xf0, 0xff];
    const DELETED = [0x00, 0xd0, 0xde];
    function dist(a, b) {
      return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
    }
    const hits = [];
    const all = document.querySelectorAll('body *');
    for (const el of all) {
      const cs = getComputedStyle(el);
      for (const prop of ['color', 'backgroundColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor']) {
        const v = cs[prop];
        const m = v && v.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
        if (!m) continue;
        const alpha = m[4] !== undefined ? +m[4] : 1;
        if (alpha < 0.15) continue; // ignore near-invisible tints
        const rgb = [+m[1], +m[2], +m[3]];
        if (dist(rgb, VOLT) < 60 || dist(rgb, DELETED) < 60) {
          hits.push({
            tag: el.tagName,
            testid: el.getAttribute ? el.getAttribute('data-testid') : null,
            prop,
            value: v,
          });
        }
      }
    }
    return hits;
  });
}

async function sessionPulsePresence(page) {
  return page.evaluate(() => ({
    cardA: document.querySelectorAll('[data-testid="vault-gutter-card-a"]').length,
    cardAright: document.querySelectorAll('[data-testid="vault-gutter-card-a-right"]').length,
    gutterLeft: document.querySelectorAll('[data-testid="vault-gutter-left"]').length,
    gutterRight: document.querySelectorAll('[data-testid="vault-gutter-right"]').length,
  }));
}

async function gotoAndReachBetEntry(browser, w, h, dpr = 1) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: dpr });
  await page.goto(BASE, { waitUntil: 'networkidle0' });
  await page.reload({ waitUntil: 'networkidle0' });
  await wait(500);
  return page;
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const R = {};

  const viewports = [
    { key: '1440x900', w: 1440, h: 900 },
    { key: '1440x1920', w: 1440, h: 1920 },
    { key: '1920x1080', w: 1920, h: 1080 },
  ];

  // ---- (g) regression check: lobby session-pulse Card A present BEFORE we
  // ever touch bet-entry, at 1440x900 ----
  {
    const page = await gotoAndReachBetEntry(browser, 1440, 900);
    R.lobby_sessionPulse_1440 = await sessionPulsePresence(page);
    R.lobby_cyan_1440 = await cyanProbe(page);
    await page.close();
  }

  for (const vp of viewports) {
    const page = await gotoAndReachBetEntry(browser, vp.w, vp.h);
    await clickButtonContaining(page, 'ape in');
    await wait(700);

    const panel = await bottomPanelState(page);
    const yourbet = await page.evaluate(rectAndStyle, '[data-testid="vault-betentry-yourbet"]');
    const confirm = await page.evaluate(rectAndStyle, '[data-testid="vault-betentry-confirm"]');
    const world = await page.evaluate(rectAndStyle, '[data-testid="vault-betentry-world"]');
    const edges = await boardEdgesPage(page);
    const overflow = await overflowProbe(page);
    const cyan = await cyanProbe(page);
    const pulseDuringBetEntry = await sessionPulsePresence(page);

    R[vp.key] = { panel, yourbet, confirm, world, edges, overflow, cyanHits: cyan, pulseDuringBetEntry };

    // Full-page crop for review
    await page.screenshot({ path: path.join(SHOTS, `indep-betentry-${vp.key}-full.png`) });
    // Wide crop spanning left card stack -> a chunk into the board (see-through proof)
    if (yourbet && confirm) {
      const left = Math.max(0, Math.min(yourbet.left, confirm.left) - 40);
      const top = Math.max(0, Math.min(yourbet.top, confirm.top) - 40);
      const right = Math.min(vp.w, Math.max(yourbet.right, confirm.right) + 260);
      const bottom = Math.min(vp.h, Math.max(yourbet.bottom, confirm.bottom) + 40);
      await page.screenshot({
        path: path.join(SHOTS, `indep-betentry-${vp.key}-left-wide.png`),
        clip: { x: Math.round(left), y: Math.round(top), width: Math.round(right - left), height: Math.round(bottom - top) },
      });
    }
    if (world) {
      const left = Math.max(0, world.left - 260);
      const top = Math.max(0, world.top - 40);
      const right = Math.min(vp.w, world.right + 40);
      const bottom = Math.min(vp.h, world.bottom + 40);
      await page.screenshot({
        path: path.join(SHOTS, `indep-betentry-${vp.key}-right-wide.png`),
        clip: { x: Math.round(left), y: Math.round(top), width: Math.round(right - left), height: Math.round(bottom - top) },
      });
    }

    await page.close();
  }

  // ---- mobile 390x844 ----
  {
    const page = await gotoAndReachBetEntry(browser, 390, 844, 2);
    await clickButtonContaining(page, 'ape in');
    await wait(700);
    const mobile = await page.evaluate(() => ({
      hasSetYourPlay: document.body.textContent.includes('SET YOUR PLAY'),
      betConsoleNodes: document.querySelectorAll('[data-testid="bet-console"]').length,
      yourbetGutter: document.querySelectorAll('[data-testid="vault-betentry-yourbet"]').length,
      confirmGutter: document.querySelectorAll('[data-testid="vault-betentry-confirm"]').length,
      worldGutter: document.querySelectorAll('[data-testid="vault-betentry-world"]').length,
    }));
    const overflow = await overflowProbe(page);
    R['390x844'] = { mobile, overflow };
    await page.screenshot({ path: path.join(SHOTS, 'indep-betentry-390x844-full.png'), fullPage: true });
    await page.close();
  }

  // ---- (h) source hygiene: MY OWN grep, own regex, distinguishing real code
  // occurrences from comment mentions (the maker's own driver's naive regex
  // conflated the two — see run notes). ----
  const srcPath = path.join(process.cwd(), '..', 'originals', 'vault', 'VaultExperience.tsx');
  const src = fs.readFileSync(srcPath, 'utf8');
  const lines = src.split(/\r?\n/);
  const codeOccurrences400 = [];
  const commentOccurrences400 = [];
  lines.forEach((line, i) => {
    if (/topOffset:\s*400/.test(line)) {
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('*')) {
        commentOccurrences400.push(i + 1);
      } else {
        codeOccurrences400.push(i + 1);
      }
    }
  });
  R.grep_topOffset_400_codeLines = codeOccurrences400;
  R.grep_topOffset_400_commentLines = commentOccurrences400;
  R.grep_GUTTER_maxWidth_200_count = (src.match(/maxWidth:\s*200\b/g) || []).length;
  R.grep_gutterCard_reuse_count = (src.match(/styles\.gutterCard\b/g) || []).length;
  R.grep_betentryGutterLeftStack_count = (src.match(/betentryGutterLeftStack/g) || []).length;
  R.grep_betentryGutterRightStack_count = (src.match(/betentryGutterRightStack/g) || []).length;
  R.grep_BETENTRY_GUTTER_topOffset_72_count = (src.match(/topOffset:\s*72\b/g) || []).length;

  await browser.close();
  fs.writeFileSync(path.join(process.cwd(), 'indep-betentry-gutter-results.json'), JSON.stringify(R, null, 2));
  console.log(JSON.stringify(R, null, 2));
})();
