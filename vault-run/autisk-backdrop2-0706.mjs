import puppeteer from 'puppeteer-core'
import fs from 'fs'
import { PNG } from 'pngjs'
const CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT=process.argv[2]||'5931'
const OUT='C:/Users/Erstr/AppData/Local/Temp/claude/C--Users-Erstr-OneDrive-Bureaublad-swoobz-games-export/ae0f5ec2-dc4c-47ea-a2ca-1ea3484743ef/scratchpad/autisk-backdrop'
const wait=ms=>new Promise(r=>setTimeout(r,ms))
async function clickText(page,t){const h=await page.evaluateHandle((t)=>{const els=[...document.querySelectorAll('button,[role=button],a')];const n=e=>(e.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();const lc=t.toLowerCase();return els.find(e=>e.offsetParent&&!e.disabled&&n(e)===lc)||els.find(e=>e.offsetParent&&!e.disabled&&n(e).includes(lc))||null},t);const el=h.asElement();if(!el)return false;try{await el.click()}catch{return false}return true}
async function enterBet(page){await clickText(page,'ape in')||await clickText(page,'got it')||await clickText(page,'skip');await wait(900)}
const readPng=p=>PNG.sync.read(fs.readFileSync(p))
const px=(img,x,y)=>{const i=(img.width*Math.round(y)+Math.round(x))*4;return [img.data[i],img.data[i+1],img.data[i+2]]}
const br=a=>Math.round(0.299*a[0]+0.587*a[1]+0.114*a[2])
async function clickCard(page,mode){const el=await page.$(`[data-testid="vault-world-card-${mode}"]`);if(!el)return false;await el.click();return true}
async function readState(page){return page.evaluate(()=>{const bd=document.querySelector('[data-testid="vault-grid-backdrop"]');const cs=getComputedStyle(bd);const m=cs.backgroundImage.match(/rgba\(3,\s*7,\s*13,\s*([\d.]+)\)/);const url=cs.backgroundImage.match(/backdrop-([a-z]+)\.png/);const hdr=document.querySelector('[data-testid="vault-grid-hud-inner"]');return{scrim:m?m[1]:null,art:url?url[1]:null,hud:hdr?hdr.textContent.replace(/\s+/g,' ').trim().slice(0,40):null}})}
async function run(){
  const b=await puppeteer.launch({executablePath:CHROME,headless:false,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required','--force-device-scale-factor=1','--window-size=1460,940']})
  const page=await b.newPage();await page.setViewport({width:1440,height:900,deviceScaleFactor:1})
  const out={}
  await page.goto(`http://localhost:${PORT}/`,{waitUntil:'networkidle2'});await wait(500);await enterBet(page)
  for(const mode of ['bluechips','altseason','shitcoin']){
    const ok=await clickCard(page,mode);await wait(700)
    const st=await readState(page);out[mode]={clicked:ok,...st}
    const f=`${OUT}/v2-betentry-${mode}.png`;await page.screenshot({path:f})
    const img=readPng(f)
    // seam: sample a vertical-ish continuity across gutter+control at a y with visible art gaps
    out[mode].scan={}
    for(const y of [70,175,455]){out[mode].scan['y'+y]=[900,1000,1023,1045,1100,1250,1340].map(x=>br(px(img,x,y)))}
    // crop board-right/control-left seam
    await page.screenshot({path:`${OUT}/v2-seam-${mode}.png`,clip:{x:960,y:60,width:440,height:640}})
  }
  fs.writeFileSync(`${OUT}/v2-results.json`,JSON.stringify(out,null,2))
  console.log('DONE',JSON.stringify(out,null,1))
  await b.close()
}
run().catch(e=>{console.log('FATAL',e.message);process.exit(1)})
