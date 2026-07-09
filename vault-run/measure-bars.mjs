import puppeteer from 'puppeteer-core';
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = ms => new Promise(r => setTimeout(r, ms));
const W = parseInt(process.argv[2] || '1440'), H = parseInt(process.argv[3] || '900'), TAG = process.argv[4] || 'D1440';
const PORT = process.argv[5] || '5181';

const browser = await puppeteer.launch({
  executablePath: EXE, headless: false,
  defaultViewport: { width: W, height: H, deviceScaleFactor: 1 },
  args: [`--window-size=${W + 20},${H + 140}`],
});
const page = (await browser.pages())[0];
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2', timeout: 60000 });
await wait(1000);

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

async function measurePanel(label) {
  const m = await page.evaluate(() => {
    const panelWrap = document.querySelector('[aria-live="polite"]:not([aria-label])') || document.querySelector('[aria-live="polite"]');
    const child = panelWrap ? panelWrap.firstElementChild : null;
    const r = child ? child.getBoundingClientRect() : null;
    const cols = child ? [...child.children].map(c => {
      const cr = c.getBoundingClientRect();
      return { left: Math.round(cr.left), right: Math.round(cr.right), top: Math.round(cr.top), bottom: Math.round(cr.bottom) };
    }) : [];
    return { height: r ? Math.round(r.height) : null, cols };
  });
  console.log(label, TAG, JSON.stringify(m));
}

await measurePanel('LOBBY-BAR');
await clickText('ape in'); await wait(600);
await measurePanel('BETENTRY-BAR');
await clickText('send it'); await wait(900);
await measurePanel('PLAYING-BAR');

await browser.close();
