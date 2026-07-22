import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const DEVICES = { Pixel7: {width:412,height:915}, iPhone14Pro: {width:393,height:852} }
for (const [name, vp] of Object.entries(DEVICES)) {
  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] })
  const p = await b.newPage()
  await p.setViewport({ ...vp, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  await p.goto('http://localhost:5281/', { waitUntil: 'networkidle0' })
  await wait(700)
  const info = await p.evaluate(() => {
    const btns = [...document.querySelectorAll('button')]
    const matches = btns.filter(b => /send it/i.test(b.textContent||''))
    return matches.map(b => {
      const r = b.getBoundingClientRect()
      return { text: (b.textContent||'').trim(), top: r.top, bottom: r.bottom, height: r.height, width: r.width, needsScroll: r.bottom > window.innerHeight, belowFoldPx: Math.max(0, r.bottom - window.innerHeight) }
    })
  })
  console.log(name, JSON.stringify(info))
  await b.close()
}
