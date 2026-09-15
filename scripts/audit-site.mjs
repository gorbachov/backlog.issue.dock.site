import {createServer} from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {chromium} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import lighthouse from 'lighthouse';
const root=path.resolve(process.argv[2] || '.');
const out=path.join(root,'docs/review');fs.mkdirSync(out,{recursive:true});
const server=createServer((req,res)=>{
 let pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=path.join(root,pathname);
 if(!file.startsWith(root+'/') && file!==root){res.writeHead(403);return res.end();}
 if(fs.existsSync(file) && fs.statSync(file).isDirectory()){
  if(!pathname.endsWith('/')){res.writeHead(301,{Location:pathname+'/'});return res.end();}
  file=path.join(file,'index.html');
 }
 if(!fs.existsSync(file)){res.statusCode=404;file=path.join(root,'404.html');}
 if(!fs.existsSync(file)){res.end('Not found');return;}
 res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.xml':'application/xml'})[path.extname(file)]||'text/plain');
 res.end(fs.readFileSync(file));
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const port=server.address().port,base=`http://127.0.0.1:${port}`;
const browser=await chromium.launch({headless:true,args:['--remote-debugging-port=9223']});
const results=[];
try {
 for(const width of [1440,500]){
  const context=await browser.newContext({viewport:{width,height:1000},deviceScaleFactor:1});
  for(const route of ['/','/privacy/','/terms/','/commerce-disclosure/','/support/',...(fs.existsSync(path.join(root,'404.html'))?['/not-a-real-page/']:[])]){
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error' && !m.text().includes('404'))errors.push(m.text());});
   await page.addInitScript(()=>{window.__cls=0;new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)window.__cls+=e.value;}).observe({type:'layout-shift',buffered:true});});
   const response=await page.goto(base+route);await page.evaluate(()=>document.fonts.ready);
   await page.evaluate(async()=>{for(let y=0;y<document.body.scrollHeight;y+=600){scrollTo({top:y,behavior:"instant"});await new Promise(r=>setTimeout(r,20));}scrollTo({top:0,behavior:"instant"});});
   await page.evaluate(async()=>{await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));document.activeElement?.blur();});
   await page.waitForTimeout(250);
   const metrics=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,cls:window.__cls,brokenImages:[...document.images].filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src)}));
   const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
   const name=route==='/'?'home':route.split('/')[1];
   if(route==='/') await page.screenshot({path:path.join(out,`${name}-${width}.png`),fullPage:true});
   if(route==='/'){
    for(const id of ['features','security','beta',...await page.locator('.product-feature').evaluateAll(es=>es.map(e=>e.id))]){await page.locator(`#${id}`).evaluate(e=>scrollTo({top:e.getBoundingClientRect().top+scrollY-90,behavior:'instant'}));await page.waitForTimeout(250);await page.locator(`#${id}`).screenshot({path:path.join(out,`${id}-${width}.png`)});}
    await page.goto(base+'/');await page.keyboard.press('Tab');const first=await page.locator(':focus').textContent();
    await page.keyboard.press('Enter');await page.keyboard.press('Tab');
    metrics.keyboard={first,afterSkip:await page.locator(':focus').textContent()};
    const summary=page.locator('summary').first();await summary.focus();await page.keyboard.press('Enter');metrics.keyboard.faqOpened=await summary.evaluate(e=>e.parentElement.open);
   }
   results.push({route,width,status:response.status(),...metrics,errors,violations:axe.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))});
   await page.close();
  }
  await context.close();
  const lh=await lighthouse(base+'/',{port:9223,output:'json',onlyCategories:['performance','accessibility','best-practices','seo'],formFactor:width===500?'mobile':'desktop',screenEmulation:{mobile:width===500,width,height:1000,deviceScaleFactor:1,disabled:false},throttlingMethod:'provided'});
  fs.writeFileSync(path.join(out,`lighthouse-${width}.json`),lh.report);
  console.log(width,Object.fromEntries(Object.entries(lh.lhr.categories).map(([k,v])=>[k,v.score])));
 }
 fs.writeFileSync(path.join(out,'browser-audit.json'),JSON.stringify(results,null,2));
 if(results.some(r=>r.scrollWidth>r.width || r.errors.length || r.brokenImages.length || r.violations.length)) process.exitCode=1;
 console.log(results.map(r=>({route:r.route,width:r.width,overflow:r.scrollWidth-r.width,cls:r.cls,violations:r.violations.map(v=>v.id),errors:r.errors})));
}finally{await browser.close();server.close();}
