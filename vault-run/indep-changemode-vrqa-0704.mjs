// INDEPENDENT verification (swoobz-visual-regression-qa) of the "change mode"
// secondary-button promotion (FIX 4, vault SETTLED screen). Written FRESH —
// does NOT reuse or trust the maker's own changemode-verify-0704.mjs script,
// though the driver PATTERN (ape in -> SEND IT -> canvas clicks -> take
// profit / rug) is the well-established one documented in AGENT_MEMORY.
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5837';
const OUT = process.argv[3] || 'C:/Users/Erstr/AppData/Local/Temp/claude/C--Users-Erstr-OneDrive-Bureaublad-swoobz-games-export/ae0f5ec2-dc4c-47ea-a2ca-1ea3484743ef/scratchpad/changemode-indep';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

async function clickTextGlobal(page, t) {
  // Deliberately NOT scoped to any container — mobile's "take profit" /
  // "SEND IT" buttons are NOT inside the desktop-only gutter-card
  // containers, so a container-scoped query would silently miss them.
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button]')];
    return (
      els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.trim().toLowerCase() === t.toLowerCase()) ||
      els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.toLowerCase().includes(t.toLowerCase()))
    );
  }, t);
  const el = h.asElement();
  if (!el) return false;
  await el.click();
  return true;
}

async function detectPhase(page) {
  return await page.evaluate(() => {
    const has = (id) => !!document.querySelector(`[data-testid="${id}"]`);
    if (has('vault-settled-left') || has('vault-settled-right') || has('vault-settled-right-new') || has('vault-settledpanel')) return 'settled';
    if (has('vault-playing-left') || has('vault-playing-right') || has('vault-playing-actions')) return 'playing';
    if (has('vault-betentry-left') || has('vault-betentry-right') || has('vault-betentry-confirm')) return 'bet-entry';
    if (has('vault-lobby-left') || has('vault-lobby-right')) return 'lobby';
    return 'unknown';
  });
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
  // Global search, NOT scoped to [data-testid=vault-playing-actions] — that
  // container is DESKTOP-ONLY (PlayingGutterCards); on mobile the button
  // lives in a different DOM location entirely. Text + offsetParent is the
  // only reliable cross-viewport probe (per task grounding note).
  return await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(
      (b) => b.offsetParent !== null && !b.disabled && b.textContent.toLowerCase().includes('take profit'),
    );
    if (btn) { btn.click(); return true; }
    return false;
  });
}

async function startRound(page) {
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(600);
  await clickTextGlobal(page, 'ape in');
  await wait(600);
  const sentIt = await clickTextGlobal(page, 'SEND IT');
  await wait(800);
  return sentIt;
}

async function driveToWin(page) {
  const sentIt = await startRound(page);
  let phase = await detectPhase(page);
  for (let i = 0; i < 4 && phase !== 'settled'; i++) {
    await clickCanvasFraction(page, 0.15 + i * 0.1, 0.5);
    await wait(400);
    phase = await detectPhase(page);
  }
  if (phase !== 'settled') {
    await takeProfitIfEnabled(page);
    await wait(1000);
    phase = await detectPhase(page);
  }
  return { sentIt, settled: phase === 'settled' };
}

async function driveToRug(page, maxAttempts = 8) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await startRound(page);
    const spots = [];
    for (let gx = 1; gx <= 9; gx++) for (let gy = 1; gy <= 9; gy++) spots.push([gx / 10, gy / 10]);
    let phase = 'playing';
    for (const [fx, fy] of spots) {
      phase = await detectPhase(page);
      if (phase === 'settled') break;
      await clickCanvasFraction(page, fx, fy);
      await wait(300);
    }
    await wait(800);
    phase = await detectPhase(page);
    if (phase === 'settled') {
      const outcome = await page.evaluate(() => {
        const text = document.body.innerText || '';
        return /rug/i.test(text) ? 'rug' : (/won|profit|bag/i.test(text) ? 'win' : 'unknown');
      });
      console.log(`  [driveToRug] attempt ${attempt} -> ${outcome}`);
      if (outcome === 'rug') return true;
    } else {
      console.log(`  [driveToRug] attempt ${attempt} did not settle`);
    }
  }
  return (await detectPhase(page)) === 'settled';
}

