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
  const pageDiv = cabinet.parentElement;
  const kids = [...pageDiv.children].map(k=>{const r=k.getBoundingClientRect(); return {tag:k.tagName, cls:(k.className||'').toString().slice(0,30), top:r.top,bottom:r.bottom,h:r.height};});
  const vw = window.innerWidth, vh = window.innerHeight;
  return { vw, vh, kids };
});
console.log(TAG, JSON.stringify(m,null,1));
await browser.close();
