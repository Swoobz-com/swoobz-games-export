import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage();
  await page.setContent('<html><body></body></html>');
  const result = await page.evaluate(() => {
    const out = {};
    const texts = ['view receipt ↓', 'receipt ↓', 'receipt', 'view receipt'];
    for (const fs of [10, 9, 8.5, 8]) {
      out[fs] = {};
      for (const txt of texts) {
        const span = document.createElement('span');
        span.style.fontFamily = "'Geist Mono', ui-monospace, monospace";
        span.style.fontWeight = '700';
        span.style.fontSize = fs + 'px';
        span.style.letterSpacing = '0.14em';
        span.style.textTransform = 'uppercase';
        span.style.whiteSpace = 'nowrap';
        span.style.position = 'absolute';
        span.textContent = txt;
        document.body.appendChild(span);
        out[fs][txt] = span.getBoundingClientRect().width;
        document.body.removeChild(span);
      }
    }
    return out;
  });
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
})();
