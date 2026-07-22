import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.env.PORT || '5390'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button]')]
    const lc = t.toLowerCase()
    return (
      els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.trim().toLowerCase() === lc) ||
      els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.toLowerCase().includes(lc)) ||
      null
    )
  }, t)
  const el = h.asElement()
  if (!el) return false
  try { await el.click() } catch (e) { return false }
  return true
}
;(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: false, args: ['--autoplay-policy=no-user-gesture-required', '--window-size=1980,1100'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 })
  await page.goto('http://localhost:' + PORT + '/', { waitUntil: 'networkidle0' })
  await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear() } catch (e) {} })
  await page.goto('http://localhost:' + PORT + '/', { waitUntil: 'networkidle0' })
  await wait(900)
  await clickText(page, 'got it')
  await wait(400)

  const before = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="vault-world-card-altseason"]')
    const r = el ? el.getBoundingClientRect() : null
    return { present: !!el, rect: r ? [r.x, r.y, r.width, r.height] : null, disabled: el ? el.disabled : null, mode: (document.body.textContent.match(/BLUECHIPS|ALTSEASON|SHITCOIN/) || [])[0] }
  })
  console.log('BEFORE', JSON.stringify(before))

  const h = await page.$('[data-testid="vault-world-card-altseason"]')
  if (h) {
    try {
      await h.click()
      console.log('click() call did not throw')
    } catch (e) {
      console.log('click() THREW', e.message)
    }
  } else {
    console.log('SELECTOR NOT FOUND')
  }
  await wait(600)
  const after = await page.evaluate(() => (document.body.textContent.match(/BLUECHIPS|ALTSEASON|SHITCOIN/) || [])[0])
  console.log('AFTER mode=', after)

  // try clicking via page.mouse at the element center as a fallback check
  if (after !== 'ALTSEASON') {
    const r = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="vault-world-card-altseason"]')
      const rect = el.getBoundingClientRect()
      return [rect.x + rect.width / 2, rect.y + rect.height / 2]
    })
    console.log('retry via mouse.click at', r)
    await page.mouse.click(r[0], r[1])
    await wait(600)
    const after2 = await page.evaluate(() => (document.body.textContent.match(/BLUECHIPS|ALTSEASON|SHITCOIN/) || [])[0])
    console.log('AFTER2 mode=', after2)
  }

  // canvas rect + a tile click diagnostic (bluechips default board, 5x5)
  await clickText(page, 'send it')
  await wait(1200)
  const cr = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    const r = c.getBoundingClientRect()
    return { left: r.left, top: r.top, width: r.width, height: r.height }
  })
  console.log('CANVAS_RECT', JSON.stringify(cr))
  await browser.close()
})()
