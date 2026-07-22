import puppeteer from 'puppeteer-core';
import fs from 'fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const OUTDIR = 'shots-brandcohesion-0707c';
if (!fs.existsSync(OUTDIR)) fs.mkdirSync(OUTDIR);

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.evaluateOnNewDocument(() => { try { localStorage.clear(); sessionStorage.clear(); } catch(e){} });
  await page.goto('http://localhost:5390/', { waitUntil: 'networkidle2', timeout: 60000 });
  await wait(1200);

  const blueBtn = await page.$('[data-testid="vault-world-card-bluechips"]');
  await blueBtn.click();
  await wait(300);

  for (let attempt = 0; attempt < 5; attempt++) {
    const sendIt = await page.evaluateHandle(() => [...document.querySelectorAll('button')].find(b => b.textContent.includes('SEND IT') || /bet again/i.test(b.textContent)));
    if (sendIt && sendIt.asElement()) { await sendIt.asElement().click(); await wait(600); }
    // Board visually spans ~x253-843,y202-780 within the 1440x900 viewport (measured live via screenshot);
    // canvas DOM box (73.6..1022.4) is wider than the drawn grid (backdrop art fills the rest). Click tile (0,0) center.
    await page.mouse.click(323, 274);
    await wait(500);
    const isSettled = await page.evaluate(() => !!document.querySelector('[data-testid="vault-hero-overlay"]'));
    if (isSettled) {
      await page.screenshot({ path: `${OUTDIR}/attempt${attempt}-instant.png` });
      const heroText = await page.evaluate(() => document.querySelector('[data-testid="vault-hero-overlay"]')?.innerText || null);
      const caption = await page.evaluate(() => document.querySelector('[data-testid="vault-settled-board-caption"]')?.textContent || null);
      console.log(`attempt${attempt} SETTLED (rug on first tap). hero=`, heroText, 'caption=', caption);
      continue;
    }
    const cashOutBtn = await page.evaluateHandle(() => [...document.querySelectorAll('button')].find(b => /take profit/i.test(b.textContent) && !b.disabled));
    if (cashOutBtn && cashOutBtn.asElement()) {
      await cashOutBtn.asElement().click();
      await wait(120); // capture EARLY while hero overlay fully visible
      await page.screenshot({ path: `${OUTDIR}/attempt${attempt}-WIN-hero.png` });
      const heroText = await page.evaluate(() => document.querySelector('[data-testid="vault-hero-overlay"]')?.innerText || null);
      const caption = await page.evaluate(() => document.querySelector('[data-testid="vault-settled-board-caption"]')?.textContent || null);
      console.log(`attempt${attempt} WIN hero=`, heroText, 'caption=', caption);
      const rect = await page.evaluate(() => {
        const el = document.querySelector('[data-testid="vault-hero-overlay"]');
        const inner = el?.querySelector('span'); // eyebrow span first
        const labelStack = el?.children?.[2]; // heroLabelStack (backdrop, image wrap, label stack)
        const lr = labelStack?.getBoundingClientRect();
        return lr ? { x: lr.x, y: lr.y, width: lr.width, height: lr.height } : null;
      });
      console.log('LABEL STACK RECT:', JSON.stringify(rect));
      break;
    } else {
      const texts = await page.evaluate(() => [...document.querySelectorAll('button')].map(b => ({t: b.textContent.trim(), disabled: b.disabled})));
      console.log(`attempt${attempt}: no cashout button available, retrying. buttons=`, JSON.stringify(texts));
    }
  }

  await browser.close();
  console.log('DONE');
})().catch(e => { console.error('FATAL', e); process.exit(1); });
