import { useState, type ReactNode } from 'react';
import { Button } from './ui';
import { libraryUrl, type LibraryRoute } from './library-route';
import type { Area } from './page';
import { pageAncestors } from './page-hierarchy';

export const librarySections = [
  { value: 'LINGUAGENS', label: 'Idiomas' }, { value: 'FACULDADE', label: 'Faculdade' },
  { value: 'PROJETOS', label: 'Projetos' }, { value: 'OUTROS', label: 'Outros' },
] as const;

export function LibraryNavigation({ current, pages = [], loading, error, onRetry, onNavigate, onSearch, onLogout, children }: {
  current: LibraryRoute; pages?: Area[]; loading?: boolean; error?: string; onRetry?: () => void; onNavigate: (route: LibraryRoute) => void; onSearch: () => void; onLogout: () => void; children?: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const link = (label: string, route: LibraryRoute, active: boolean) => <a key={label} href={libraryUrl(route)} aria-current={active ? 'page' : undefined} onClick={event => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); setExpanded(false); onNavigate(route);
  }}>{label}</a>;
  return <nav className="library-navigation" aria-label="Biblioteca" onKeyDown={event => {
    if (event.key === 'Escape' && expanded && !event.nativeEvent.isComposing) {
      event.stopPropagation(); setExpanded(false); event.currentTarget.querySelector<HTMLButtonElement>('.navigation-toggle')?.focus();
    }
  }}>
    <strong>Biblioteca de Estudos</strong>
    <Button className="navigation-toggle" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>Navegação</Button>
    <div className="navigation-links" data-expanded={expanded}>
    <Button data-library-search onClick={onSearch}>Buscar páginas</Button>
    {link('Início', {}, !current.section && !current.view && !current.q && !current.pageId)}
    {link('Favoritos', { view: 'favorites' }, current.view === 'favorites')}
    {link('Recentes', { view: 'recent' }, current.view === 'recent')}
    {link('Todas as páginas', { view: 'all' }, current.view === 'all')}
    <span className="navigation-label">Áreas de estudo</span>
    {librarySections.map(section => link(section.label, { section: section.value }, current.section === section.value && !current.view))}
    {current.section && (error ? <div role="alert"><p>{error}</p><Button onClick={onRetry}>Recarregar árvore</Button></div> : loading ? <p role="status">Atualizando árvore…</p> : null)}
    {current.section && !error && <PageTree key={current.pageId ?? current.section} loading={loading} pages={pages.filter(page => page.section === current.section && !page.deletedAt)} selectedId={current.pageId} onNavigate={route => { setExpanded(false); onNavigate(route); }} />}
    {children}
    {link('Lixeira', { view: 'trash' }, current.view === 'trash')}
    <Button onClick={onLogout}>Sair</Button>
    </div>
  </nav>;
}

export function PageTree({ pages, loading, selectedId, onNavigate }: { pages: Area[]; loading?: boolean; selectedId?: string; onNavigate: (route: LibraryRoute) => void }) {
  const selected = pages.find(page => page.id === selectedId);
  const [open, setOpen] = useState(() => new Set(pageAncestors(pages, selected?.parentId).map(page => page.id)));
  const seen = new Set<string>();
  const ids = new Set(pages.map(page => page.id));
  const children = new Map<string, Area[]>();
  for (const page of pages) if (page.parentId) children.set(page.parentId, [...(children.get(page.parentId) ?? []), page]);
  const ancestors = new Set(pageAncestors(pages, selected?.parentId).map(page => page.id));
  const [closed, setClosed] = useState(new Set<string>());
  const visit = (page: Area): ReactNode => {
    if (seen.has(page.id)) return null;
    seen.add(page.id);
    const childNodes = (children.get(page.id) ?? []).map(visit);
    const expanded = !closed.has(page.id) && (open.has(page.id) || ancestors.has(page.id));
    return <li key={page.id}>
      <div className="page-tree-row">
        {childNodes.some(Boolean) ? <Button aria-label={`${expanded ? 'Recolher' : 'Expandir'} ${page.nome}`} aria-expanded={expanded} aria-controls={`children-${page.id}`} onClick={() => {
          setOpen(current => { const next = new Set(current); if (expanded) next.delete(page.id); else next.add(page.id); return next; });
          setClosed(current => { const next = new Set(current); if (expanded) next.add(page.id); else next.delete(page.id); return next; });
        }}>{expanded ? '▾' : '▸'}</Button> : <span className="page-tree-spacer" />}
        <a href={libraryUrl({ pageId: page.id })} title={page.nome} aria-current={selectedId === page.id ? 'page' : undefined} onClick={event => {
          if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
          event.preventDefault(); onNavigate({ pageId: page.id });
        }}><span aria-hidden="true">{page.icone ?? '◻'}</span> {page.nome}</a>
      </div>
      {childNodes.some(Boolean) && <ul id={`children-${page.id}`} hidden={!expanded}>{childNodes}</ul>}
    </li>;
  };
  const roots = pages.filter(page => !page.parentId || !ids.has(page.parentId)).map(visit);
  const remainder = pages.filter(page => !seen.has(page.id)).map(visit);
  return <section className="navigation-pages" aria-label="Árvore de páginas" aria-busy={loading}><span className="navigation-label">Páginas da área</span><ul>{roots}{remainder}</ul>{!loading && !pages.length && <p>Nenhuma página nesta área.</p>}</section>;
}

export function PageBreadcrumb({ pages, parentId, section, name, onNavigate }: { pages: Area[]; parentId?: string | null; section: string; name: string; onNavigate: (route: LibraryRoute) => void }) {
  const items = [{ label: 'Biblioteca', route: {} }, { label: librarySections.find(item => item.value === section)?.label ?? section, route: { section: section as LibraryRoute['section'] } }, ...pageAncestors(pages, parentId).map(page => ({ label: page.nome, route: { pageId: page.id } }))];
  return <nav className="page-breadcrumb" aria-label="Caminho da página"><ol>{items.map((item, index) => <li key={index}><a href={libraryUrl(item.route)} onClick={event => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); onNavigate(item.route);
  }}>{item.label}</a></li>)}<li aria-current="page">{name || 'Sem título'}</li></ol></nav>;
}
