import { Button, Select, containModalTab } from './ui';
import { useEffect, useRef, useState } from 'react';
import type { JSONContent } from '@tiptap/core';
import type { Area } from './page';
import { TemplateDocument } from './TemplateDocument';
import { responseValue, type LibraryRequest } from './collection-query';

type Template = { id: string; name: string; description?: string; type: 'NOTE' | 'LECTURE' | 'PROJECT' };
type Preview = Template & { content: JSONContent; metadata: { coverAttachmentId?: string | null }; files: { id: string; tipo: string; nome: string | null; url: string | null }[] };
type Props = { templates: Template[]; request: LibraryRequest; pages: Area[]; defaultSection: Area['section']; defaultSubSection: Area['subSection']; onApplied: (area: Area) => void; onClose: () => void; loading?: boolean; error?: string; onRetry?: () => void };

export function TemplateGallery({ templates, request, pages, defaultSection, defaultSubSection, onApplied, onClose, loading, error: loadError, onRetry }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState('');
  const [preview, setPreview] = useState<Preview>();
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string>();
  const [error, setError] = useState<string>();
  const [section, setSection] = useState(defaultSection);
  const [subSection, setSubSection] = useState(defaultSubSection);
  const [parentId, setParentId] = useState('');
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState(false);
  const working = useRef(false);
  const attempt = useRef<{ signature: string; key: string } | undefined>(undefined);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    return () => { previous?.focus(); };
  }, []);
  useEffect(() => {
    if (!selected) return;
    const controller = new AbortController();
    const load = async () => { setPreviewLoading(true); setPreviewError(undefined); setPreview(undefined);
    void request('/templates/' + selected + '/preview', { signal: controller.signal }).then(responseValue<Preview>).then(result => {
      if (!controller.signal.aborted) setPreview(result);
    }).catch(cause => { if (!controller.signal.aborted) setPreviewError(cause.message); })
      .finally(() => { if (!controller.signal.aborted) setPreviewLoading(false); });
    }; void load(); return () => controller.abort();
  }, [selected, retry, request]);
  const apply = async () => {
    if (working.current || !selected || !preview) return;
    working.current = true; setBusy(true); setError(undefined);
    const body = { section, subSection, parentId: parentId || null };
    const signature = JSON.stringify({ selected, ...body });
    if (attempt.current?.signature !== signature) attempt.current = { signature, key: crypto.randomUUID() };
    try {
      const result = await responseValue<Area>(await request('/templates/' + selected + '/apply', { method: 'POST', headers: { 'Idempotency-Key': attempt.current.key }, body: JSON.stringify(body) }));
      onApplied(result);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível aplicar o modelo.'); }
    finally { working.current = false; setBusy(false); }
  };
  const remove = async () => {
    if (working.current || !selected || !window.confirm('Excluir este modelo? As páginas já criadas continuam independentes.')) return;
    working.current = true; setBusy(true); setError(undefined);
    try {
      await responseValue(await request('/templates/' + selected, { method: 'DELETE' }));
      setSelected(''); setPreview(undefined); onRetry?.();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível excluir. Tente novamente para concluir a limpeza.'); }
    finally { working.current = false; setBusy(false); }
  };
  return <dialog ref={dialog} className="template-gallery-dialog" aria-label="Modelos de páginas" onKeyDown={containModalTab} onCancel={event => { event.preventDefault(); if (!working.current) onClose(); }}>
    <div className="gallery-header"><h2>Modelos</h2><Button disabled={busy} onClick={onClose}>Fechar modelos</Button></div>
    <p>Para criar um modelo, abra uma página e escolha “Salvar como modelo” no menu da página.</p>
    {loading && <p role="status">Carregando modelos…</p>}
    {loadError && <p role="alert">{loadError}<Button onClick={onRetry}>Tentar carregar modelos novamente</Button></p>}
    <div className="template-list">{!loading && !loadError && templates.map(template => <Button key={template.id} className="template-card" disabled={busy} aria-pressed={selected === template.id} onClick={() => { setSelected(template.id); setError(undefined); }}><strong>{template.name}</strong><span>{template.description}</span></Button>)}</div>
    {!loading && !loadError && !templates.length && <p>Nenhum modelo criado ainda.</p>}
    {selected && <section className="template-preview" aria-label="Prévia do modelo">
      {previewLoading && <p role="status">Carregando prévia…</p>}
      {previewError && <p role="alert">{previewError}<Button onClick={() => setRetry(value => value + 1)}>Tentar prévia novamente</Button></p>}
      {preview && <><h3>{preview.name}</h3><TemplateDocument content={preview.content} files={preview.files} coverAttachmentId={preview.metadata.coverAttachmentId} /><Button disabled={busy} onClick={() => setRetry(value => value + 1)}>Atualizar prévia e mídia</Button></>}
      <div className="view-controls">
        <label>Área de destino<Select value={section} disabled={busy} onChange={event => { setSection(event.target.value as Area['section']); setParentId(''); }}><option value="LINGUAGENS">Idiomas</option><option value="FACULDADE">Faculdade</option><option value="PROJETOS">Projetos</option><option value="OUTROS">Outros</option></Select></label>
        <label>Status inicial<Select disabled={busy} value={subSection} onChange={event => setSubSection(event.target.value as Area['subSection'])}><option value="ESTUDANDO">Estudando</option><option value="ESTUDADO">Estudado</option></Select></label>
        <label>Página mãe de destino<Select disabled={busy} value={parentId} onChange={event => setParentId(event.target.value)}><option value="">Página principal</option>{pages.filter(page => page.section === section && !page.deletedAt).map(page => <option key={page.id} value={page.id}>{page.nome}</option>)}</Select></label>
      </div>
      <div className="template-actions"><Button disabled={busy || !preview || previewLoading} onClick={() => void apply()}>{busy ? 'Aguarde…' : 'Criar página com este modelo'}</Button><Button disabled={busy} onClick={() => void remove()}>Excluir modelo</Button></div>
    </section>}
    {error && <p role="alert">{error}</p>}
  </dialog>;
}
