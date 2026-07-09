import puppeteer from 'puppeteer-core'
import { spawn, execSync } from 'node:child_process'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 5321
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
function waitForServer(port, t = 45000) { const s = Date.now(); return new Promise((res, rej) => { const go = () => { const rq = http.get({ host: 'localhost', port, path: '/', timeout: 2000 }, (r) => { r.resume(); res(true) }); rq.on('error', () => { if (Date.now() - s > t) rej(new Error('x')); else setTimeout(go, 500) }); rq.on('timeout', () => { rq.destroy(); if (Date.now() - s > t) rej(new Error('x')); else setTimeout(go, 500) }) }; go() }) }
function killTree(pid) { if (!pid) return; try { execSync('taskkill /pid ' + pid + ' /T /F', { stdio: 'ignore' }) } catch (e) {} }
async function clickText(page, text) { const h = await page.evaluateHandle((t) => { const els = [...document.querySelectorAll('button,[role=button],a')]; const n = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase(); const lc = t.toLowerCase(); return els.find((e) => e.offsetParent !== null && n(e) === lc) || els.find((e) => e.offsetParent !== null && n(e).includes(lc)) || null }, text); const el = h.asElement(); if (!el) return false; const b = await el.boundingBox(); if (!b) return false; await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2); return true }
async function clickTestId(page, id) { const h = await page.$('[data-testid="' + id + '"]'); if (!h) return false; const b = await h.boundingBox(); if (!b) return false; await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2); return true }
async function probe(page, tag) {
  return page.evaluate((tag) => {
    const de = document.documentElement
    const topbarEls = [...document.querySelectorAll('*')].filter(e => (e.textContent||'').includes('RUG OR RICHES') && e.children.length < 6)
    const title = topbarEls[0]
    const tr = title ? title.getBoundingClientRect() : null
    return { tag, scrollY: window.scrollY, docScrollTop: de.scrollTop, innerH: window.innerHeight, scrollH: de.scrollHeight, overflowY: de.scrollHeight > window.innerHeight, titleTop: tr ? Math.round(tr.top) : null, titleText: title ? (title.textContent||'').slice(0,40) : null }
  }, tag)
}
async function main() {
  const vite = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: __dirname, shell: true })
  let browser
  try {
    await waitForServer(PORT); await wait(500)
    browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] })
    const page = await browser.newPage(); page.setDefaultTimeout(15000)
    await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
    await page.goto('http://localhost:' + PORT + '/', { waitUntil: 'networkidle0' })
    await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear() } catch (e) {} })
    await page.reload({ waitUntil: 'networkidle0' }); await wait(500)
    await clickText(page, 'got it'); await wait(120); await clickText(page, 'skip'); await wait(150)
    console.log(JSON.stringify(await probe(page, 'betentry')))
    await clickTestId(page, 'vault-world-card-bluechips'); await wait(200)
    console.log(JSON.stringify(await probe(page, 'world-selected')))
    await clickText(page, 'send it'); await wait(1000)
    console.log(JSON.stringify(await probe(page, 'playing-scroll0')))
    await page.evaluate(() => window.scrollTo(0, 0)); await wait(200)
    console.log(JSON.stringify(await probe(page, 'playing-after-scrollTo0')))
  } catch (e) { console.error('FATAL', e) } finally { try { if (browser) await browser.close() } catch (e) {} killTree(vite.pid) }
}
main()
