import puppeteer from 'puppeteer-core'
import fs from 'fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const OUT = 'shots-brandqa-0703'
fs.mkdirSync(OUT, { recursive: true })

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 2 } })
const page = (await browser.pages())[0]
await page.goto('http://localhost:5399/', { waitUntil: 'networkidle0' })

const clickText = async (txt) => page.evaluate((t) => {
  const b = [...document.querySelectorAll('button')].find(x => x.textContent && x.textContent.includes(t))
  if (b) { b.click(); return true }
  return false
}, txt)
const bodyText = () => page.evaluate(() => document.body.innerText)

// Frame-vs-cyan proximity scanner: checks EVERY brass-bordered frame element
// (outer card hairline, corner brackets, BOTH specimen bezel rings) against
// EVERY element carrying a volt/cyan color anywhere in its computed style,
// for actual bounding-box proximity/overlap.
async function scanFrameContact(page) {
  return page.evaluate(() => {
    const isBrassColor = (v) => v && (/202,\s*160,\s*64/.test(v) || /#caa040/i.test(v) || /#8f7d5c/i.test(v))
    const frameEls = [...document.querySelectorAll('*')].filter(el => {
      const cs = getComputedStyle(el)
      return isBrassColor(cs.borderTopColor) || isBrassColor(cs.borderColor)
    })
    const isCyanish = (v) => v && (/0,\s*240,\s*255/.test(v) || /41,\s*230,\s*255/.test(v))
    const cyanEls = [...document.querySelectorAll('*')].filter(el => {
      const cs = getComputedStyle(el)
      return isCyanish(cs.color) || isCyanish(cs.backgroundColor) || isCyanish(cs.borderColor) || isCyanish(cs.boxShadow) || isCyanish(cs.textShadow)
    })
    const contacts = []
    for (const f of frameEls) {
      const fr = f.getBoundingClientRect()
      for (const c of cyanEls) {
        const cr = c.getBoundingClientRect()
        // expand cyan element's rect by a rough glow margin estimated from box-shadow blur radius
        const cs = getComputedStyle(c)
        let margin = 0
        const m = cs.boxShadow.match(/(\d+)px\s+(\d+)px\s+(\d+)px/)
        if (m) margin = parseInt(m[3], 10)
        const exp = { left: cr.left - margin, right: cr.right + margin, top: cr.top - margin, bottom: cr.bottom + margin }
        const overlap = !(exp.right < fr.left || exp.left > fr.right || exp.bottom < fr.top || exp.top > fr.bottom)
        if (overlap) {
          contacts.push({
            frameTag: f.tagName, frameRect: { x: fr.x, y: fr.y, w: fr.width, h: fr.height },
            cyanTag: c.tagName, cyanRect: { x: cr.x, y: cr.y, w: cr.width, h: cr.height }, margin,
            cyanStyle: { color: cs.color, bg: cs.backgroundColor, border: cs.borderColor, shadow: cs.boxShadow.slice(0, 100) }
          })
        }
      }
    }
    return { frameCount: frameEls.length, cyanCount: cyanEls.length, contacts }
  })
}

await clickText('ENTER THE ASSAY LINE')
await new Promise(r => setTimeout(r, 150))
let won = false
for (let attempt = 0; attempt < 60 && !won; attempt++) {
  await clickText('CLEAR')
  const box = await page.evaluate(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } })
  const tile = box.w / 32
  for (let col = 0; col < 8; col++) await page.mouse.click(box.x + col * tile + tile / 2, box.y + tile / 2)
  await new Promise(r => setTimeout(r, 40))
  const pace = await bodyText()
  if (pace.includes('PACE: BEAD')) { await clickText('PACE:'); await new Promise(r => setTimeout(r, 30)) }
  await clickText('PLUNGE')
  // Sample contact scan repeatedly through the cascade + landing-spark + settle window
  for (let t = 0; t < 8; t++) {
    await new Promise(r => setTimeout(r, 90))
    const scan = await scanFrameContact(page)
    if (scan.contacts.length > 0) {
      console.log(`CONTACT FOUND at t=${t * 90}ms attempt=${attempt}`, JSON.stringify(scan.contacts, null, 2))
      await page.screenshot({ path: `${OUT}/CONTACT-attempt${attempt}-t${t}.png` })
    }
  }
  const txt = await bodyText()
  if (txt.includes('CLAIM PROVEN')) {
    won = true
    await page.screenshot({ path: `${OUT}/win-full.png` })
    const rightCase = await page.evaluate(() => {
      const els = [...document.querySelectorAll('div')].filter(d => d.textContent?.includes('ASSAY TALLY') && d.children.length < 5)
      return null
    })
    // zoom on right specimen case
    const caseInfo = await page.evaluate(() => {
      const label = [...document.querySelectorAll('div')].find(d => d.textContent === 'ASSAY TALLY')
      if (!label) return null
      let p = label
      for (let i = 0; i < 6 && p; i++) p = p.parentElement
      const r = p.getBoundingClientRect()
      return { x: r.x, y: r.y, w: r.width, h: r.height }
    })
    if (caseInfo) {
      await page.screenshot({ path: `${OUT}/win-right-case-zoom.png`, clip: { x: caseInfo.x - 5, y: caseInfo.y - 5, width: caseInfo.w + 10, height: caseInfo.h + 10 } })
    }
    const finalScan = await scanFrameContact(page)
    console.log('FINAL_SETTLE_SCAN', JSON.stringify(finalScan, null, 2))
  } else if (txt.includes('BAD VEIN')) {
    await new Promise(r => setTimeout(r, 200))
    await clickText('ASSAY AGAIN')
    await new Promise(r => setTimeout(r, 100))
  }
}
console.log('won', won)
await browser.close()
