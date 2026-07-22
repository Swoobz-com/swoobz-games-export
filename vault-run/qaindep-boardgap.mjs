import puppeteer from 'puppeteer-core';
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = ms => new Promise(r => setTimeout(r, ms));
const PORT = process.argv[2] || '5181';
for (const [W,H,tag] of [[1440,900,'D1440'],[1920,1080,'D1920'],[390,844,'M390']]) {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: false, defaultViewport: { width: W, height: H, deviceScaleFactor: 1 }, args: [`--window-size=${W+20},${H+140}`] });
  const page = (await browser.pages())[0];
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2', timeout: 60000 });
  await wait(1300);
  const g = await page.evaluate(() => {
    const shell = document.querySelector('[data-testid="vault-canvas-shell"]');
    const shellR = shell ? shell.getBoundingClientRect() : null;
    const panelWrap = document.querySelector('[aria-live="polite"]:not([aria-label])');
    const panelR = panelWrap ? panelWrap.getBoundingClientRect() : null;
    return {
      boardBottom: shellR ? Math.round(shellR.bottom) : null,
      barTop: panelR ? Math.round(panelR.top) : null,
      gap: shellR && panelR ? Math.round(panelR.top - shellR.bottom) : null,
    };
  });
  console.log(tag, JSON.stringify(g));
  await browser.close();
}
