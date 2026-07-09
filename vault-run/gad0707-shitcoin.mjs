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
  const p = await b.newPage()
  await p.setViewport({ width: vp.width, height: vp.height, isMobile: true, hasTouch: true })
  p.on('pageerror', (e) => console.log(`[pageerror ${vp.name}]`, e.message))
  await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await p.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
  await p.reload({ waitUntil: 'networkidle0' })
  await wait(600)

  // click SHITCOIN world card
  const clickedWorld = await p.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button, [role="button"]'))
    const el = buttons.find((e) => /SHITCOIN/.test(e.textContent || ''))
    if (el) { el.click(); return true }
    return false
  })
  await wait(400)
  await p.screenshot({ path: `gad0707-shitcoin-${vp.name}-betentry.png` })

  const clickedSend = await p.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'))
    const btn = btns.find((b) => /send it/i.test(b.textContent || ''))
    if (btn) { btn.click(); return true }
    return false
  })
  await wait(700)
  await p.screenshot({ path: `gad0707-shitcoin-${vp.name}-playing.png` })
  console.log(vp.name, 'clickedWorld', clickedWorld, 'clickedSend', clickedSend)

  // measure HUD text bottom vs first tile top, using DOM testids if present
  const measurement = await p.evaluate(() => {
    const hud = document.querySelector('[data-testid="vault-grid-hud-inner"]') || document.querySelector('[data-testid="DesktopHudRow"]')
    const shell = document.querySelector('[data-testid="vault-canvas-shell"]')
    const canvas = shell ? shell.querySelector('canvas') : null
    return {
      hasHud: !!hud,
      hudRect: hud ? hud.getBoundingClientRect() : null,
      shellRect: shell ? shell.getBoundingClientRect() : null,
      canvasRect: canvas ? canvas.getBoundingClientRect() : null,
    }
  })
  console.log(vp.name, JSON.stringify(measurement))

  await p.close()
}
await b.close()
console.log('done')
