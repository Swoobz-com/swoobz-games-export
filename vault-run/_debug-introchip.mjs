import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
async function run() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] })
  for (const vp of [{w:1440,h:900,mobile:false},{w:412,h:915,mobile:true}]) {
    const page = await browser.newPage()
    await page.setViewport({ width: vp.w, height: vp.h, deviceScaleFactor: 1, isMobile: vp.mobile, hasTouch: vp.mobile })
    await page.goto('http://localhost:5390/', { waitUntil: 'networkidle0' })
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
    await page.reload({ waitUntil: 'networkidle0' })
    await wait(500)
    const introPresent = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="vault-ctl-intro"]')
      return el ? { present: true, text: el.textContent.replace(/\s+/g,' ').trim() } : { present: false, bodyHasApeIn: /APE IN\. DODGE THE RUG/i.test(document.body.innerText) }
    })
    console.log(`${vp.w}x${vp.h}:`, JSON.stringify(introPresent))
    await page.close()
  }
  await browser.close()
}
run()
