import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new' })
const page = (await browser.pages())[0]
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
await wait(500)
const info = await page.evaluate(() => {
  const els = Array.from(document.querySelectorAll('*'))
  const hits = []
  for (const el of els) {
    const cs = getComputedStyle(el)
    for (const prop of ['color','backgroundColor','borderColor','boxShadow','outlineColor']) {
      const v = cs[prop]
      if (!v) continue
      // parse rgb triples, flag if blue > green+15 and blue>100 and red<blue-40 (true cyan-ish)
      const matches = v.matchAll(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/g)
      for (const m of matches) {
        const r = +m[1], g = +m[2], b = +m[3]
        if (b > 150 && g > 120 && r < 100 && b >= g - 10) {
          hits.push({ tag: el.tagName, cls: el.className?.toString?.().slice(0,40), prop, val: v })
        }
      }
    }
  }
  return hits
})
console.log('DOM cyan-ish style hits:', JSON.stringify(info, null, 2))
await browser.close()
