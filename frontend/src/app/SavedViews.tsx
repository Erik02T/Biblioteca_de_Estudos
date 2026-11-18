import { useEffect, useState } from 'react';
import { Button, Input, Select } from './ui';
import { responseValue, viewBody, viewRoute, type LibraryRequest, type SavedView } from './collection-query';
import type { LibraryRoute } from './library-route';

export function SavedViews({ route, request, onApply }: { route: LibraryRoute; request: LibraryRequest; onApply: (route: LibraryRoute) => void }) {
  const [views, setViews] = useState<SavedView[]>([]);
  const [selected, setSelected] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string>();
  const [status, setStatus] = useState('Carregando visualizações…');
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void request('/view-configurations', { signal: controller.signal }).then(responseValue<SavedView[]>).then(items => {
      if (!controller.signal.aborted) { setViews(items); setStatus(''); setError(undefined); }
    }).catch(cause => { if (!controller.signal.aborted) { setError(cause.message); setStatus(''); } });
    return () => controller.abort();
  }, [request, retry]);
  const current = views.find(view => view.id === selected);
  const write = async (action: 'create' | 'update' | 'delete') => {
    if (busy || action !== 'delete' && !name.trim()) return;
    if (action === 'delete' && !window.confirm(`Excluir a visualização “${current?.name}”?`)) return;
    setBusy(true); setError(undefined); setStatus('');
    try {
      if (action === 'delete') {
        await responseValue(await request('/view-configurations/' + selected, { method: 'DELETE' }));
        setViews(items => items.filter(item => item.id !== selected)); setSelected(''); setName('');
        setStatus('Visualização excluída.');
      } else {
        const result = await responseValue<SavedView>(await request('/view-configurations' + (action === 'update' ? '/' + selected : ''), {
          method: action === 'update' ? 'PATCH' : 'POST', body: JSON.stringify({ name: name.trim(), ...viewBody(route) }),
        }));
        setViews(items => [result, ...items.filter(item => item.id !== result.id)]); setSelected(result.id); setName(result.name);
        setStatus('Visualização salva.');
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível salvar.'); }
    finally { setBusy(false); }
  };
  return <section className="saved-views" aria-label="Visualizações salvas" aria-busy={busy}>
    <label>Visualização salva<Select value={selected} disabled={busy} onChange={event => {
      const id = event.target.value; setSelected(id); setName(views.find(item => item.id === id)?.name ?? ''); setStatus('');
    }}><option value="">Nova visualização</option>{views.map(view => <option key={view.id} value={view.id}>{view.name}{view.configurationError ? ' (incompatível)' : ''}</option>)}</Select></label>
    <Button disabled={!current || Boolean(current.configurationError) || busy} onClick={() => { if (current) { onApply(viewRoute(current)); setStatus('Visualização aplicada.'); } }}>Abrir visualização</Button>
    <label>Nome da visualização<Input maxLength={120} value={name} disabled={busy} onChange={event => setName(event.target.value)} placeholder="Ex: Revisão da faculdade" /></label>
    <Button disabled={!name.trim() || busy} onClick={() => void write('create')}>Salvar como nova</Button>
    {current && <><Button disabled={!name.trim() || busy} onClick={() => void write('update')}>{current.configurationError ? 'Corrigir com configuração atual' : 'Atualizar visualização'}</Button><Button disabled={busy} onClick={() => void write('delete')}>Excluir visualização</Button></>}
    {current?.configurationError && <p role="alert">Configuração incompatível: {current.configurationError} Ajuste os filtros atuais e atualize a visualização, ou exclua-a.</p>}
    {error && <p role="alert">{error}<Button onClick={() => setRetry(value => value + 1)}>Recarregar visualizações</Button></p>}
    {status && <p role="status">{status}</p>}
  </section>;
}
