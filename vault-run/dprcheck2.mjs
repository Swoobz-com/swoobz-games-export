import puppeteer from 'puppeteer-core';
const EXE='C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const [W,H,DPR,TAG] = [parseInt(process.argv[2]||'2560'), parseInt(process.argv[3]||'1440'), parseFloat(process.argv[4]||'1'), process.argv[5]||'D2560'];
const browser=await puppeteer.launch({executablePath:EXE,headless:false,defaultViewport:{width:W,height:H,deviceScaleFactor:DPR},args:[`--window-size=${W+20},${H+140}`,'--autoplay-policy=no-user-gesture-required']});
const page=(await browser.pages())[0];
await page.goto('http://localhost:5181/',{waitUntil:'networkidle2',timeout:60000});
await wait(1800);
const m = await page.evaluate(() => {
  const canvas = document.querySelector('canvas');
  const r = canvas.getBoundingClientRect();
  return { dpr: window.devicePixelRatio, cssW: r.width, cssH: r.height, backingW: canvas.width, backingH: canvas.height, ratioW: canvas.width/r.width, ratioH: canvas.height/r.height, left: r.left, top: r.top };
});
console.log(TAG,'DPR CHECK', JSON.stringify(m));
// crop into a single tile region for pixel inspection - roughly first safe tile top-left area
await page.screenshot({path:`shots/crisp-${TAG}-full.png`});
const cropX = Math.round(m.left + m.cssW*0.18);
const cropY = Math.round(m.top + m.cssH*0.15);
await page.screenshot({path:`shots/crisp-${TAG}-tilezoom.png`, clip:{x:cropX,y:cropY,width:300,height:250}});
await browser.close();
