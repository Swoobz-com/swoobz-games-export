import puppeteer from 'puppeteer-core'
import fs from 'fs'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '5390'
const OUT = 'shots-jesse-0707'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })

const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1', '--autoplay-policy=no-user-gesture-required'] })
const p = await b.newPage()
p.on('pageerror', (e) => console.log('PAGEERROR', e.message))
p.on('console', (m) => { const t = m.text(); if (/error|warn/i.test(t)) console.log('CONSOLE', m.type(), t.slice(0,140)) })

// clear storage then reload for true cold start
await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear() } catch(e){} })
await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' }); await wait(1200)

// dump full visible text + testids + all buttons
const dump = await p.evaluate(() => {
  const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width>0 && r.height>0 && s.visibility!=='hidden' && s.opacity!=='0' }
  const testids = [...document.querySelectorAll('[data-testid]')].filter(vis).map(e => ({ id: e.getAttribute('data-testid'), txt: (e.textContent||'').replace(/\s+/g,' ').trim().slice(0,80) }))
  const btns = [...document.querySelectorAll('button,[role=button]')].filter(vis).map(e => ({ t: (e.textContent||'').replace(/\s+/g,' ').trim().slice(0,50), disabled: e.disabled }))
  return { bodyText: document.body.innerText.replace(/\n{2,}/g,'\n').slice(0, 2500), testids, btns }
})
console.log('=== BODY TEXT (what the screen literally says) ===')
console.log(dump.bodyText)
console.log('\n=== TESTIDS (visible) ===')
dump.testids.forEach(t => console.log(`  ${t.id}  |  "${t.txt}"`))
console.log('\n=== BUTTONS (visible) ===')
dump.btns.forEach(x => console.log(`  ${x.disabled?'[disabled] ':''}"${x.t}"`))
await p.screenshot({ path: `${OUT}/cold-desktop-1440.png` })

// mobile cold
await p.setViewport({ width: 412, height: 915, deviceScaleFactor: 2 })
await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear() } catch(e){} })
await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' }); await wait(1200)
const mdump = await p.evaluate(() => document.body.innerText.replace(/\n{2,}/g,'\n').slice(0, 2000))
console.log('\n=== MOBILE BODY TEXT ===')
console.log(mdump)
await p.screenshot({ path: `${OUT}/cold-mobile-412.png` })

await b.close()
console.log('\nDONE cold probe')
