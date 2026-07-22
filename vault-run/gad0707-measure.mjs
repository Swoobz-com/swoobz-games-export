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

    const rect = await p.evaluate(() => {
      const shell = document.querySelector('[data-testid="vault-canvas-shell"]')
      const canvas = shell ? shell.querySelector('canvas') : null
      const cr = canvas ? canvas.getBoundingClientRect() : null
      return cr ? { top: cr.top, left: cr.left, width: cr.width, height: cr.height } : null
    })
    console.log(`${vp.name} ${world} canvasRect`, JSON.stringify(rect))

    // Clip screenshot of top 260px of the canvas area to visually inspect overlap
    if (rect) {
      await p.screenshot({
        path: `gad0707-crop-${vp.name}-${world}.png`,
        clip: { x: rect.left, y: rect.top, width: rect.width, height: Math.min(220, rect.height) },
      })
    }
    await p.close()
  }
}
await b.close()
console.log('done')
