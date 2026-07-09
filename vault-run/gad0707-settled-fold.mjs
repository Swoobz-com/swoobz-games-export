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

async function settledKind(p) {
  return p.evaluate(() => {
    const t = document.body.innerText || ''
    if (/SETTLED\s*·?\s*LOSS|RUGGED/i.test(t)) return 'LOSS'
    if (/SETTLED\s*·?\s*WIN/i.test(t)) return 'WIN'
    return null
  })
}

const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1'] })
for (const vp of viewports) {
  // WIN: bluechips, reveal 1 tile then TAKE PROFIT
  {
    const p = await b.newPage()
    await p.setViewport({ width: vp.width, height: vp.height, isMobile: true, hasTouch: true })
    await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
    await p.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
    await p.reload({ waitUntil: 'networkidle0' })
    await wait(500)
    await p.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'))
      const btn = btns.find((b) => /send it/i.test(b.textContent || ''))
      if (btn) btn.click()
    })
    await wait(700)
    await clickCanvasCell(p, 4, 4, 5, 5) // bottom-right corner, low mine density there hopefully
    await wait(700)
    let kind = await settledKind(p)
    let tries = 0
    while (!kind && tries < 5) {
      await clickCanvasCell(p, tries, 3, 5, 5)
      await wait(600)
      kind = await settledKind(p)
      tries++
    }
    if (kind !== 'LOSS') {
      await p.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'))
        const btn = btns.find((b) => /take profit/i.test(b.textContent || ''))
        if (btn && !btn.disabled) btn.click()
      })
      await wait(900)
      kind = await settledKind(p)
    }
    await p.screenshot({ path: `gad0707-settled-${vp.name}-${kind || 'unknown'}.png` })
    const m = await p.evaluate((vh) => {
      const btns = Array.from(document.querySelectorAll('button'))
      const btn = btns.find((b) => /^bet again/i.test((b.getAttribute('aria-label') || '')))
      const r = btn ? btn.getBoundingClientRect() : null
      return {
        found: !!btn,
        bottom: r ? r.bottom : null,
        top: r ? r.top : null,
        viewportH: vh,
        aboveFoldBy: r ? vh - r.bottom : null,
      }
    }, vp.height)
    console.log(vp.name, kind, JSON.stringify(m))
    await p.close()
  }

  // LOSS: shitcoin, click tiles until rug
  {
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
    let kind = null
    outer: for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 7; col++) {
        await clickCanvasCell(p, col, row, 7, 7)
        await wait(600)
        kind = await settledKind(p)
        if (kind) break outer
      }
    }
    await p.screenshot({ path: `gad0707-settled-${vp.name}-${kind || 'unknown'}-shitcoin.png` })
    const m = await p.evaluate((vh) => {
      const btns = Array.from(document.querySelectorAll('button'))
      const btn = btns.find((b) => /^bet again/i.test((b.getAttribute('aria-label') || '')))
      const r = btn ? btn.getBoundingClientRect() : null
      return {
        found: !!btn,
        bottom: r ? r.bottom : null,
        top: r ? r.top : null,
        viewportH: vh,
        aboveFoldBy: r ? vh - r.bottom : null,
      }
    }, vp.height)
    console.log(vp.name, kind, 'shitcoin', JSON.stringify(m))
    await p.close()
  }
}
await b.close()
console.log('done')
