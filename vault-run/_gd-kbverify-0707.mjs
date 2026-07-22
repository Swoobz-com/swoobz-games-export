// Keyboard-operability holdgate driver for VaultGridCanvas.
// Tab into the grid -> Arrow keys move cursor -> Enter reveals a tile via
// the SAME handler a click uses. Screenshots the visible focus ring.
import puppeteer from 'puppeteer-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT_DIR = 'C:/Users/Erstr/AppData/Local/Temp/claude/C--Users-Erstr-OneDrive-Bureaublad-swoobz-games-export/ae0f5ec2-dc4c-47ea-a2ca-1ea3484743ef/scratchpad';

const log = (...a) => console.log(...a);

async function clickText(page, text, withinSelector) {
  const handle = await page.evaluateHandle(
    (txt, within) => {
      const root = within ? document.querySelector(within) : document;
      if (!root) return null;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
      let node = walker.currentNode;
      while (node) {
        if (node.textContent && node.textContent.trim() === txt && node.children.length === 0) return node;
        node = walker.nextNode();
      }
      return null;
    },
    text,
    withinSelector,
  );
  const el = handle.asElement();
  if (!el) return false;
  await el.click();
  return true;
}

async function main() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:5301/', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 800));

  // Drive: bet-entry -> playing. Find and click the CTA (SEND IT / whatever
  // is on-screen) enough times to get into 'playing' phase.
  const results = {};

  const getPhaseInfo = () =>
    page.evaluate(() => {
      const canvas = document.querySelector('[data-testid="vault-grid-canvas"]');
      return {
        ariaLabel: canvas ? canvas.getAttribute('aria-label') : null,
        role: canvas ? canvas.getAttribute('role') : null,
        tabIndex: canvas ? canvas.tabIndex : null,
        rowcount: canvas ? canvas.getAttribute('aria-rowcount') : null,
      };
    });

  results.initialCanvasAttrs = await getPhaseInfo();
  log('Initial canvas attrs:', JSON.stringify(results.initialCanvasAttrs));

  // Real (trusted) mouse click on the CTA -- the button uses pointer
  // handlers, so a synthetic DOM .click() does not trigger it; a genuine
  // Puppeteer mouse click does.
  try {
    await page.click('[data-testid="vault-ctl-cta"]');
    log('Clicked [data-testid="vault-ctl-cta"] (real mouse click)');
    await new Promise((r) => setTimeout(r, 800));
  } catch (e) {
    log('CTA click failed:', e.message);
  }

  results.afterCtaCanvasAttrs = await getPhaseInfo();
  log('After-CTA canvas attrs:', JSON.stringify(results.afterCtaCanvasAttrs));

  // Read the current revealed-tile count via the status testid (per prior
  // agents' convention) if present, else fall back to reading revealed via
  // a custom marker we don't have -- use the aria-activedescendant / cell
  // labels themselves as ground truth.
  const readStatus = () =>
    page.evaluate(() => {
      const el = document.querySelector('[data-testid="vault-grid-status"]');
      return el ? el.textContent : null;
    });

  results.statusBeforeReveal = await readStatus();
  log('Status before reveal:', results.statusBeforeReveal);

  // ---- KEYBOARD DRIVE ----
  // 1. Tab from body until the grid canvas has focus (single tab stop).
  await page.evaluate(() => document.body.focus());
  let focusedIsGrid = false;
  let tabPresses = 0;
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab');
    tabPresses++;
    const info = await page.evaluate(() => {
      const active = document.activeElement;
      return {
        isCanvas: active && active.getAttribute && active.getAttribute('data-testid') === 'vault-grid-canvas',
        tag: active ? active.tagName : null,
        testid: active ? active.getAttribute('data-testid') : null,
      };
    });
    if (info.isCanvas) {
      focusedIsGrid = true;
      break;
    }
  }
  results.tabPressesToReachGrid = tabPresses;
  results.focusedIsGrid = focusedIsGrid;
  log('Tab presses to reach grid:', tabPresses, 'focused:', focusedIsGrid);

  // 2. Confirm aria-activedescendant appears once focused (cursor defaults to tile 0).
  const activeDescAfterFocus = await page.evaluate(() => {
    const c = document.querySelector('[data-testid="vault-grid-canvas"]');
    return c ? c.getAttribute('aria-activedescendant') : null;
  });
  results.activeDescAfterFocus = activeDescAfterFocus;
  log('aria-activedescendant after focus:', activeDescAfterFocus);

  // Screenshot #1: focus ring on default tile (index 0).
  await page.screenshot({ path: `${OUT_DIR}/focus-ring-initial.png` });

  // 3. Move with arrow keys: Right, Right, Down -> should land on a
  //    different tile than the default.
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowDown');
  await new Promise((r) => setTimeout(r, 150));
  const activeDescAfterArrows = await page.evaluate(() => {
    const c = document.querySelector('[data-testid="vault-grid-canvas"]');
    return c ? c.getAttribute('aria-activedescendant') : null;
  });
  results.activeDescAfterArrows = activeDescAfterArrows;
  log('aria-activedescendant after 2xRight+1xDown:', activeDescAfterArrows);

  await page.screenshot({ path: `${OUT_DIR}/focus-ring-after-arrows.png` });

  // 4. Verify clamping: press ArrowUp many times, ArrowLeft many times ->
  //    should clamp at tile 0 (top-left), never throw / never go negative.
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowLeft');
  }
  const activeDescAfterClamp = await page.evaluate(() => {
    const c = document.querySelector('[data-testid="vault-grid-canvas"]');
    return c ? c.getAttribute('aria-activedescendant') : null;
  });
  results.activeDescAfterClamp = activeDescAfterClamp;
  log('aria-activedescendant after clamp-to-corner:', activeDescAfterClamp);

  // Move to a known tile deterministically for the reveal test: Right, Right -> tile index 2 (row 0).
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  const activeDescBeforeReveal = await page.evaluate(() => {
    const c = document.querySelector('[data-testid="vault-grid-canvas"]');
    return c ? c.getAttribute('aria-activedescendant') : null;
  });
  results.activeDescBeforeReveal = activeDescBeforeReveal;
  log('cursor before reveal:', activeDescBeforeReveal);

  const cellLabelBefore = await page.evaluate((id) => {
    const el = document.getElementById(id);
    return el ? el.getAttribute('aria-label') : null;
  }, activeDescBeforeReveal);
  results.cellLabelBeforeReveal = cellLabelBefore;
  log('cell label before reveal:', cellLabelBefore);

  // 5. Press Enter -> should reveal via the SAME activateTile() the click
  //    handler uses. Confirm via the status text delta + the cell's own
  //    accessible-name flipping to "revealed, safe" (or ending the round).
  await page.keyboard.press('Enter');
  await new Promise((r) => setTimeout(r, 400));

  const statusAfterReveal = await readStatus();
  results.statusAfterReveal = statusAfterReveal;
  log('Status after Enter reveal:', statusAfterReveal);

  const cellLabelAfter = await page.evaluate((id) => {
    const el = document.getElementById(id);
    return el ? el.getAttribute('aria-label') : null;
  }, activeDescBeforeReveal);
  results.cellLabelAfterReveal = cellLabelAfter;
  log('cell label after reveal:', cellLabelAfter);

  await page.screenshot({ path: `${OUT_DIR}/focus-ring-after-reveal.png` });

  // 6. Space should ALSO reveal (same handler) -- move right, press Space.
  await page.keyboard.press('ArrowRight');
  const activeDescBeforeSpace = await page.evaluate(() => {
    const c = document.querySelector('[data-testid="vault-grid-canvas"]');
    return c ? c.getAttribute('aria-activedescendant') : null;
  });
  const cellLabelBeforeSpace = await page.evaluate((id) => {
    const el = document.getElementById(id);
    return el ? el.getAttribute('aria-label') : null;
  }, activeDescBeforeSpace);
  await page.keyboard.press(' ');
  await new Promise((r) => setTimeout(r, 400));
  const cellLabelAfterSpace = await page.evaluate((id) => {
    const el = document.getElementById(id);
    return el ? el.getAttribute('aria-label') : null;
  }, activeDescBeforeSpace);
  results.cellLabelBeforeSpace = cellLabelBeforeSpace;
  results.cellLabelAfterSpace = cellLabelAfterSpace;
  log('cell label before Space:', cellLabelBeforeSpace, ' after Space:', cellLabelAfterSpace);

  // 7. Tab again -> focus should leave the grid (single tab stop, no trap).
  await page.keyboard.press('Tab');
  const activeAfterSecondTab = await page.evaluate(() => {
    const active = document.activeElement;
    return {
      isCanvas: active && active.getAttribute && active.getAttribute('data-testid') === 'vault-grid-canvas',
      tag: active ? active.tagName : null,
    };
  });
  results.activeAfterSecondTab = activeAfterSecondTab;
  log('Focus after second Tab (should have left the grid):', JSON.stringify(activeAfterSecondTab));

  // Zoomed crop around the cursor tile for a clear focus-ring screenshot.
  const canvasBox = await page.evaluate(() => {
    const c = document.querySelector('[data-testid="vault-grid-canvas"]');
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  });
  results.canvasBox = canvasBox;

  console.log('\n=== RESULTS ===');
  console.log(JSON.stringify(results, null, 2));

  await browser.close();
}

main().catch((e) => {
  console.error('DRIVER ERROR', e);
  process.exit(1);
});
