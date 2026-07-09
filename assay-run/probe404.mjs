import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:'new'})
const p = (await b.pages())[0]
const failed = []
p.on('requestfailed', r => failed.push(r.url()))
p.on('response', r => { if (r.status()===404) failed.push('404: '+r.url()) })
await p.goto(process.argv[2],{waitUntil:'networkidle2',timeout:30000})
await new Promise(r=>setTimeout(r,800))
console.log(JSON.stringify([...new Set(failed)],null,2))
await b.close()
