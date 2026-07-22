import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--force-device-scale-factor=1'] })
const p = await b.newPage()
const fails = []
p.on('requestfailed', (r) => fails.push(r.url() + ' :: ' + (r.failure()?.errorText||'')))
p.on('response', (r) => { if (r.status() >= 400) fails.push(r.status() + ' ' + r.url()) })
await p.setViewport({ width: 1440, height: 900 })
await p.goto('http://localhost:5190/', { waitUntil: 'networkidle0' })
await wait(1200)
console.log(fails.length ? fails.join('\n') : 'no failed requests')
await b.close()
