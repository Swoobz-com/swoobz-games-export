// Functional probe: at the 992x850 edge-zone, does the overlapping gutter
// card (visually covering board tiles in the Playing phase) actually
// INTERCEPT the click (pointer-events:auto, dead-zone regression) or does the
// click pass through to the canvas underneath (pointer-events:none wrapper,
// harmless visual-only overlap)?
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = '5301';
const OUT_DIR = 'shots-holisticaudit0703/mtqa';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function findButtonByText(page, t) {
  return await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button]')];
    return (
      els.find((e) => e.offsetParent !== null && e.textContent.trim().toLowerCase() === t.toLowerCase()) ||
      els.find((e) => e.offsetParent !== null && e.textContent.toLowerCase().includes(t.toLowerCase()))
    );
  }, t);
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 992, height: 850 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await page.reload({ waitUntil: 'networkidle0' });
  await wait(500);

  // Lobby -> BetEntry -> Playing
  const apeH = await findButtonByText(page, 'ape in');
  await apeH.asElement().click();
  await wait(500);
  const sendH = await findButtonByText(page, 'send it');
  await sendH.asElement().click();
  await wait(700);

  // Get gutter card rects + computed pointer-events + z-index.
  const cardInfo = await page.evaluate(() => {
    const ids = ['vault-playing-status', 'vault-playing-actions', 'vault-gutter-card-a', 'vault-gutter-card-a-right', 'vault-playing-left', 'vault-playing-right', 'vault-gutter-left', 'vault-gutter-right'];
    const out = {};
    for (const id of ids) {
      const el = document.querySelector(`[data-testid="${id}"]`);
      if (!el) { out[id] = null; continue; }
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      out[id] = { rect: r.toJSON(), pointerEvents: cs.pointerEvents, zIndex: cs.zIndex, position: cs.position };
    }
    return out;
  });

  const canvasRect = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    return c ? c.getBoundingClientRect().toJSON() : null;
  });

  // elementFromPoint at a coordinate that's visually inside the SESSION
  // PULSE left card (per screenshot, roughly x=150 y=520 at 992x850) which
  // ALSO overlaps a board tile per the geometry probe.
  const probePoints = [
    { label: 'top-left-pump-card-over-tile', x: 150, y: 180 },
    { label: 'bottom-left-sessionpulse-over-tile', x: 150, y: 520 },
    { label: 'bottom-right-sessionpulse-over-tile', x: 812, y: 520 },
  ];
  const elementFromPointResults = [];
  for (const p of probePoints) {
    const res = await page.evaluate(({ x, y }) => {
      const el = document.elementFromPoint(x, y);
      if (!el) return { x, y, tag: null };
      const testid = el.closest('[data-testid]')?.dataset.testid;
      return { x, y, tag: el.tagName, className: el.className?.toString().slice(0, 80), closestTestid: testid };
    }, p);
    elementFromPointResults.push({ label: p.label, ...res });
  }

  // Actually attempt a click at the bottom-left overlap point and see if a
  // tile reveal occurs (SAFE LEFT counter decrementing / revealedTiles
  // growing) vs nothing happening (card absorbed the click).
  const safeLeftBefore = await page.evaluate(() => (document.body.textContent.match(/SAFE LEFT (\d+)/) || [])[1]);
  await page.mouse.click(150, 520);
  await wait(400);
  const safeLeftAfter = await page.evaluate(() => (document.body.textContent.match(/SAFE LEFT (\d+)/) || [])[1]);
  await page.screenshot({ path: `${OUT_DIR}/edge-992x850-overlap-click-test.png` });

  const tileClickWentThrough = safeLeftBefore !== safeLeftAfter;

  fs.writeFileSync(`${OUT_DIR}/../holisticaudit0703-mtqa-overlap-functional-results.json`, JSON.stringify({
    cardInfo, canvasRect, elementFromPointResults, safeLeftBefore, safeLeftAfter, tileClickWentThrough,
  }, null, 2));
  console.log(JSON.stringify({ cardInfo, elementFromPointResults, safeLeftBefore, safeLeftAfter, tileClickWentThrough }, null, 2));

  await browser.close();
})();
