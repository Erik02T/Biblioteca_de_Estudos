import { useState } from 'react';
import type { Area } from './page';
import { Button, Input, Select } from './ui';

export type StudyPatch = Partial<Pick<Area, 'nome' | 'categoria' | 'nivelEntendimento' | 'section' | 'subSection' | 'parentId' | 'isFavorite'>>;
export type UpdateStudy = (area: Area, patch: StudyPatch) => Promise<Area>;
export type ReloadStudy = (id: string) => Promise<Area>;
const values = (area: Area) => ({ nome: area.nome, categoria: area.categoria, nivelEntendimento: area.nivelEntendimento, subSection: area.subSection });

export function PropertyRow({ area, onEdit, onUpdate, onReload }: { area: Area; onEdit: (area: Area) => void; onUpdate: UpdateStudy; onReload: ReloadStudy }) {
  const [draft, setDraft] = useState<{ base: Area; values: ReturnType<typeof values> }>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const displayed = draft?.values ?? values(area);
  const change = (patch: Partial<ReturnType<typeof values>>) => setDraft(current => ({ base: current?.base ?? area, values: { ...(current?.values ?? values(area)), ...patch } }));
  const save = async () => {
    if (!draft || busy) return;
    setBusy(true); setError(undefined);
    try {
      const original = values(draft.base);
      const patch = Object.fromEntries(Object.entries(draft.values).filter(([key, value]) => value !== original[key as keyof typeof original])) as StudyPatch;
      await onUpdate(draft.base, patch); setDraft(undefined);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível salvar as propriedades.'); }
    finally { setBusy(false); }
  };
  const reload = async () => {
    setBusy(true);
    try { await onReload(area.id); setDraft(undefined); setError(undefined); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível recarregar.'); }
    finally { setBusy(false); }
  };
  return <tr role="row" data-page-id={area.id} aria-busy={busy}>
    <td role="cell"><span className="table-field-label" aria-hidden="true">Nome</span><Input form={'properties-' + area.id} aria-label={`Título de ${area.nome}`} maxLength={255} required disabled={busy} value={displayed.nome} onChange={event => change({ nome: event.target.value })} /></td>
    <td role="cell"><span className="table-field-label" aria-hidden="true">Categoria</span><Input form={'properties-' + area.id} aria-label={`Categoria de ${area.nome}`} maxLength={255} required disabled={busy} value={displayed.categoria} onChange={event => change({ categoria: event.target.value })} /></td>
    <td role="cell"><span className="table-field-label" aria-hidden="true">Nível</span><Select aria-label={`Nível de ${area.nome}`} disabled={busy} value={displayed.nivelEntendimento} onChange={event => change({ nivelEntendimento: Number(event.target.value) })}>{[0, 1, 2, 3, 4, 5].map(level => <option key={level} value={level}>{level}/5</option>)}</Select></td>
    <td role="cell"><span className="table-field-label" aria-hidden="true">Status</span><Select aria-label={`Status de ${area.nome}`} disabled={busy} value={displayed.subSection} onChange={event => change({ subSection: event.target.value as Area['subSection'] })}><option value="ESTUDANDO">Estudando</option><option value="ESTUDADO">Estudado</option></Select></td>
    <td role="cell"><span className="table-field-label" aria-hidden="true">Favorito</span><FavoriteButton area={area} onUpdate={onUpdate} /></td>
    <td role="cell"><span className="table-field-label" aria-hidden="true">Atualizado</span>{new Date(area.updatedAt).toLocaleDateString('pt-BR')}</td>
    <td role="cell"><form id={'properties-' + area.id} onSubmit={event => { event.preventDefault(); void save(); }}><Button type="submit" disabled={!draft || busy}>Salvar propriedades</Button></form><Button disabled={busy} onClick={() => onEdit(area)}>Abrir página</Button>
      {error && <div role="alert">{error}<p>As alterações digitadas foram preservadas.</p><Button disabled={busy} onClick={() => void reload()}>Recarregar propriedades</Button></div>}
    </td>
  </tr>;
}

export function FavoriteButton({ area, onUpdate }: { area: Area; onUpdate: UpdateStudy }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  return <><Button disabled={busy} aria-label={`${area.isFavorite ? 'Desfavoritar' : 'Favoritar'} ${area.nome}`} aria-pressed={Boolean(area.isFavorite)} onClick={() => {
    if (busy) return; setBusy(true); setError(undefined);
    void onUpdate(area, { isFavorite: !area.isFavorite }).catch(cause => setError(cause.message)).finally(() => setBusy(false));
  }}>{busy ? '…' : area.isFavorite ? '★' : '☆'}</Button>{error && <p role="alert">{error}</p>}</>;
}

export function BoardStatus({ area, onUpdate, onReload }: { area: Area; onUpdate: UpdateStudy; onReload: ReloadStudy }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const target = area.subSection === 'ESTUDANDO' ? 'ESTUDADO' : 'ESTUDANDO';
  return <details><summary>Status da página</summary><Button disabled={busy} onClick={() => {
    setBusy(true); setError(undefined);
    void onUpdate(area, { subSection: target }).catch(cause => setError(cause.message)).finally(() => setBusy(false));
  }}>Mover para {target === 'ESTUDADO' ? 'Estudado' : 'Estudando'}</Button>
    {error && <p role="alert">{error}<Button disabled={busy} onClick={() => { setBusy(true); void onReload(area.id).then(() => setError(undefined)).catch(cause => setError(cause.message)).finally(() => setBusy(false)); }}>Recarregar propriedades</Button></p>}
  </details>;
}
