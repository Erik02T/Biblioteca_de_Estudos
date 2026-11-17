async (page) => {
  if (new URL(page.url()).origin !== 'http://localhost:3048') throw Error('Use isolated F10 frontend');
  const ids = await page.evaluate(async () => {
    const api = 'http://localhost:3047';
    const auth = await fetch(api + '/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'f10-' + crypto.randomUUID() + '@example.com', password: 'F10-fixture-12345' }) });
    if (!auth.ok) throw Error('Fixture registration: ' + auth.status);
    const tokens = await auth.json();
    localStorage.setItem('biblioteca-access-token', tokens.accessToken); localStorage.setItem('biblioteca-refresh-token', tokens.refreshToken);
    const paragraph = text => ({ type: 'paragraph', content: text ? [{ type: 'text', text }] : [] });
    const create = async (nome, content, section = 'LINGUAGENS') => {
      const r = await fetch(api + '/areas', { method: 'POST', headers: { Authorization: 'Bearer ' + tokens.accessToken, 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify({ nome, categoria: 'Fixture F10', section, subSection: 'ESTUDANDO', conteudo: { type: 'doc', content } }) });
      if (!r.ok) throw Error('Fixture creation: ' + r.status); return (await r.json()).id;
    };
    const theory = await create('Teoria alvo F10', [paragraph('は e が')], 'FACULDADE');
    const examples = await create('Exemplos alvo F10', [paragraph('日本語の例')], 'PROJETOS');
    const main = await create('Documento misto F10 日本語', [
      { type: 'heading', attrs: { level: 6 }, content: [{ type: 'text', text: 'Título legado H6' }] },
      paragraph('Teoria 日本語 e fontes'),
      { type: 'codeBlock', attrs: { language: 'javascript' }, content: [{ type: 'text', text: '  const valor = "日本語";\n\tconsole.log(valor);' }] },
      { type: 'taskList', content: [{ type: 'taskItem', attrs: { checked: true }, content: [paragraph('Tarefa A 日本語')] }, { type: 'taskItem', attrs: { checked: false }, content: [paragraph('Tarefa B')] }] },
      { type: 'toggleBlock', attrs: { summary: 'Exemplos', open: true }, content: [paragraph('Dentro um'), paragraph('Dentro dois')] },
      { type: 'callout', attrs: { variant: 'tip' }, content: [paragraph('Explicação preservada')] },
      paragraph(''),
    ]);
    const ids = { main, theory, examples }; localStorage.setItem('f10-fixture', JSON.stringify(ids)); localStorage.setItem('f10-media-fixture', main); return ids;
  });
  await page.goto('http://localhost:3048/?page=' + ids.main);
  await page.getByRole('textbox', { name: 'Conteúdo da página' }).waitFor();
  return ids;
}
