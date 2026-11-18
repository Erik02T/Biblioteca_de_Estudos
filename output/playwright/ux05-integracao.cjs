// Real local API/PostgreSQL/MinIO; isolated account and bucket, no external traffic.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/eriks/AppData/Local/npm-cache/_npx/31e32ef8478fbf80/node_modules/playwright');
const assert = require('node:assert/strict'), fs = require('node:fs'), { randomUUID } = require('node:crypto');
const { unzipSync, strFromU8 } = require('../../backend/node_modules/fflate');
const base = 'http://127.0.0.1:3033', browserAPI = 'http://[::1]:3033', front = 'http://localhost:3001';
const artifact = process.env.UX_ARTIFACT_PREFIX || 'UX-05';
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const results = { state: 'FALHOU', checks: [], errors: [], timings: {} };
  let page, token, failSave = false, failMaterials = false, failVersions = false, failTemplates = false, delayMaterials = false, delayVersions = false;
  const check = (value, name) => { assert.ok(value, name); results.checks.push(name); console.log('PASS:', name); };
  async function raw(path, method = 'GET', body, access = token) {
    return fetch(base + path, { method, headers: { ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...(access ? { Authorization: `Bearer ${access}` } : {}) }, body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body) });
  }
  async function api(path, method = 'GET', body, access = token) {
    const response = await raw(path, method, body, access);
    assert.ok(response.ok, `${method} ${path} returned ${response.status}`);
    return response.json();
  }
  try {
    page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.on('pageerror', e => results.errors.push(e.message));
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin === front) return route.continue();
      if (url.origin === 'http://localhost:9000') return route.continue();
      if (!['/areas', '/attachments', '/auth', '/templates', '/exports', '/view-configurations'].some(prefix => url.pathname.startsWith(prefix))) return route.abort();
      if (url.pathname === '/templates' && failTemplates) return route.fulfill({ status: 503, json: { message: 'Falha de teste na lista de modelos' } });
      if (url.pathname === '/attachments' && route.request().method() === 'GET') {
        if (delayMaterials) await new Promise(resolve => setTimeout(resolve, 1500));
        if (failMaterials) return route.fulfill({ status: 503, json: { message: 'Materiais temporariamente indisponíveis' } });
      }
      if (url.pathname.endsWith('/revisions') && route.request().method() === 'GET') {
        if (delayVersions) await new Promise(resolve => setTimeout(resolve, 1500));
        if (failVersions) return route.fulfill({ status: 503, json: { message: 'Versões temporariamente indisponíveis' } });
      }
      if (failSave && route.request().method() === 'PATCH' && /^\/areas\/[^/]+$/.test(url.pathname)) return route.abort('internetdisconnected');
      const response = await route.fetch({ url: browserAPI + url.pathname + url.search });
      await route.fulfill({ response });
    });
    const button = name => page.getByRole('button', { name, exact: true });
    const heading = name => page.getByRole('heading', { name, exact: true });
    const link = name => page.getByRole('link', { name, exact: true });
    const doc = page.getByRole('textbox', { name: 'Conteúdo da página', exact: true });
    const saved = () => page.waitForFunction(() => document.querySelector('[data-testid="save-status"]')?.textContent === 'Salvo');
    const menu = async name => { await button('Mais opções da página').click(); await page.getByRole('menuitem', { name, exact: true }).click(); };
    const email = `ux05-${randomUUID()}@example.com`, password = randomUUID() + randomUUID();
    await page.goto(front); await button('Criar uma conta').click();
    await page.getByRole('textbox', { name: 'E-mail' }).fill(email);
    await page.getByLabel('Senha', { exact: true }).fill(password); await button('Cadastrar').click();
    await link('Idiomas').waitFor();
    token = await page.evaluate(() => localStorage.getItem('biblioteca-access-token'));
    check(Boolean(token), 'Cadastro real pela interface cria sessão autenticada');
    await link('Idiomas').click();
    failTemplates = true; await button('Modelos').click(); await page.getByText('Não foi possível carregar os modelos.', { exact: true }).waitFor();
    check(await page.getByText('Nenhum modelo criado ainda.', { exact: true }).count() === 0, 'Falha de modelos não é mascarada como vazio');
    failTemplates = false; await button('Tentar carregar modelos novamente').click(); await page.getByText('Nenhum modelo criado ainda.', { exact: true }).waitFor();
    await button('Fechar').focus(); await page.keyboard.press('Escape');
    check(await button('Modelos').evaluate(el => el === document.activeElement), 'Modelos permite nova leitura real e Escape devolve foco');
    await button('+ Nova página').click();
    await page.getByRole('textbox', { name: 'Nome da página' }).fill('Página real UX-05');
    check((await page.getByTestId('save-status').innerText()).includes('ainda não criada'), 'Rascunho não declara persistência');
    await doc.fill('Estudo 日本語 — texto real que será preservado.');
    await button('Propriedades').click();
    await page.getByRole('textbox', { name: 'Categoria', exact: true }).fill('Homologação isolada');
    check(await page.getByText('O conteúdo e as propriedades serão gravados ao criar a página.').isVisible(), 'Propriedades de rascunho explicam a criação explícita');
    await button('Fechar ferramenta').click(); await button('Criar página').click();
    await page.waitForURL(url => url.searchParams.has('page')); await saved();
    const id = new URL(page.url()).searchParams.get('page');
    let record = await api(`/areas/${id}`);
    check(record.nome === 'Página real UX-05' && JSON.stringify(record.conteudo).includes('日本語'), 'Criar página persiste título, categoria e japonês em novo GET');
    await doc.evaluate(el => { el.dataset.ux05Instance = 'retained'; });
    const startSave = Date.now();
    await doc.press('Control+End'); await page.keyboard.type(' Texto novo do autosave.'); await saved();
    results.timings.autosaveMs = Date.now() - startSave;
    check(JSON.stringify((await api(`/areas/${id}`)).conteudo).includes('Texto novo'), 'Autosave do corpo confirmado no PostgreSQL');
    await page.getByRole('textbox', { name: 'Nome da página' }).fill('Título pendente UX-05');
    check((await page.getByTestId('save-status').innerText()).includes('propriedades pendentes'), 'Metadados pendentes não aparecem como Salvo');
    await button('Propriedades').click(); await button('Aplicar alterações').click(); await saved();
    check(await button('Aplicar alterações').evaluate(el => el === document.activeElement), 'Aplicar propriedades restaura foco após gravação');
    check((await api(`/areas/${id}`)).nome === 'Título pendente UX-05', 'Aplicar propriedades grava sem sair da página');
    await page.keyboard.press('Escape');
    await doc.click(); await page.keyboard.press('Home'); await page.keyboard.down('Shift'); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight'); await page.keyboard.up('Shift');
    const selection = await page.evaluate(() => getSelection().toString());
    await button('Formatar').click(); await button('Negrito').click();
    check(await doc.locator('strong').count() > 0 && await page.evaluate(() => getSelection().toString()) === selection, 'Formatação preserva seleção e fecha superfície modal quando necessário');
    check(await doc.getAttribute('data-ux05-instance') === 'retained', 'Ferramentas preservam instância do editor');
    await saved();
    // Failures are injected only at the transport boundary; retries then hit the real server.
    delayMaterials = true; failMaterials = true;
    await page.reload(); await doc.waitFor(); await button('Materiais (0)').click();
    await page.getByText('Carregando materiais…', { exact: true }).waitFor();
    check(await page.getByText(/Nenhum anexo ainda/).count() === 0, 'Materiais em carregamento não indicam vazio');
    await page.getByRole('alert').filter({ hasText: 'Não foi possível carregar os materiais.' }).waitFor();
    delayMaterials = false; failMaterials = false; await button('Tentar carregar materiais novamente').click();
    await page.getByText(/Nenhum anexo ainda/).waitFor(); check(true, 'Erro de materiais permite nova leitura real sem recarregar a página');
    const chooserPromise = page.waitForEvent('filechooser'); await button('Arquivo').click();
    const pdf = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF');
    await (await chooserPromise).setFiles({ name: 'Material_' + 'nome_longo_'.repeat(8) + '.pdf', mimeType: 'application/pdf', buffer: pdf });
    const materialLink = page.getByRole('link', { name: /^Material_/ }); await materialLink.waitFor();
    const materials = await api(`/attachments?areaId=${id}`);
    check(materials.length === 1 && materials[0].tipo === 'ARQUIVO', 'Upload real cria material associado ao ID da página');
    const file = await fetch(materials[0].url); check(file.ok && Buffer.from(await file.arrayBuffer()).equals(pdf), 'Download via URL assinada do MinIO recupera os mesmos bytes');
    for (const width of [320, 375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      check(await page.evaluate(() => {
        const slot = document.querySelector('[data-testid="attach-slot"]'), name = slot.querySelector('a'), remove = slot.querySelector('button');
        return document.documentElement.scrollWidth <= innerWidth && name.scrollWidth <= name.clientWidth + 1 && remove.getBoundingClientRect().width >= 44 && remove.getBoundingClientRect().height >= 44;
      }), `Material real com nome longo contido e remoção 44px em ${width}`);
      if (width === 320) await page.screenshot({ path: `output/playwright/${artifact}-materiais-real-320.png` });
    }
    await page.screenshot({ path: `output/playwright/${artifact}-materiais-real.png` });
    await button('Fechar ferramenta').click();
    delayVersions = true; failVersions = true; await menu('Versões');
    await page.getByText('Carregando versões…', { exact: true }).waitFor();
    check(await page.getByText('Nenhuma versão listada.', { exact: true }).count() === 0, 'Versões em carregamento não indicam histórico vazio');
    await page.getByRole('alert').filter({ hasText: 'Versões temporariamente' }).waitFor();
    failVersions = false; delayVersions = false; await button('Tentar carregar versões novamente').click();
    await page.getByText('Nenhuma versão listada.', { exact: true }).waitFor();
    await button('Fechar').focus(); await page.keyboard.press('Tab');
    check(await page.getByRole('textbox', { name: 'Nome da versão' }).evaluate(el => el === document.activeElement), 'Tab do último controle retorna ao primeiro no diálogo de versões');
    await page.keyboard.press('Shift+Tab'); check(await button('Fechar').evaluate(el => el === document.activeElement), 'Shift+Tab retorna ao último controle no diálogo de versões');
    await page.getByRole('textbox', { name: 'Nome da versão' }).fill('Versão real UX-05'); await button('Criar versão').click();
    await page.getByText(/Versão criada/).waitFor();
    const revisions = await api(`/areas/${id}/revisions`);
    const revision = revisions.find(r => r.name === 'Versão real UX-05'); check(Boolean(revision), 'Versão criada pela interface confirmada em nova leitura real');
    const snapshot = await api(`/areas/${id}/revisions/${revision.id}`);
    check(snapshot.files.length === 1 && snapshot.files[0].id, 'Versão preserva material real');
    await button('Fechar').click();
    await doc.fill('Estado posterior à versão.'); await saved();
    await menu('Versões'); await page.getByRole('button', { name: /Versão real UX-05 —/ }).click();
    await page.getByRole('region', { name: 'Pré-visualização da versão' }).waitFor();
    check(await button('Restaurar versão').isDisabled(), 'Restaurar versão exige confirmação explícita');
    await page.getByRole('checkbox', { name: /Restaurar esta versão/ }).check(); await button('Restaurar versão').click();
    await page.getByRole('dialog', { name: 'Versões da página' }).waitFor({ state: 'hidden' });
    await heading('Título pendente UX-05').waitFor(); await button('Título pendente UX-05').click(); await doc.waitFor(); await saved();
    record = await api(`/areas/${id}`);
    check(JSON.stringify(record.conteudo).includes('Texto novo') && !JSON.stringify(record.conteudo).includes('posterior'), 'Restauração recupera o conteúdo original por novo GET');
    check((await api(`/areas/${id}/revisions`)).length >= 2, 'Restauração cria versão de segurança do estado substituído');
    await menu('Exportar');
    const downloadPromise = page.waitForEvent('download'); await button('Baixar ZIP').click();
    const download = await downloadPromise; await download.saveAs(`output/playwright/${artifact}-exportacao.zip`);
    const zip = unzipSync(fs.readFileSync(`output/playwright/${artifact}-exportacao.zip`));
    check(Object.keys(zip).some(name => name.endsWith('.pdf')) && Object.values(zip).some(bytes => strFromU8(bytes).includes('Texto novo')), 'ZIP real contém documento e arquivo, sem URL temporária como conteúdo');
    await button('Fechar').click();
    await page.getByRole('textbox', { name: 'Nome da página' }).fill('Título salvo ao navegar');
    await link('Faculdade').click(); await heading('Faculdade').waitFor();
    check((await api(`/areas/${id}`)).nome === 'Título salvo ao navegar', 'Navegar para outra área grava propriedades antes da saída');
    await page.goBack(); await doc.waitFor(); check(new URL(page.url()).searchParams.get('page') === id, 'Voltar do navegador reabre ID original');
    await page.goForward(); await heading('Faculdade').waitFor();
    await page.goto(`${front}/?page=${id}`); await doc.waitFor(); await button('Voltar').click();
    await heading('Título salvo ao navegar').waitFor();
    const card = page.locator('article').filter({ has: heading('Título salvo ao navegar') });
    await card.getByRole('button', { name: 'Favoritar', exact: true }).click(); await link('Favoritos').click(); await heading('Título salvo ao navegar').waitFor();
    check((await api(`/areas/${id}`)).isFavorite, 'Favorito persiste e aparece na coleção global');
    await page.getByRole('combobox', { name: 'Visualização:' }).selectOption('TABLE');
    await page.getByRole('button', { name: 'Editar', exact: true }).click(); await doc.waitFor();
    await page.getByRole('textbox', { name: 'Nome da página' }).fill('Título pendente antes de duplicar');
    await menu('Duplicar página'); await page.waitForURL(url => url.searchParams.has('page') && url.searchParams.get('page') !== id); await doc.waitFor();
    const copyId = new URL(page.url()).searchParams.get('page');
    check(copyId !== id && JSON.stringify((await api(`/areas/${copyId}`)).conteudo) === JSON.stringify(record.conteudo), 'Duplicação abre novo ID e conserva documento');
    check((await api(`/areas/${copyId}`)).nome.includes('Título pendente antes de duplicar'), 'Duplicação inclui propriedades pendentes na cópia');
    page.once('dialog', dialog => dialog.accept()); await menu('Excluir página');
    await button('+ Nova página').waitFor(); await link('Lixeira').click();
    check((await raw(`/areas/${copyId}`)).status === 404, 'Exclusão envia somente a cópia à lixeira');
    const trash = await api('/areas/trash'); const deleted = trash.items.find(item => item.id === copyId);
    check(Boolean(deleted), 'Lixeira conserva ID original');
    const trashedCard = page.locator('article').filter({ has: heading(deleted.nome) });
    await trashedCard.locator('summary').click(); page.once('dialog', dialog => dialog.accept());
    await trashedCard.getByRole('button', { name: 'Restaurar', exact: true }).click();
    await page.waitForURL(url => !url.searchParams.has('view'));
    check((await api(`/areas/${copyId}`)).deletedAt === null, 'Restaurar página recupera mesmo ID');
    const other = await api('/auth/register', 'POST', { email: `ux05-other-${randomUUID()}@example.com`, password }, null);
    check((await raw(`/areas/${id}`, 'GET', undefined, other.accessToken)).status === 404, 'Outra conta não lê a página de teste');
    check((await raw(`/attachments?areaId=${id}`, 'GET', undefined, other.accessToken)).status === 404, 'Outra conta não lê os materiais');
    check((await raw(`/areas/${id}/revisions`, 'GET', undefined, other.accessToken)).status === 404, 'Outra conta não lê as versões');
    check((await raw('/exports', 'POST', { ids: [id] }, other.accessToken)).status === 404, 'Outra conta não exporta a página');
    await page.goto(`${front}/?page=${id}`); await doc.waitFor();
    failSave = true; await doc.fill('Texto local preservado durante falha de rede.');
    await page.getByRole('alert').filter({ hasText: 'conexão' }).waitFor();
    await button('Voltar').click();
    check(await doc.isVisible() && (await doc.innerText()).includes('Texto local'), 'Falha de rede impede saída e conserva edição');
    failSave = false; await button('Propriedades').click(); await button('Aplicar alterações').click(); await saved(); await button('Fechar ferramenta').click();
    check(JSON.stringify((await api(`/areas/${id}`)).conteudo).includes('Texto local'), 'Nova tentativa após falha grava conteúdo real');
    const current = await api(`/areas/${id}`);
    await api(`/areas/${id}`, 'PATCH', { nome: 'Alteração externa', updatedAt: current.updatedAt });
    const conflict = page.waitForResponse(response => response.request().method() === 'PATCH' && new URL(response.url()).pathname === `/areas/${id}` && response.status() === 409);
    await doc.fill('Texto local em conflito sem sobrescrever servidor.'); await conflict;
    await page.getByRole('alert').filter({ hasText: /atualizada|conflito/i }).waitFor();
    check((await doc.innerText()).includes('em conflito') && !JSON.stringify((await api(`/areas/${id}`)).conteudo).includes('em conflito'), '409 real preserva texto local e não sobrescreve revisão externa');
    await page.screenshot({ path: `output/playwright/${artifact}-conflito-real.png` });
    check(results.errors.length === 0, 'Sem exceções JavaScript no roteiro integrado');
    results.state = 'VERIFICADO';
  } finally {
    if (results.state === 'FALHOU' && page) {
      await page.screenshot({ path: `output/playwright/${artifact}-falha-integracao.png` });
      results.failureUI = await page.locator('body').innerText();
    }
    fs.writeFileSync(`output/playwright/${artifact}-integracao-resultados.json`, JSON.stringify(results, null, 2));
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
