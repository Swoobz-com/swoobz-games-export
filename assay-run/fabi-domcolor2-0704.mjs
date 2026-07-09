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
    for (const prop of ['color','backgroundColor','borderColor','boxShadow','outlineColor','background','backgroundImage']) {
      const v = cs[prop]
      if (!v) continue
      const matches = v.matchAll(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/g)
      for (const m of matches) {
        const r = +m[1], g = +m[2], b = +m[3]
        // purple/magenta/lilac: r and b both notably higher than g
        if (r > 90 && b > 90 && g < r - 30 && g < b - 30) {
          hits.push({ tag: el.tagName, text: el.textContent?.slice(0,30), prop, val: v })
        }
      }
    }
  }
  return hits
})
console.log('DOM purple-ish style hits:', JSON.stringify(info, null, 2))
await browser.close()
