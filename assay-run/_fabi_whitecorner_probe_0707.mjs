import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
async function main() {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: false, args: ['--window-size=1500,1000'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
  await page.goto('http://localhost:5182/', { waitUntil: 'networkidle0' })
  await wait(500)
  const info = await page.evaluate(() => {
    const html = document.documentElement
    const body = document.body
    const root = document.getElementById('root') || document.body.firstElementChild
    function bg(el) { return el ? getComputedStyle(el).backgroundColor : null }
    const elAtTopRight = document.elementFromPoint(window.innerWidth - 3, 3)
    const elAtBottomRight = document.elementFromPoint(window.innerWidth - 3, window.innerHeight - 3)
    const elAtTopLeft = document.elementFromPoint(3, 3)
    function describe(el) {
      if (!el) return null
      const r = el.getBoundingClientRect()
      const cs = getComputedStyle(el)
      return { tag: el.tagName, id: el.id, cls: el.className?.toString().slice(0, 80), bg: cs.backgroundColor, bgImage: cs.backgroundImage?.slice(0, 60), rect: { left: r.left, top: r.top, right: r.right, bottom: r.bottom } }
    }
    return {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      htmlBg: bg(html),
      bodyBg: bg(body),
      rootBg: bg(root),
      elAtTopRight: describe(elAtTopRight),
      elAtBottomRight: describe(elAtBottomRight),
      elAtTopLeft: describe(elAtTopLeft),
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
    }
  })
  console.log(JSON.stringify(info, null, 2))
  await page.screenshot({ path: 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-fabi-finalend-0707/whitecorner-check.png' })
  await wait(200)
  await browser.close()
}
main().catch((e) => { console.error(e); process.exit(1) })
