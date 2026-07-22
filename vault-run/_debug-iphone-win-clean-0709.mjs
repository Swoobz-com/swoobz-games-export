import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
function computeGridLayout(W,H,gridSize,minimalBands){const wide=W/H>1.2;const topReserved=minimalBands?H*0.035:H*(wide?0.12:0.15);const bottomReserved=minimalBands?H*0.035:H*(wide?0.14:0.18);const sideFrac=minimalBands?0.04:0.08;const safeW=W*(1-sideFrac*2);const safeH=(H-topReserved-bottomReserved)*0.96;const available=Math.min(safeW,safeH);const FIXED_TILE=96,FIXED_GAP=16;const fixedFull=FIXED_TILE*gridSize+FIXED_GAP*(gridSize-1);if(minimalBands&&fixedFull<=available+0.5){const x=(W-fixedFull)/2;const bandCenterY=topReserved+(H-topReserved-bottomReserved)/2;const y=bandCenterY-fixedFull/2;return{x,y,tile:FIXED_TILE,gap:FIXED_GAP,full:fixedFull}}const gap=Math.max(6,available*0.026);const tile=(available-gap*(gridSize-1))/gridSize;const full=tile*gridSize+gap*(gridSize-1);const x=(W-full)/2;const bandCenterY=topReserved+(H-topReserved-bottomReserved)/2;const y=bandCenterY-full/2;return{x,y,tile,gap,full}}
async function boardBox(p){return p.evaluate(()=>{const c=document.querySelector('canvas');if(!c)return null;const r=c.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}})}
async function touchCell(p,box,col,row,cols,minimalBands){const grid=computeGridLayout(box.w,box.h,cols,minimalBands);const cx=box.x+grid.x+col*(grid.tile+grid.gap)+grid.tile/2;const cy=box.y+grid.y+row*(grid.tile+grid.gap)+grid.tile/2;await p.touchscreen.tap(cx,cy)}
async function findRealBtn(p, re){return p.evaluate((re)=>{const btns=[...document.querySelectorAll('button')];const el=btns.find(b=>new RegExp(re,'i').test(b.textContent||'')&&!b.disabled);if(!el)return null;const r=el.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}},re)}

let attempts = 0
let outcome = null
while (attempts < 8 && outcome !== 'WIN') {
  attempts++
  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] })
  const p = await b.newPage()
  await p.setViewport({ width: 393, height: 852, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  await p.goto('http://localhost:5281/', { waitUntil: 'networkidle0' })
  await p.evaluate(() => { try{localStorage.clear();sessionStorage.clear()}catch(e){} })
  await p.goto('http://localhost:5281/', { waitUntil: 'networkidle0' })
  await wait(700)
  const sendIt = await findRealBtn(p, 'send it')
  await p.touchscreen.tap(sendIt.x, sendIt.y)
  await wait(900)
  const cells = [[1,1],[2,1],[3,1]]
  let lost = false
  for (const [c,r] of cells) {
    const box = await boardBox(p)
    await touchCell(p, box, c, r, 5, true)
    await wait(700)
    const rugged = await p.evaluate(() => /RUGGED/i.test(document.body.innerText))
    if (rugged) { lost = true; break }
  }
  if (!lost) {
    const cashout = await findRealBtn(p, 'take profit')
    if (cashout) { await p.touchscreen.tap(cashout.x, cashout.y); await wait(900) }
  }
  const result = await p.evaluate(() => {
    const settled = !!document.querySelector('[data-testid="vault-settledpanel"]')
    const won = /SETTLED\s*·\s*WIN/i.test(document.body.innerText)
    return { settled, won }
  })
  outcome = result.won ? 'WIN' : 'LOSS'
  if (outcome === 'WIN') {
    await wait(2200)
    const measured = await p.evaluate(() => {
      const cap = document.querySelector('[data-testid="vault-settled-board-caption"]')
      const panel = document.querySelector('[data-testid="vault-settledpanel"]')
      if (!cap||!panel) return {error:'missing'}
      const cr = cap.getBoundingClientRect().toJSON()
      const pr = panel.getBoundingClientRect().toJSON()
      return { captionRect: cr, panelRect: pr, verticalGap: pr.top - cr.bottom }
    })
    console.log('ATTEMPT', attempts, 'RESULT: WIN, measured:', JSON.stringify(measured))
    await p.screenshot({ path: '_debug-iphone14pro-win-clean.png' }).catch(()=>{})
  } else {
    console.log('ATTEMPT', attempts, 'RESULT: LOSS, retrying...')
  }
  await b.close()
}
