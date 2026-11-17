'use client';

import { useEffect, useRef, useState } from 'react';
import type { JSONContent } from '@tiptap/core';
import type { ResourceInsertKind } from './BlockControls';
import type { DocumentInsertion } from './document-insertion';
import type { ResolvedAttachment } from './document-resources';
import { Button, Field, Input, containModalTab } from './ui';

type PageResult = { id: string; nome: string; section: string };
export function DocumentResourcePicker({ kind, insertion, areaId, attachments, request, onAttachment, onClose }: {
  kind: ResourceInsertKind; insertion: DocumentInsertion; areaId?: string; attachments: ResolvedAttachment[];
  request: (path: string, init?: RequestInit) => Promise<Response>; onAttachment: (attachment: ResolvedAttachment) => void; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const alive = useRef(true);
  const uploadController = useRef<AbortController | null>(null);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [results, setResults] = useState<PageResult[]>([]);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const isPage = kind === 'pageInline' || kind === 'pageBlock';
  const title = isPage ? 'Inserir referência de página' : kind === 'image' ? 'Inserir imagem' : kind === 'link' ? 'Inserir link de material' : 'Inserir arquivo';
  useEffect(() => {
    alive.current = true;
    const element = dialog.current;
    element?.showModal();
    return () => {
      alive.current = false; uploadController.current?.abort(); insertion.dispose(); element?.close();
      // The document is inert while the picker is modal. Restore ProseMirror's
      // selection after closing, rather than a stale native contenteditable caret.
      queueMicrotask(() => insertion.focus());
    };
  }, [insertion]);
  useEffect(() => {
    if (!isPage || !query.trim()) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true); setError('');
      try {
        const response = await request(`/areas/search?q=${encodeURIComponent(query.trim())}&page=${page}&limit=20`, { signal: controller.signal });
        if (!response.ok) throw Error('Não foi possível buscar páginas.');
        const data = await response.json() as { items: PageResult[]; pagination: { totalPages: number } };
        if (!controller.signal.aborted) { setResults(data.items); setPages(data.pagination.totalPages); }
      } catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Falha na busca.'); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [isPage, query, page, retry, request]);
  const insert = (node: JSONContent, inline = false) => {
    if (insertion.insert(node, inline)) onClose();
    else setError('A posição mudou ou não aceita este conteúdo. Feche e escolha uma nova posição no texto.');
  };
  const insertAttachment = (attachment: ResolvedAttachment) => insert({ type: kind === 'image' ? 'image' : 'attachment', attrs: { attachmentId: attachment.id } });
  const create = async (file?: File) => {
    if (!areaId) { setError('Crie a página antes de anexar materiais.'); return; }
    if (file && file.size > 100 * 1024 * 1024) { setError('O limite por arquivo é 100 MB.'); return; }
    if (!file) {
      try { const url = new URL(query); if (!['http:', 'https:'].includes(url.protocol)) throw Error(); }
      catch { setError('Informe uma URL HTTP ou HTTPS válida.'); return; }
    }
    setBusy(true); setError('');
    const controller = new AbortController(); uploadController.current = controller;
    try {
      let response: Response;
      if (file) {
        const data = new FormData(); data.append('areaId', areaId); data.append('file', file);
        response = await request('/attachments/upload', { method: 'POST', body: data, signal: controller.signal });
      } else response = await request('/attachments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ areaId, tipo: 'LINK', nome: query.slice(0, 255), url: query }), signal: controller.signal });
      if (!response.ok) { const data = await response.json().catch(() => null); throw Error(Array.isArray(data?.message) ? data.message.join(' ') : data?.message || 'Não foi possível anexar o material.'); }
      const attachment = await response.json() as ResolvedAttachment;
      if (alive.current) { onAttachment(attachment); insertAttachment(attachment); }
    } catch (cause) { if (alive.current && !controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Falha no envio.'); }
    finally { if (alive.current) setBusy(false); }
  };
  const materials = attachments.filter(item => kind === 'image' ? item.tipo === 'IMAGEM' : kind === 'link' ? item.tipo === 'LINK' : item.tipo !== 'IMAGEM');
  return <dialog ref={dialog} className="document-picker" aria-label={title} onCancel={event => { event.preventDefault(); event.stopPropagation(); onClose(); }} onKeyDown={event => {
    containModalTab(event);
    if (event.key === 'Escape' && !event.nativeEvent.isComposing && event.nativeEvent.keyCode !== 229) { event.preventDefault(); event.stopPropagation(); onClose(); }
  }}>
    <h2>{title}</h2>
    {isPage ? <>
      <Field label="Buscar página"><Input autoFocus value={query} onChange={event => { setQuery(event.target.value); setPage(1); setResults([]); setPages(1); setError(''); setLoading(Boolean(event.target.value.trim())); }} /></Field>
      {loading && <p role="status">Buscando páginas…</p>}
      {!loading && query.trim() && !error && results.length === 0 && <p>Nenhuma página encontrada.</p>}
      <div className="document-picker-results">{results.map(item => <Button key={item.id} onClick={() => {
        const node = { type: 'pageReference', attrs: { targetPageId: item.id } };
        insert(kind === 'pageInline' ? node : { type: 'paragraph', content: [node] }, kind === 'pageInline');
      }}>{item.nome} · {item.section}</Button>)}</div>
      {pages > 1 && <nav aria-label="Resultados de páginas"><Button disabled={page <= 1 || loading} onClick={() => setPage(value => value - 1)}>Anterior</Button><span>{page} / {pages}</span><Button disabled={page >= pages || loading} onClick={() => setPage(value => value + 1)}>Próxima</Button></nav>}
    </> : <>
      {!areaId ? <p>Crie a página antes de anexar materiais.</p> : <>
        {kind === 'link' ? <><Field label="URL do material"><Input autoFocus type="url" value={query} onChange={event => setQuery(event.target.value)} placeholder="https://" /></Field><Button disabled={busy} onClick={() => void create()}>Adicionar e inserir link</Button></> : <>
          <Field label={kind === 'image' ? 'Enviar imagem' : 'Enviar arquivo'}><Input autoFocus type="file" disabled={busy} accept={kind === 'image' ? 'image/jpeg,image/png,image/gif,image/webp,image/bmp,image/svg+xml' : undefined} onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void create(file); }} /></Field>
          <p>Até 100 MB. Imagens, documentos, textos, áudio, vídeo e compactados nos formatos aceitos pelo envio. Executáveis e scripts não são aceitos.</p>
        </>}
        {materials.length > 0 && <><h3>Materiais desta página</h3><div className="document-picker-results">{materials.map(item => <Button key={item.id} disabled={busy} onClick={() => insertAttachment(item)}>{item.nome || 'Material sem nome'}</Button>)}</div></>}
      </>}
    </>}
    {busy && <p role="status">Enviando material…</p>}
    {error && <p role="alert">{error}</p>}
    {isPage && error && <Button onClick={() => setRetry(value => value + 1)}>Tentar buscar novamente</Button>}
    <Button onClick={onClose}>Fechar</Button>
  </dialog>;
}
