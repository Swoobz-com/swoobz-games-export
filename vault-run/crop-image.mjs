import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const [, , srcRel, x, y, w, h, outRel] = process.argv;
const src = path.resolve(srcRel);
const out = path.resolve(outRel);
const ext = path.extname(src).slice(1).toLowerCase();
const mime = ext === 'jpg' ? 'jpeg' : ext;
const b64 = fs.readFileSync(src).toString('base64');

(async () => {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: true });
  const page = await browser.newPage();
  const dataUrl = `data:image/${mime};base64,${b64}`;
  await page.setContent(`<img id="i" src="${dataUrl}">`);
  await page.waitForSelector('#i');
  const imgSize = await page.evaluate(() => {
    const img = document.getElementById('i');
    return new Promise((resolve) => {
      if (img.complete) resolve({ w: img.naturalWidth, h: img.naturalHeight });
      else img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    });
  });
  await page.evaluate(({ x, y, w, h }) => {
    const img = document.getElementById('i');
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, -x, -y);
    document.body.innerHTML = '';
    document.body.appendChild(canvas);
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
  }, { x: +x, y: +y, w: +w, h: +h });
  await page.setViewport({ width: +w, height: +h });
  await page.screenshot({ path: out, clip: { x: 0, y: 0, width: +w, height: +h } });
  await browser.close();
  console.log('cropped', imgSize);
})();
