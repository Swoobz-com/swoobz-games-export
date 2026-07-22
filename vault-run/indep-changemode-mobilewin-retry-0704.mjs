// Retry-safe WIN driver for the mobile viewport (a single early reveal can
// hit a mine and produce an accidental rug, which the first indep pass did
// at 412x915). Reveals exactly ONE tile then takes profit immediately;
// retries a fresh round on an accidental rug, up to 10 attempts.
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5837';
const OUT = process.argv[3] || 'C:/Users/Erstr/AppData/Local/Temp/claude/C--Users-Erstr-OneDrive-Bureaublad-swoobz-games-export/ae0f5ec2-dc4c-47ea-a2ca-1ea3484743ef/scratchpad/changemode-indep/final';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function clickTextGlobal(page, t) {
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
    return 'not-settled';
  });
}
async function outcomeText(page) {
  return await page.evaluate(() => {
    const text = document.body.innerText || '';
    return /rug/i.test(text) ? 'rug' : (/won|profit|bag/i.test(text) ? 'win' : 'unknown');
  });
}
async function clickCanvasFraction(page, fx, fy) {
  const box = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  await page.mouse.click(box.x + box.w * fx, box.y + box.h * fy);
}
async function takeProfitIfEnabled(page) {
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
  await clickTextGlobal(page, 'SEND IT');
  await wait(800);
}

function styleOf(cs) {
  return { border: `${cs.borderTopWidth} ${cs.borderTopStyle} ${cs.borderTopColor}`, backgroundColor: cs.backgroundColor, backgroundImage: cs.backgroundImage, padding: cs.padding, borderRadius: cs.borderRadius };
}
async function measure(page) {
  return await page.evaluate((styleOfSrc) => {
    const styleOf = eval(`(${styleOfSrc})`);
    const visible = [...document.querySelectorAll('button')].filter((b) => b.offsetParent !== null);
    const changeModeBtns = visible.filter((b) => /change mode/i.test(b.textContent));
    const betAgainBtns = visible.filter((b) => /^bet again →$/i.test(b.textContent.trim()));
    const shareBtns = visible.filter((b) => /share/i.test(b.textContent) && b.getAttribute('aria-label') === 'Share this result');
    function describe(btn) {
      const r = btn.getBoundingClientRect();
      const cs = getComputedStyle(btn);
      return { text: btn.textContent.trim(), rect: { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width * 100) / 100, height: Math.round(r.height * 100) / 100 }, computed: styleOf(cs) };
    }
    return {
      changeMode: changeModeBtns.map(describe),
      betAgain: betAgainBtns.map(describe),
      share: shareBtns.map(describe),
      overflow: { scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth, scrollHeight: document.documentElement.scrollHeight, innerHeight: window.innerHeight },
    };
  }, styleOf.toString());
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 1 });

  let settledWin = false;
  let attempt = 0;
  for (; attempt < 10 && !settledWin; attempt++) {
    await startRound(page);
    // reveal exactly one interior tile (avoid edges/corners where mine density guess is riskier — still random but consistent single-reveal minimizes exposure)
    await clickCanvasFraction(page, 0.5, 0.35);
    await wait(400);
    let phase = await detectPhase(page);
    if (phase !== 'settled') {
      await takeProfitIfEnabled(page);
      await wait(900);
      phase = await detectPhase(page);
    }
    if (phase === 'settled') {
      const oc = await outcomeText(page);
      console.log(`attempt ${attempt + 1}: settled, outcome=${oc}`);
      if (oc === 'win') { settledWin = true; break; }
    } else {
      console.log(`attempt ${attempt + 1}: did not settle`);
    }
  }

  console.log('settledWin:', settledWin, 'attempts used:', attempt + 1);
  const m = await measure(page);
  await page.screenshot({ path: `${OUT}/M412x915-win-RETRY-full.png`, fullPage: false });
  fs.writeFileSync(`${OUT}/M412x915-win-RETRY.json`, JSON.stringify({ settledWin, attempts: attempt + 1, measured: m }, null, 2));
  console.log(JSON.stringify({ settledWin, measured: m }, null, 2));

  await browser.close();
})();
