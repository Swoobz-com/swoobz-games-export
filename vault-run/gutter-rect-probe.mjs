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
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900 })
await page.goto('http://localhost:5783/', { waitUntil: 'networkidle0' })
await sleep(300)
await clickText(page, 'ape in')
await sleep(300)
const data = await page.evaluate(() => {
  const q = (id) => document.querySelector(`[data-testid="${id}"]`)
  const rect = (el) => el ? el.getBoundingClientRect().toJSON() : null
  return {
    viewportW: window.innerWidth,
    right: rect(q('vault-betentry-right')),
    world: rect(q('vault-betentry-world')),
    yourbet: rect(q('vault-betentry-yourbet')),
    confirm: rect(q('vault-betentry-confirm')),
    sendItBtn: (() => {
      const btns = Array.from(document.querySelectorAll('button'))
      const b = btns.find(b => b.textContent && b.textContent.toLowerCase().includes('send it'))
      return b ? b.getBoundingClientRect().toJSON() : null
    })(),
  }
})
console.log(JSON.stringify(data, null, 2))
await browser.close()
