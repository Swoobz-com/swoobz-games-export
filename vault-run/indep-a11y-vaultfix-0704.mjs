// Independent live verification (NOT the builder's script) of the P0
// desktop-settled a11y fix on Rug or Riches (vault). Fresh port 5350.
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 5350;
const OUT = 'C:/Users/Erstr/AppData/Local/Temp/claude/C--Users-Erstr-OneDrive-Bureaublad-swoobz-games-export/ae0f5ec2-dc4c-47ea-a2ca-1ea3484743ef/scratchpad/shots-indep-a11y-0704';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });

async function clickText(page, t, within) {
  const h = await page.evaluateHandle(({ t, within }) => {
    const root = within ? document.querySelector(within) : document;
    if (!root) return null;
    const els = [...root.querySelectorAll('button,[role=button]')];
    return (
      els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.trim().toLowerCase() === t.toLowerCase()) ||
      els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.toLowerCase().includes(t.toLowerCase()))
    );
  }, { t, within });
  const el = h.asElement();
  if (!el) return false;
  await el.click();
  return true;
}

async function isSettled(page) {
  return await page.evaluate(() => !!document.querySelector('[data-testid="vault-settled-left"], [data-testid="vault-settledpanel"]'));
}
async function clickCanvasFraction(page, fx, fy) {
  const box = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  if (!box) return false;
  await page.mouse.click(box.x + box.w * fx, box.y + box.h * fy);
  return true;
}
async function takeProfitIfEnabled(page) {
  return await page.evaluate(() => {
    const btn = [...document.querySelectorAll('[data-testid="vault-playing-actions"] button, .vault-press, button')].find((b) =>
      b.textContent.toLowerCase().includes('take profit'),
    );
    if (btn && !btn.disabled) {
      btn.click();
      return true;
    }
    return false;
  });
}

async function enterRound(page) {
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(600);
  await clickText(page, 'ape in');
  await wait(600);
  await clickText(page, 'send it', '[data-testid="vault-betentry-confirm"]') || (await clickText(page, 'send it'));
  await wait(800);
}

async function forceWin(page) {
  const spots = [];
  for (let gx = 1; gx <= 9; gx++) for (let gy = 1; gy <= 9; gy++) spots.push([gx / 10, gy / 10]);
  let reveals = 0;
  for (const [fx, fy] of spots) {
    if (await isSettled(page)) return true;
    await clickCanvasFraction(page, fx, fy);
    await wait(300);
    if (await isSettled(page)) return true;
    reveals++;
    if (reveals >= 2) {
      if (await takeProfitIfEnabled(page)) {
        await wait(1000);
        return await isSettled(page);
      }
    }
  }
  await wait(900);
  return await isSettled(page);
}

async function forceLoss(page) {
  const spots = [];
  for (let gx = 1; gx <= 9; gx++) for (let gy = 1; gy <= 9; gy++) spots.push([gx / 10, gy / 10]);
  for (const [fx, fy] of spots) {
    if (await isSettled(page)) return true;
    await clickCanvasFraction(page, fx, fy);
    await wait(250);
    if (await isSettled(page)) return true;
  }
  await wait(900);
  return await isSettled(page);
}

