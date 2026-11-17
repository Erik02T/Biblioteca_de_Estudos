export type PageSnapshot = {
  section: 'LINGUAGENS' | 'FACULDADE' | 'PROJETOS' | 'OUTROS';
  subSection: 'ESTUDANDO' | 'ESTUDADO';
  nome: string; categoria: string; nivelEntendimento: number; icone: string;
  parentId: string | null; targetPageId: string | null; coverAttachmentId: string | null;
  coverPosition: number; fullWidth: boolean; conteudo: import('@tiptap/core').JSONContent;
};

export type LocalDraft = {
  schemaVersion: 1; id: string; userId: string; pageId?: string;
  creationKey: string; creationRequest?: PageSnapshot;
  baseUpdatedAt?: string; sequence: number; snapshot: PageSnapshot;
  inFlight?: PageSnapshot; savedAt: string;
};

export interface DraftStore {
  put(draft: LocalDraft): Promise<void>;
  list(userId: string, pageId?: string): Promise<LocalDraft[]>;
  remove(userId: string, id: string, throughSequence: number): Promise<void>;
}

/** One record per editing session: tabs never overwrite each other's journals. */
export class IndexedDraftStore implements DraftStore {
  private open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') { reject(new Error('Armazenamento local indisponível.')); return; }
      const request = indexedDB.open('biblioteca-drafts-v1', 1);
      request.onupgradeneeded = () => {
        const store = request.result.createObjectStore('drafts', { keyPath: 'id' });
        store.createIndex('userId', 'userId');
      };
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('Feche outras janelas antigas para liberar os rascunhos locais.'));
      request.onsuccess = () => resolve(request.result);
    });
  }

  private async transaction<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore, done: (value: T) => void) => void): Promise<T> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('drafts', mode);
      let result: T;
      tx.oncomplete = () => { db.close(); resolve(result); };
      tx.onerror = tx.onabort = () => { db.close(); reject(tx.error ?? new Error('Não foi possível guardar o rascunho local.')); };
      try { work(tx.objectStore('drafts'), value => { result = value; }); }
      catch (error) { db.close(); reject(error); }
    });
  }

  put(draft: LocalDraft): Promise<void> {
    return this.transaction('readwrite', (store, done) => {
      const request = store.get(draft.id);
      request.onsuccess = () => {
        const old = request.result as LocalDraft | undefined;
        if (!old || (old.userId === draft.userId && old.sequence <= draft.sequence)) store.put(draft);
        done(undefined);
      };
    });
  }

  list(userId: string, pageId?: string): Promise<LocalDraft[]> {
    return this.transaction('readonly', (store, done) => {
      const request = store.index('userId').getAll(userId);
      request.onsuccess = () => done((request.result as LocalDraft[]).filter(draft => draft.schemaVersion === 1 && draft.userId === userId && (pageId === undefined || draft.pageId === pageId)).sort((a, b) => b.savedAt.localeCompare(a.savedAt)));
    });
  }

  remove(userId: string, id: string, throughSequence: number): Promise<void> {
    return this.transaction<void>('readwrite', (store, done) => {
      const request = store.get(id);
      request.onsuccess = () => {
        const draft = request.result as LocalDraft | undefined;
        if (draft?.userId === userId && draft.sequence <= throughSequence) store.delete(id);
        done(undefined);
      };
    }).then(() => { window.dispatchEvent(new Event('biblioteca-drafts-confirmed')); });
  }
}

export const draftStore = new IndexedDraftStore();

// JSONB may return object properties in a different order from Tiptap's JSON.
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)]));
  return value;
}

export function snapshotMatches(snapshot: PageSnapshot, remote: Record<string, unknown>, contentWritable = true): boolean {
  return Object.entries(snapshot).every(([key, value]) => {
    if (!contentWritable && key === 'conteudo') return true;
    const remoteValue = remote[key] ?? (['parentId', 'targetPageId', 'coverAttachmentId'].includes(key) ? null : key === 'icone' ? '' : undefined);
    return JSON.stringify(canonical(value)) === JSON.stringify(canonical(remoteValue));
  });
}
