// API interception is test-only; no fixture request reaches a remote service.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/eriks/AppData/Local/npm-cache/_npx/31e32ef8478fbf80/node_modules/playwright');
const fs = require('node:fs'), assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({headless:true,channel:'chrome'});
 try {
 const page = await browser.newPage({viewport:{width:1440,height:900}});
 await page.addInitScript(()=>localStorage.setItem('biblioteca-access-token','ux05-fixture'));
 const items=Array.from({length:25},(_,i)=>({id:`${String(i+1).padStart(8,'0')}-1111-4111-8111-111111111111`,nome:i===0?'Japonês — título extenso para verificar navegação':`Página ${String(i).padStart(2,'0')}`,categoria:'Idioma',section:'LINGUAGENS',subSection:i%2?'ESTUDADO':'ESTUDANDO',nivelEntendimento:3,isFavorite:i<2,parentId:i===24?'00000001-1111-4111-8111-111111111111':null,sortOrder:i,lastOpenedAt:'2026-11-15T12:00:00Z',updatedAt:'2026-11-15T12:00:00Z',conteudo:{type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'Documento isolado. 日本語'}]}]}}));
 items[0].updatedAt='2026-11-15T12:00:01Z';
 let failList=false, failSave=false, tick=0;
 const results={checks:[],viewports:[],requests:[]};
 const check=(value,label)=>{assert.ok(value,label);results.checks.push(label)};
 await page.route('**/*',async route=>{
   const u=new URL(route.request().url());
   if(u.origin==='http://localhost:3001') return route.continue();
   if(u.pathname.startsWith('/attachments')) return route.fulfill({json:[]});
   if(!u.pathname.startsWith('/areas')) return route.fulfill({status:404,json:{message:'Endpoint fora da fixture'}});
   results.requests.push(u.pathname+u.search);
   const item=items.find(x=>u.pathname.startsWith(`/areas/${x.id}`));
   if(item){
     if(route.request().method()==='PATCH'){
       if(failSave)return route.fulfill({status:409,json:{message:'Conflito de teste: revise as alterações.'}});
       if(u.pathname.endsWith('/favorite'))item.isFavorite=!item.isFavorite;
       else Object.assign(item,route.request().postDataJSON(),{updatedAt:`2026-11-15T12:01:${String(++tick).padStart(2,'0')}Z`});
     }
     return route.fulfill({json:item});
   }
   if(u.pathname.endsWith('/trash'))return route.fulfill({json:{items:[],pagination:{page:1,limit:100,total:0,totalPages:0}}});
   if(failList)return route.fulfill({status:500,json:{message:'Falha de teste'}});
   const filtered=items.filter(x=>(!u.searchParams.has('section')||x.section===u.searchParams.get('section'))&&(!u.searchParams.has('subSection')||x.subSection===u.searchParams.get('subSection'))&&(!u.searchParams.has('q')||x.nome.includes(u.searchParams.get('q'))));
   const number=Number(u.searchParams.get('page')||1),limit=13;
   return route.fulfill({json:{items:filtered.slice((number-1)*limit,number*limit),pagination:{page:number,limit,total:filtered.length,totalPages:Math.ceil(filtered.length/limit)}}});
 });
 const base='http://localhost:3001/';
 const button=name=>page.getByRole('button',{name,exact:true});
 const link=name=>page.getByRole('link',{name,exact:true});
 const heading=name=>page.getByRole('heading',{name,exact:true});
 for(const [name,path] of [['inicio',''],['colecao','?section=LINGUAGENS'],['status','?section=LINGUAGENS&status=ESTUDANDO'],['editor',`?page=${items[0].id}`]]){
   await page.goto(base+path);
   await page.getByRole('navigation',{name:'Biblioteca',exact:true}).waitFor();
   if(name==='editor')await page.getByRole('textbox',{name:'Nome da página'}).waitFor();
   else if(name!=='inicio')await heading(items[0].nome).waitFor();
   for(const width of [320,375,768,1024,1440]){
     await page.setViewportSize({width,height:900});
     const measure=await page.evaluate(()=>{
       const fields=[...document.querySelectorAll('.ui-properties input,.ui-properties select')].map(el=>el.getBoundingClientRect());
       return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,overlap:fields.some((a,i)=>fields.slice(i+1).some(b=>a.left<b.right&&b.left<a.right&&a.top<b.bottom&&b.top<a.bottom))};
     });
     results.viewports.push({name,...measure});check(measure.width>=measure.scrollWidth&&!measure.overlap,`Layout ${name} ${width}`);
     if(width===320||width===1440)await page.screenshot({path:`output/playwright/UX-05-colecoes-${name}-${width}.png`});
   }
 }
 await page.goto(base);await link('Idiomas').click();await heading(items[0].nome).waitFor();
 check(new URL(page.url()).search==='?section=LINGUAGENS','Área abre coleção diretamente');
 check(await page.locator('article').count()===20,'API paginada agregada antes da paginação visual');
 await button('Próxima').click();await heading('Página 01').waitFor();
 check(await page.locator('article').count()===5,'Segunda página mostra cinco itens restantes');
 await button('Estudando').click();await heading(items[0].nome).waitFor();
 check(!new URL(page.url()).searchParams.has('listPage'),'Filtro reinicia paginação');
 await page.reload();await heading(items[0].nome).waitFor();
 check(await button('Estudando').getAttribute('aria-pressed')==='true','Status sobrevive à recarga');
 await button('Estudado').click();await heading('Página 01').waitFor();
 await page.goBack();await heading(items[0].nome).waitFor();
 await page.goForward();await heading('Página 01').waitFor();check(true,'Voltar/Avançar restauram status');
 await link('Idiomas').click();
 await page.getByRole('combobox',{name:'Ordenar por:'}).selectOption('nome');
 await page.getByRole('combobox',{name:'Direção:'}).selectOption('asc');
 await page.getByRole('textbox',{name:'Buscar:',exact:true}).fill('Japonês');await button('Aplicar busca').click();await heading(items[0].nome).waitFor();
 await page.waitForFunction(()=>document.querySelectorAll('article').length===1);
 check(await page.locator('article').count()===1,'Busca filtra coleção inteira');const collectionUrl=page.url();
 const summary=page.locator('article summary').first();await summary.focus();await page.keyboard.press('Enter');
 check(await page.locator('article details').first().getAttribute('open')!==null,'Ações abrem pelo teclado');
 await page.keyboard.press('Escape');check(await summary.evaluate(el=>el===document.activeElement),'Escape retorna foco');
 check(await page.locator('article').first().getAttribute('draggable')==='false','Ordem por nome impede arrastar');
 await button(items[0].nome).click();const title=page.getByRole('textbox',{name:'Nome da página'});await title.waitFor();
 const editor=page.locator('.tiptap');await editor.evaluate(el=>{el.dataset.ux05Instance='retained'});
 await button('Buscar páginas').click();await page.getByRole('textbox',{name:'Buscar em toda a biblioteca'}).press('Escape');
 check(await editor.getAttribute('data-ux05-instance')==='retained','Busca preserva instância do editor');
 await title.fill('Japonês — título preservado');failSave=true;await link('Faculdade').click();
 await page.getByRole('alert').filter({hasText:'Conflito de teste'}).waitFor();
 check(new URL(page.url()).searchParams.get('page')===items[0].id,'Conflito bloqueia saída pela lateral');
 failSave=false;await button('Voltar').click();await heading('Japonês — título preservado').waitFor();
 check(page.url()===collectionUrl,'Retorno recupera URL completa da coleção');
 check(items[0].nome==='Japonês — título preservado','Metadados confirmados na API interceptada');
 await link('Favoritos').click();await heading('Favoritos').waitFor();await button('Desfavoritar').first().click();
 await page.waitForFunction(()=>document.querySelectorAll('article').length===1);check(true,'Desfavoritar atualiza coleção de favoritos');
 await link('Lixeira').click();await heading('Nada foi enviado para a lixeira.').waitFor();check(true,'Lixeira vazia explícita');
 failList=true;await link('Idiomas').click();await page.getByText('Não foi possível carregar esta coleção.').waitFor();
 failList=false;await button('Tentar novamente').click();await heading(items[0].nome).waitFor();check(true,'Erro de coleção recuperável');
 for(const layout of ['TABLE','BOARD']){
   await page.getByRole('combobox',{name:'Visualização:'}).selectOption(layout);await page.setViewportSize({width:320,height:900});
   check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Sem overflow ${layout} 320`);
 }
 fs.writeFileSync('output/playwright/UX-05-colecoes-browser-resultados.json',JSON.stringify(results,null,2));
 console.log(JSON.stringify({checks:results.checks,viewports:results.viewports}));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
