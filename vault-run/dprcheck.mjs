import puppeteer from 'puppeteer-core';
const EXE='C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const browser=await puppeteer.launch({executablePath:EXE,headless:false,defaultViewport:{width:1920,height:1080,deviceScaleFactor:2},args:['--window-size=1940,1220','--autoplay-policy=no-user-gesture-required']});
const page=(await browser.pages())[0];
await page.goto('http://localhost:5181/',{waitUntil:'networkidle2',timeout:60000});
await wait(1500);
const m = await page.evaluate(() => {
  const canvas = document.querySelector('canvas');
  const r = canvas.getBoundingClientRect();
  return { dpr: window.devicePixelRatio, cssW: r.width, cssH: r.height, backingW: canvas.width, backingH: canvas.height, ratioW: canvas.width/r.width, ratioH: canvas.height/r.height };
});
console.log('DPR CHECK', JSON.stringify(m));
await page.screenshot({path:'shots/dpr-crop-check-1920dsf2.png', clip:{x:0,y:0,width:1920,height:1080}});
await browser.close();
