import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5183';
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
async function cellCenter(page, idx, g) {
  return await page.evaluate(({ idx, g }) => {
      const c = document.querySelector('canvas');
      const r = c.getBoundingClientRect();
      const W = r.width, H = r.height;
      const wide = W / H > 1.2;
      const tR = H * (wide ? 0.12 : 0.15);
      const bR = H * (wide ? 0.14 : 0.18);
      const sF = 0.08;
      const sW = W * (1 - sF * 2);
      const sH = (H - tR - bR) * 0.96;
      const av = Math.min(sW, sH);
      const gap = Math.max(6, av * 0.026);
      const tile = (av - gap * (g - 1)) / g;
      const full = tile * g + gap * (g - 1);
      const x0 = (W - full) / 2;
      const by = tR + (H - tR - bR) / 2;
      const y0 = by - full / 2;
      const col = idx % g, row = Math.floor(idx / g);
      return { cx: r.left + x0 + col * (tile + gap) + tile / 2, cy: r.top + y0 + row * (tile + gap) + tile / 2 };
    }, { idx, g });
}
async function settledNow(page) { return await page.evaluate(() => document.body.textContent.toLowerCase().includes('bet again')); }
async function playOneRound(page, firstRound) {
  if (firstRound) { await clickText(page, 'ape in'); await wait(400); }
  else { await clickText(page, 'bet again'); await wait(400); }
  await clickText(page, 'send it'); await wait(700);
  let done = false;
  for (let k = 0; k < 12 && !done; k++) {
    const idx = [1, 6, 11, 17, 22, 3, 8, 14, 0, 24, 5, 20][k] || 2;
    const { cx, cy } = await cellCenter(page, idx, 5);
    await page.mouse.click(cx, cy);
    await wait(400);
    done = await settledNow(page);
  }
  if (!done) { await clickText(page, 'take profit'); await wait(700); done = await settledNow(page); }
  await wait(500);
  return done;
}
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(500);
  await playOneRound(page, true);
  await playOneRound(page, false);
  await page.screenshot({ path: 'shots/probe-cardb-settled-1920.png' });
  const data = await page.evaluate(() => {
    const gutterB = document.querySelector('[data-testid="vault-gutter-card-b"]');
    const gutterC = document.querySelector('[data-testid="vault-gutter-card-c"]');
    function rr(el){ if(!el) return null; const rc = el.getBoundingClientRect(); return {top:rc.top,left:rc.left,right:rc.right,bottom:rc.bottom,width:rc.width,height:rc.height}; }
    return { gutterB: rr(gutterB), gutterC: rr(gutterC) };
  });
  console.log(JSON.stringify(data, null, 2));
  await browser.close();
})();
