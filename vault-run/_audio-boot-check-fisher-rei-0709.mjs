import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

async function check(label, url) {
  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] })
  const p = await b.newPage()
  const errors = []
  const failed = []
  const http4xx5xx = []
  p.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()) })
  p.on('pageerror', (err) => errors.push('PAGEERROR: ' + err.message))
  p.on('requestfailed', (r) => failed.push(r.url() + ' :: ' + (r.failure()?.errorText || '')))
  p.on('response', (r) => { if (r.status() >= 400) http4xx5xx.push(r.status() + ' ' + r.url()) })
  await p.goto(url, { waitUntil: 'networkidle0', timeout: 30000 })
  await wait(2000)
  const bodyText = await p.evaluate(() => document.body?.innerText?.slice(0, 300) || '')
  const rootChildren = await p.evaluate(() => document.getElementById('root')?.children?.length ?? -1)
  await b.close()
  console.log(`===== ${label} (${url}) =====`)
  console.log('root #children:', rootChildren)
  console.log('bodyText sample:', JSON.stringify(bodyText))
  console.log('console errors:', errors.length, errors.slice(0, 10))
  console.log('requestfailed:', failed.length, failed.slice(0, 10))
  console.log('http >=400:', http4xx5xx.length, http4xx5xx.slice(0, 10))
  console.log('')
}

await check('OO-FISHER', 'http://localhost:5184/')
await check('OO-REI', 'http://localhost:5185/')
