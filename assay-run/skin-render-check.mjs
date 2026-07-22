import puppeteer from 'puppeteer-core';
import { readFileSync } from 'node:fs';
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const dir = 'C:/Users/Erstr/AppData/Local/Temp/claude/C--Users-Erstr-OneDrive-Bureaublad-swoobz-games-export/eed49dad-7609-4969-843a-cb4e422d24da/scratchpad/assay-skin-review';
const wordmark = readFileSync(dir + '/wordmark_ondark.svg', 'utf8');
const html = `<!doctype html><html><body style="margin:0;background:#07080C">
<div style="padding:50px 70px;background:#07080C">${wordmark.replace('<svg', '<svg style="height:130px;width:auto"')}</div>
<div style="padding:20px 70px;background:#11151c">${wordmark.replace('<svg', '<svg style="height:80px;width:auto"')}</div>
</body></html>`;
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: { width: 1100, height: 380, deviceScaleFactor: 2 }, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'load' });
await new Promise(r => setTimeout(r, 300));
await page.screenshot({ path: dir + '/wordmark-on-dark.png' });
await browser.close();
console.log('done');
