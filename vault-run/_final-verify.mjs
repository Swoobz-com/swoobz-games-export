import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait = ms => new Promise(r=>setTimeout(r,ms))
async function clickText(page,t){const h=await page.evaluateHandle((t)=>{const els=[...document.querySelectorAll('button')];const lc=t.toLowerCase();return els.find(e=>e.offsetParent!==null&&e.textContent.toLowerCase().includes(lc))||null},t);const el=h.asElement();if(!el)return false;try{await el.click()}catch(e){return false};return true}
const browser = await puppeteer.launch({executablePath:CHROME, headless:false, args:['--window-size=1980,1200']})
for (const w of [1000,1440,1920]) {
  const page = await browser.newPage()
  await page.setViewport({width:w,height:900,deviceScaleFactor:1})
  await page.goto('http://localhost:5181/', {waitUntil:'networkidle0'})
  await wait(600)
  await clickText(page,'got it'); await clickText(page,'skip'); await wait(150)
  await clickText(page,'ape in'); await wait(700)
  const data = await page.evaluate(() => {
    const right = document.querySelector('[data-testid="vault-betentry-right"]')
    const rr = right.getBoundingClientRect()
    const btns = [...document.querySelectorAll('button')]
    const send = btns.find(b => /send it/i.test(b.textContent))
    const sr = send.getBoundingClientRect()
    const tierSpans = [...document.querySelectorAll('[data-testid="vault-betentry-world"] span')].filter(s => ['NORMAL','HARD','CRAZY'].includes(s.textContent.trim()))
    const yourBetRow = document.querySelector('[data-testid="vault-betentry-yourbet"]').children[1]
    const yourBetH = yourBetRow.getBoundingClientRect().height
    const valueSpan = yourBetRow.children[1]
    const valueRect = valueSpan.getBoundingClientRect()
    return {
      scrollW: right.scrollWidth, clientW: right.clientWidth,
      scrollH: right.scrollHeight, clientH: right.clientHeight,
      noScrollEitherAxis: right.scrollWidth <= right.clientWidth + 1 && right.scrollHeight <= right.clientHeight + 1,
      tierTexts: tierSpans.map(s => s.textContent.trim()),
      sendBottom: Math.round(sr.bottom), scrollerBottom: Math.round(rr.bottom),
      sendAboveFold: sr.bottom <= rr.bottom + 1,
      yourBetRowHeight: Math.round(yourBetH),
      valueHeight: Math.round(valueRect.height),
      valueOneLine: valueRect.height < 28, // single-line threshold for this font size
      valueText: valueSpan.textContent,
    }
  })
  console.log(`=== width ${w} ===`, JSON.stringify(data, null, 2))
  await page.close()
}
await browser.close()
