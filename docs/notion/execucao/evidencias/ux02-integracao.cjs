// Requires isolated backend on 3027 with DATABASE_URL pointing to biblioteca_test_ux02_20261115.
// All browser API requests are proxied to that local server; no mocked persistence.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/eriks/AppData/Local/npm-cache/_npx/31e32ef8478fbf80/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),{randomUUID}=require('node:crypto');
const base='http://localhost:3027';
(async()=>{
 let token;
 async function api(path,method='GET',body){
   const res=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:body===undefined?undefined:JSON.stringify(body)});
   assert.ok(res.ok,`${method} ${path}: ${res.status}`);return res.json();
 }
 token=(await api('/auth/register','POST',{email:`ux02-${randomUUID()}@example.com`,password:randomUUID()+randomUUID()})).accessToken;
 const create=(nome,subSection='ESTUDANDO',parentId)=>api('/areas','POST',{nome,categoria:'Teste UX-02',section:'LINGUAGENS',subSection,nivelEntendimento:2,parentId,conteudo:{type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'Conteúdo real isolado. 日本語'}]}]}});
 const first=await create('Página de integração A'),second=await create('Página de integração B');
 const studied=await create('Página concluída','ESTUDADO');await create('Subpágina de integração','ESTUDANDO',first.id);
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 const checks=[];
 try {
   const page=await browser.newPage({viewport:{width:1440,height:900}});
   await page.addInitScript(value=>localStorage.setItem('biblioteca-access-token',value),token);
   await page.route('**/*',async route=>{
     const url=new URL(route.request().url());
     if(url.origin==='http://localhost:3001')return route.continue();
     if(!['/areas','/attachments','/auth','/templates'].some(prefix=>url.pathname.startsWith(prefix)))return route.abort();
     const response=await route.fetch({url:base+url.pathname+url.search});await route.fulfill({response});
   });
   const button=name=>page.getByRole('button',{name,exact:true});
   const link=name=>page.getByRole('link',{name,exact:true});
   const heading=name=>page.getByRole('heading',{name,exact:true});
   await page.goto('http://localhost:3001/?section=LINGUAGENS');await heading(first.nome).waitFor();
   assert.equal(await page.locator('article').count(),4);checks.push('Coleção real inclui dois status e subpágina com mesmos IDs');
   await button('Estudado').click();await heading(studied.nome).waitFor();assert.equal(await page.locator('article').count(),1);
   await page.reload();await heading(studied.nome).waitFor();checks.push('Status e URL antiga preservados após recarga real');
   await button('Estudando').click();await heading(first.nome).waitFor();
   await page.getByRole('combobox',{name:'Escopo:'}).selectOption('ROOTS');
   await page.waitForFunction(()=>document.querySelectorAll('article').length===2);
   await page.getByRole('combobox',{name:'Ordenar por:'}).selectOption('sortOrder');
   const secondCard=page.locator('article').filter({has:heading(second.nome)});
   await secondCard.locator('summary').click();await secondCard.getByRole('button',{name:'Mover para cima'}).click();
   await page.waitForFunction(name=>document.querySelector('article h2')?.textContent===name,second.nome);
   const ordered=await api('/areas?section=LINGUAGENS&subSection=ESTUDANDO&parentId=&orderBy=sortOrder');
   assert.equal(ordered.items[0].id,second.id);checks.push('Reordenação por teclado/botão confirmada em nova leitura HTTP');
   await button(first.nome).click();await page.getByRole('textbox',{name:'Nome da página'}).fill('Título persistido UX-02');
   await page.locator('.tiptap').fill('Texto persistido pela navegação UX-02. 日本語');
   await link('Faculdade').click();await heading('Faculdade').waitFor();
   const saved=await api(`/areas/${first.id}`);assert.equal(saved.nome,'Título persistido UX-02');assert.ok(JSON.stringify(saved.conteudo).includes('Texto persistido pela navegação'));
   checks.push('Navegação lateral grava conteúdo/metadados: confirmados no PostgreSQL por novo GET');
   await page.goto(`http://localhost:3001/?page=${first.id}`);await page.getByRole('textbox',{name:'Nome da página'}).waitFor();
   assert.equal(await page.getByRole('textbox',{name:'Nome da página'}).inputValue(),'Título persistido UX-02');
   assert.match(await page.locator('.tiptap').innerText(),/Texto persistido pela navegação/);checks.push('Link direto por ID reabre conteúdo e título persistidos');
   await button('Voltar').click();await heading('Título persistido UX-02').waitFor();
   const card=page.locator('article').filter({has:heading('Título persistido UX-02')});await card.getByRole('button',{name:'Favoritar',exact:true}).click();
   await card.getByRole('button',{name:'Desfavoritar',exact:true}).waitFor();assert.equal((await api(`/areas/${first.id}`)).isFavorite,true);
   await link('Favoritos').click();await heading('Título persistido UX-02').waitFor();checks.push('Favorito persistido e recuperado na coleção global');
   const favorite=page.locator('article').filter({has:heading('Título persistido UX-02')});await favorite.locator('summary').click();
   page.once('dialog',dialog=>dialog.dismiss());await favorite.getByRole('button',{name:'Duplicar',exact:true}).click();
   await page.getByRole('textbox',{name:'Nome da página'}).waitFor();const copyId=new URL(page.url()).searchParams.get('page');assert.notEqual(copyId,first.id);assert.ok(copyId);
   const copy=await api(`/areas/${copyId}`);assert.deepEqual(copy.conteudo,saved.conteudo);checks.push('Duplicação mantém conteúdo e abre novo ID real');
   await page.goto('http://localhost:3001/?section=LINGUAGENS');await heading(second.nome).waitFor();
   const remove=page.locator('article').filter({has:heading(second.nome)});await remove.locator('summary').click();page.once('dialog',dialog=>dialog.accept());await remove.getByRole('button',{name:'Excluir',exact:true}).click();
   await heading(second.nome).waitFor({state:'hidden'});await link('Lixeira').click();await heading(second.nome).waitFor();
   const trash=page.locator('article').filter({has:heading(second.nome)});await trash.locator('summary').click();page.once('dialog',dialog=>dialog.accept());await trash.getByRole('button',{name:'Restaurar',exact:true}).click();
   await page.waitForURL(url=>!url.searchParams.has('view'));assert.equal((await api(`/areas/${second.id}`)).deletedAt,null);checks.push('Excluir/restaurar preserva o ID e recupera registro real');
   fs.writeFileSync('docs/notion/execucao/evidencias/UX-02-integracao-resultados.json',JSON.stringify({state:'VERIFICADO',database:'biblioteca_test_ux02_20261115',checks},null,2));
   console.log(JSON.stringify({checks}));
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
