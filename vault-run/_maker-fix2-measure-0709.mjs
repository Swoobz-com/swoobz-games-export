import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const DEVICES = [
  { name: 'iPhone14Pro', width: 393, height: 852, isMobile: true, hasTouch: true, dsf: 2 },
  { name: 'Pixel7', width: 412, height: 915, isMobile: true, hasTouch: true, dsf: 2.6 },
  { name: 'Desktop1440', width: 1440, height: 900, isMobile: false, hasTouch: false, dsf: 1 },
  { name: 'Desktop1920', width: 1920, height: 1080, isMobile: false, hasTouch: false, dsf: 1 },
]
for (const vp of DEVICES) {
  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] })
  const p = await b.newPage()
  await p.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: vp.dsf, isMobile: vp.isMobile, hasTouch: vp.hasTouch })
  await p.goto('http://localhost:5281/', { waitUntil: 'networkidle0' })
  // Measure at t≈0 (first paint) — right after load, minimal wait.
  await wait(120)
  const info = await p.evaluate(() => {
    const btns = [...document.querySelectorAll('button')]
    const matches = btns.filter((b) => /send it/i.test(b.textContent || ''))
    return {
      innerHeight: window.innerHeight,
      matches: matches.map((b) => {
        const r = b.getBoundingClientRect()
        return {
          text: (b.textContent || '').trim(),
          bottom: Math.round(r.bottom * 10) / 10,
          top: Math.round(r.top * 10) / 10,
          belowFoldPx: Math.max(0, Math.round((r.bottom - window.innerHeight) * 10) / 10),
        }
      }),
    }
  })
  console.log(vp.name, JSON.stringify(info))
  await b.close()
}
