import puppeteer from 'puppeteer-core';
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({
  executablePath: EXE, headless: false,
  defaultViewport: { width: 390, height: 844, deviceScaleFactor: 1 },
  args: ['--window-size=410,984', '--autoplay-policy=no-user-gesture-required'],
});
const page = (await browser.pages())[0];
const t0 = Date.now();
await page.goto('http://localhost:5182/', { waitUntil: 'networkidle2', timeout: 60000 });
console.log('networkidle2 reached at', Date.now() - t0, 'ms');
async function snap(delay) {
  await wait(delay);
  const info = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button,[role=button]')].filter(e => e.offsetParent !== null).map(b => b.textContent.trim());
    return { readyState: document.readyState, buttons: btns.slice(0, 10), bodyLen: document.body.textContent.length };
  });
  console.log('T+' + (Date.now() - t0) + 'ms', JSON.stringify(info));
}
await snap(0);
await snap(300);
await snap(300);
await snap(300);
await browser.close();
