import puppeteer from 'puppeteer-core';
import fs from 'fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const OUTDIR = 'shots-brandcohesion-0707d-mobile';
if (!fs.existsSync(OUTDIR)) fs.mkdirSync(OUTDIR);
const EMDASH = '—';

async function scanEmdash(page) {
  return await page.evaluate((EMDASH) => {
    const hits = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    let n;
    while ((n = walker.nextNode())) {
      const p = n.parentElement;
      if (!p) continue;
      if (p.tagName === 'STYLE' || p.tagName === 'SCRIPT') continue;
      if (n.textContent.includes(EMDASH)) hits.push({ kind: 'text', text: n.textContent.trim().slice(0,140), testid: p.closest('[data-testid]')?.getAttribute('data-testid') || null });
    }
    document.querySelectorAll('[aria-label]').forEach((el) => {
      const v = el.getAttribute('aria-label');
      if (v && v.includes(EMDASH)) hits.push({ kind: 'aria-label', text: v, testid: el.closest('[data-testid]')?.getAttribute('data-testid') || null });
    });
    return hits;
  }, EMDASH);
}

async function run(viewport, label) {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport(viewport);
  await page.evaluateOnNewDocument(() => { try { localStorage.clear(); sessionStorage.clear(); } catch(e){} });
  await page.goto('http://localhost:5390/', { waitUntil: 'networkidle2', timeout: 60000 });
  await wait(1200);
  await page.screenshot({ path: `${OUTDIR}/${label}-01-betentry.png`, fullPage: true });
  let hits = await scanEmdash(page);
  console.log(`[${label}] EMDASH betentry:`, JSON.stringify(hits, null, 2));
  const bodyFont = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
  console.log(`[${label}] body font:`, bodyFont);

  const sendIt = await page.evaluateHandle(() => [...document.querySelectorAll('button')].find(b => b.textContent.includes('SEND IT')));
  if (sendIt && sendIt.asElement()) {
    await sendIt.asElement().click();
    await wait(700);
    await page.screenshot({ path: `${OUTDIR}/${label}-02-playing.png`, fullPage: true });
    const dutchCheck = await page.evaluate(() => document.body.innerText.includes('VERGRENDELD') || document.body.innerText.includes('INZET'));
    console.log(`[${label}] Dutch leak present on mobile playing:`, dutchCheck);
    hits = await scanEmdash(page);
    console.log(`[${label}] EMDASH playing:`, JSON.stringify(hits, null, 2));
  } else {
    console.log(`[${label}] SEND IT button not found`);
  }
  await browser.close();
}

(async () => {
  await run({ width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, 'pixel7');
  await run({ width: 393, height: 852, deviceScaleFactor: 3, isMobile: true, hasTouch: true }, 'iphone14pro');
  console.log('DONE');
})().catch(e => { console.error('FATAL', e); process.exit(1); });
