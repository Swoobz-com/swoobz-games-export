import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const OUT = 'shots-desktop-fill'
fs.mkdirSync(OUT, { recursive: true })
const b = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
})
const p = (await b.pages())[0]
const errs = []
p.on('pageerror', (e) => errs.push(e.message))
p.on('console', (m) => {
  if (m.type() === 'error') errs.push('CONSOLE.ERROR: ' + m.text())
})
const click = async (t) => {
  const h = await p.evaluateHandle(
    (x) => [...document.querySelectorAll('button')].find((b) => b.textContent && b.textContent.includes(x)) || null,
    t,
  )
  const el = h.asElement()
  if (el) {
    await el.click()
    return true
  }
  return false
}
let busted = false
for (let attempt = 0; attempt < 5 && !busted; attempt++) {
  await p.goto(process.argv[2], { waitUntil: 'networkidle2', timeout: 30000 })
  await wait(500)
  await click('ENTER THE ASSAY LINE')
  await wait(400)
  const box = await p.evaluate(() => {
    const c = document.querySelector('canvas')
    const r = c.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width }
  })
  const tile = box.w / 32
  let n = 0
  for (let row = 3; row < 30 && n < 40; row += 2) {
    for (let col = 2; col < 30 && n < 40; col += 3) {
      await p.mouse.click(box.x + col * tile + tile / 2, box.y + row * tile + tile / 2)
      n++
      await wait(10)
    }
  }
  await wait(300)
  await click('PLUNGE')
  await wait(500)
  await p.screenshot({ path: `${OUT}/1440x900-bust-mid.png` })
  await wait(4200)
  const txt = (await p.evaluate(() => document.body.innerText)).replace(/\n/g, ' | ')
  if (txt.includes('BUSTED')) {
    busted = true
    await p.screenshot({ path: `${OUT}/1440x900-bust-settled.png` })
    console.log('BUST captured (attempt ' + attempt + '):', txt.slice(0, 250))
  } else {
    console.log('attempt ' + attempt + ': proven, retrying for a bust...')
  }
}
console.log('errors:', errs)
await b.close()
process.exit(busted && errs.length === 0 ? 0 : 1)
