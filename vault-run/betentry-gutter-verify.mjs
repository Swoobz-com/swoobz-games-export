// Self-verification for the BETENTRY GUTTER REWORK (2026-07-03+1): the whole
// BetEntry bottom-bar console is removed on desktop and relocated into
// transparent gutter cards (BetEntryGutterCards), using the SAME GLASS/
// GLASS_CTA + BETENTRY_GUTTER anchor technique as the session-pulse gutter
// cards. Mirrors the structure of gutter-mirror-verify.mjs (prior round's
// driver, kept as the template) but targets the NEW testids.
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5190';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button]')];
    return (
      els.find((e) => e.offsetParent !== null && e.textContent.trim().toLowerCase() === t.toLowerCase()) ||
      els.find((e) => e.offsetParent !== null && e.textContent.toLowerCase().includes(t.toLowerCase()))
    );
  }, t);
  const el = h.asElement();
  if (!el) return false;
  await el.click();
  return true;
}

async function clickTextWithin(page, selector, t) {
  const h = await page.evaluateHandle(({ selector, t }) => {
    const root = document.querySelector(selector);
    if (!root) return null;
    const els = [...root.querySelectorAll('button')];
    return (
      els.find((e) => e.offsetParent !== null && e.textContent.trim().toLowerCase() === t.toLowerCase()) ||
      els.find((e) => e.offsetParent !== null && e.textContent.toLowerCase().includes(t.toLowerCase()))
    );
  }, { selector, t });
  const el = h.asElement();
  if (!el) return false;
  await el.click();
  return true;
}

function rectOf(sel) {
  const el = document.querySelector(sel);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  return {
    top: r.top, left: r.left, right: r.right, bottom: r.bottom,
    width: r.width, height: r.height,
    backdropFilter: cs.backdropFilter,
    backgroundImage: cs.backgroundImage,
    backgroundColor: cs.backgroundColor,
    borderColor: cs.borderColor,
  };
}

async function gridEdges(page) {
  return await page.evaluate(() => {
    const shell = document.querySelector('[data-testid="vault-canvas-shell"]');
    if (!shell) return null;
    const r = shell.getBoundingClientRect();
    const W = r.width, H = r.height;
    const wide = W / H > 1.2;
    const top = wide ? H * 0.12 : H * 0.15;
    const bottom = wide ? H * 0.14 : H * 0.18;
    const safeW = W * 0.84;
    const safeH = (H - top - bottom) * 0.96;
    const available = Math.min(safeW, safeH);
    const gridLeft = r.left + (W - available) / 2;
    const gridRight = r.left + W - (W - available) / 2;
    return { gridLeft, gridRight };
  });
}

async function panelEmptyCheck(page) {
  return await page.evaluate(() => {
    const panel = document.querySelector('[aria-live="polite"]');
    if (!panel) return { panelFound: false };
    return {
      panelFound: true,
      childElementCount: panel.childElementCount,
      innerHTMLLength: panel.innerHTML.length,
      hasSetYourPlay: document.body.textContent.includes('SET YOUR PLAY'),
      hasBetConsoleRoot: !!document.querySelector('[data-testid="bet-console"]'),
    };
  });
}

async function sendItButtonStyle(page) {
  return await page.evaluate(() => {
    const card = document.querySelector('[data-testid="vault-betentry-confirm"]');
    if (!card) return null;
    const btn = [...card.querySelectorAll('button')][0];
    if (!btn) return null;
    const cs = getComputedStyle(btn);
    return {
      text: btn.textContent.trim(),
      disabled: btn.disabled,
      opacity: cs.opacity,
      backgroundImage: cs.backgroundImage,
      backgroundColor: cs.backgroundColor,
      color: cs.color,
      cursor: cs.cursor,
    };
  });
}

