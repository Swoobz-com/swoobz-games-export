import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5309';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
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
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(500);
  console.log('LOBBY headerTape:', await page.evaluate(() => document.querySelector('*')?.ownerDocument && document.body.querySelector('[class]')));
  const dump = async (label) => {
    const txt = await page.evaluate(() => {
      const tape = document.querySelector('span'); // fallback
      const all = [...document.querySelectorAll('span')].map(s=>s.textContent).filter(Boolean);
      return all.filter(t => t.toUpperCase().includes('SESSION') || t.toUpperCase().includes('BALANCE') || t.toUpperCase().includes('ROUND'));
    });
    console.log(label, JSON.stringify(txt));
  };
  await dump('LOBBY');
  await clickText(page, 'ape in');
  await wait(400);
  await clickText(page, 'bluechips', '[data-testid="vault-betentry-world"]');
  await wait(300);
  await dump('BETENTRY');
  await browser.close();
})();
