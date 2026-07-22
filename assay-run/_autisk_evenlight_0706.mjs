import puppeteer from 'puppeteer-core'
import { PNG } from 'pngjs'
import { mkdirSync } from 'node:fs'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const OUT = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/autisk-evenlight-0706'
mkdirSync(OUT, { recursive: true })
const wait = ms => new Promise(r => setTimeout(r, ms))
const clickText = (page, rs) => page.evaluate((rs) => {
  const r = new RegExp(rs, 'i')
  const b = [...document.querySelectorAll('button, div, span')].find(x => r.test((x.textContent||'').trim()) && (x.tagName==='BUTTON' || getComputedStyle(x).cursor==='pointer'))
  if (b) { b.click(); return true } return false
}, rs)

function stats(png, x0, y0, w, h) {
  const Ls = []
  const X1 = Math.min(png.width, x0 + w), Y1 = Math.min(png.height, y0 + h)
  for (let y = Math.max(0, y0); y < Y1; y++) for (let x = Math.max(0, x0); x < X1; x++) {
    const i = (y * png.width + x) * 4
    Ls.push((0.2126*png.data[i] + 0.7152*png.data[i+1] + 0.0722*png.data[i+2]) / 255)
  }
  Ls.sort((a,b)=>a-b)
  const n = Ls.length
  const mean = Ls.reduce((s,v)=>s+v,0)/n
  const top = Ls.slice(Math.floor(n*0.8)).reduce((s,v)=>s+v,0)/(n-Math.floor(n*0.8))
  const bed = Ls.slice(0, Math.floor(n*0.2)).reduce((s,v)=>s+v,0)/Math.floor(n*0.2)
  return { mean:+(mean*255).toFixed(1), coin:+(top*255).toFixed(1), bed:+(bed*255).toFixed(1) }
}

const browser = await puppeteer.launch({ executablePath: EXE, headless: false, defaultViewport: null, args: ['--autoplay-policy=no-user-gesture-required','--window-size=1500,1050'] })

async function run(vw, vh, dpr, isMob, prefix){
  const page = await browser.newPage()
  await page.setViewport({ width:vw, height:vh, deviceScaleFactor:dpr, isMobile:isMob, hasTouch:isMob })
  await page.goto(URL, { waitUntil:'load', timeout:60000 })
  await wait(1500)
  await clickText(page, 'ENTER THE DIVE|THE DIVE|DIVE IN|ENTER')
  await wait(1200)
  // dismiss first-run coachmark (LABYSSTOWIN: it overlaps the top of the board)
  await page.evaluate(() => {
    const x=[...document.querySelectorAll('button, span, div')].find(e=>{const t=(e.textContent||'').trim(); return (t==='×'||t==='x'||t==='X'||/close|dismiss|got it/i.test(t)) && e.getBoundingClientRect().width<60})
    if(x) x.click()
  })
  await wait(600)
  await page.screenshot({ path:`${OUT}/${prefix}-full.png` })
  const b = await page.evaluate(() => { const r = document.querySelector('canvas').getBoundingClientRect(); return { left:Math.round(r.left), top:Math.round(r.top), right:Math.round(r.right), bottom:Math.round(r.bottom), w:Math.round(r.width), h:Math.round(r.height) } })
  const buf = await page.screenshot({ type:'png' })
  const png = PNG.sync.read(Buffer.from(buf))
  console.log(`\n### ${prefix}  viewport ${vw}x${vh}@${dpr}  board rect ${JSON.stringify(b)} (device px: ${png.width}x${png.height})`)
  const s = dpr // device scale for pixel coords
  const bx=b.left*s, by=b.top*s, bw=b.w*s, bh=b.h*s
  const pw=Math.round(bw*0.24), ph=Math.round(bh*0.24)
  const insX=Math.round(bw*0.05), insY=Math.round(bh*0.05)
  const cx=Math.round(bx+bw/2-pw/2), cy=Math.round(by+bh/2-ph/2)
  const pts = {
    'TL': [Math.round(bx+insX), Math.round(by+insY)],
    'TR': [Math.round(bx+bw-insX-pw), Math.round(by+insY)],
    'BL': [Math.round(bx+insX), Math.round(by+bh-insY-ph)],
    'BR(was dark)': [Math.round(bx+bw-insX-pw), Math.round(by+bh-insY-ph)],
    'CENTER': [cx, cy],
  }
  const R = {}
  for (const [k,[x,y]] of Object.entries(pts)) {
    R[k] = stats(png, x, y, pw, ph)
    // save each corner crop (in CSS px for clip)
    await page.screenshot({ path:`${OUT}/${prefix}-${k.replace(/[^A-Za-z]/g,'')}.png`, clip:{ x:x/s, y:y/s, width:pw/s, height:ph/s } })
    console.log(`  ${k.padEnd(12)} L(0-255) mean=${R[k].mean}  coin=${R[k].coin}  bed=${R[k].bed}`)
  }
  const C = R['CENTER']
  console.log(`  --- pod-face (coin) ratio vs CENTER (1.000 = equal) ---`)
  for (const k of ['TL','TR','BL','BR(was dark)']) console.log(`  ${k.padEnd(12)} coin=${(R[k].coin/C.coin).toFixed(3)}  mean=${(R[k].mean/C.mean).toFixed(3)}  bed=${(R[k].bed/C.bed).toFixed(3)}`)
  await page.close()
}
await run(1440,900,1,false,'D1440')
await run(412,915,2,true,'M412')
await browser.close()
console.log('\nDONE ->', OUT)
