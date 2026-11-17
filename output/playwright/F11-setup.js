async (page) => {
  if (new URL(page.url()).origin !== 'http://localhost:3058') throw Error('Use only the isolated F11 frontend');
  const fixture = await page.evaluate(async () => {
    const api = 'http://localhost:3057';
    const auth = await fetch(api + '/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'f11-browser-' + crypto.randomUUID() + '@example.com', password: 'F11-browser-fixture-12345' }) });
    if (!auth.ok) throw Error('Registration: ' + auth.status);
    const tokens = await auth.json();
    localStorage.setItem('biblioteca-access-token', tokens.accessToken); localStorage.setItem('biblioteca-refresh-token', tokens.refreshToken);
    const headers = { Authorization: 'Bearer ' + tokens.accessToken, 'Content-Type': 'application/json' };
    const ids = [];
    for (let i = 0; i < 26; i++) {
      const response = await fetch(api + '/areas', { method: 'POST', headers: { ...headers, 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify({ nome: 'Estudo F11 ' + String(i).padStart(2, '0'), categoria: i % 2 ? 'Aula' : 'Revisão', nivelEntendimento: i % 6, section: 'FACULDADE', subSection: i % 2 ? 'ESTUDADO' : 'ESTUDANDO', conteudo: { type: 'doc', content: [{ type: 'paragraph', attrs: { id: crypto.randomUUID() }, content: [{ type: 'text', text: 'Busca no corpo F11 日本語 ' + i }] }] } }) });
      if (!response.ok) throw Error('Fixture creation: ' + response.status);
      ids.push((await response.json()).id);
    }
    const png = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2uS8AAAAASUVORK5CYII='), char => char.charCodeAt(0));
    const form = new FormData(); form.set('areaId', ids[0]); form.set('file', new File([png], 'F11-capa.png', { type: 'image/png' }));
    const upload = await fetch(api + '/attachments/upload', { method: 'POST', headers: { Authorization: headers.Authorization }, body: form });
    if (!upload.ok) throw Error('Fixture media: ' + upload.status);
    const file = await upload.json();
    const read = await fetch(api + '/areas/' + ids[0], { headers }); const source = await read.json();
    const saved = await fetch(api + '/areas/' + ids[0], { method: 'PATCH', headers, body: JSON.stringify({ updatedAt: source.updatedAt, coverAttachmentId: file.id, conteudo: { type: 'doc', content: [
      { type: 'heading', attrs: { level: 2, id: crypto.randomUUID() }, content: [{ type: 'text', text: 'Conteúdo para modelo F11' }] },
      { type: 'paragraph', attrs: { id: crypto.randomUUID() }, content: [{ type: 'text', text: 'Busca no corpo F11 日本語 0' }] },
      { type: 'image', attrs: { id: crypto.randomUUID(), attachmentId: file.id } },
    ] } }) });
    if (!saved.ok) throw Error('Fixture mixed document: ' + saved.status);
    const fixture = { source: ids[0], ids, attachment: file.id };
    localStorage.setItem('f11-fixture', JSON.stringify(fixture)); return fixture;
  });
  await page.goto('http://localhost:3058/?section=FACULDADE&layout=TABLE&order=nome&direction=asc');
  await page.getByRole('textbox', { name: 'Título de Estudo F11 00', exact: true }).waitFor();
  return { source: fixture.source, pages: fixture.ids.length };
}
