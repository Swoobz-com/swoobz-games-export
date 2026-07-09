import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage();
  await page.setContent('<html><body></body></html>');
  const result = await page.evaluate(() => {
    const out = {};
    for (const fs of [26, 22, 20, 19, 18, 17, 16, 15, 14, 13]) {
      const span = document.createElement('span');
      span.style.fontFamily = "'JetBrains Mono', 'Fira Code', monospace";
      span.style.fontWeight = '800';
      span.style.fontSize = fs + 'px';
      span.style.letterSpacing = '0.02em';
      span.style.whiteSpace = 'nowrap';
      span.style.position = 'absolute';
      span.textContent = '1.00 USDC';
      document.body.appendChild(span);
      out[fs] = span.getBoundingClientRect().width;
      document.body.removeChild(span);
    }
    return out;
  });
  console.log(result);
  await browser.close();
})();
