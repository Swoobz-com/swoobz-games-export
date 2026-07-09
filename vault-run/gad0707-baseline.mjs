import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '5302'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const viewports = [
  { name: 'Pixel7', width: 390, height: 844 },
  { name: 'iPhone14Pro', width: 393, height: 852 },
]

async function clickWorld(page, worldLabel) {
  // Click a world card by visible text if present (bet-entry world picker)
  const found = await page.evaluate((label) => {
    const els = Array.from(document.querySelectorAll('*'))
    const el = els.find((e) => e.children.length === 0 && e.textContent && e.textContent.trim() === label)
    if (el) {
      let cur = el
      for (let i = 0; i < 5 && cur; i++) {
        if (cur.getAttribute && cur.getAttribute('role') === 'button') { cur.click(); return true }
        cur.onclick || cur.tagName === 'BUTTON'
        if (cur.tagName === 'BUTTON') { cur.click(); return true }
        cur = cur.parentElement
      }
    }
    return false
  }, worldLabel)
  return found
}

const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1'] })
for (const vp of viewports) {
  const p = await b.newPage()
  await p.setViewport({ width: vp.width, height: vp.height, isMobile: true, hasTouch: true })
  p.on('console', (m) => { if (m.type() === 'error') console.log(`[console ${vp.name}]`, m.text()) })
  p.on('pageerror', (e) => console.log(`[pageerror ${vp.name}]`, e.message))
  await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await p.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
  await p.reload({ waitUntil: 'networkidle0' })
  await wait(600)
  await p.screenshot({ path: `gad0707-baseline-${vp.name}-betentry.png` })

  // Try to find and click SEND IT / GO button to enter playing phase
  await p.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'))
    const btn = btns.find((b) => /send it/i.test(b.textContent || ''))
    if (btn) btn.click()
  })
  await wait(700)
  await p.screenshot({ path: `gad0707-baseline-${vp.name}-playing.png` })

  await p.close()
}
await b.close()
console.log('done')
