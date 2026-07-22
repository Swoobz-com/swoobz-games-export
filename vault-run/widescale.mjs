import puppeteer from 'puppeteer-core';
const EXE='C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const PORT=process.argv[2]||'5181';
const S='shots/wide-';

async function clickText(page,t){const h=await page.evaluateHandle((t)=>{const els=[...document.querySelectorAll('button,[role=button]')];return els.find(e=>e.offsetParent!==null&&e.textContent.trim().toLowerCase()===t.toLowerCase())||els.find(e=>e.offsetParent!==null&&e.textContent.toLowerCase().includes(t.toLowerCase()));},t);const el=h.asElement();if(!el){console.log('NO BTN:',t);return false;}await el.click();return true;}

async function measure(page){
  return await page.evaluate(() => {
    const board = document.querySelector('[data-testid="vault-canvas-shell"]');
    const cabinet = board ? board.parentElement : null; // roundCard (cabinet)
    const canvas = document.querySelector('canvas');
    const vw = window.innerWidth, vh = window.innerHeight;
    const cabRect = cabinet ? cabinet.getBoundingClientRect() : null;
    const boardRect = board ? board.getBoundingClientRect() : null;
    const canvasRect = canvas ? canvas.getBoundingClientRect() : null;
    return {
      viewport: { vw, vh },
      cabinet: cabRect ? { w: cabRect.width, h: cabRect.height, top: cabRect.top, bottom: cabRect.bottom } : null,
      board: boardRect ? { w: boardRect.width, h: boardRect.height } : null,
      canvas: canvasRect ? { w: canvasRect.width, h: canvasRect.height, dpr: window.devicePixelRatio } : null,
    };
  });
}

async function run(W,H,TAG){
  const browser=await puppeteer.launch({executablePath:EXE,headless:false,defaultViewport:{width:W,height:H,deviceScaleFactor:1},args:[`--window-size=${W+20},${H+140}`,'--autoplay-policy=no-user-gesture-required']});
  const page=(await browser.pages())[0];
  await page.goto(`http://localhost:${PORT}/`,{waitUntil:'networkidle2',timeout:60000});
  await wait(1500);

  // Lobby / mode-select screenshot
  await page.screenshot({path:S+`${TAG}-01-lobby.png`});
  const lobbyM = await measure(page);
  console.log(TAG, 'LOBBY MEASURE', JSON.stringify(lobbyM));

  // Enter bet-entry
  await clickText(page,'ape in');
  await wait(700);
  await page.screenshot({path:S+`${TAG}-02-bet-entry.png`});
  const betM = await measure(page);
  console.log(TAG, 'BET-ENTRY MEASURE', JSON.stringify(betM));

  // Start playing
  await clickText(page,'send it');
  await wait(900);
  await page.screenshot({path:S+`${TAG}-03-playing.png`});
  const playM = await measure(page);
  console.log(TAG, 'PLAYING MEASURE', JSON.stringify(playM));

  // Compute letterbox % (top+bottom dead space relative to viewport height)
  if (playM.cabinet) {
    const dead = playM.viewport.vh - playM.cabinet.h - 0; // rough — full page includes header/footer beyond cabinet
    console.log(TAG, 'cabinet-only vertical use %:', (playM.cabinet.h/playM.viewport.vh*100).toFixed(1));
  }

  await browser.close();
}

const [W,H,TAG] = [parseInt(process.argv[3]||'1920'), parseInt(process.argv[4]||'1080'), process.argv[5]||'D1920'];
await run(W,H,TAG);
console.log('DONE', TAG);
