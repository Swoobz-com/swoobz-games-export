import puppeteer from 'puppeteer-core';
import fs from 'fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const b64 = fs.readFileSync('shots/indep-1440x900-settled2.png').toString('base64');
  await page.goto('data:text/html,<html><body style="margin:0"></body></html>');
  const crop = await page.evaluate(async (b64) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + b64;
    await img.decode();
    const canvas = document.createElement('canvas');
    const x = 1140, y = 0, w = 210, h = 100;
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, -x, -y);
    return canvas.toDataURL('image/png');
  }, b64);
  const data = crop.replace(/^data:image\/png;base64,/, '');
  fs.writeFileSync('shots/indep-crop-cardB.png', Buffer.from(data, 'base64'));
  await browser.close();
})();
