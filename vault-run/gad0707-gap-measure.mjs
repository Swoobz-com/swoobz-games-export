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

    // Read pixel data along a vertical line at the horizontal center of the
    // canvas to find where the tile grid's terminal-panel fill begins (a
    // solid near-black/blue fill distinct from the backdrop photo behind
    // it), giving an approximate first-tile-top Y in canvas-local coords.
    const data = await p.evaluate(() => {
      const hud = document.querySelector('[data-testid="vault-mobile-hud-band"]')
      const canvas = document.querySelector('[data-testid="vault-canvas-shell"] canvas')
      const hr = hud ? hud.getBoundingClientRect() : null
      const cr = canvas ? canvas.getBoundingClientRect() : null
      return { hudBottom: hr ? hr.bottom : null, canvasTop: cr ? cr.top : null }
    })
    console.log(vp.name, world, 'hudBottom', data.hudBottom, 'canvasTop', data.canvasTop, 'gap(hud->canvas)', data.canvasTop - data.hudBottom)
    await p.close()
  }
}
await b.close()
console.log('done')
