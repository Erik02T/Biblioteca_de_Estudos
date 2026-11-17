const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/eriks/AppData/Local/npm-cache/_npx/31e32ef8478fbf80/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
(async()=>{
 const extension=path.join(__dirname,'zoom-extension');
 const context=await chromium.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(),'ux02-zoom-')),{headless:true,executablePath:'C:/Users/eriks/AppData/Local/ms-playwright/chromium-1194/chrome-win/chrome.exe',args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`],viewport:{width:1440,height:900}});
 try{
 const page=context.pages()[0];
 await page.addInitScript(()=>localStorage.setItem('biblioteca-access-token','ux02-zoom-fixture'));
 const item={id:'11111111-1111-4111-8111-111111111111',nome:'Página para zoom nativo',categoria:'Teste isolado',section:'LINGUAGENS',subSection:'ESTUDANDO',nivelEntendimento:3,updatedAt:'2026-11-15T12:00:00Z',conteudo:{type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'Leitura em zoom nativo de 200%.'}]}]}};
 await page.route('**/*',route=>{
   const url=new URL(route.request().url());if(url.origin==='http://localhost:3001')return route.continue();
   if(url.pathname==='/areas')return route.fulfill({json:{items:[item],pagination:{page:1,limit:100,total:1,totalPages:1}}});
   if(url.pathname===`/areas/${item.id}`)return route.fulfill({json:item});
   return route.fulfill({json:[]});
 });
 await page.goto('http://localhost:3001/?section=LINGUAGENS');await page.getByRole('heading',{name:item.nome}).waitFor();
 const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');
 const before=await page.evaluate(()=>({width:innerWidth,dpr:devicePixelRatio}));
 const contrast=await page.evaluate(()=>{
   const selected=document.querySelector('.library-navigation a[aria-current]');
   const style=getComputedStyle(selected);
   const luminance=color=>{const rgb=color.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4});return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722};
   const a=luminance(style.color),b=luminance(style.backgroundColor);
   return {foreground:style.color,background:style.backgroundColor,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};
 });
 assert.ok(contrast.ratio>=4.5);
 const zoom=await worker.evaluate(async()=>{const tabs=await chrome.tabs.query({});const tab=tabs.find(t=>t.url?.startsWith('http://localhost:3001'));await chrome.tabs.setZoom(tab.id,2);return chrome.tabs.getZoom(tab.id)});
 await page.waitForFunction(()=>devicePixelRatio===2);
 const after=await page.evaluate(()=>({width:innerWidth,dpr:devicePixelRatio,scrollWidth:document.documentElement.scrollWidth}));
 assert.equal(zoom,2);assert.equal(after.width,before.width/2);assert.ok(after.scrollWidth<=after.width);
 const nav=page.getByRole('button',{name:'Navegação',exact:true});await nav.click();await page.getByRole('link',{name:'Idiomas',exact:true}).focus();await page.keyboard.press('Escape');
 assert.equal(await nav.getAttribute('aria-expanded'),'false');assert.ok(await nav.evaluate(el=>el===document.activeElement));
 await page.screenshot({path:path.join(__dirname,'UX-02-zoom-colecao.png')});
 await page.getByRole('button',{name:item.nome,exact:true}).click();await page.getByRole('textbox',{name:'Nome da página'}).waitFor();
 const editor=await page.evaluate(()=>{
   const fields=[...document.querySelectorAll('.ui-properties input,.ui-properties select')].map(el=>el.getBoundingClientRect());
   return {width:innerWidth,dpr:devicePixelRatio,scrollWidth:document.documentElement.scrollWidth,overlap:fields.some((a,i)=>fields.slice(i+1).some(b=>a.left<b.right&&b.left<a.right&&a.top<b.bottom&&b.top<a.bottom))};
 });
 assert.equal(editor.dpr,2);assert.ok(editor.scrollWidth<=editor.width&&!editor.overlap);
 await page.screenshot({path:path.join(__dirname,'UX-02-zoom-editor.png')});
 const result={state:'VERIFICADO',method:'chrome.tabs.setZoom(tabId, 2), browser-level zoom',before,after,editor,contrast,navigation:'Escape fecha navegação recolhível e retorna foco'};
 fs.writeFileSync(path.join(__dirname,'UX-02-zoom-resultados.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 }finally{await context.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
