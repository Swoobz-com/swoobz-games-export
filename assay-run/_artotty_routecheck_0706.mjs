import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const OUT = 'shots-artotty-route-0706'
fs.mkdirSync(OUT, { recursive: true })
const wait = ms => new Promise(r => setTimeout(r, ms))
const clickText = (page, re) => page.evaluate((rs) => {
  const r = new RegExp(rs, 'i')
  const b = [...document.querySelectorAll('button, div, span')].find(x => r.test((x.textContent || '').trim()) && (x.tagName === 'BUTTON' || getComputedStyle(x).cursor === 'pointer'))
  if (b) { b.click(); return true } return false
}, re.source)
async function boardGeo(page){ return page.evaluate(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return { left:r.left, top:r.top, w:r.width, h:r.height } }) }
async function tap(page, c, r){ const g=await boardGeo(page); const T=g.w/14; await page.mouse.click(g.left+c*T+T/2, g.top+r*T+T/2); await wait(40) }
async function dismiss(page){ await page.evaluate(()=>{ const x=[...document.querySelectorAll('button,div,span')].find(e=>(e.textContent||'').trim()==='×' || /got it|dismiss/i.test(e.getAttribute?.('aria-label')||'')); if(x) x.click() }) }

const browser = await puppeteer.launch({ executablePath:EXE, headless:'new', defaultViewport:null })

// ---------- DESKTOP ----------
{
  const page = await browser.newPage()
  await page.setViewport({ width:1440, height:900, deviceScaleFactor:2 })
  const errs=[]; page.on('console',m=>{if(m.type()==='error')errs.push(m.text())}); page.on('pageerror',e=>errs.push('pageerr:'+e.message))
  await page.goto(URL, { waitUntil:'load' }); await wait(700)
  await clickText(page, /ENTER THE DIVE/); await wait(400)
  await dismiss(page); await wait(150)
  // contiguous run of 5 in row 3
  for (const c of [3,4,5,6,7]) await tap(page, c, 3)
  // one FAR isolated pick, same row big gap (col 11 vs 7 = gap of 3 empty cols)
  await tap(page, 11, 3)
  await dismiss(page); await wait(150)
  // state now = 6 picks (< MIN_TRAIL 8) => ARMING copy visible + isolated far pick
  await page.screenshot({ path:`${OUT}/d1-arming-full.png` })
  let g = await boardGeo(page)
  await page.screenshot({ path:`${OUT}/d1-arming-board.png`, clip:{x:Math.round(g.left), y:Math.round(g.top-120), width:Math.round(g.w), height:Math.round(g.h+130)} })
  // add 2 more spread-out far picks => 8 = ARMED
  await tap(page, 3, 9)     // far bottom-left
  await tap(page, 12, 11)   // far bottom-right corner
  await dismiss(page); await wait(150)
  await page.screenshot({ path:`${OUT}/d2-armed-full.png` })
  g = await boardGeo(page)
  await page.screenshot({ path:`${OUT}/d2-armed-board.png`, clip:{x:Math.round(g.left), y:Math.round(g.top-120), width:Math.round(g.w), height:Math.round(g.h+130)} })
  fs.writeFileSync(`${OUT}/desktop-errs.json`, JSON.stringify({errs, g}, null, 2))
  await page.close()
}

// ---------- MOBILE ----------
{
  const page = await browser.newPage()
  await page.setViewport({ width:412, height:915, deviceScaleFactor:3, isMobile:true, hasTouch:true })
  await page.goto(URL, { waitUntil:'load' }); await wait(700)
  await clickText(page, /ENTER THE DIVE/); await wait(400)
  await dismiss(page); await wait(150)
  // mobile board is a panning loupe; tap a few visible cells to show a short run + a spread pick
  const g=await boardGeo(page); const T=g.w/14
  const cells=[[6,6],[7,6],[8,6],[3,3],[11,10]]
  for(const [c,r] of cells){ await page.mouse.click(g.left+c*T+T/2, g.top+r*T+T/2); await wait(60) }
  await dismiss(page); await wait(150)
  await page.screenshot({ path:`${OUT}/m1-planning-full.png` })
  await page.close()
}

await browser.close()
console.log('done')
