import puppeteer from 'puppeteer-core';
const EXE='C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const [PORT,W,H,TAG] = [process.argv[2]||'5181', parseInt(process.argv[3]||'1920'), parseInt(process.argv[4]||'1080'), process.argv[5]||'D1920'];
const browser=await puppeteer.launch({executablePath:EXE,headless:false,defaultViewport:{width:W,height:H,deviceScaleFactor:1},args:[`--window-size=${W+20},${H+140}`,'--autoplay-policy=no-user-gesture-required']});
const page=(await browser.pages())[0];
await page.goto(`http://localhost:${PORT}/`,{waitUntil:'networkidle2',timeout:60000});
await wait(1500);
const info = await page.evaluate(()=>{
  const all = [...document.querySelectorAll('body *')];
  const cyanish = [];
  for(const el of all){
    const cs = getComputedStyle(el);
    const props = [cs.color, cs.backgroundColor, cs.borderColor, cs.borderTopColor, cs.borderBottomColor];
    for(const p of props){
      const m = p.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/);
      if(m){
        const r=+m[1], g=+m[2], b=+m[3];
        if(r < 100 && g > 150 && b > 150 && Math.abs(g-b) < 60){
          cyanish.push({tag: el.tagName, cls: el.className && el.className.toString().slice(0,40), color: p});
        }
      }
    }
  }
  return cyanish;
});
console.log(TAG, 'CYAN-ISH ELEMENTS FOUND:', info.length);
if(info.length) console.log(JSON.stringify(info,null,1));
await browser.close();
