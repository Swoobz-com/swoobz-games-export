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
    // headerTape is the first div after mobileContentStackStyle wrapping brand+help+meta+balance
    const spans = [...document.querySelectorAll('span')]
    const brand = spans.find(s => (s.textContent||'').trim() === 'RUG OR RICHES')
    if (!brand) return { error: 'brand not found' }
    const header = brand.closest('div')
    const r = header.getBoundingClientRect()
    return {
      scrollWidth: header.scrollWidth,
      clientWidth: header.clientWidth,
      overflowsX: header.scrollWidth > header.clientWidth + 1,
      rect: { left: r.left, right: r.right, top: r.top, bottom: r.bottom },
      viewportW: window.innerWidth,
    }
  })
  console.log(name, JSON.stringify(info))
  await b.close()
}
