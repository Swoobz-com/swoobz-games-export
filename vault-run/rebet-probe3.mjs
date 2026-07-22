import puppeteer from 'puppeteer-core';
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = ms => new Promise(r => setTimeout(r, ms));
const PORT = process.argv[2] || '5182';

const browser = await puppeteer.launch({
  executablePath: EXE,
  headless: false,
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
  args: [`--window-size=1460,1040`, '--autoplay-policy=no-user-gesture-required'],
});
const page = (await browser.pages())[0];
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2', timeout: 60000 });
await wait(1500);

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

const idxBefore = await page.evaluate(() => document.body.textContent.toLowerCase().indexOf('bet again'));
console.log('idxBefore (lobby)', idxBefore);

console.log('click ape in', await clickText('ape in'));
await wait(700);

const idxAfterApe = await page.evaluate(() => document.body.textContent.toLowerCase().indexOf('bet again'));
console.log('idxAfterApe (bet-entry)', idxAfterApe);
if (idxAfterApe >= 0) {
  const ctx = await page.evaluate((i) => document.body.textContent.slice(Math.max(0,i-80), i+80), idxAfterApe);
  console.log('CTX:', ctx);
}
await browser.close();
