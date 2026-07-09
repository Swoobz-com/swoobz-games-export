import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new' })
const page = await browser.newPage()
await page.emulate({ viewport: { width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true, isLandscape: false } })
await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
await wait(500)
await page.screenshot({ path: './fabi-shots-0704/mobile-lobby.png' })
await page.evaluate(() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('ENTER THE ASSAY LINE')); b && b.click() })
await wait(500)
await page.screenshot({ path: './fabi-shots-0704/mobile-planning.png' })
const info = await page.evaluate(() => {
  const els = Array.from(document.querySelectorAll('*'))
  const hits = []
  for (const el of els) {
    const cs = getComputedStyle(el)
    for (const prop of ['color','backgroundColor','borderColor']) {
      const v = cs[prop]; if (!v) continue
      const m = [...v.matchAll(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/g)]
      for (const mm of m) {
        const r=+mm[1],g=+mm[2],b=+mm[3]
        if (b>150 && g>120 && r<100 && b>=g-10) hits.push({tag:el.tagName, prop, v})
      }
    }
  }
  return hits
})
console.log('mobile cyan DOM hits:', JSON.stringify(info))
const text = await page.evaluate(() => document.body.innerText)
console.log('mobile em-dash:', text.includes('—'), 'casino:', /\b(WIN|JACKPOT|LUCKY|HOT|MEGA)\b/.test(text))
await browser.close()
