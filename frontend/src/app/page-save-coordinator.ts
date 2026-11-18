import { type DraftStore, type LocalDraft, type PageSnapshot, snapshotMatches } from './draft-store';

export type SavedPage = Record<string, unknown> & { id: string; updatedAt: string };
export class PageSaveError extends Error {
  constructor(message: string, readonly status?: number) { super(message); }
}
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/** The single writer used by autosave, navigation and version/export checkpoints. */
export class PageSaveCoordinator {
  readonly draftId: string;
  private record: LocalDraft;
  private acknowledged = 0;
  private pending?: Promise<SavedPage | undefined>;
  private local: Promise<void> = Promise.resolve();
  private active = true;
  private uncertain = false;
  private creationSequence?: number;
  lastSaved?: SavedPage;
  saving = false;
  blocked = false;
  error?: string;

  constructor(private readonly options: {
    userId: string; pageId?: string; updatedAt?: string; initial: PageSnapshot;
    store: DraftStore; request: (pageId: string | undefined, body: PageSnapshot, revision: string | undefined, key: string) => Promise<SavedPage>;
    read: (pageId: string) => Promise<SavedPage>; isCurrent: () => boolean;
    changed: () => void; contentWritable?: boolean;
  }) {
    this.draftId = crypto.randomUUID();
    this.record = { schemaVersion: 1, id: this.draftId, userId: options.userId, pageId: options.pageId, creationKey: crypto.randomUUID(), baseUpdatedAt: options.updatedAt, sequence: 0, snapshot: copy(options.initial), savedAt: new Date().toISOString() };
  }

  get dirty() { return this.record.sequence > this.acknowledged; }
  get draft() { return copy(this.record); }
  get snapshot() { return copy(this.record.snapshot); }
  get revision() { return this.record.baseUpdatedAt; }
  get pageId() { return this.record.pageId; }
  get sequence() { return this.record.sequence; }
  get needsReconciliation() { return this.uncertain || this.blocked; }
  deactivate() { this.active = false; }
  activate() { this.active = true; }
  private assertCurrent() {
    if (!this.active || !this.options.isCurrent()) throw new PageSaveError('A conta mudou. O rascunho permanece na conta original.');
  }
  private notify() { if (this.active && this.options.isCurrent()) this.options.changed(); }
  private journal() {
    const record = copy(this.record);
    this.local = this.local.catch(() => {}).then(() => this.options.store.put(record));
    void this.local.catch(() => { this.error = 'Não foi possível guardar o rascunho neste navegador. Mantenha a página aberta e tente salvar novamente.'; this.notify(); });
    return this.local;
  }
  update(snapshot: PageSnapshot) {
    this.assertCurrent();
    this.record.snapshot = copy(snapshot); this.record.sequence += 1;
    this.record.savedAt = new Date().toISOString();
    void this.journal(); this.notify();
  }
  async durable() { await this.local; }

  async recover(draft: LocalDraft, remote?: SavedPage) {
    this.assertCurrent();
    if (draft.userId !== this.options.userId || draft.schemaVersion !== 1) throw new PageSaveError('Rascunho de outra conta ou formato incompatível.');
    if (draft.pageId !== this.options.pageId) throw new PageSaveError('Abra a página correspondente antes de recuperar este rascunho.');
    if (draft.pageId) {
      if (!remote || remote.id !== draft.pageId || (remote.updatedAt !== draft.baseUpdatedAt && !(draft.inFlight && snapshotMatches(draft.inFlight, remote, this.options.contentWritable)))) {
        throw new PageSaveError('A página remota mudou. Baixe o rascunho para comparar; a recuperação não sobrescreve a versão atual.', 409);
      }
    }
    this.record = { ...copy(draft), id: this.draftId, baseUpdatedAt: remote?.updatedAt, sequence: this.record.sequence + 1, savedAt: new Date().toISOString() };
    this.acknowledged = this.record.sequence - 1;
    this.creationSequence = this.record.creationRequest ? this.acknowledged : undefined;
    this.blocked = false; this.uncertain = false; this.error = undefined;
    await this.journal(); this.notify();
    // Keep the source journal until the user explicitly discards it or saving succeeds.
    this.recoveredSource = draft;
  }
  private recoveredSource?: LocalDraft;

