import puppeteer from 'puppeteer-core'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5401/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const page = (await browser.pages())[0]
const clickText = async (txt) => {
  const handle = await page.evaluateHandle((t) => {
    const btns = [...document.querySelectorAll('button')]
    return btns.find((b) => b.textContent && b.textContent.includes(t)) || null
  }, txt)
  const el = handle.asElement()
  if (!el) return false
  await el.click()
  return true
}

for (const vp of [{ w: 1440, h: 900 }, { w: 1920, h: 1080 }]) {
  await page.setViewport({ width: vp.w, height: vp.h, deviceScaleFactor: 1 })
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
  await wait(400)
  await clickText('ENTER THE ASSAY LINE')
  await wait(400)
  const info = await page.evaluate(() => {
    const canvas = document.querySelector('canvas')
    const boardRect = canvas.getBoundingClientRect()
    // walnut card = canvas's ancestor with border-radius:16 (walnut card wrapper)
    const specimenLabels = [...document.querySelectorAll('*')].filter(
      (el) => el.textContent === 'SPECIMEN CASE · No. I' || el.textContent === 'SPECIMEN CASE · No. II',
    )
    // Find card: walk up from canvas until we hit the element with the walnut background/border
    let node = canvas
    let card = null
    while (node && node !== document.body) {
      const cs = getComputedStyle(node)
      if (cs.borderRadius === '16px') {
        card = node
        break
      }
      node = node.parentElement
    }
    const cardRect = card ? card.getBoundingClientRect() : null
    // Specimen case outer container: absolutely positioned ancestor of the plate label
    const caseRects = specimenLabels.map((lbl) => {
      let n = lbl
      while (n && n.parentElement) {
        if (getComputedStyle(n).position === 'absolute') return n.getBoundingClientRect()
        n = n.parentElement
      }
      return null
    })
    return { boardRect: { h: boardRect.height }, cardRect: cardRect && { top: cardRect.top, bottom: cardRect.bottom, height: cardRect.height }, caseRects: caseRects.map((r) => r && { top: r.top, bottom: r.bottom, height: r.height }) }
  })
  console.log(vp.w + 'x' + vp.h, JSON.stringify(info))
}
await browser.close()
