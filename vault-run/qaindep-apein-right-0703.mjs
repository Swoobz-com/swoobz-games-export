// INDEPENDENT measurement: Lobby "ape in ->" button (vault-lobby-apein) horizontal
// position vs viewport centerX, at 1440x900 and 1920x1080. Also confirms
// vault-lobby-hero is on the LEFT, contrast of the button, and mobile Lobby
// is unchanged (390x844). READ + MEASURE ONLY, no source edits.
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5201';
const OUTDIR = 'shots-apein-right-0703';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function luminance(r, g, b) {
  const a = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}
function contrastRatio(rgb1, rgb2) {
  const L1 = luminance(...rgb1);
  const L2 = luminance(...rgb2);
  const [hi, lo] = L1 > L2 ? [L1, L2] : [L2, L1];
  return (hi + 0.05) / (lo + 0.05);
}
function parseRgb(str) {
  const m = str && str.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
  if (!m) return null;
  return { rgb: [+m[1], +m[2], +m[3]], a: m[4] !== undefined ? +m[4] : 1 };
}
function worstContrastForGradient(backgroundImage, colorStr) {
  const bgMatch = backgroundImage.match(/rgba?\([\d.,\s]+\)/g);
  const text = parseRgb(colorStr);
  if (!bgMatch || !text) return null;
  const stops = bgMatch.map((s) => parseRgb(s)).filter(Boolean);
  const ratios = stops.map((s) => contrastRatio(s.rgb, text.rgb));
  return { ratios, worst: Math.min(...ratios), stopAlphas: stops.map((s) => s.a) };
}

async function measureViewport(browser, width, height) {
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', (err) => consoleErrors.push('PAGEERROR: ' + err.message));
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(600);

  const out = { width, height };

  out.gutterTestids = await page.evaluate(() => ({
    left: !!document.querySelector('[data-testid="vault-lobby-left"]'),
    hero: !!document.querySelector('[data-testid="vault-lobby-hero"]'),
    right: !!document.querySelector('[data-testid="vault-lobby-right"]'),
    apein: !!document.querySelector('[data-testid="vault-lobby-apein"]'),
  }));

  // Bounding rects: hero card, right stack, apein card, and the actual <button> inside apein card
  out.rects = await page.evaluate(() => {
    const grab = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height, centerX: r.left + r.width / 2, centerY: r.top + r.height / 2 };
    };
    const apeinCard = document.querySelector('[data-testid="vault-lobby-apein"]');
    let apeinButton = null;
    if (apeinCard) {
      const btn = [...apeinCard.querySelectorAll('button')].find(b => b.textContent.toLowerCase().includes('ape in')) || apeinCard.querySelector('button');
      if (btn) {
        const r = btn.getBoundingClientRect();
        apeinButton = { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height, centerX: r.left + r.width / 2, centerY: r.top + r.height / 2, text: btn.textContent.trim() };
      }
    }
    return {
      hero: grab('[data-testid="vault-lobby-hero"]'),
      leftStack: grab('[data-testid="vault-lobby-left"]'),
      rightStack: grab('[data-testid="vault-lobby-right"]'),
      apeinCard: grab('[data-testid="vault-lobby-apein"]'),
      apeinButton,
    };
  });

  const viewportCenterX = width / 2;
  out.viewportCenterX = viewportCenterX;
  if (out.rects.apeinButton) {
    out.apein_side = out.rects.apeinButton.centerX > viewportCenterX ? 'RIGHT' : 'LEFT';
    out.apein_deltaFromCenter = out.rects.apeinButton.centerX - viewportCenterX;
  }
  if (out.rects.hero) {
    out.hero_side = out.rects.hero.centerX > viewportCenterX ? 'RIGHT' : 'LEFT';
    out.hero_deltaFromCenter = out.rects.hero.centerX - viewportCenterX;
  }

  // Button computed style for opacity/contrast
  out.buttonStyle = await page.evaluate(() => {
    const card = document.querySelector('[data-testid="vault-lobby-apein"]');
    if (!card) return null;
    const btn = [...card.querySelectorAll('button')].find(b => b.textContent.toLowerCase().includes('ape in')) || card.querySelector('button');
    if (!btn) return null;
    const cs = getComputedStyle(btn);
    const cardCs = getComputedStyle(card);
    return {
      text: btn.textContent.trim(),
      disabled: btn.disabled,
      opacity: cs.opacity,
      backgroundImage: cs.backgroundImage,
      backgroundColor: cs.backgroundColor,
      color: cs.color,
      cardBackdropFilter: cardCs.backdropFilter,
      cardOpacity: cardCs.opacity,
    };
  });

  if (out.buttonStyle) {
    if (out.buttonStyle.backgroundImage && out.buttonStyle.backgroundImage !== 'none') {
      out.contrast = worstContrastForGradient(out.buttonStyle.backgroundImage, out.buttonStyle.color);
    } else {
      const bg = parseRgb(out.buttonStyle.backgroundColor);
      const fg = parseRgb(out.buttonStyle.color);
      if (bg && fg) out.contrast = { ratios: [contrastRatio(bg.rgb, fg.rgb)], worst: contrastRatio(bg.rgb, fg.rgb), bgAlpha: bg.a };
    }
  }

  out.consoleErrors = consoleErrors;

  // Screenshots
  await page.screenshot({ path: `${OUTDIR}/lobby-${width}x${height}-full.png` });
  if (out.rects.apeinButton) {
    const r = out.rects.apeinButton;
    await page.screenshot({
      path: `${OUTDIR}/lobby-${width}x${height}-apein-button-crop.png`,
      clip: { x: Math.max(0, r.left - 30), y: Math.max(0, r.top - 30), width: r.width + 60, height: r.height + 60 },
    });
  }

  await page.close();
  return out;
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  fs.mkdirSync(OUTDIR, { recursive: true });
  const R = {};

  R.d1440 = await measureViewport(browser, 1440, 900);
  R.d1920 = await measureViewport(browser, 1920, 1080);

  // ============ MOBILE 390x844 — must be fully UNCHANGED ============
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
    await wait(600);
    R.mobile = {};
    R.mobile.gutterDom = await page.evaluate(() => ({
      lobbyLeft: document.querySelectorAll('[data-testid="vault-lobby-left"]').length,
      lobbyRight: document.querySelectorAll('[data-testid="vault-lobby-right"]').length,
      lobbyApein: document.querySelectorAll('[data-testid="vault-lobby-apein"]').length,
    }));
    R.mobile.hasApeInText = await page.evaluate(() => document.body.textContent.toLowerCase().includes('ape in'));
    // Confirm an original-style bottom bar / panel exists (aria-live polite panel present with content)
    R.mobile.panel = await page.evaluate(() => {
      const panel = document.querySelector('[aria-live="polite"]');
      if (!panel) return { found: false };
      const r = panel.getBoundingClientRect();
      return { found: true, childElementCount: panel.childElementCount, rect: { top: r.top, bottom: r.bottom, height: r.height } };
    });
    await page.screenshot({ path: `${OUTDIR}/mobile-390x844-lobby-full.png` });
    await page.close();
  }

  await browser.close();
  fs.writeFileSync(`${OUTDIR}-results.json`, JSON.stringify(R, null, 2));
  console.log(JSON.stringify(R, null, 2));
})();