// ---- pixel sampling helper: screenshot a rect, decode via in-page canvas ----
async function sampleRectColor(page, rect, sx, sy) {
  // rect: {x,y,width,height} viewport coords; sx,sy fraction within rect
  const buf = await page.screenshot({ clip: rect, encoding: 'base64' });
  const px = await page.evaluate(async (b64, fx, fy) => {
    const img = new Image();
    const loaded = new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
    img.src = 'data:image/png;base64,' + b64;
    await loaded;
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const x = Math.max(0, Math.min(img.width - 1, Math.round(img.width * fx)));
    const y = Math.max(0, Math.min(img.height - 1, Math.round(img.height * fy)));
    const d = ctx.getImageData(x, y, 1, 1).data;
    return [d[0], d[1], d[2], d[3]];
  }, buf, sx, sy);
  return px;
}
function relLum([r, g, b]) {
  const f = (c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const [rl, gl, bl] = [f(r), f(g), f(b)];
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}
function contrastRatio(rgb1, rgb2) {
  const l1 = relLum(rgb1), l2 = relLum(rgb2);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const R = {};

  // ============ ITEM 1 + 2: WIN, desktop 1440x900 ============
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await enterRound(page);
    const won = await forceWin(page);
    await wait(1300); // allow verify effect -> 'matched'

    const dom = await page.evaluate(() => {
      const settledLeft = document.querySelector('[data-testid="vault-settled-left"]');
      const settledRight = document.querySelector('[data-testid="vault-settled-right-new"]');
      const srLiveEls = [...document.querySelectorAll('.sr-only[aria-live]')];
      const chip = document.querySelector('.vault-receipt-toggle');
      const ariaControls = chip ? chip.getAttribute('aria-controls') : null;
      const targetBefore = ariaControls ? document.getElementById(ariaControls) : null;
      return {
        isWideDesktopMode: !!settledLeft && !!settledRight,
        settlementPanelPresentDesktop: !!document.querySelector('[data-testid="vault-settledpanel"]'),
        srLiveTexts: srLiveEls.map((s) => s.textContent),
        chipFound: !!chip,
        chipAriaControls: ariaControls,
        chipAriaExpandedBefore: chip ? chip.getAttribute('aria-expanded') : null,
        targetExistsBeforeExpand: !!targetBefore,
      };
    });
    R.win_dom_1440 = { won, dom };

    // expand receipt
    const clicked = await page.evaluate(() => {
      const chip = document.querySelector('.vault-receipt-toggle');
      if (!chip) return false;
      chip.click();
      return true;
    });
    await wait(400);
    const after = await page.evaluate(() => {
      const chip = document.querySelector('.vault-receipt-toggle');
      const ariaControls = chip ? chip.getAttribute('aria-controls') : null;
      const target = ariaControls ? document.getElementById(ariaControls) : null;
      return {
        ariaExpanded: chip ? chip.getAttribute('aria-expanded') : null,
        targetExistsAfterExpand: !!target,
        targetVisible: target ? target.offsetParent !== null : false,
        targetTestId: target ? target.getAttribute('data-testid') : null,
        targetFullText: target ? target.textContent : null,
        // check un-truncated hex: server seed row should be a long hex, not "…"-truncated
        hasEllipsisInFullReceipt: target ? target.textContent.includes('…') === false ? 'no-ellipsis-in-dl-rows' : 'HAS-ELLIPSIS-CHECK' : null,
      };
    });
    R.win_receipt_expand_1440 = { clicked, after };

    await page.screenshot({ path: `${OUT}/win-1440-settled-expanded.png`, fullPage: true });
    await page.close();
  }

  // ============ ITEM 1 + 2 + 3: LOSS/RUG, desktop 1440x900 ============
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await enterRound(page);
    const rugged = await forceLoss(page);
    await wait(1300);

    const dom = await page.evaluate(() => {
      const srLiveEls = [...document.querySelectorAll('.sr-only[aria-live]')];
      const chip = document.querySelector('.vault-receipt-toggle');
      const ariaControls = chip ? chip.getAttribute('aria-controls') : null;
      const targetBefore = ariaControls ? document.getElementById(ariaControls) : null;
      return {
        srLiveTexts: srLiveEls.map((s) => s.textContent),
        chipFound: !!chip,
        chipAriaControls: ariaControls,
        targetExistsBeforeExpand: !!targetBefore,
        bodyIncludesRuggedWord: document.body.textContent.includes('BUST') || document.body.textContent.includes('rug'),
      };
    });
    R.loss_dom_1440 = { rugged, dom };

    // Contrast: BET AGAIN button (loss/red) vs its card background (gutterCardCta glass)
    const rects = await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="vault-settled-betagain"] button');
      const card = document.querySelector('[data-testid="vault-settled-betagain"]');
      const ledgeBtn = document.querySelector('[data-testid="vault-board-rebet"] button');
      const b = btn ? btn.getBoundingClientRect() : null;
      const c = card ? card.getBoundingClientRect() : null;
      const l = ledgeBtn ? ledgeBtn.getBoundingClientRect() : null;
      const cs = (el) => el ? getComputedStyle(el) : null;
      const btnCs = cs(btn);
      return {
        btnRect: b ? { x: b.x, y: b.y, width: b.width, height: b.height } : null,
        cardRect: c ? { x: c.x, y: c.y, width: c.width, height: c.height } : null,
        ledgeRect: l ? { x: l.x, y: l.y, width: l.width, height: l.height } : null,
        btnBg: btnCs ? btnCs.backgroundColor : null,
        btnBgImage: btnCs ? btnCs.backgroundImage : null,
        btnColor: btnCs ? btnCs.color : null,
        btnText: btn ? btn.textContent : null,
      };
    });
    R.betagain_loss_computed = rects;

    if (rects.btnRect && rects.cardRect) {
      // sample button fill center
      const btnPx = await sampleRectColor(page, {
        x: rects.btnRect.x, y: rects.btnRect.y, width: rects.btnRect.width, height: rects.btnRect.height,
      }, 0.5, 0.5);
      // sample card background just outside button, near card edge (top strip above button)
      const cardBgY = Math.max(0, (rects.btnRect.y - rects.cardRect.y) / rects.cardRect.height * 0.3);
      const cardPx = await sampleRectColor(page, {
        x: rects.cardRect.x, y: rects.cardRect.y, width: rects.cardRect.width, height: rects.cardRect.height,
      }, 0.5, 0.05); // near top of card, above the button, still inside card glass
      R.betagain_loss_pixels = {
        buttonFillRGBA: btnPx,
        cardBgRGBA: cardPx,
        contrastButtonVsCard: contrastRatio(btnPx.slice(0, 3), cardPx.slice(0, 3)),
      };
      // Also text contrast: sample a text-pixel (left edge of label, likely dark ink) vs button fill.
      // Instead compute analytically since text color is a CSS var (T.accentInk #04130b) confirmed via computed style if not transparent.
    }

    // near-board ledge button same check
    if (rects.ledgeRect) {
      const ledgeCs = await page.evaluate(() => {
        const btn = document.querySelector('[data-testid="vault-board-rebet"] button');
        const wrap = document.querySelector('[data-testid="vault-board-rebet"]');
        const cs = (el) => el ? getComputedStyle(el) : null;
        return { btnBg: cs(btn) ? cs(btn).backgroundColor : null, wrapBg: cs(wrap) ? cs(wrap).backgroundColor : null };
      });
      R.ledge_betagain_computed = ledgeCs;
    }

    await page.screenshot({ path: `${OUT}/loss-1440-settled.png`, fullPage: true });
    // Cropped shot of just the bet-again card for visual record
    if (rects.cardRect) {
      await page.screenshot({ path: `${OUT}/loss-1440-betagain-card.png`, clip: { x: Math.max(0,rects.cardRect.x-10), y: Math.max(0,rects.cardRect.y-10), width: rects.cardRect.width+20, height: rects.cardRect.height+20 } });
    }
    await page.close();
  }

  // ============ ITEM 3b: focus indicators on settled screen ============
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await enterRound(page);
    await forceLoss(page);
    await wait(1300);
    // Tab through focusable elements and diff focused vs not.
    const focusables = await page.evaluate(() => {
      const els = [...document.querySelectorAll('button,[href],input,[tabindex]:not([tabindex="-1"])')].filter(
        (e) => e.offsetParent !== null,
      );
      return els.length;
    });
    const focusReport = [];
    for (let i = 0; i < Math.min(focusables, 25); i++) {
      await page.keyboard.press('Tab');
      await wait(60);
      const info = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return {
          tag: el.tagName,
          testid: el.getAttribute('data-testid'),
          text: el.textContent ? el.textContent.trim().slice(0, 30) : null,
          outline: cs.outline,
          outlineColor: cs.outlineColor,
          outlineWidth: cs.outlineWidth,
          boxShadow: cs.boxShadow,
          rect: { x: r.x, y: r.y, w: r.width, h: r.height },
        };
      });
      if (info) focusReport.push(info);
    }
    R.focus_sweep_loss_1440 = focusReport;
    await page.close();
  }

  // ============ ITEM 3c: prefers-reduced-motion ============
  {
    const page = await browser.newPage();
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await enterRound(page);
    await forceWin(page);
    await wait(1300);
    const motionCheck = await page.evaluate(() => {
      const toggle = document.querySelector('.vault-receipt-toggle');
      const cs = toggle ? getComputedStyle(toggle) : null;
      // Check the vault-spinner class transition/animation rules exist and media query respected
      const sheets = [...document.styleSheets];
      let hasReducedMotionRule = false;
      try {
        for (const s of sheets) {
          for (const r of s.cssRules || []) {
            if (r.media && [...r.media].some((m) => m.includes('prefers-reduced-motion'))) hasReducedMotionRule = true;
          }
        }
      } catch (e) {}
      return {
        toggleTransition: cs ? cs.transition : null,
        hasReducedMotionRule,
      };
    });
    R.motion_reduce_check = motionCheck;
    await page.screenshot({ path: `${OUT}/win-1440-reducedmotion.png`, fullPage: true });
    await page.close();
  }

  // ============ ITEM 4: MOBILE settled (should be UNCHANGED) ============
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
    await enterRound(page);
    await forceLoss(page);
    await wait(1300);
    const mobileDom = await page.evaluate(() => {
      const panel = document.querySelector('[data-testid="vault-settledpanel"]');
      const gutterLeft = document.querySelector('[data-testid="vault-settled-left"]');
      const chip = document.querySelector('.vault-receipt-toggle');
      const ariaControls = chip ? chip.getAttribute('aria-controls') : null;
      const target = ariaControls ? document.getElementById(ariaControls) : null;
      return {
        settlementPanelPresent: !!panel,
        panelAriaLive: panel ? panel.getAttribute('aria-live') : null,
        panelAriaLabel: panel ? panel.getAttribute('aria-label') : null,
        gutterCardsAbsent: !gutterLeft, // mobile should NOT render the new gutter cards
        chipFound: !!chip,
        chipAriaControls: ariaControls,
        targetExistsBeforeExpand: !!target,
      };
    });
    R.mobile_settled_loss = mobileDom;

    // expand mobile receipt too
    const clicked = await page.evaluate(() => {
      const chip = document.querySelector('.vault-receipt-toggle');
      if (!chip) return false;
      chip.click();
      return true;
    });
    await wait(400);
    const after = await page.evaluate(() => {
      const chip = document.querySelector('.vault-receipt-toggle');
      const ariaControls = chip ? chip.getAttribute('aria-controls') : null;
      const target = ariaControls ? document.getElementById(ariaControls) : null;
      return {
        targetExistsAfterExpand: !!target,
        targetVisible: target ? target.offsetParent !== null : false,
      };
    });
    R.mobile_receipt_expand = { clicked, after };
    await page.screenshot({ path: `${OUT}/mobile-390-settled-loss.png`, fullPage: true });
    await page.close();
  }

  await browser.close();
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(R, null, 2));
  console.log(JSON.stringify(R, null, 2));
})();
