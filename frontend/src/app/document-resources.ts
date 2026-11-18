import type { Editor } from '@tiptap/core';

export type ResolvedAttachment = { id: string; areaId?: string; tipo: 'IMAGEM' | 'ARQUIVO' | 'LINK'; nome: string | null; url: string };
export type ResolvedPage = { id: string; available: boolean; nome?: string; icone?: string | null; section?: string };
export type DocumentResources = {
  attachment: (id: string, refresh?: boolean) => Promise<ResolvedAttachment>;
  page: (id: string, refresh?: boolean) => Promise<ResolvedPage>;
  navigate: (id: string) => void;
};
const resources = new WeakMap<Editor, { value?: DocumentResources; listeners: Set<() => void> }>();
function state(editor: Editor) {
  let item = resources.get(editor);
  if (!item) { item = { listeners: new Set() }; resources.set(editor, item); }
  return item;
}
export function documentResources(editor: Editor) { return state(editor).value; }
export function configureDocumentResources(editor: Editor, value: DocumentResources) {
  const item = state(editor); item.value = value; item.listeners.forEach(listener => listener());
  return () => { if (item.value === value) { item.value = undefined; item.listeners.forEach(listener => listener()); } };
}
export function subscribeDocumentResources(editor: Editor, listener: () => void) {
  const listeners = state(editor).listeners; listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Per-editor/account cache. Reference reads in the same turn share one authorized request. */
export function createDocumentResources(request: (path: string) => Promise<Response>, navigate: (id: string) => void, areaId: string): DocumentResources {
  const attachments = new Map<string, Promise<ResolvedAttachment>>();
  const attachmentPending = new Set<string>();
  const pages = new Map<string, Promise<ResolvedPage>>();
  const pending = new Map<string, { resolve: (page: ResolvedPage) => void; reject: (cause: unknown) => void }[]>();
  let scheduled = false;
  const flush = async () => {
    scheduled = false;
    const batch = new Map(pending); pending.clear();
    const ids = [...batch.keys()];
    for (let i = 0; i < ids.length; i += 100) {
      const chunk = ids.slice(i, i + 100);
      try {
        const response = await request('/areas/references?ids=' + chunk.map(encodeURIComponent).join(','));
        if (!response.ok) throw Error('Não foi possível consultar as referências.');
        const data = await response.json() as { items: ResolvedPage[] };
        for (const id of chunk) batch.get(id)?.forEach(waiter => waiter.resolve(data.items.find(page => page.id === id) ?? { id, available: false }));
      } catch (cause) {
        for (const id of chunk) { pages.delete(id); batch.get(id)?.forEach(waiter => waiter.reject(cause)); }
      }
    }
  };
  return {
    navigate,
    attachment(id, refresh = false) {
      if (refresh && !attachmentPending.has(id)) attachments.delete(id);
      let result = attachments.get(id);
      if (!result) {
        attachmentPending.add(id);
        result = request('/attachments/' + encodeURIComponent(id)).then(async response => {
          if (!response.ok) throw Error('Material indisponível.');
          const attachment = await response.json() as ResolvedAttachment;
          if (attachment.areaId !== areaId) throw Error('Material indisponível.');
          const url = new URL(attachment.url);
          if (!['http:', 'https:'].includes(url.protocol)) throw Error('Endereço indisponível.');
          return attachment;
        }).catch(cause => { attachments.delete(id); throw cause; }).finally(() => { attachmentPending.delete(id); });
        attachments.set(id, result);
      }
      return result;
    },
    page(id, refresh = false) {
      if (refresh && !pending.has(id)) pages.delete(id);
      let result = pages.get(id);
      if (!result) {
        result = new Promise<ResolvedPage>((resolve, reject) => {
          const waiters = pending.get(id) ?? []; waiters.push({ resolve, reject }); pending.set(id, waiters);
          if (!scheduled) { scheduled = true; queueMicrotask(() => { void flush(); }); }
        });
        pages.set(id, result);
      }
      return result;
    },
  };
}
