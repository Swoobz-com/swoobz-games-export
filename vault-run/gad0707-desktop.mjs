import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '5302'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

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
const p = await b.newPage()
await p.setViewport({ width: 1440, height: 900 })
p.on('pageerror', (e) => console.log('[pageerror]', e.message))
await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
await p.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
await p.reload({ waitUntil: 'networkidle0' })
await wait(600)
await p.screenshot({ path: 'gad0707-desktop-1440-betentry.png' })

await p.evaluate(() => {
  const btns = Array.from(document.querySelectorAll('button'))
  const btn = btns.find((b) => /send it/i.test(b.textContent || ''))
  if (btn) btn.click()
})
await wait(700)
await p.screenshot({ path: 'gad0707-desktop-1440-playing.png' })

// reveal 1 safe then take profit
let revealed = false
for (let i = 0; i < 8 && !revealed; i++) {
  if (await isTrulySettled(p)) break
  await clickCanvasCell(p, i % 5, 4, 5, 5)
  await wait(500)
  const can = await p.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'))
    const btn = btns.find((b) => /take profit/i.test(b.textContent || ''))
    return btn ? !btn.disabled : false
  })
  if (can) revealed = true
}
if (revealed) {
  await p.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'))
    const btn = btns.find((b) => /take profit/i.test(b.textContent || ''))
    if (btn) btn.click()
  })
}
await waitSettled(p)
await wait(400)
await p.screenshot({ path: 'gad0707-desktop-1440-settled.png' })

// expand receipt to check mixer row removed
const clickedReceipt = await p.evaluate(() => {
  const btns = Array.from(document.querySelectorAll('button, [role="button"], a'))
  const el = btns.find((e) => /view receipt/i.test(e.textContent || ''))
  if (el) { el.click(); return true }
  return false
})
await wait(500)
await p.screenshot({ path: 'gad0707-desktop-1440-receipt.png' })
const receiptText = await p.evaluate(() => document.body.innerText)
console.log('clickedReceipt', clickedReceipt)
console.log('contains "mixer":', /mixer/i.test(receiptText))
console.log('contains "server seed":', /server seed/i.test(receiptText))

await b.close()
console.log('done')
