'use client';

import { useEffect, useState } from 'react';
import { draftStore, type LocalDraft } from './draft-store';
import { Button } from './ui';

export function downloadDraft(draft: LocalDraft) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = 'rascunho-biblioteca.json'; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function DraftRecovery({ ownerId, refreshKey, onSelect }: { ownerId: string; refreshKey: string; onSelect: (draft: LocalDraft) => void }) {
  const [drafts, setDrafts] = useState<LocalDraft[]>([]);
  const [error, setError] = useState<string>();
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const refresh = () => setRetry(value => value + 1);
    window.addEventListener('biblioteca-drafts-confirmed', refresh);
    return () => window.removeEventListener('biblioteca-drafts-confirmed', refresh);
  }, []);
  useEffect(() => {
    let active = true;
    void draftStore.list(ownerId).then(items => { if (active) { setDrafts(items); setError(undefined); } }).catch(() => {
      if (active) setError('Não foi possível consultar os rascunhos deste navegador.');
    });
    return () => { active = false; };
  }, [ownerId, refreshKey, retry]);
  const discard = async (draft: LocalDraft) => {
    if (!window.confirm('Descartar somente este rascunho local? A página remota será mantida.')) return;
    try { await draftStore.remove(ownerId, draft.id, draft.sequence); setRetry(value => value + 1); }
    catch { setError('Não foi possível descartar o rascunho.'); }
  };
  if (error) return <section aria-label="Rascunhos locais"><p role="alert">{error}</p><Button onClick={() => setRetry(value => value + 1)}>Consultar rascunhos novamente</Button></section>;
  if (!drafts.length) return null;
  return <section aria-label="Rascunhos locais"><h2>Rascunhos neste navegador</h2><p>Confira a versão remota antes de recuperar. Cada sessão de edição é preservada separadamente.</p><ul>{drafts.map(draft => <li key={draft.id}>{draft.snapshot.nome} · {new Date(draft.savedAt).toLocaleString('pt-BR')} <Button onClick={() => onSelect(draft)}>Abrir recuperação</Button><Button onClick={() => downloadDraft(draft)}>Baixar rascunho</Button><Button onClick={() => void discard(draft)}>Descartar rascunho</Button></li>)}</ul></section>;
}
