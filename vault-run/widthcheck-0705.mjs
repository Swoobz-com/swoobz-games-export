import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5567';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button]')];
    return (els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.trim().toLowerCase() === t.toLowerCase()) ||
      els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.toLowerCase().includes(t.toLowerCase())));
  }, t);
  const el = h.asElement();
  if (!el) return false;
  await el.click();
  return true;
}
async function colInfo(page) {
  return page.evaluate(() => {
    const col = document.querySelector('[data-testid="vault-control-column"]');
    if (!col) return null;
    const r = col.getBoundingClientRect();
    return { width: r.width, scrollHeight: col.scrollHeight, clientHeight: col.clientHeight, hasInternalScroll: col.scrollHeight > col.clientHeight + 1 };
  });
}
async function run() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: false, args: ['--window-size=1500,1000'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2' });
  await wait(500);
  console.log('LOBBY', JSON.stringify(await colInfo(page)));
  await clickText(page, 'ape in'); await wait(400);
  console.log('BETENTRY', JSON.stringify(await colInfo(page)));
  await clickText(page, 'SEND IT'); await wait(600);
  console.log('PLAYING', JSON.stringify(await colInfo(page)));
  // force a quick settle via take profit if possible, else manual tap loop
  const took = await clickText(page, 'take profit');
  await wait(600);
  console.log('AFTER-TAKEPROFIT-ATTEMPT', JSON.stringify(await colInfo(page)));
  await browser.close();
}
run();
