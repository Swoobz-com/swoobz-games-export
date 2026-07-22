import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const tapText = async (page, txt) => {
  const handle = await page.evaluateHandle((t) => {
    const btns = [...document.querySelectorAll('button')]
    return btns.find((b) => b.textContent && b.textContent.includes(t)) || null
  }, txt)
  const el = handle.asElement()
  if (!el) return false
  await el.click()
  return true
}
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', args: ['--autoplay-policy=no-user-gesture-required'] })
const page = await browser.newPage()
await page.setViewport({ width: 393, height: 852, deviceScaleFactor: 3, isMobile: true, hasTouch: true })
await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
await wait(400)
await tapText(page, 'ENTER')
await wait(500)
await tapText(page, '×')
await wait(200)
for (let i = 0; i < 40; i++) {
  await page.keyboard.press('Tab')
  const tag = await page.evaluate(() => document.activeElement && document.activeElement.tagName)
  if (tag === 'CANVAS') break
}
const dump = await page.evaluate(() => {
  const c = document.activeElement
  const path = []
  let el = c
  let depth = 0
  while (el && depth < 6) {
    const r = el.getBoundingClientRect()
    path.push({
      depth,
      tag: el.tagName,
      cls: el.className,
      ariaHidden: el.getAttribute && el.getAttribute('aria-hidden'),
      childCount: el.children ? el.children.length : 0,
      rect: { top: r.top, left: r.left, width: r.width, height: r.height },
    })
    el = el.parentElement
    depth++
  }
  // Now for the canvas's parent and grandparent, list ALL children with computed styles.
  const describeChildren = (node) => {
    if (!node) return []
    return [...node.children].map((ch) => {
      const cs = getComputedStyle(ch)
      const r = ch.getBoundingClientRect()
      return {
        tag: ch.tagName,
        ariaHidden: ch.getAttribute('aria-hidden'),
        position: cs.position,
        borderTopColor: cs.borderTopColor,
        borderTopWidth: cs.borderTopWidth,
        rect: { top: r.top, left: r.left, width: r.width, height: r.height },
      }
    })
  }
  const parent = c.parentElement
  const gp = parent ? parent.parentElement : null
  return {
    ancestorPath: path,
    parentChildren: describeChildren(parent),
    grandparentChildren: describeChildren(gp),
  }
})
console.log(JSON.stringify(dump, null, 2))
await browser.close()
