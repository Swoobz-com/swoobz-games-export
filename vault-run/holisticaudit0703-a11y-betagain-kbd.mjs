import puppeteer from 'puppeteer-core';
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const PORT = process.argv[2] || '5317';
const browser = await puppeteer.launch({
  executablePath: EXE, headless: false,
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
  args: ['--window-size=1460,1040'],
});
const page = (await browser.pages())[0];
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2', timeout: 60000 });
await wait(1200);

async function clickText(t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button]')];
    return els.find(e => e.offsetParent !== null && e.textContent.trim().toLowerCase() === t.toLowerCase())
      || els.find(e => e.offsetParent !== null && e.textContent.toLowerCase().includes(t.toLowerCase()));
  }, t);
  const el = h.asElement();
  if (!el) { console.log('NO BTN:', t); return false; }
  await el.click();
  return true;
}
async function cellCenter(idx, g) {
  return await page.evaluate(({ idx, g }) => {
    const c = document.querySelector('canvas');
    const r = c.getBoundingClientRect();
    const W = r.width, H = r.height;
    const tR = H * 0.15, bR = H * 0.18, sF = 0.08;
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

await clickText('ape in'); await wait(700);
await clickText('send it'); await wait(900);
{
  const { cx, cy } = await cellCenter(6, 5);
  await page.mouse.click(cx, cy); await wait(600);
}
// tab to TAKE PROFIT then Enter (keyboard-only cash-out)
await page.evaluate(() => document.activeElement.blur());
for (let i = 0; i < 10; i++) {
  await page.keyboard.press('Tab'); await wait(70);
  const isTP = await page.evaluate(() => /take profit/i.test(document.activeElement?.textContent || ''));
  if (isTP) break;
}
await page.keyboard.press('Enter');
await wait(1200);
const phaseAfterCashout = await page.evaluate(() => ({
  hasSettledResult: !!document.querySelector('[data-testid="vault-settled-result"]'),
  bodyHasBetAgain: document.body.textContent.toLowerCase().includes('bet again'),
}));
console.log('after keyboard cashout:', JSON.stringify(phaseAfterCashout));

// tab to BET AGAIN then press Enter (keyboard-only rebet)
await page.evaluate(() => document.activeElement.blur());
let foundBA = false;
for (let i = 0; i < 12; i++) {
  await page.keyboard.press('Tab'); await wait(70);
  const info = await page.evaluate(() => ({
    text: (document.activeElement?.textContent || '').trim(),
    testid: document.activeElement?.closest('[data-testid]')?.getAttribute('data-testid'),
  }));
  if (info.testid === 'vault-settled-betagain' && /^bet again/i.test(info.text)) { foundBA = true; break; }
}
console.log('foundBA on tab:', foundBA);
const before = await page.evaluate(() => ({
  hasPlayingActions: !!document.querySelector('[data-testid="vault-playing-actions"]'),
  hasSettledResult: !!document.querySelector('[data-testid="vault-settled-result"]'),
}));
console.log('before Enter:', JSON.stringify(before));
await page.keyboard.press('Enter');
await wait(1000);
const after = await page.evaluate(() => ({
  hasPlayingActions: !!document.querySelector('[data-testid="vault-playing-actions"]'),
  hasSettledResult: !!document.querySelector('[data-testid="vault-settled-result"]'),
  activeElTag: document.activeElement?.tagName,
  activeElText: (document.activeElement?.textContent||'').trim().slice(0,30),
}));
console.log('after Enter on BET AGAIN:', JSON.stringify(after));
await page.screenshot({ path: 'shots-holisticaudit0703/a11y/betagain-keyboard-enter-result.png' });
await browser.close();
