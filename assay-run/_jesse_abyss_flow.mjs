import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const OUT = 'shots-jesse-abyss-0706'
import { mkdirSync } from 'fs'
mkdirSync(OUT, { recursive: true })

const clickText = (page, rs) => page.evaluate((s) => {
  const r = new RegExp(s, 'i')
  const b = [...document.querySelectorAll('button, div, span')].find(x => r.test((x.textContent || '').trim()) && (x.tagName === 'BUTTON' || getComputedStyle(x).cursor === 'pointer'))
  if (b) { b.click(); return true } return false
}, rs)

// read the TO WIN panel + the CTA + depth-ceiling exactly
const readWin = (page, tag) => page.evaluate((t) => {
  const grab = (re) => {
    const els = [...document.querySelectorAll('*')].filter(e => e.children.length === 0)
    return els.filter(e => re.test((e.textContent||'').trim())).map(e => ({ txt:e.textContent.trim(), fs:getComputedStyle(e).fontSize, color:getComputedStyle(e).color, x:Math.round(e.getBoundingClientRect().x), y:Math.round(e.getBoundingClientRect().y) }))
  }
  // the TO WIN block: find element containing "TO WIN" then its parent's full text
  let toWinBlock = ''
  for (const e of document.querySelectorAll('*')) {
    if ((e.textContent||'').trim().startsWith('TO WIN') && e.getBoundingClientRect().width < 260) { toWinBlock = e.textContent.trim().replace(/\s+/g,' '); break }
  }
  const cta = [...document.querySelectorAll('button')].map(b=>b.textContent.trim()).find(t=>/RUN THE LINE|SECURED|RUGGED|DIVE AGAIN|SAME LINE/i.test(t)) || ''
  return { tag:t, toWinBlock, cta, bignums: grab(/^\d[\d.,]*x?$/).filter(g=>parseFloat(g.fs)>=15) }
}, tag)

async function traceTo(page, target) {
  // continuous snake over NEW cells until CTA count-remaining hits 0 or target reached
  const geo = await page.evaluate(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return { left: r.left, top: r.top, w: r.width } })
  const TILE = geo.w / 14
  const cells = []
  for (let row = 3; row <= 12; row++) { const cols = row % 2 ? [3,4,5,6,7,8,9] : [9,8,7,6,5,4,3]; for (const col of cols) cells.push([col, row]) }
  let placed = 0
  for (const [col, row] of cells) {
    if (placed >= target) break
    await page.mouse.click(geo.left + col * TILE + TILE / 2, geo.top + row * TILE + TILE / 2)
    placed++
    await wait(70)
  }
}

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null, args: ['--autoplay-policy=no-user-gesture-required'] })
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 })
await page.goto(URL, { waitUntil: 'load', timeout: 60000 })
await wait(800)
await clickText(page, 'ENTER THE DIVE'); await wait(500)
console.log('IDLE:', JSON.stringify(await readWin(page,'idle')))

await traceTo(page, 4); await wait(300)
await page.screenshot({ path: OUT + '/f-plot4.png' })
console.log('4POD:', JSON.stringify(await readWin(page,'4pods')))

await traceTo(page, 4); await wait(300)  // extend to 8 total
await page.screenshot({ path: OUT + '/f-plot8.png' })
console.log('8POD:', JSON.stringify(await readWin(page,'8pods')))

await traceTo(page, 4); await wait(300)  // extend to 12 total
await page.screenshot({ path: OUT + '/f-plot12.png' })
console.log('12POD:', JSON.stringify(await readWin(page,'12pods')))

// bump bet to 5 and re-read TO WIN (should scale)
await clickText(page, '^5$'); await wait(300)
console.log('BET5:', JSON.stringify(await readWin(page,'bet5')))

// crop the board (crisp coins) at 12 pods + full frame
await page.screenshot({ path: OUT + '/f-full12.png' })
const geo = await page.evaluate(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return { left: r.left, top: r.top, w: r.width, h:r.height } })
await page.screenshot({ path: OUT + '/f-boardcrop.png', clip: { x: Math.round(geo.left), y: Math.round(geo.top), width: Math.round(Math.min(geo.w,520)), height: Math.round(Math.min(geo.h,520)) } })

// RUN THE LINE
await clickText(page, '^RUN THE LINE'); await wait(500)
await page.screenshot({ path: OUT + '/f-reveal0.png' })
await wait(800); await page.screenshot({ path: OUT + '/f-reveal1.png' })
await wait(1500); await page.screenshot({ path: OUT + '/f-reveal2.png' })
await wait(2500)
console.log('SETTLE:', JSON.stringify(await readWin(page,'settle')))
await page.screenshot({ path: OUT + '/f-settle.png' })

await browser.close()
console.log('done')
