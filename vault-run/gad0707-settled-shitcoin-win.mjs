import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '5302'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const viewports = [
  { name: 'Pixel7', width: 390, height: 844 },
  { name: 'iPhone14Pro', width: 393, height: 852 },
]

async function clickCanvasCell(p, col, row, cols, rows) {
  const box = await p.evaluate(() => {
    const c = document.querySelector('[data-testid="vault-canvas-shell"] canvas')
    if (!c) return null
    const r = c.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  })
  if (!box) return
  const fx = (col + 0.5) / cols
  const fy = (row + 0.5) / rows
  await p.mouse.click(box.x + box.w * fx * 0.92 + box.w * 0.04, box.y + box.h * fy * 0.86 + box.h * 0.05)
}
async function isTrulySettled(p) {
  return p.evaluate(() => /SETTLED\s*·\s*(WIN|LOSS)/i.test(document.body.innerText || ''))
}
async function waitSettled(p, maxMs = 6000) {
  const start = Date.now()
  while (Date.now() - start < maxMs) {
    if (await isTrulySettled(p)) return true
    await wait(200)
  }
  return false
}

const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1'] })
for (const vp of viewports) {
  const p = await b.newPage()
  await p.setViewport({ width: vp.width, height: vp.height, isMobile: true, hasTouch: true })
  await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await p.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
  await p.reload({ waitUntil: 'networkidle0' })
  await wait(500)
  await p.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button, [role="button"]'))
    const el = buttons.find((e) => /SHITCOIN/.test(e.textContent || ''))
    if (el) el.click()
  })
  await wait(300)
  await p.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'))
    const btn = btns.find((b) => /send it/i.test(b.textContent || ''))
    if (btn) btn.click()
  })
  await wait(700)
  // reveal 1 safe tile top-left corner area (SHITCOIN has 24/49 mines, ~51% safe odds per tile)
  let revealed = false
  for (let i = 0; i < 8 && !revealed; i++) {
    if (await isTrulySettled(p)) break
    await clickCanvasCell(p, i % 7, 6, 7, 7) // bottom row, try several
    await wait(500)
    const canTakeProfit = await p.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'))
      const btn = btns.find((b) => /take profit/i.test(b.textContent || ''))
      return btn ? !btn.disabled : false
    })
    if (canTakeProfit) revealed = true
  }
  if (revealed) {
    await p.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'))
      const btn = btns.find((b) => /take profit/i.test(b.textContent || ''))
      if (btn) btn.click()
    })
  }
  const ok = await waitSettled(p)
  await wait(300)
  await p.screenshot({ path: `gad0707-settled-shitcoin-${vp.name}.png` })
  const m = await p.evaluate((vh) => {
    const btns = Array.from(document.querySelectorAll('button'))
    const btn = btns.find((b) => /^bet again/i.test((b.getAttribute('aria-label') || '')))
    const r = btn ? btn.getBoundingClientRect() : null
    return { found: !!btn, bottom: r ? r.bottom : null, viewportH: vh, aboveFoldBy: r ? vh - r.bottom : null }
  }, vp.height)
  console.log(vp.name, 'shitcoin settled', 'ok', ok, JSON.stringify(m))
  await p.close()
}
await b.close()
console.log('done')
