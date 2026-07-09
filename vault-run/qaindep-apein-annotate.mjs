import puppeteer from 'puppeteer-core';
import fs from 'fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5201';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(600);

  await page.evaluate(() => {
    const vpCenterX = window.innerWidth / 2;
    const line = document.createElement('div');
    line.style.cssText = `position:fixed;left:${vpCenterX}px;top:0;width:2px;height:100vh;background:red;z-index:999999;`;
    document.body.appendChild(line);
    const label = document.createElement('div');
    label.textContent = 'VIEWPORT CENTER';
    label.style.cssText = `position:fixed;left:${vpCenterX + 6}px;top:6px;color:red;font:bold 12px monospace;z-index:999999;background:rgba(0,0,0,0.6);padding:2px 4px;`;
    document.body.appendChild(label);

    const hero = document.querySelector('[data-testid="vault-lobby-hero"]');
    const apein = document.querySelector('[data-testid="vault-lobby-apein"]');
    const mark = (el, colorLabel, color) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      const box = document.createElement('div');
      box.style.cssText = `position:fixed;left:${r.left - 4}px;top:${r.top - 4}px;width:${r.width + 8}px;height:${r.height + 8}px;border:3px solid ${color};z-index:999998;box-sizing:border-box;`;
      document.body.appendChild(box);
      const lbl = document.createElement('div');
      lbl.textContent = colorLabel;
      lbl.style.cssText = `position:fixed;left:${r.left}px;top:${r.top - 22}px;color:${color};font:bold 13px monospace;z-index:999998;background:rgba(0,0,0,0.7);padding:2px 4px;`;
      document.body.appendChild(lbl);
    };
    mark(hero, 'HERO TEXT (LEFT)', '#FF2E7E');
    mark(apein, 'APE IN BUTTON (RIGHT)', '#00F0FF');
  });

  fs.mkdirSync('shots-apein-right-0703', { recursive: true });
  await page.screenshot({ path: 'shots-apein-right-0703/lobby-1440x900-ANNOTATED.png' });
  await browser.close();
  console.log('done');
})();
