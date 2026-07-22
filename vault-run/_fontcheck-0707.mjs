import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.evaluateOnNewDocument(() => { try { localStorage.clear(); sessionStorage.clear(); } catch(e){} });
  await page.goto('http://localhost:5390/', { waitUntil: 'networkidle2', timeout: 60000 });
  await wait(1200);
  const out = await page.evaluate(() => {
    const pick = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      return { text: el.textContent.trim().slice(0,60), font: getComputedStyle(el).fontFamily };
    };
    return {
      introLabel: pick('[data-testid="vault-ctl-intro"] span:first-child'),
      introLine: pick('[data-testid="vault-ctl-intro"] span:nth-child(2)'),
      wagerLabel: pick('[data-testid="vault-ctl-wager"] span'),
      hintOnMobileConsole: pick('[data-testid="bet-console"] *'),
    };
  });
  console.log(JSON.stringify(out, null, 2));
  await browser.close();
})();
