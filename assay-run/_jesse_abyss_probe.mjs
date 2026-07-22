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

// dump every visible text node + its font-size + color, plus button faces
const dump = (page, tag) => page.evaluate((t) => {
  const out = { tag: t, buttons: [], texts: [] }
  for (const b of document.querySelectorAll('button')) {
    const r = b.getBoundingClientRect()
    if (r.width < 1) continue
    const cs = getComputedStyle(b)
    out.buttons.push({ txt: (b.textContent || '').trim().slice(0, 40), fs: cs.fontSize, w: Math.round(r.width), h: Math.round(r.height) })
  }
  // walk text-bearing leaf elements
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  const seen = new Set()
  let n
  while ((n = walk.nextNode())) {
    const txt = n.textContent.trim()
    if (!txt || txt.length > 60) continue
    const el = n.parentElement
    const r = el.getBoundingClientRect()
    if (r.width < 1 || r.height < 1) continue
    const cs = getComputedStyle(el)
    const key = txt + '|' + Math.round(r.x) + '|' + Math.round(r.y)
    if (seen.has(key)) continue
    seen.add(key)
    out.texts.push({ txt, fs: cs.fontSize, color: cs.color, x: Math.round(r.x), y: Math.round(r.y) })
  }
  return out
}, tag)

async function traceLine(page, n) {
  const geo = await page.evaluate(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return { left: r.left, top: r.top, w: r.width } })
  const TILE = geo.w / 14
  const cells = []
  for (let row = 3; row <= 10 && cells.length < n; row++) { const cols = row % 2 ? [3,4,5,6,7,8] : [8,7,6,5,4,3]; for (const col of cols) { if (cells.length < n) cells.push([col, row]) } }
  for (const [col, row] of cells) { await page.mouse.click(geo.left + col * TILE + TILE / 2, geo.top + row * TILE + TILE / 2); await wait(60) }
}

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null, args: ['--autoplay-policy=no-user-gesture-required'] })
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
await page.goto(URL, { waitUntil: 'load', timeout: 60000 })
await wait(800)
await page.screenshot({ path: OUT + '/01-entry.png' })
console.log('=== ENTRY ==='); console.log(JSON.stringify(await dump(page, 'entry'), null, 1))

await clickText(page, 'ENTER THE DIVE')
await wait(500)
await page.screenshot({ path: OUT + '/02-idle-board.png' })
console.log('=== IDLE BOARD (0 pods) ==='); console.log(JSON.stringify(await dump(page, 'idle'), null, 1))

// trace 1 pod
await traceLine(page, 1); await wait(300)
await page.screenshot({ path: OUT + '/03-plot-1.png' })
console.log('=== 1 POD ==='); console.log(JSON.stringify((await dump(page,'p1')).texts.filter(t=>/win|haul|x|mult|\d/i.test(t.txt)), null, 1))

// trace up to 4
await traceLine(page, 4); await wait(300)
await page.screenshot({ path: OUT + '/04-plot-4.png' })
console.log('=== 4 PODS ==='); console.log(JSON.stringify((await dump(page,'p4')).texts.filter(t=>/win|haul|x|mult|\d/i.test(t.txt)), null, 1))

// trace up to 8
await traceLine(page, 8); await wait(300)
await page.screenshot({ path: OUT + '/05-plot-8.png' })
console.log('=== 8 PODS ==='); console.log(JSON.stringify(await dump(page,'p8'), null, 1))

// trace up to 12
await traceLine(page, 12); await wait(300)
await page.screenshot({ path: OUT + '/06-plot-12.png' })
console.log('=== 12 PODS ==='); console.log(JSON.stringify((await dump(page,'p12')).texts.filter(t=>/win|haul|x|mult|\d/i.test(t.txt)), null, 1))

// change bet up (find a + near YOUR BET)
await clickText(page, 'HADAL')
await wait(300)
await page.screenshot({ path: OUT + '/07-hadal.png' })
console.log('=== HADAL DEPTH ==='); console.log(JSON.stringify((await dump(page,'hadal')).texts.filter(t=>/win|haul|x|mult|\d|depth|bet/i.test(t.txt)), null, 1))

await browser.close()
console.log('done')
