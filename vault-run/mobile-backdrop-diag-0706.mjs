import puppeteer from 'puppeteer-core'
const CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait=(ms)=>new Promise(r=>setTimeout(r,ms))
async function run(){
  const b=await puppeteer.launch({executablePath:CHROME,headless:'new',args:['--no-sandbox','--force-device-scale-factor=1']})
  const page=await b.newPage()
  await page.setViewport({width:412,height:915,deviceScaleFactor:1})
  await page.goto('http://localhost:5901/',{waitUntil:'networkidle0'})
  await wait(600)
  const info = await page.evaluate(()=>{
    const bd=document.querySelector('[data-testid="vault-grid-backdrop"]')
    const board=document.querySelector('[data-testid="vault-canvas-shell"]')
    const cabinet = board ? board.parentElement : null // cabinetStyle div
    const br=bd?bd.getBoundingClientRect():null
    const cr=cabinet?cabinet.getBoundingClientRect():null
    const boardR=board?board.getBoundingClientRect():null
    const cs = bd ? getComputedStyle(bd) : null
    // find the panel (sibling after board inside cabinet)
    let panel=null
    if(cabinet){ const kids=[...cabinet.children]; panel = kids[kids.length-1] }
    const panelR = panel?panel.getBoundingClientRect():null
    return {
      backdropRect: br?{t:Math.round(br.top),b:Math.round(br.bottom),l:Math.round(br.left),r:Math.round(br.right)}:null,
      cabinetRect: cr?{t:Math.round(cr.top),b:Math.round(cr.bottom),l:Math.round(cr.left),r:Math.round(cr.right)}:null,
      boardRect: boardR?{t:Math.round(boardR.top),b:Math.round(boardR.bottom)}:null,
      panelRect: panelR?{t:Math.round(panelR.top),b:Math.round(panelR.bottom)}:null,
      cabinetOverflow: cabinet? getComputedStyle(cabinet).overflow : null,
      cabinetBg: cabinet? getComputedStyle(cabinet).background.slice(0,80): null,
      backdropCoversWholeCabinet: (br&&cr)? (Math.abs(br.top-cr.top)<3 && Math.abs(br.bottom-cr.bottom)<3): null,
    }
  })
  console.log(JSON.stringify(info,null,2))
  await page.screenshot({path:'C:/Users/Erstr/AppData/Local/Temp/claude/C--Users-Erstr-OneDrive-Bureaublad-swoobz-games-export/ae0f5ec2-dc4c-47ea-a2ca-1ea3484743ef/scratchpad/shots-backdrop-fix/mobile-full-412x915.png', fullPage:true})
  await b.close()
}
run()