async function cyanProbe(page) {
  return await page.evaluate(() => {
    const all = [...document.querySelectorAll('body *')];
    const cyanish = [];
    for (const el of all) {
      const cs = getComputedStyle(el);
      const props = [cs.color, cs.backgroundColor, cs.borderColor, cs.borderTopColor, cs.borderBottomColor];
      for (const p of props) {
        const m = p.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/);
        if (m) {
          const r = +m[1], g = +m[2], b = +m[3];
          if (r < 90 && g > 150 && b > 150 && Math.abs(g - b) < 60) {
            cyanish.push({ tag: el.tagName, testid: el.dataset ? el.dataset.testid : undefined, color: p });
          }
        }
      }
    }
    return cyanish;
  });
}

async function wagerText(page) {
  return await page.evaluate(() => {
    const card = document.querySelector('[data-testid="vault-betentry-yourbet"]');
    if (!card) return null;
    return card.textContent;
  });
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  fs.mkdirSync('shots', { recursive: true });
  const R = {};

  // ============ 1440x900 — full desktop walk ============
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
    await page.reload({ waitUntil: 'networkidle0' });
    await wait(500);

    await clickText(page, 'ape in');
    await wait(600);

    // (a) bottom panel empty
    R.panel_1440 = await panelEmptyCheck(page);

    // (b) relocated cards present + measurable
    R.yourbet_1440 = await page.evaluate(rectOf, '[data-testid="vault-betentry-yourbet"]');
    R.confirm_1440 = await page.evaluate(rectOf, '[data-testid="vault-betentry-confirm"]');
    R.world_1440 = await page.evaluate(rectOf, '[data-testid="vault-betentry-world"]');
    R.edges_1440 = await gridEdges(page);

    await page.screenshot({ path: 'shots/betentry-gutter-1440x900-left-wide.png', clip: clipAround(R.yourbet_1440, R.confirm_1440) });
    await page.screenshot({ path: 'shots/betentry-gutter-1440x900-right-wide.png', clip: clipAround(R.world_1440, R.world_1440) });
    await page.screenshot({ path: 'shots/betentry-gutter-1440x900-full.png' });

    // (b) function: wager stepper
    const before = await wagerText(page);
    await clickTextWithin(page, '[data-testid="vault-betentry-yourbet"]', '+');
    await wait(400);
    const afterPlus = await wagerText(page);
    R.stepper_changed = before !== afterPlus;
    R.stepper_before = before;
    R.stepper_after = afterPlus;

    // (b) function: preset chip
    await clickTextWithin(page, '[data-testid="vault-betentry-yourbet"]', '25');
    await wait(400);
    R.preset25_pressed = await page.evaluate(() => {
      const card = document.querySelector('[data-testid="vault-betentry-yourbet"]');
      const chip = [...card.querySelectorAll('button')].find((b) => b.textContent.trim() === '25');
      return chip ? chip.getAttribute('aria-pressed') : null;
    });

    // (b) function: mode card select (ALTSEASON)
    await clickTextWithin(page, '[data-testid="vault-betentry-world"]', 'ALTSEASON');
    await wait(400);
    R.altseason_pressed = await page.evaluate(() => {
      const card = document.querySelector('[data-testid="vault-betentry-world"]');
      const btn = [...card.querySelectorAll('button')].find((b) => b.textContent.includes('ALTSEASON'));
      return btn ? btn.getAttribute('aria-pressed') : null;
    });

    // (e) SEND IT legibility (opaque commit style, enabled/clickable)
    R.sendIt_style_before = await sendItButtonStyle(page);

    // (d) see-through wide crop of BOTH gutters together
    await page.screenshot({ path: 'shots/betentry-gutter-1440x900-both.png' });

    // (b)/(e) function: SEND IT actually calls placeBet -> phase advances,
    // relocated cards disappear (phase no longer bet-entry)
    await clickTextWithin(page, '[data-testid="vault-betentry-confirm"]', 'SEND IT');
    await wait(700);
    R.afterSendIt_worldCardGone = await page.evaluate(() => !document.querySelector('[data-testid="vault-betentry-world"]'));
    R.afterSendIt_phaseLabel = await page.evaluate(() => document.body.textContent.includes('PUMPING'));

    R.cyan_1440 = (await cyanProbe(page)).length;
    await page.close();
  }

  // ============ 1440x1920 — height-invariance / void-risk proof ============
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1920, deviceScaleFactor: 1 });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
    await page.reload({ waitUntil: 'networkidle0' });
    await wait(500);
    await clickText(page, 'ape in');
    await wait(600);
    R.yourbet_1440h1920 = await page.evaluate(rectOf, '[data-testid="vault-betentry-yourbet"]');
    R.confirm_1440h1920 = await page.evaluate(rectOf, '[data-testid="vault-betentry-confirm"]');
    R.world_1440h1920 = await page.evaluate(rectOf, '[data-testid="vault-betentry-world"]');
    R.edges_1440h1920 = await gridEdges(page);
    await page.screenshot({ path: 'shots/betentry-gutter-1440x1920-left-wide.png', clip: clipAround(R.yourbet_1440h1920, R.confirm_1440h1920) });
    await page.screenshot({ path: 'shots/betentry-gutter-1440x1920-full.png' });
    await page.close();
  }

  // ============ 1920x1080 — second desktop viewport ============
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
    await page.reload({ waitUntil: 'networkidle0' });
    await wait(500);
    await clickText(page, 'ape in');
    await wait(600);
    R.yourbet_1920 = await page.evaluate(rectOf, '[data-testid="vault-betentry-yourbet"]');
    R.confirm_1920 = await page.evaluate(rectOf, '[data-testid="vault-betentry-confirm"]');
    R.world_1920 = await page.evaluate(rectOf, '[data-testid="vault-betentry-world"]');
    R.edges_1920 = await gridEdges(page);
    await page.screenshot({ path: 'shots/betentry-gutter-1920x1080-left-wide.png', clip: clipAround(R.yourbet_1920, R.confirm_1920) });
    await page.screenshot({ path: 'shots/betentry-gutter-1920x1080-full.png' });
    R.panel_1920 = await panelEmptyCheck(page);
    await page.close();
  }

  // ============ 390x844 mobile — bottom bar UNCHANGED, gutters NOTHING ============
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
    await page.reload({ waitUntil: 'networkidle0' });
    await wait(500);
    await clickText(page, 'ape in');
    await wait(600);
    R.mobile_hasSetYourPlay = await page.evaluate(() => document.body.textContent.includes('SET YOUR PLAY'));
    R.mobile_hasBetConsoleRoot = await page.evaluate(() => !!document.querySelector('[data-testid="bet-console"]'));
    R.mobile_gutterDom = await page.evaluate(() => ({
      yourbet: document.querySelectorAll('[data-testid="vault-betentry-yourbet"]').length,
      confirm: document.querySelectorAll('[data-testid="vault-betentry-confirm"]').length,
      world: document.querySelectorAll('[data-testid="vault-betentry-world"]').length,
    }));
    await page.screenshot({ path: 'shots/betentry-gutter-390x844-betentry-full.png', fullPage: true });
    await page.close();
  }

  // ============ Source hygiene ============
  const src = fs.readFileSync('../originals/vault/VaultExperience.tsx', 'utf8');
  R.grep_topOffset_400 = (src.match(/topOffset:\s*400/g) || []).length;
  R.grep_BETENTRY_GUTTER_topOffset_72 = (src.match(/topOffset:\s*72/g) || []).length;
  R.grep_placeBet_calls = (src.match(/controller\.placeBet\(\)/g) || []).length;
  R.grep_gutterCard_reused = (src.match(/styles\.gutterCard\b/g) || []).length;

  await browser.close();
  fs.writeFileSync('betentry-gutter-verify-results.json', JSON.stringify(R, null, 2));
  console.log(JSON.stringify(R, null, 2));
})();

function clipAround(rectA, rectB) {
  const rects = [rectA, rectB].filter(Boolean);
  if (rects.length === 0) return undefined;
  const pad = 80;
  const left = Math.min(...rects.map((r) => r.left));
  const top = Math.min(...rects.map((r) => r.top));
  const right = Math.max(...rects.map((r) => r.right));
  const bottom = Math.max(...rects.map((r) => r.bottom));
  return {
    x: Math.max(0, Math.round(left - pad)),
    y: Math.max(0, Math.round(top - pad)),
    width: Math.round(right - left + pad * 2),
    height: Math.round(bottom - top + pad * 2),
  };
}
