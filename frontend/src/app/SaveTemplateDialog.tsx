import { useEffect, useRef, useState } from 'react';
import { Button, Input, Select, containModalTab } from './ui';
import { responseValue, type LibraryRequest } from './collection-query';

export function SaveTemplateDialog({ pageId, name: initialName, checkpoint, request, onClose }: {
  pageId: string; name: string; checkpoint: () => Promise<string>; request: LibraryRequest; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const working = useRef(false);
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState('');
  const [type, setType] = useState('NOTE');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    const focus = document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    return () => focus?.focus();
  }, []);
  const save = async () => {
    if (working.current) return;
    working.current = true; setBusy(true); setError(undefined);
    try {
      const updatedAt = await checkpoint();
      await responseValue(await request('/templates/from-page', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pageId, updatedAt, name: name.trim(), description: description.trim(), type }) }));
      setSaved(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível criar o modelo.'); }
    finally { working.current = false; setBusy(false); }
  };
  return <dialog ref={dialog} className="document-picker" aria-label="Salvar página como modelo" onKeyDown={containModalTab} onCancel={event => { event.preventDefault(); if (!working.current) onClose(); }}>
    <h2>Salvar como modelo</h2>
    {saved ? <p role="status">Modelo salvo com cópias independentes dos materiais.</p> : <form onSubmit={event => { event.preventDefault(); void save(); }}>
      <label>Nome do modelo<Input autoFocus required maxLength={120} disabled={busy} value={name} onChange={event => setName(event.target.value)} /></label>
      <label>Descrição<Input maxLength={1000} disabled={busy} value={description} onChange={event => setDescription(event.target.value)} /></label>
      <label>Tipo de modelo<Select disabled={busy} value={type} onChange={event => setType(event.target.value)}><option value="NOTE">Anotação</option><option value="LECTURE">Aula</option><option value="PROJECT">Projeto</option></Select></label>
      <p>Conteúdo, propriedades, capa e materiais serão copiados. Subpáginas não fazem parte do modelo.</p>
      <Button type="submit" disabled={busy || !name.trim()}>{busy ? 'Salvando modelo…' : 'Salvar modelo'}</Button>
    </form>}
    {error && <p role="alert">{error}</p>}
    <Button disabled={busy} onClick={onClose}>{saved ? 'Concluir' : 'Cancelar'}</Button>
  </dialog>;
}
