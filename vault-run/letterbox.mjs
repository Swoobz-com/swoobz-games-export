import puppeteer from 'puppeteer-core';
const EXE='C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const [PORT,W,H,TAG] = [process.argv[2]||'5181', parseInt(process.argv[3]||'1920'), parseInt(process.argv[4]||'1080'), process.argv[5]||'D1920'];
const browser=await puppeteer.launch({executablePath:EXE,headless:false,defaultViewport:{width:W,height:H,deviceScaleFactor:1},args:[`--window-size=${W+20},${H+140}`,'--autoplay-policy=no-user-gesture-required']});
const page=(await browser.pages())[0];
await page.goto(`http://localhost:${PORT}/`,{waitUntil:'networkidle2',timeout:60000});
await wait(1500);
const m = await page.evaluate(() => {
  const board = document.querySelector('[data-testid="vault-canvas-shell"]');
  const cabinet = board.parentElement;
  // page container = cabinet's parent (the flex column with header/cabinet/footer)
  const pageDiv = cabinet.parentElement;
  const pageRect = pageDiv.getBoundingClientRect();
  const cabRect = cabinet.getBoundingClientRect();
  const vw = window.innerWidth, vh = window.innerHeight;
  return { vw, vh, pageRect: {top:pageRect.top,bottom:pageRect.bottom,h:pageRect.height,w:pageRect.width}, cabRect: {w:cabRect.width,h:cabRect.height} };
});
const deadTotal = m.vh - m.pageRect.h;
const deadPct = (deadTotal / m.vh * 100).toFixed(1);
console.log(TAG, JSON.stringify(m));
console.log(TAG, 'TOTAL DEAD (top+bottom) px:', deadTotal.toFixed(1), 'pct of vh:', deadPct+'%');
console.log(TAG, 'cabinet width fill pct of vw:', (m.cabRect.w/m.vw*100).toFixed(1)+'%');
await browser.close();
