import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const clickText = (page, re) => page.evaluate((rs) => {
  const r = new RegExp(rs, 'i')
  const b = [...document.querySelectorAll('button, div, span')].find((x) => r.test((x.textContent||'').trim()) && (x.tagName==='BUTTON' || getComputedStyle(x).cursor==='pointer'))
  if (b) { b.click(); return true }
  return false
}, re.source)
async function mobilePan(page, col, row, dim) {
  const info = await page.evaluate(() => {
    const c = document.querySelector('canvas'); if (!c) return null
    const wrap = c.parentElement; const wr = wrap.getBoundingClientRect()
    return { wrapLeft: wr.left, wrapTop: wr.top, wrapW: wr.width, wrapH: wr.height, scrollW: wrap.scrollWidth, scrollH: wrap.scrollHeight }
  })
  if (!info) return null
  const TILE = info.scrollW / dim
  const targetX = (col + 0.5) * TILE, targetY = (row + 0.5) * TILE
  const dsl = Math.max(0, Math.min(info.scrollW - info.wrapW, targetX - info.wrapW/2))
  const dst = Math.max(0, Math.min(info.scrollH - info.wrapH, targetY - info.wrapH/2))
  await page.evaluate((sl,st) => { const c=document.querySelector('canvas'); const wrap=c.parentElement; wrap.scrollLeft=sl; wrap.scrollTop=st }, dsl, dst)
  await wait(30)
  const r2 = await page.evaluate(() => { const c=document.querySelector('canvas'); const wrap=c.parentElement; const wr=wrap.getBoundingClientRect(); return {left:wr.left, top:wr.top, scrollLeft:wrap.scrollLeft, scrollTop:wrap.scrollTop} })
  const x = r2.left - r2.scrollLeft + targetX, y = r2.top - r2.scrollTop + targetY
  await page.touchscreen.tap(x,y)
}
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const page = await browser.newPage()
await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true })
await page.goto('http://localhost:5182/', { waitUntil: 'load' })
await wait(500)
await page.evaluate(()=>{try{window.localStorage.clear()}catch{}})
await page.reload({waitUntil:'load'}); await wait(450)
await page.keyboard.press('Escape').catch(()=>{})
await clickText(page, /ENTER THE DIVE/); await wait(300)
await clickText(page, /HADAL/i); await wait(150)
await clickText(page, /^PACE:/); await wait(100) // toggle away from default staggered if needed -- check label first actually
const dim = 14
const cells = []
for (const row of [3,4]) for (let col=3; col<8; col++) cells.push([col,row])
for (const [col,row] of cells) { await mobilePan(page, col, row, dim); await wait(60) }
await wait(150)
await clickText(page, /^RUN THE LINE/)
let settled = false
for (let i=0;i<90 && !settled;i++){ await wait(80); const t = await page.evaluate(()=>document.body.innerText); if(/RUGGED BY THE DEEP|SECURED THE HAUL/.test(t)) settled = true }
await wait(300)
const full = await page.evaluate(() => document.body.innerText)
console.log('SETTLED REACHED:', settled)
console.log('=== FULL BODY TEXT AT SETTLED (mobile 412) ===')
console.log(full)
await page.screenshot({path:'shots-visregqa-herofix-0707/DEBUG-mobile-settled-full.png'})
await browser.close()
