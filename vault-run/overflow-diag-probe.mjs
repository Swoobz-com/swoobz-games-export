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
  const world = document.querySelector('[data-testid="vault-betentry-world"]')
  const yourbet = document.querySelector('[data-testid="vault-betentry-yourbet"]')
  const confirm = document.querySelector('[data-testid="vault-betentry-confirm"]')
  function widest(el, label) {
    let maxRight = 0, maxEl = null
    const walk = (node) => {
      if (node.nodeType === 1) {
        const r = node.getBoundingClientRect()
        if (r.right > maxRight && r.width > 0) { maxRight = r.right; maxEl = node }
        Array.from(node.children).forEach(walk)
      }
    }
    walk(el)
    return { label, parentLeft: el.getBoundingClientRect().left, parentWidth: el.getBoundingClientRect().width, maxRight, widestTag: maxEl ? maxEl.tagName + '.' + (maxEl.className||'') : null, widestText: maxEl ? (maxEl.textContent||'').slice(0,40) : null }
  }
  return [widest(world,'world'), widest(yourbet,'yourbet'), widest(confirm,'confirm')]
})
console.log(JSON.stringify(data, null, 2))
await browser.close()
