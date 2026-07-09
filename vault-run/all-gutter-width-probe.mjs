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
async function driveToSettled(page) {
  await clickText(page, 'MANUAL')
  await sleep(150)
  const canvas = await page.$('[data-testid="vault-canvas-shell"] canvas')
  const box = canvas ? await canvas.boundingBox() : null
  if (box) {
    outer: for (let gx = 1; gx <= 9; gx++) {
      for (let gy = 1; gy <= 9; gy++) {
        const settled = await page.$('[data-testid="vault-settled-betagain"]')
        if (settled) break outer
        await page.mouse.click(box.x + (box.width * gx) / 10, box.y + (box.height * gy) / 10)
        await sleep(90)
      }
    }
  }
  await sleep(400)
}
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' })
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900 })
await page.goto('http://localhost:5783/', { waitUntil: 'networkidle0' })
await sleep(300)

async function measureAll(label) {
  return page.evaluate((label) => {
    const ids = ['vault-lobby-left','vault-lobby-right','vault-playing-left','vault-playing-right',
      'vault-settled-left','vault-settled-right','vault-gutter-left','vault-gutter-right',
      'vault-settled-result','vault-settled-meta','vault-settled-next','vault-gutter-card-a']
    const out = {}
    for (const id of ids) {
      const stack = document.querySelector(`[data-testid="${id}"]`)
      if (!stack) { out[id] = null; continue }
      const stackW = stack.getBoundingClientRect().width
      const stackMaxWidth = getComputedStyle(stack).maxWidth
      const children = Array.from(stack.children).map(c => ({ w: c.getBoundingClientRect().width, boxSizing: getComputedStyle(c).boxSizing }))
      out[id] = { stackW, stackMaxWidth, children }
    }
    return { label, out }
  }, label)
}

console.log(JSON.stringify(await measureAll('lobby'), null, 2))
await clickText(page, 'ape in'); await sleep(300)
console.log(JSON.stringify(await measureAll('betentry'), null, 2))
const sendIt = await page.$('[data-testid="vault-betentry-confirm"] button')
if (sendIt) await sendIt.click()
await sleep(400)
console.log(JSON.stringify(await measureAll('playing'), null, 2))
await driveToSettled(page)
console.log(JSON.stringify(await measureAll('settled'), null, 2))
await browser.close()
