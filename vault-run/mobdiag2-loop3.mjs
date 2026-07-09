import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await page.goto('http://localhost:5500/', { waitUntil: 'networkidle0' });
  await wait(500);
  const before = await page.evaluate(() => document.body.textContent.slice(0,200));
  console.log('BEFORE:', before);
  const apeInBtn = await page.evaluate(() => {
    const els = [...document.querySelectorAll('button')];
    const b = els.find(e => e.textContent.toLowerCase().includes('ape in'));
    return b ? { text: b.textContent, disabled: b.disabled } : null;
  });
  console.log('apeInBtn', JSON.stringify(apeInBtn));
  await page.evaluate(() => {
    const els = [...document.querySelectorAll('button')];
    const b = els.find(e => e.textContent.toLowerCase().includes('ape in'));
    if (b) b.click();
  });
  await wait(700);
  const sendItBtn = await page.evaluate(() => {
    const els = [...document.querySelectorAll('button')];
    const b = els.find(e => e.textContent.includes('SEND IT'));
    return b ? { text: b.textContent, disabled: b.disabled, rect: b.getBoundingClientRect() } : null;
  });
  console.log('sendItBtn', JSON.stringify(sendItBtn));
  await page.evaluate(() => {
    const els = [...document.querySelectorAll('button')];
    const b = els.find(e => e.textContent.includes('SEND IT'));
    if (b) b.click();
  });
  await wait(900);
  const settled = await page.evaluate(() => !!document.querySelector('[data-testid="vault-settledpanel"]'));
  const phaseText = await page.evaluate(() => document.body.textContent.slice(0,300));
  console.log('settled', settled);
  console.log('phaseText', phaseText);
  await browser.close();
})();
