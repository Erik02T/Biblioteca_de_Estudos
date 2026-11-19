import { useEffect, useId, useRef, useState } from 'react';
import { Button, Input, Select, containModalTab } from './ui';
import { responseValue, viewBody, viewRoute, type LibraryRequest, type SavedView } from './collection-query';
import type { LibraryRoute } from './library-route';
import styles from './page.module.css';

type WriteAction = 'create' | 'rename' | 'update' | 'delete';

export function SavedViews({ route, request, onApply, onClose }: {
  route: LibraryRoute;
  request: LibraryRequest;
  onApply: (route: LibraryRoute) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [views, setViews] = useState<SavedView[]>([]);
  const [selected, setSelected] = useState('');
  const [edit, setEdit] = useState<'create' | 'rename'>();
  const [name, setName] = useState('');
  const [loadError, setLoadError] = useState<string>();
  const [error, setError] = useState<string>();
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const newViewButton = useRef<HTMLButtonElement>(null);
  const renameButton = useRef<HTMLButtonElement>(null);
  const viewPicker = useRef<HTMLSelectElement>(null);
  const cancelledEdit = useRef<'create' | 'rename'>(undefined);
  const current = views.find(view => view.id === selected);

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => { element?.close(); };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void request('/view-configurations', { signal: controller.signal }).then(responseValue<SavedView[]>).then(items => {
      if (!controller.signal.aborted) setViews(items);
    }).catch(cause => {
      if (!controller.signal.aborted) setLoadError(cause instanceof Error ? cause.message : 'Não foi possível carregar as visões.');
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [request, retry]);

  useEffect(() => {
    if (edit) return;
    if (cancelledEdit.current) {
      (cancelledEdit.current === 'rename' ? renameButton : newViewButton).current?.focus();
      cancelledEdit.current = undefined;
    } else if (status) (viewPicker.current ?? newViewButton.current)?.focus();
  }, [edit, status]);

  const close = () => {
    dialog.current?.close();
    onClose();
  };
  const startEdit = (action: 'create' | 'rename') => {
    setEdit(action);
    setName(action === 'rename' ? current?.name ?? '' : '');
    setError(undefined);
    setStatus('');
  };
  const finishEdit = () => {
    cancelledEdit.current = edit;
    setEdit(undefined);
    setError(undefined);
  };
  const write = async (action: WriteAction) => {
    const title = action === 'create' || action === 'rename' ? name.trim() : current?.name;
    if (busy || !title || (action !== 'create' && !current)) return;
    if (action === 'delete' && !window.confirm(`Excluir a visão “${title}”?`)) return;
    const path = action === 'create' ? '/view-configurations' : '/view-configurations/' + selected;
    setBusy(true);
    setError(undefined);
    setStatus('');
    try {
      if (action === 'delete') {
        await responseValue(await request(path, { method: 'DELETE' }));
        setViews(items => items.filter(item => item.id !== selected));
        setSelected('');
        setStatus('Visão excluída.');
      } else {
        const body = action === 'rename' ? { name: title } : { name: title, ...viewBody(route) };
        const saved = await responseValue<SavedView>(await request(path, {
          method: action === 'create' ? 'POST' : 'PATCH',
          body: JSON.stringify(body),
        }));
        setViews(items => [saved, ...items.filter(item => item.id !== saved.id)]);
        setSelected(saved.id);
        setEdit(undefined);
        setStatus(action === 'rename' ? 'Visão renomeada.' : 'Visão salva.');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível concluir a operação.');
    } finally {
      setBusy(false);
    }
  };

  return <dialog ref={dialog} className={styles.savedViewsDialog} aria-labelledby={titleId}
    onKeyDown={containModalTab} onCancel={event => { event.preventDefault(); if (!busy) close(); }}>
    <div className={styles.savedViewsHeader}>
      <h2 id={titleId}>Visões salvas</h2>
      <Button disabled={busy} onClick={close}>Fechar</Button>
    </div>
    <div className={styles.savedViewsBody} aria-busy={busy}>
      {loading && <p role="status">Carregando visões…</p>}
      {loadError && <div role="alert"><p>{loadError}</p><Button onClick={() => {
        setLoading(true);
        setLoadError(undefined);
        setRetry(value => value + 1);
      }}>Recarregar visões</Button></div>}
      {!loading && !loadError && (views.length > 0 ? <label className="ui-field">Visão salva
        <Select ref={viewPicker} value={selected} disabled={busy || Boolean(edit)} onChange={event => {
          setSelected(event.target.value);
          setStatus('');
          setError(undefined);
        }}>
          <option value="">Selecione uma visão</option>
          {views.map(view => <option key={view.id} value={view.id}>{view.name}{view.configurationError ? ' (incompatível)' : ''}</option>)}
        </Select>
      </label> : <p>Nenhuma visão salva.</p>)}
      <div className={styles.savedViewsActions}>
        <Button ref={newViewButton} disabled={busy || loading || Boolean(edit)} onClick={() => startEdit('create')}>Salvar como nova</Button>
        {current && <>
          <Button disabled={busy || Boolean(edit) || Boolean(current.configurationError)} onClick={() => {
            onApply(viewRoute(current));
            close();
          }}>Abrir visão</Button>
          <Button disabled={busy || Boolean(edit)} onClick={() => void write('update')}>
            {current.configurationError ? 'Corrigir com configuração atual' : 'Atualizar com configuração atual'}
          </Button>
          <Button ref={renameButton} disabled={busy || Boolean(edit) || Boolean(current.configurationError)} onClick={() => startEdit('rename')}>Renomear</Button>
          <Button disabled={busy || Boolean(edit)} onClick={() => void write('delete')}>Excluir visão</Button>
        </>}
      </div>
      {edit && <form className={styles.savedViewsBody} onSubmit={event => { event.preventDefault(); void write(edit); }}>
        <label className="ui-field">Nome da visão<Input autoFocus key={edit} maxLength={120} value={name} disabled={busy}
          onChange={event => setName(event.target.value)} placeholder="Ex.: Revisar gramática" /></label>
        <div className={styles.savedViewsActions}>
          <Button disabled={busy} onClick={finishEdit}>Cancelar</Button>
          <Button type="submit" className={styles.collectionPrimary} disabled={!name.trim() || busy}>
            {edit === 'create' ? 'Salvar visão atual' : 'Salvar nome'}
          </Button>
        </div>
      </form>}
      {current?.configurationError && <p className={styles.filterError} role="alert">Configuração incompatível. {current.configurationError}</p>}
      {error && <p className={styles.filterError} role="alert">{error}</p>}
      {status && <p role="status">{status}</p>}
    </div>
  </dialog>;
}
