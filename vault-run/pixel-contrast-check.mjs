import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button]')];
    return els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.toLowerCase().includes(t.toLowerCase()));
  }, t);
  const el = h.asElement(); if (!el) return false; await el.click(); return true;
}
async function clickCanvasFraction(page, fx, fy) {
  const box = await page.evaluate(() => { const c = document.querySelector('canvas'); if (!c) return null; const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  if (!box) return false;
  await page.mouse.click(box.x + box.w * fx, box.y + box.h * fy);
  return true;
}
function luminance([r,g,b]) {
  const a = [r,g,b].map(v => { v/=255; return v<=0.03928? v/12.92 : Math.pow((v+0.055)/1.055,2.4); });
  return 0.2126*a[0]+0.7152*a[1]+0.0722*a[2];
}
function ratio(fg,bg){ const L1=luminance(fg)+0.05, L2=luminance(bg)+0.05; return L1>L2?L1/L2:L2/L1; }

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto('http://localhost:5501/', { waitUntil: 'networkidle0' });
  await wait(500);
  await clickText(page, 'ape in'); await wait(600);
  await clickText(page, 'SEND IT'); await wait(700);
  const spots = []; for (let gx=1; gx<=9; gx++) for (let gy=1; gy<=9; gy++) spots.push([gx/10, gy/10]);
  for (const [fx, fy] of spots) {
    const settled = await page.evaluate(() => !!document.querySelector('[data-testid="vault-settled-left"]'));
    if (settled) break;
    await clickCanvasFraction(page, fx, fy); await wait(280);
  }
  await wait(2500);
  // real-mouse open (avoid keyboard state interference)
  const box = await page.evaluate(() => { const c = document.querySelector('.vault-receipt-toggle'); const r = c.getBoundingClientRect(); return { x: r.left+r.width/2, y: r.top+r.height/2 }; });
  await page.mouse.click(box.x, box.y);
  await wait(500);

  // Get bounding rects of a dt (label) and dd (value) text, sample center pixel of glyph vs sample bg pixel just outside text run
  const rects = await page.evaluate(() => {
    const body = document.querySelector('[data-testid="vault-settled-receipt-gutter"]');
    const dt = body.querySelector('dt');
    const dd = body.querySelector('dd');
    return { dt: dt.getBoundingClientRect(), dd: dd.getBoundingClientRect(), bodyBg: getComputedStyle(body).backgroundColor };
  });
  console.log('RECTS', JSON.stringify(rects));

  const shot = await page.screenshot({ fullPage: false });
  // Use canvas in node? simpler: use page.evaluate with an offscreen canvas drawing the screenshot isn't trivial in node.
  // Instead use CDP Page.captureScreenshot + decode via a temp <img> in-page canvas trick: draw the live DOM element to canvas is impossible cross-origin-safe for text.
  // Simplest robust approach: use page.$eval with document.elementFromPoint is not pixel color. Use page.accessibility or just sample via getComputedStyle for color/background(true composited via backdrop) -- instead let's use the 'html2canvas'-free approach: read pixel via a canvas drawWindow is not available in headless chrome via puppeteer directly, but we CAN use page.screenshot(clip) region + save file, then load via sharp/jimp. Node lacks those here. Use PNG parsing manually via 'pngjs' if available.
  console.log('bodyBg', rects.bodyBg);
  await page.close();
  await browser.close();
})();
