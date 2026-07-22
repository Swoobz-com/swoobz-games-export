import puppeteer from 'puppeteer-core'
import fs from 'fs'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '5287'
const OUT = 'shots-grindqa-fix5-mobilecheck-0707'
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
async function boardBox(p) { return p.evaluate(() => { const c = document.querySelector('canvas'); if (!c) return null; const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } }) }
async function tapCell(p, box, col, row, cols) { await p.mouse.click(box.x + box.w * ((col+0.5)/cols), box.y + box.h * ((row+0.5)/cols)) }
async function clearAndGo(p) {
  await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear() } catch(e){} })
  await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' }); await wait(700)
}

const DEVICES = [
  { name: 'iPhone14Pro', width: 393, height: 852 },
  { name: 'Pixel7', width: 412, height: 915 },
]

const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1', '--autoplay-policy=no-user-gesture-required'] })
const p = await b.newPage()
p.on('pageerror', (e) => console.log('PAGEERROR', e.message))

for (const d of DEVICES) {
  await p.setViewport({ width: d.width, height: d.height, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
  await clearAndGo(p)
  const sentIt = await clickText(p, 'send it')
  console.log(`[${d.name}] send-it clicked:`, sentIt)
  await wait(900)
  // PLAYING phase: confirm TAKE PROFIT CTA present, visible, in viewport, and
  // that the mobile HUD band (FIX #2) does not overlap/crowd it out.
  const takeProfitInfo = await p.evaluate(() => {
    const btns = [...document.querySelectorAll('button')]
    const tp = btns.find((b) => /take profit/i.test(b.textContent || ''))
    if (!tp) return { present: false }
    const r = tp.getBoundingClientRect()
    return { present: true, rect: { top: r.top, bottom: r.bottom, left: r.left, right: r.right }, inViewport: r.bottom <= window.innerHeight && r.top >= 0, disabled: tp.disabled }
  })
  console.log(`[${d.name}] PLAYING take-profit CTA:`, JSON.stringify(takeProfitInfo))
  await p.screenshot({ path: `${OUT}/${d.name}-playing.png` })

  // Reveal one safe tile then cash out via TAKE PROFIT to reach SETTLED·WIN.
  const box = await boardBox(p)
  if (box) {
    await tapCell(p, box, 1, 1, 5)
    await wait(1500)
    await clickText(p, 'take profit')
    await wait(1500)
  }
  const settledPointsInfo = await p.evaluate(() => {
    const all = [...document.querySelectorAll('span,div')]
    const ptsEl = all.find((e) => /^\+\d+$/.test((e.textContent || '').trim()) )
    const ptsRowEl = all.find((e) => /pts\s*·\s*1\.\d+x/i.test(e.textContent || '') && e.children.length === 0)
    const target = ptsRowEl || ptsEl
    if (!target) return { present: false }
    const r = target.getBoundingClientRect()
    return { present: true, text: target.textContent, rect: { top: r.top, bottom: r.bottom }, inViewport: r.bottom <= window.innerHeight && r.top >= 0, visible: target.offsetParent !== null }
  })
  console.log(`[${d.name}] SETTLED·WIN ownership-points row:`, JSON.stringify(settledPointsInfo))
  await p.screenshot({ path: `${OUT}/${d.name}-settled-win.png`, fullPage: false })

  // ── LOSS case: force a rug by tapping cells until RUGGED, then confirm
  //    the 1.5x-loss-amplified points row is present/visible/in-viewport.
  await clearAndGo(p)
  await clickText(p, 'send it')
  await wait(900)
  const box2 = await boardBox(p)
  let ruggedOk = false
  if (box2) {
    outer: for (let r = 0; r < 5 && !ruggedOk; r++) {
      for (let c = 0; c < 5 && !ruggedOk; c++) {
        await tapCell(p, box2, c, r, 5)
        for (let poll = 0; poll < 15; poll++) {
          await wait(80)
          const tb = await p.evaluate(() => document.querySelector('[data-testid="vault-grid-topbar"]')?.textContent || '')
          if (/RUGGED|SETTLED/i.test(tb)) { ruggedOk = true; break outer }
        }
      }
    }
  }
  await wait(1200)
  const settledLossInfo = await p.evaluate(() => {
    const all = [...document.querySelectorAll('span,div')]
    const ptsRowEl = all.find((e) => /pts\s*·\s*1\.5x/i.test(e.textContent || '') && e.children.length === 0)
    if (!ptsRowEl) return { present: false }
    const r = ptsRowEl.getBoundingClientRect()
    return { present: true, text: ptsRowEl.textContent, rect: { top: r.top, bottom: r.bottom }, inViewport: r.bottom <= window.innerHeight && r.top >= 0, visible: ptsRowEl.offsetParent !== null }
  })
  console.log(`[${d.name}] ruggedOk:`, ruggedOk, ' SETTLED·LOSS 1.5x points row:', JSON.stringify(settledLossInfo))
  await p.screenshot({ path: `${OUT}/${d.name}-settled-loss.png`, fullPage: false })
}

await b.close()
