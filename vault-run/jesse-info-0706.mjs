import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '5211'
const OUT = 'shots-jesse-coldstart-0706'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1'] })

async function openInfo(label, vw, vh, dpr) {
  const p = await b.newPage()
  await p.setViewport({ width: vw, height: vh, deviceScaleFactor: dpr })
  await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded' })
  await p.evaluate(() => { try { localStorage.clear() } catch (e) {} })
  await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' }); await wait(900)
  // click the "?" button
  const clicked = await p.evaluate(() => {
    const els = [...document.querySelectorAll('button,[role=button],a')]
    const q = els.find((e) => (e.textContent || '').trim() === '?' && e.offsetParent !== null)
    if (q) { q.click(); return true }
    return false
  })
  await wait(700)
  await p.screenshot({ path: `${OUT}/info-${label}.png` })
  // dump any modal/overlay text
  const txt = await p.evaluate(() => {
    // grab the largest recently-shown dialog-ish container text
    const cands = [...document.querySelectorAll('[role=dialog],[class*=modal],[class*=info],[class*=Info],[class*=overlay],[class*=Overlay],[class*=sheet],[class*=Sheet],[class*=rules],[class*=Rules]')]
    return cands.map((c) => (c.textContent || '').replace(/\s+/g, ' ').trim()).filter((t) => t.length > 20).slice(0, 4)
  })
  console.log(`\n===== ${label} INFO clicked=${clicked} =====`)
  txt.forEach((t, i) => console.log(`  [${i}] ${t.slice(0, 400)}`))
  await p.close()
}
await openInfo('desktop', 1440, 900, 1)
await openInfo('mobile', 390, 844, 2)
await b.close()
console.log('\nDONE info')
