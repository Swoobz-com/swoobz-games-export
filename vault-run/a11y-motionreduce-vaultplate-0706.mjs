import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5302';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2', timeout: 60000 });
  await wait(800);
  const result = await page.evaluate(() => {
    const classes = [
      'vault-card-enter', 'vault-cashout-dramatic', 'vault-spinner',
      'vault-world-card', 'vault-press', 'vault-receipt-toggle', 'vault-corner-btn',
    ];
    const out = {};
    for (const cls of classes) {
      const el = document.createElement('div');
      el.className = cls;
      document.body.appendChild(el);
      const cs = getComputedStyle(el);
      out[cls] = { animationName: cs.animationName, animationDuration: cs.animationDuration, transitionDuration: cs.transitionDuration };
      el.remove();
    }
    return out;
  });
  console.log('reduced-motion computed styles:', JSON.stringify(result, null, 2));
  await browser.close();
})();
