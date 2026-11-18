import { Node, mergeAttributes, type NodeViewRenderer } from '@tiptap/core';
import { documentResources, subscribeDocumentResources } from './document-resources';

const resourceAttributes = (kind: 'attachment' | 'page') => ({
  ...(kind === 'attachment' ? { attachmentId: { default: null } } : { targetPageId: { default: null } }),
  ...(kind === 'attachment' ? { alt: { default: null }, name: { default: null }, title: { default: null } } : {}),
});

export const DocumentImage = Node.create({
  name: 'image', group: 'block', atom: true, draggable: true,
  addAttributes() { return resourceAttributes('attachment'); },
  parseHTML() { return [{ tag: 'figure[data-attachment-id]', getAttrs: element => ({ attachmentId: element.getAttribute('data-attachment-id') }) }]; },
  renderHTML({ HTMLAttributes }) { return ['figure', mergeAttributes({ 'data-attachment-id': HTMLAttributes.attachmentId }, HTMLAttributes), 'Imagem']; },
  addNodeView() { return resourceNodeView('image'); },
});
export const DocumentAttachment = Node.create({
  name: 'attachment', group: 'block', atom: true, draggable: true,
  addAttributes() { return resourceAttributes('attachment'); },
  parseHTML() { return [{ tag: 'div[data-attachment-id]', getAttrs: element => ({ attachmentId: element.getAttribute('data-attachment-id') }) }]; },
  renderHTML({ HTMLAttributes }) { return ['div', mergeAttributes({ 'data-attachment-id': HTMLAttributes.attachmentId }, HTMLAttributes), 'Material']; },
  addNodeView() { return resourceNodeView('attachment'); },
});
export const PageReference = Node.create({
  name: 'pageReference', group: 'inline', inline: true, atom: true, selectable: true,
  addAttributes() { return resourceAttributes('page'); },
  parseHTML() { return [{ tag: 'span[data-page-reference]', getAttrs: element => ({ targetPageId: element.getAttribute('data-page-reference') }) }]; },
  renderHTML({ HTMLAttributes }) { return ['span', mergeAttributes({ 'data-page-reference': HTMLAttributes.targetPageId }, HTMLAttributes), 'Página referenciada']; },
  addNodeView() { return resourceNodeView('pageReference'); },
});

function resourceNodeView(kind: 'image' | 'attachment' | 'pageReference'): NodeViewRenderer {
  return ({ node, editor, getPos }) => {
    let current = node, disposed = false, generation = 0, imageRetried = false;
    const dom = document.createElement(kind === 'pageReference' ? 'span' : 'div');
    dom.className = kind === 'pageReference' ? 'document-reference' : 'document-material';
    dom.contentEditable = 'false';
    const label = document.createElement('span'); label.setAttribute('role', 'status');
    const open = document.createElement('a'); open.target = '_blank'; open.rel = 'noopener noreferrer'; open.hidden = true;
    const preview = kind === 'image' ? document.createElement('img') : null;
    const retry = document.createElement('button'); retry.type = 'button'; retry.textContent = 'Tentar novamente'; retry.hidden = true;
    dom.append(label, open); if (preview) dom.append(preview); dom.append(retry);
    const select = () => { const pos = getPos(); if (typeof pos === 'number') editor.commands.setNodeSelection(pos); };
    dom.addEventListener('pointerdown', select);
    const load = async (refresh = false) => {
      const revision = ++generation;
      const services = documentResources(editor);
      open.hidden = true; open.removeAttribute('href'); if (preview) { preview.hidden = true; preview.removeAttribute('src'); }
      label.textContent = 'Carregando…'; retry.hidden = true;
      if (!services) { label.textContent = kind === 'pageReference' ? 'Página indisponível' : 'Material indisponível'; return; }
      try {
        if (kind === 'pageReference') {
          const page = await services.page(String(current.attrs.targetPageId ?? ''), refresh);
          if (disposed || revision !== generation) return;
          label.textContent = page.available ? '' : 'Página indisponível';
          open.textContent = `${page.icone || '↗'} ${page.nome || 'Sem título'}`;
          open.href = '?page=' + encodeURIComponent(page.id); open.target = '_self'; open.hidden = !page.available;
        } else {
          const attachment = await services.attachment(String(current.attrs.attachmentId ?? ''), refresh);
          if (disposed || revision !== generation) return;
          label.textContent = ''; open.textContent = attachment.nome || current.attrs.name || 'Abrir material';
          open.href = attachment.url; open.hidden = false;
          if (preview && attachment.tipo === 'IMAGEM') {
            preview.alt = current.attrs.alt || attachment.nome || 'Imagem anexada'; preview.hidden = false; preview.src = attachment.url;
          }
        }
      } catch {
        if (disposed || revision !== generation) return;
        label.textContent = kind === 'pageReference' ? 'Não foi possível consultar a página.' : 'Material indisponível.';
        retry.hidden = false;
      }
    };
    const refresh = () => { imageRetried = false; void load(true); };
    retry.addEventListener('click', refresh);
    preview?.addEventListener('error', () => {
      if (!imageRetried) { imageRetried = true; void load(true); }
      else { preview.hidden = true; label.textContent = 'Não foi possível carregar a imagem.'; retry.hidden = false; }
    });
    open.addEventListener('click', event => {
      if (kind !== 'pageReference') return;
      event.preventDefault(); event.stopPropagation();
      documentResources(editor)?.navigate(String(current.attrs.targetPageId));
    });
    const unsubscribe = subscribeDocumentResources(editor, refresh);
    window.addEventListener('focus', refresh);
    void load();
    return {
      dom,
      update(updated) {
        if (updated.type !== current.type) return false;
        const changed = JSON.stringify(updated.attrs) !== JSON.stringify(current.attrs);
        current = updated; if (changed) refresh(); return true;
      },
      stopEvent: event => event.target instanceof HTMLElement && Boolean(event.target.closest('a,button')),
      ignoreMutation: mutation => mutation.type !== 'selection',
      destroy() { disposed = true; generation += 1; unsubscribe(); window.removeEventListener('focus', refresh); dom.removeEventListener('pointerdown', select); },
    };
  };
}
