import puppeteer from 'puppeteer-core'
import fs from 'fs'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '5320'
const OUT = 'shots-jesse-sweep-0707/cleantempo'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
fs.mkdirSync(OUT, { recursive: true })
async function clickText(page, t, within) {
  try { const h = await page.evaluateHandle(({ t, within }) => {
      const root = within ? document.querySelector(within) : document; if (!root) return null
      const els = [...root.querySelectorAll('button,[role=button],a')]
      const norm = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase(); const lc = t.toLowerCase()
      return els.find((e) => e.offsetParent !== null && !e.disabled && norm(e) === lc) || els.find((e) => e.offsetParent !== null && !e.disabled && norm(e).includes(lc)) || null
    }, { t, within }); const el = h.asElement(); if (!el) return false; await el.click(); return true } catch { return false }
}
const status = (p) => p.evaluate(() => document.querySelector('[data-testid="vault-grid-status"]')?.textContent.replace(/\s+/g,' ').trim() || '').catch(()=>'')
const openedN = async (p) => { const m = (await status(p)).match(/OPEN (\d+) of/); return m ? +m[1] : -1 }
async function boardBox(p) { return p.evaluate(() => { const c = document.querySelector('canvas'); if (!c) return null; const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } }).catch(()=>null) }
const isRug = async (p) => /RUGGED|BUST/i.test(await status(p))
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1', '--autoplay-policy=no-user-gesture-required'] })
const p = await b.newPage()
await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear() } catch(e){} })
let done=false
for (let a=1;a<=10 && !done;a++){
  await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' }); await wait(1100)
  await clickText(p,'send it','[data-testid="vault-ctl-cta"]')||await clickText(p,'send it'); await wait(900)
  const box = await boardBox(p); if(!box) continue
  const order=[[0,0],[1,0],[2,0],[3,0],[4,0],[0,1],[1,1]]; let prev=await openedN(p)
  for (const [c,r] of order){
    if (await isRug(p)) break
    await p.mouse.click(box.x+box.w*((c+0.5)/5), box.y+box.h*((r+0.5)/5))
    // wait for register (poll), keep within rhythm window
    let t=0; while(t<1000){ await wait(70); t+=70; const o=await openedN(p); if(o>prev){prev=o;break} }
    await wait(120)
    if (prev>=5){ await p.screenshot({path:`${OUT}/a${a}-open${prev}.png`}); console.log(`attempt${a} reached open ${prev} -> shot`); done=true; break }
  }
  console.log(`attempt${a} ended open=${prev} rug=${await isRug(p)}`)
}
console.log('done', done)
await b.close()
