import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '5302'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const viewports = [
  { name: 'Pixel7', width: 390, height: 844 },
  { name: 'iPhone14Pro', width: 393, height: 852 },
]

const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1'] })
for (const vp of viewports) {
  for (const world of ['bluechips', 'shitcoin']) {
    const p = await b.newPage()
    await p.setViewport({ width: vp.width, height: vp.height, isMobile: true, hasTouch: true })
    await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
    await p.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
    await p.reload({ waitUntil: 'networkidle0' })
    await wait(500)
    if (world === 'shitcoin') {
      await p.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, [role="button"]'))
        const el = buttons.find((e) => /SHITCOIN/.test(e.textContent || ''))
        if (el) el.click()
      })
      await wait(300)
    }
    await p.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'))
      const btn = btns.find((b) => /send it/i.test(b.textContent || ''))
      if (btn) btn.click()
    })
    await wait(700)

    const result = await p.evaluate(() => {
      const hud = document.querySelector('[data-testid="vault-mobile-hud-band"]')
      const canvas = document.querySelector('[data-testid="vault-canvas-shell"] canvas')
      if (!canvas) return null
      const hr = hud ? hud.getBoundingClientRect() : null
      const cr = canvas.getBoundingClientRect()
      const ctx = canvas.getContext('2d')
      // canvas internal resolution vs CSS size may differ (DPR) — sample at
      // the canvas's own pixel width/height, at horizontal center.
      const cw = canvas.width
      const ch = canvas.height
      const scaleY = ch / cr.height
      const cx = Math.floor(cw / 2)
      // Scan down from y=0 looking for the terminal-panel fill (a solid
      // dark blue-steel color, distinct from the lighter photographic
      // backdrop) OR the tile's own lighter fill/gold border. We detect the
      // first row where the pixel differs meaningfully in luminance-pattern
      // consistency (a proxy for "structured UI" vs "photo noise") by
      // looking for the specific near-black terminal panel background
      // (roughly rgb 20-40, 25-45, 35-55) which is very flat/uniform.
      let firstPanelRow = null
      for (let y = 0; y < ch; y++) {
        const d = ctx.getImageData(cx, y, 1, 1).data
        const [r, g, bch] = d
        // Terminal panel fill is a flat dark blue-black; sample a few
        // neighboring x to confirm flatness (avoids matching the photo's
        // occasional dark pixel).
        if (r < 45 && g < 55 && bch < 70 && bch >= g) {
          const d2 = ctx.getImageData(Math.max(0, cx - 30), y, 1, 1).data
          const d3 = ctx.getImageData(Math.min(cw - 1, cx + 30), y, 1, 1).data
          const flat = Math.abs(d2[0] - r) < 12 && Math.abs(d3[0] - r) < 12
          if (flat) { firstPanelRow = y; break }
        }
      }
      return {
        cw, ch, scaleY,
        firstPanelRowCanvasPx: firstPanelRow,
        firstPanelRowCssPx: firstPanelRow !== null ? firstPanelRow / scaleY : null,
        canvasTopViewport: cr.top,
        hudBottomViewport: hr ? hr.bottom : null,
      }
    })
    if (result) {
      const tileTopViewport = result.canvasTopViewport + (result.firstPanelRowCssPx ?? 0)
      const gap = result.hudBottomViewport !== null ? tileTopViewport - result.hudBottomViewport : null
      console.log(vp.name, world, 'tileTopViewport~', tileTopViewport.toFixed(1), 'hudBottom', result.hudBottomViewport, 'GAP px =', gap ? gap.toFixed(1) : null)
    } else {
      console.log(vp.name, world, 'no canvas found')
    }
    await p.close()
  }
}
await b.close()
console.log('done')
