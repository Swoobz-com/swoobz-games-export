import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
async function clickText(page, text) {
  const handle = await page.evaluateHandle((t) => {
    const all = Array.from(document.querySelectorAll('button'))
    return all.find((b) => b.textContent && b.textContent.trim().toLowerCase().includes(t.toLowerCase())) || null
  }, text)
  const el = handle.asElement()
  if (!el) return false
  await el.click()
  return true
}
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' })
for (const w of [1000, 1150, 1280, 1440, 1920, 2560]) {
  const page = await browser.newPage()
  await page.setViewport({ width: w, height: 900 })
  await page.goto('http://localhost:5783/', { waitUntil: 'networkidle0' })
  await sleep(250)
  await clickText(page, 'ape in')
  await sleep(300)
  const data = await page.evaluate((w) => {
    const world = document.querySelector('[data-testid="vault-betentry-world"]')
    const btns = Array.from(document.querySelectorAll('button'))
    const sendIt = btns.find(b => b.textContent && b.textContent.toLowerCase().includes('send it'))
    const worldRect = world ? world.getBoundingClientRect().toJSON() : null
    const sendItRect = sendIt ? sendIt.getBoundingClientRect().toJSON() : null
    return {
      viewportW: w,
      worldRight: worldRect ? worldRect.right : null,
      worldOffscreenPx: worldRect ? Math.max(0, worldRect.right - w) : null,
      sendItRight: sendItRect ? sendItRect.right : null,
      sendItOffscreenPx: sendItRect ? Math.max(0, sendItRect.right - w) : null,
    }
  }, w)
  console.log(JSON.stringify(data))
  await page.close()
}
await browser.close()
