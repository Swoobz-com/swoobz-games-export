import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const OUT = 'shots-abyss-deep-0706'
fs.mkdirSync(OUT, { recursive: true })
const wait = ms => new Promise(r => setTimeout(r, ms))
const clickText = (page, re) => page.evaluate((rs) => {
  const r = new RegExp(rs, 'i')
  const b = [...document.querySelectorAll('button, div, span')].find(x => r.test((x.textContent || '').trim()) && (x.tagName === 'BUTTON' || getComputedStyle(x).cursor === 'pointer'))
  if (b) { b.click(); return true } return false
}, re.source)

async function boardGeo(page){ return page.evaluate(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return { left: r.left, top: r.top, w: r.width, h: r.height } }) }
async function traceLine(page, n) {
  const geo = await boardGeo(page); const TILE = geo.w / 14; const cells = []
  for (let row = 2; row <= 13 && cells.length < n; row++) { const cols = row % 2 ? [2,3,4,5,6,7,8,9,10,11] : [11,10,9,8,7,6,5,4,3,2]; for (const col of cols) { if (cells.length < n) cells.push([col, row]) } }
  for (const [col, row] of cells) { await page.mouse.click(geo.left + col * TILE + TILE / 2, geo.top + row * TILE + TILE / 2); await wait(25) }
}
// sample a pixel from a screenshot buffer via canvas in-page not available; use page.screenshot + parse is heavy.
// Instead sample DOM/computed backgrounds + read canvas pixels for board.
async function samplePage(page){
  return page.evaluate(() => {
    const out = {}
    const root = document.querySelector('#root') || document.body
    // full page bg
    out.bodyBg = getComputedStyle(document.body).backgroundColor
    // find the largest fixed/absolute bg element behind panels (control column wrapper)
    // sample the scene canvas pixels at grid points
    const c = document.querySelector('canvas')
    if (c) {
      const g = c.getContext('2d', { willReadFrequently: true })
      const rd = (x,y)=>{ try{ const d = g.getImageData(x,y,1,1).data; return [d[0],d[1],d[2]] }catch(e){ return null } }
      out.boardTL = rd(Math.round(c.width*0.10), Math.round(c.width*0.06))
      out.boardBR = rd(Math.round(c.width*0.90), Math.round(c.width*0.94))
      out.boardMid = rd(Math.round(c.width*0.5), Math.round(c.width*0.5))
    }
    return out
  })
}

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })

// DESKTOP: depth recolors + pixel margins
{
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
  await page.goto(URL, { waitUntil: 'load' }); await wait(700)
  await clickText(page, /ENTER THE DIVE/); await wait(400)
  await traceLine(page, 10); await wait(200)
  // sample margin colors from a full screenshot
  const buf = await page.screenshot({ path: `${OUT}/d-plot-mid.png` })
  await clickText(page, /HADAL/); await wait(500)
  await page.screenshot({ path: `${OUT}/d-hadal.png` })
  await clickText(page, /REEF/); await wait(500)
  await page.screenshot({ path: `${OUT}/d-reef.png` })
  await page.close()
}

// FORCE A BUST: HADAL (16 bombs), paint 40 discs, dense-capture the bust beat
async function attemptBust(page, label){
  await clickText(page, /HADAL/); await wait(300)
  await traceLine(page, 40); await wait(200)
  await clickText(page, /^RUN THE LINE/); await wait(150)
  // dense capture 0..2500ms
  const frames=[]
  for(let i=0;i<16;i++){ await page.screenshot({ path: `${OUT}/${label}-f${String(i).padStart(2,'0')}.png` }); await wait(150) }
  await wait(1500)
  const txt = await page.evaluate(()=>document.body.innerText)
  return /RUGGED BY THE DEEP/i.test(txt) ? 'BUST' : /SECURED THE HAUL/i.test(txt) ? 'WON' : '?'
}
{
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
  await page.goto(URL, { waitUntil: 'load' }); await wait(700)
  await clickText(page, /ENTER THE DIVE/); await wait(400)
  let res='?'
  for(let a=0;a<6 && res!=='BUST';a++){
    res = await attemptBust(page, 'bust')
    console.log('bust attempt', a, res)
    if(res!=='BUST'){ await clickText(page, /DIVE AGAIN|SAME LINE|ENTER THE DIVE/); await wait(500); await clickText(page, /CLEAR/); await wait(200) }
  }
  await page.screenshot({ path: `${OUT}/bust-settled.png` })
  console.log('FINAL BUST RESULT', res)
  await page.close()
}

// WIN MOMENT dense capture (sub rises with haul net) on MIDNIGHT, small line
{
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
  await page.goto(URL, { waitUntil: 'load' }); await wait(700)
  await clickText(page, /ENTER THE DIVE/); await wait(400)
  await traceLine(page, 8); await wait(200)
  await clickText(page, /INSTANT/); await wait(150) // instant pace so win lands fast
  await clickText(page, /^RUN THE LINE/); await wait(80)
  for(let i=0;i<20;i++){ await page.screenshot({ path: `${OUT}/win-f${String(i).padStart(2,'0')}.png` }); await wait(120) }
  const txt = await page.evaluate(()=>document.body.innerText)
  console.log('WIN capture outcome', /SECURED/i.test(txt)?'WON':/RUGGED/i.test(txt)?'BUST':'?')
  await page.close()
}

await browser.close()
console.log('done deep')
