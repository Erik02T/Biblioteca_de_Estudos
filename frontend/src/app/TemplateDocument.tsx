/* eslint-disable @next/next/no-img-element -- previews use short-lived signed storage URLs. */
import { createElement, type ReactNode } from 'react';
import type { JSONContent } from '@tiptap/core';

type PreviewFile = { id: string; tipo: string; nome: string | null; url: string | null };
export function TemplateDocument({ content, files, coverAttachmentId }: { content: JSONContent | { texto?: string }; files: PreviewFile[]; coverAttachmentId?: string | null }) {
  const render = (node: JSONContent, key: number): ReactNode => {
    if (node.type === 'text') {
      let text: ReactNode = node.text;
      for (const mark of node.marks ?? []) {
        const tag = ({ bold: 'strong', italic: 'em', strike: 's', code: 'code', highlight: 'mark', underline: 'u' } as Record<string, string>)[mark.type];
        if (tag) text = createElement(tag, { key: mark.type }, text);
      }
      return <span key={key}>{text}</span>;
    }
    const children = node.content?.map(render);
    if (node.type === 'doc') return <div key={key}>{children}</div>;
    if (node.type === 'image' || node.type === 'attachment') {
      const file = files.find(file => file.id === node.attrs?.attachmentId);
      if (!file?.url) return <p key={key}>Material indisponível</p>;
      return <figure key={key}>{node.type === 'image' && <img src={file.url} alt={file.nome ?? 'Imagem do modelo'} />}<figcaption><a href={file.url} target="_blank" rel="noreferrer">{file.nome ?? 'Abrir material'}</a></figcaption></figure>;
    }
    if (node.type === 'pageReference') return <span key={key}>↗ Página referenciada</span>;
    if (node.type === 'codeBlock') return <pre key={key}><code>{children}</code></pre>;
    if (node.type === 'hardBreak') return <br key={key} />;
    if (node.type === 'horizontalRule') return <hr key={key} />;
    if (node.type === 'toggleBlock') return <details key={key} open><summary>{String(node.attrs?.summary ?? 'Alternante')}</summary>{children}</details>;
    if (node.type === 'taskItem') return <li key={key}><input type="checkbox" checked={Boolean(node.attrs?.checked)} disabled aria-label="Tarefa do modelo" />{children}</li>;
    const tag = node.type === 'heading' ? `h${Math.max(1, Math.min(6, Number(node.attrs?.level ?? 2)))}`
      : ({ paragraph: 'p', bulletList: 'ul', orderedList: 'ol', taskList: 'ul', listItem: 'li', blockquote: 'blockquote', callout: 'aside' } as Record<string, string>)[node.type ?? ''] ?? 'div';
    return createElement(tag, { key }, children);
  };
  const cover = files.find(file => file.id === coverAttachmentId && file.tipo === 'IMAGEM');
  return <div className="template-document">{cover?.url && <figure><img src={cover.url} alt="Capa do modelo" /></figure>}{'texto' in content ? <p>{content.texto}</p> : render(content as JSONContent, 0)}{files.length > 0 && <section aria-label="Materiais do modelo"><h4>Materiais</h4><ul>{files.map(file => <li key={file.id}>{file.url ? <a href={file.url} target="_blank" rel="noreferrer">{file.nome ?? 'Material'}</a> : 'Material indisponível'}</li>)}</ul></section>}</div>;
}