  flush(): Promise<SavedPage | undefined> {
    if (this.pending) return this.pending;
    const pending = this.persist().finally(() => { if (this.pending === pending) this.pending = undefined; });
    this.pending = pending;
    return pending;
  }

  private async persist(): Promise<SavedPage | undefined> {
    this.assertCurrent();
    if (this.blocked) throw new PageSaveError(this.error ?? 'Conflito: preserve o rascunho e reabra a versão remota.', 409);
    this.saving = true; this.error = undefined; this.notify();
    try {
      while (this.dirty || !this.record.pageId) {
        this.assertCurrent();
        const sequence = this.record.sequence;
        const snapshot = copy(this.record.snapshot);
        if (!snapshot.nome.trim() || !snapshot.categoria.trim()) throw new PageSaveError('Preencha nome e categoria antes de salvar.');
        if (this.uncertain && this.record.pageId) {
          const remote = await this.options.read(this.record.pageId);
          this.assertCurrent();
          if (remote.updatedAt !== this.record.baseUpdatedAt) {
            if (!this.record.inFlight || !snapshotMatches(this.record.inFlight, remote, this.options.contentWritable)) throw new PageSaveError('Conflito — a página remota mudou. Seu rascunho foi preservado para comparação.', 409);
            this.record.baseUpdatedAt = remote.updatedAt;
          }
          this.uncertain = false;
        }
        if (!this.record.pageId && !this.record.creationRequest) {
          this.record.creationRequest = snapshot; this.creationSequence = sequence;
        }
        const sent = !this.record.pageId ? this.record.creationRequest! : snapshot;
        this.record.inFlight = sent;
        await this.journal();
        this.assertCurrent();
        this.uncertain = true;
        const saved = await this.options.request(this.record.pageId, sent, this.record.baseUpdatedAt, this.record.creationKey);
        this.assertCurrent();
        if (!this.record.pageId && !snapshotMatches(sent, saved, this.options.contentWritable)) {
          this.record.pageId = saved.id;
          await this.journal();
          throw new PageSaveError('Conflito — a página criada já foi alterada. O rascunho foi preservado; reabra a versão remota para comparar.', 409);
        }
        const acknowledged = this.record.pageId ? sequence : this.creationSequence ?? sequence;
        this.record.pageId = saved.id; this.record.baseUpdatedAt = saved.updatedAt;
        this.record.creationRequest = undefined; this.record.inFlight = undefined;
        this.acknowledged = acknowledged; this.lastSaved = saved; this.uncertain = false;
        // Serialize deletion with local writes; a late acknowledgement cannot erase a newer edit.
        if (this.dirty) await this.journal();
        else {
          await this.local;
          await this.options.store.remove(this.options.userId, this.draftId, acknowledged);
        }
        if (this.recoveredSource && !this.dirty) {
          await this.options.store.remove(this.options.userId, this.recoveredSource.id, this.recoveredSource.sequence);
          this.recoveredSource = undefined;
        }
        this.notify();
      }
      return this.lastSaved;
    } catch (error) {
      if (error instanceof PageSaveError && error.status === 409) this.blocked = true;
      if (error instanceof PageSaveError && error.status && error.status >= 400 && error.status < 500 && error.status !== 409) {
        this.uncertain = false;
        // A definite rejection did not commit a creation. Corrections may form a new request.
        if (!this.record.pageId) {
          this.record.creationRequest = undefined; this.creationSequence = undefined;
          await this.journal();
        }
      }
      this.error = error instanceof Error ? error.message : 'Não foi possível salvar a página.';
      this.notify(); throw error;
    } finally { this.saving = false; this.notify(); }
  }
}
