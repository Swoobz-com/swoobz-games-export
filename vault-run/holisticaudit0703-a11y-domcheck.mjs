import puppeteer from 'puppeteer-core';
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const PORT = process.argv[2] || '5317';
const browser = await puppeteer.launch({
  executablePath: EXE, headless: false,
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
  args: ['--window-size=1460,1040'],
});
const page = (await browser.pages())[0];
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2', timeout: 60000 });
await wait(1200);

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

await clickText('ape in'); await wait(700);
await clickText('send it'); await wait(900);

const dump = await page.evaluate(() => {
  function all(sel) {
    return [...document.querySelectorAll(sel)].map(e => ({
      text: e.textContent.trim().slice(0,30), tabIndex: e.tabIndex, visible: e.offsetParent !== null,
      testidAncestor: e.closest('[data-testid]')?.getAttribute('data-testid'),
    }));
  }
  return {
    manualBtns: all('button').filter(b => b.text === 'MANUAL'),
    trailBtns: all('button').filter(b => b.text === 'TRAIL'),
    worldBtns: all('button').filter(b => b.testidAncestor === 'vault-corner-world'),
    helpBtns: all('button').filter(b => b.testidAncestor === 'vault-corner-help'),
    totalButtons: document.querySelectorAll('button').length,
    focusableCount: [...document.querySelectorAll('button,a,input,[tabindex]')].filter(e => e.offsetParent !== null && e.tabIndex !== -1).length,
    playingLeftCount: document.querySelectorAll('[data-testid="vault-playing-left"]').length,
    playingRightCount: document.querySelectorAll('[data-testid="vault-playing-right"]').length,
    cornerWorldCount: document.querySelectorAll('[data-testid="vault-corner-world"]').length,
    cornerHelpCount: document.querySelectorAll('[data-testid="vault-corner-help"]').length,
  };
});
console.log(JSON.stringify(dump, null, 2));

// Now do the actual tab walk with document.activeElement identity check
await page.evaluate(() => document.activeElement.blur());
const walk = [];
for (let i = 0; i < 10; i++) {
  await page.keyboard.press('Tab');
  await wait(80);
  const info = await page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return { isBody: true };
    return {
      text: (el.textContent||'').trim().slice(0,20),
      testidAncestor: el.closest('[data-testid]')?.getAttribute('data-testid'),
      // give it a unique marker via a data attribute we set NOW so we can tell if it's literally the same node next time
    };
  });
  walk.push({ step: i+1, ...info });
}
console.log(JSON.stringify(walk, null, 2));
await browser.close();
