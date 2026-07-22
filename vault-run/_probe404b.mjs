import puppeteer from 'puppeteer-core'
const b=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:'new',args:['--no-sandbox']})
const p=await b.newPage()
const bad=[]
p.on('requestfailed',r=>bad.push('FAIL '+r.url()))
p.on('response',r=>{ if(r.status()>=400) bad.push(r.status()+' '+r.url()) })
await p.goto('http://localhost:6612/',{waitUntil:'networkidle0'})
await new Promise(r=>setTimeout(r,1500))
console.log(bad.join('\n')||'NO 4xx/failed')
await b.close()
