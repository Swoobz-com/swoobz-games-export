import puppeteer from 'puppeteer-core';
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = ms => new Promise(r => setTimeout(r, ms));
const SHOTS = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/vault-run/shots-holisticaudit0703/fairness';
async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button]')];
    return els.find(e => e.offsetParent !== null && e.textContent.trim().toLowerCase() === t.toLowerCase())
      || els.find(e => e.offsetParent !== null && e.textContent.toLowerCase().includes(t.toLowerCase()));
  }, t);
  const el = h.asElement();
  if (!el) return false;
  await el.click();
  return true;
}
const browser = await puppeteer.launch({ executablePath: EXE, headless: false, defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 }, args: ['--window-size=1460,1040','--autoplay-policy=no-user-gesture-required'] });
const page = (await browser.pages())[0];
await page.goto('http://localhost:5307/', { waitUntil: 'networkidle2', timeout: 60000 });
await wait(1000);
const lobbyText = await page.evaluate(() => document.body.textContent);
console.log('LOBBY has "RTP"?', lobbyText.includes('RTP'));
await page.screenshot({ path: `${SHOTS}/lobby-1440x900-no-rtp.png` });
await clickText(page, 'ape in');
await wait(700);
const betEntryText = await page.evaluate(() => document.body.textContent);
console.log('BET ENTRY has "RTP"?', betEntryText.includes('RTP'));
await page.screenshot({ path: `${SHOTS}/betentry-1440x900-rtp-modecards.png` });
await browser.close();
