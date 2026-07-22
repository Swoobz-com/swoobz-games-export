import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage();
  await page.setContent('<html><body></body></html>');
  const result = await page.evaluate(() => {
    const out = {};
    for (const ls of [0.14, 0.10, 0.06, 0.04, 0.02, 0]) {
      const span = document.createElement('span');
      span.style.fontFamily = "'Geist Mono', ui-monospace, monospace";
      span.style.fontWeight = '700';
      span.style.fontSize = '10px';
      span.style.letterSpacing = ls + 'em';
      span.style.textTransform = 'uppercase';
      span.style.whiteSpace = 'nowrap';
      span.style.position = 'absolute';
      span.textContent = 'view receipt ↓';
      document.body.appendChild(span);
      out[ls] = span.getBoundingClientRect().width;
      document.body.removeChild(span);
    }
    return out;
  });
  console.log(result);
  await browser.close();
})();
