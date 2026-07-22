import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button],a')]
    const norm = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase()
    return els.find((e) => e.offsetParent !== null && !e.disabled && norm(e).includes(t)) || null
  }, t.toLowerCase())
  const el = h.asElement(); if (!el) return false
  try { await el.click() } catch { return false }
  return true
}
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1', '--autoplay-policy=no-user-gesture-required'] })
const p = await b.newPage()
await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
await p.goto('http://localhost:6473/', { waitUntil: 'networkidle0' })
await wait(700)
console.log('gotit', await clickText(p, 'got it'))
console.log('skip', await clickText(p, 'skip'))
await wait(300)
console.log('phase before ape', await p.evaluate(() => document.querySelector('[data-testid="vault-grid-topbar"]')?.textContent || 'NONE'))
console.log('apein', await clickText(p, 'ape in'))
await wait(700)
console.log('phase after ape', await p.evaluate(() => document.querySelector('[data-testid="vault-grid-topbar"]')?.textContent || 'NONE'))
const info = await p.evaluate(() => {
  const wp = document.querySelector('[data-testid="vault-board-worldpicker"]')
  const testids = [...document.querySelectorAll('[data-testid]')].map(e => e.getAttribute('data-testid')).filter(t => /world|mode|board|ctl/.test(t))
  return { hasWorldpicker: !!wp, wpButtons: wp ? [...wp.querySelectorAll('button')].map(x => (x.textContent||'').replace(/\s+/g,' ').trim().slice(0,20)) : null, testids }
})
console.log(JSON.stringify(info, null, 2))
await b.close()
