import puppeteer from 'puppeteer-core'
import fs from 'fs'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '5390'
const OUT = 'shots-grindqa-mobileloss-0707'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })

async function clickText(page, t, within) {
  const h = await page.evaluateHandle(({ t, within }) => {
    const root = within ? document.querySelector(within) : document
    if (!root) return null
    const els = [...root.querySelectorAll('button,[role=button],a')]
    const norm = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase()
    const lc = t.toLowerCase()
    return els.find((e) => e.offsetParent !== null && !e.disabled && norm(e) === lc) ||
      els.find((e) => e.offsetParent !== null && !e.disabled && norm(e).includes(lc)) || null
  }, { t, within })
  const el = h.asElement(); if (!el) return false
  try { await el.click() } catch { return false }
  return true
}
const topbar = (p) => p.evaluate(() => document.body.innerText.slice(0,40))
async function boardBox(p) { return p.evaluate(() => { const c = document.querySelector('canvas'); if (!c) return null; const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } }) }
async function clearAndGo(p) {
  await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear() } catch(e){} })
  await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' }); await wait(1000)
}
async function tapCell(p, box, col, row, cols) { await p.mouse.click(box.x + box.w * ((col+0.5)/cols), box.y + box.h * ((row+0.5)/cols)) }
async function pointsProbe(p) {
  return p.evaluate(() => {
    const all = [...document.querySelectorAll('body *')]
    const leafHits = all.filter((e) => e.children.length === 0 && /pts\s*·/i.test(e.textContent || ''))
    return { leafHitCount: leafHits.length, leafTexts: leafHits.map((e)=>e.textContent.trim()) }
  })
}

const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1', '--autoplay-policy=no-user-gesture-required'] })
const p = await b.newPage()
p.on('pageerror', (e) => console.log('PAGEERROR', e.message))
await p.setViewport({ width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
await clearAndGo(p)

// set wager to 5 via preset chip in mobile bet-entry panel (ModeSelector+BetConsole bottom sheet)
const clicked5 = await clickText(p, '5')
console.log('mobile wager preset 5 clicked:', clicked5)
await wait(300)
await p.screenshot({ path: `${OUT}/00-wager5.png` })

await clickText(p, 'send it')
await wait(900)
const box = await boardBox(p)
let lossSettled = false
for (let i = 0; i < 25 && !lossSettled; i++) {
  await tapCell(p, box, i % 5, Math.floor(i / 5) % 5, 5)
  await wait(500)
  const dump = await topbar(p)
  if (/SETTLED/i.test(await p.evaluate(() => document.body.innerText))) { lossSettled = true }
}
await wait(600)
await p.screenshot({ path: `${OUT}/01-settled.png` })
const bodyText = await p.evaluate(() => document.body.innerText.replace(/\n{2,}/g,'\n').slice(0,900))
console.log('=== MOBILE SETTLED BODY ===\n' + bodyText)
const pts = await pointsProbe(p)
console.log('MOBILE LOSS points probe:', JSON.stringify(pts))
await b.close()