function styleOf(cs) {
  return {
    border: `${cs.borderTopWidth} ${cs.borderTopStyle} ${cs.borderTopColor}`,
    backgroundColor: cs.backgroundColor,
    backgroundImage: cs.backgroundImage,
    padding: cs.padding,
    borderRadius: cs.borderRadius,
  };
}

async function measure(page) {
  return await page.evaluate((styleOfSrc) => {
    // eslint-disable-next-line no-eval
    const styleOf = eval(`(${styleOfSrc})`);
    function findButtons() {
      const all = [...document.querySelectorAll('button')];
      const visible = all.filter((b) => b.offsetParent !== null);
      const changeModeBtns = visible.filter((b) => /change mode/i.test(b.textContent));
      const betAgainBtns = visible.filter((b) => /^bet again →$/i.test(b.textContent.trim()));
      const shareBtns = visible.filter((b) => /share/i.test(b.textContent) && b.getAttribute('aria-label') === 'Share this result');
      return { changeModeBtns, betAgainBtns, shareBtns };
    }
    const { changeModeBtns, betAgainBtns, shareBtns } = findButtons();

    function siteOf(btn) {
      // desktop gutter card: closest ancestor with data-testid=vault-settled-betagain
      const gutterCard = btn.closest('[data-testid="vault-settled-betagain"]');
      if (gutterCard) return 'desktop-gutter (vault-settled-betagain)';
      return 'mobile-legacy (linksTier)';
    }

    function describe(btn) {
      const r = btn.getBoundingClientRect();
      const cs = getComputedStyle(btn);
      return {
        site: siteOf(btn),
        text: btn.textContent.trim(),
        rect: { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width * 100) / 100, height: Math.round(r.height * 100) / 100 },
        computed: styleOf(cs),
        disabled: btn.disabled,
      };
    }

    return {
      changeMode: changeModeBtns.map(describe),
      betAgain: betAgainBtns.map(describe),
      share: shareBtns.map(describe),
      overflow: {
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
        scrollHeight: document.documentElement.scrollHeight,
        innerHeight: window.innerHeight,
        bodyScrollHeight: document.body.scrollHeight,
      },
      phase: (function () {
        const has = (id) => !!document.querySelector(`[data-testid="${id}"]`);
        if (has('vault-settled-left') || has('vault-settled-right') || has('vault-settled-right-new') || has('vault-settledpanel')) return 'settled';
        return 'NOT-SETTLED';
      })(),
    };
  }, styleOf.toString());
}

async function runCombo(browser, w, h, outcome, tag) {
  console.log(`\n=== ${tag} (${w}x${h}, ${outcome}) ===`);
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  page.on('console', (msg) => { if (msg.type() === 'error') pageErrors.push('console.error: ' + msg.text()); });

  let driveResult;
  if (outcome === 'win') driveResult = await driveToWin(page);
  else driveResult = { settled: await driveToRug(page) };

  await wait(600);
  const phaseNow = await detectPhase(page);
  console.log(`  drive result:`, JSON.stringify(driveResult), 'phaseNow:', phaseNow);

  const m = await measure(page);
  await page.screenshot({ path: `${OUT}/${tag}-full.png`, fullPage: false });

  // Cropped screenshot around change-mode button(s) if found.
  if (m.changeMode.length) {
    const cmRect = m.changeMode[0].rect;
    await page.screenshot({
      path: `${OUT}/${tag}-changemode-crop.png`,
      clip: { x: Math.max(0, cmRect.x - 40), y: Math.max(0, cmRect.y - 60), width: cmRect.width + 200, height: cmRect.height + 120 },
    });
  }

  await page.close();
  return { tag, w, h, outcome, driveResult, phaseNow, measured: m, pageErrors };
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const results = [];

  const viewports = [
    { w: 1440, h: 900, tag: 'D1440x900' },
    { w: 1920, h: 1080, tag: 'D1920x1080' },
    { w: 412, h: 915, tag: 'M412x915' },
  ];

  for (const vp of viewports) {
    for (const outcome of ['win', 'rug']) {
      const r = await runCombo(browser, vp.w, vp.h, outcome, `${vp.tag}-${outcome}`);
      results.push(r);
    }
  }

  await browser.close();
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2));
  console.log('\n\n===== FULL RESULTS JSON =====');
  console.log(JSON.stringify(results, null, 2));
})();
