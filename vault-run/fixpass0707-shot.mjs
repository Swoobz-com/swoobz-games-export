import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '5390'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const viewports = [
  { name: 'Pixel7', width: 412, height: 915 },
  { name: 'iPhone14Pro', width: 393, height: 852 },
]
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1'] })
for (const vp of viewports) {
  const p = await b.newPage()
  await p.setViewport({ width: vp.width, height: vp.height, isMobile: true, hasTouch: true })
  await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await p.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
  await p.reload({ waitUntil: 'networkidle0' })
  await wait(500)
  await p.screenshot({ path: `fixpass0707-betentry-${vp.name}.png` })
  await p.close()
}
await b.close()
