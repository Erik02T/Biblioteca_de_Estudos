import { useEffect, useId, useRef, useState, useSyncExternalStore, type MouseEvent, type ReactNode } from 'react';
import { Button, containModalTab } from './ui';
import { Icon, type IconName } from './EditorLayout';
import { libraryUrl, type LibraryRoute } from './library-route';
import type { Area } from './page';
import { pageAncestors } from './page-hierarchy';
import styles from './LibraryNavigation.module.css';

export const librarySections = [
  { value: 'LINGUAGENS', label: 'Idiomas' },
  { value: 'FACULDADE', label: 'Faculdade' },
  { value: 'PROJETOS', label: 'Projetos' },
  { value: 'OUTROS', label: 'Outros' },
] as const;

const libraryDestinations = [
  { label: 'Início', icon: 'home', route: {} },
  { label: 'Favoritos', icon: 'star', route: { view: 'favorites' } },
  { label: 'Recentes', icon: 'clock', route: { view: 'recent' } },
  { label: 'Todas as páginas', icon: 'grid', route: { view: 'all' } },
] satisfies { label: string; icon: IconName; route: LibraryRoute }[];

const desktopQuery = '(width > 900px)';
function subscribeToDesktop(update: () => void) {
  const media = window.matchMedia(desktopQuery);
  media.addEventListener('change', update);
  return () => media.removeEventListener('change', update);
}
const isDesktopViewport = () => window.matchMedia(desktopQuery).matches;
const serverIsDesktop = () => true;

function followLibraryLink(event: MouseEvent<HTMLAnchorElement>, route: LibraryRoute, onNavigate: (route: LibraryRoute) => void) {
  if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  onNavigate(route);
}

export function LibraryNavigation({ current, pages, loading, error, drawerOpen, searchId, onDrawerChange, onRetry, onNavigate, onSearch, onLogout }: {
  current: LibraryRoute;
  pages: Area[];
  loading: boolean;
  error?: string;
  drawerOpen: boolean;
  searchId: string;
  onDrawerChange: (open: boolean) => void;
  onRetry: () => void;
  onNavigate: (route: LibraryRoute, focusContent: boolean) => void;
  onSearch: (button: HTMLButtonElement) => void;
  onLogout: () => void;
}) {
  const desktop = useSyncExternalStore(subscribeToDesktop, isDesktopViewport, serverIsDesktop);
  const drawerId = useId();
  const titleId = useId();
  const drawer = useRef<HTMLDialogElement>(null);
  const scrollRegion = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const dismiss = useRef<HTMLButtonElement>(null);
  const restoreTrigger = useRef(false);

  useEffect(() => {
    const panel = drawer.current;
    if (desktop && drawerOpen) onDrawerChange(false);
    if (!panel) return;
    if (drawerOpen) {
      panel.showModal();
      dismiss.current?.focus();
      return () => panel.close();
    }
    if (restoreTrigger.current) {
      restoreTrigger.current = false;
      trigger.current?.focus();
    }
  }, [desktop, drawerOpen, onDrawerChange]);

  const { pageId, section, view } = current;
  useEffect(() => {
    const region = scrollRegion.current;
    if (!pageId || (!desktop && !drawerOpen) || !region) return;
    const active = region.querySelector('[aria-current="page"]');
    if (!active) return;
    const viewport = region.getBoundingClientRect();
    const row = active.getBoundingClientRect();
    if (row.top < viewport.top || row.height > viewport.height) {
      region.scrollTop += row.top - viewport.top - 4;
    } else if (row.bottom > viewport.bottom) {
      region.scrollTop += row.bottom - viewport.bottom + 4;
    }
  }, [desktop, drawerOpen, pageId, pages, section]);

  const closeDrawer = () => {
    restoreTrigger.current = true;
    onDrawerChange(false);
  };
  const navigate = (route: LibraryRoute) => {
    if (!desktop) onDrawerChange(false);
    onNavigate(route, !desktop);
  };
  const link = (label: string, icon: ReactNode, route: LibraryRoute, active: boolean, trailing?: ReactNode) => (
    <a className={styles.row} href={libraryUrl(route)} aria-current={active ? 'page' : undefined}
      onClick={event => followLibraryLink(event, route, navigate)}>
      {icon}<span className={styles.label}>{label}</span>{trailing}
    </a>
  );
  const content = <nav className={styles.navigation} aria-labelledby={titleId}>
    <header className={styles.header}>
      <div className={styles.brand}>
        <span className={styles.brandMark}><Icon name="book" /></span>
        <strong className={styles.label} id={titleId}>Biblioteca de Estudos</strong>
        {!desktop && <Button ref={dismiss} className={styles.dismiss} aria-label="Fechar navegação" onClick={closeDrawer}><Icon name="x" /></Button>}
      </div>
      <Button className={styles.search} data-library-search aria-haspopup="dialog" aria-controls={searchId}
        aria-keyshortcuts="Control+K Meta+K /" onClick={event => onSearch(event.currentTarget)}>
        <Icon name="search" /><span className={styles.label}>Buscar páginas</span><kbd aria-hidden="true">Ctrl K</kbd>
      </Button>
    </header>
    <div ref={scrollRegion} className={styles.scroll}>
      <ul className={styles.group} aria-label="Navegação principal">
        {libraryDestinations.map(({ label, icon, route }) => (
          <li key={label}>{link(label, <Icon name={icon} />, route,
            !pageId && (route.view ? view === route.view : !section && !view && !current.q))}</li>
        ))}
      </ul>
      <section className={styles.areas} aria-label="Áreas de estudo">
        <h2 className={styles.groupTitle}>Áreas de estudo</h2>
        <ul className={styles.group}>
          {librarySections.map(({ value, label }) => {
            const expanded = section === value && view !== 'trash';
            return <li key={value}>
              {link(label, <span className={styles.areaDot} data-section={value} aria-hidden="true" />, { section: value },
                expanded && !view && !pageId,
                <span className={styles.areaChevron} data-expanded={expanded}><Icon name="chevron" /></span>)}
              {expanded && <div className={styles.branch}>
                {error && <div role="alert" className={styles.treeStatus}><p>{error}</p><Button onClick={onRetry}>Recarregar árvore</Button></div>}
                {loading && !error && <p role="status" className={styles.treeStatus}>Atualizando árvore…</p>}
                <PageTree key={pageId ?? value} loading={loading || Boolean(error)}
                  pages={pages.filter(page => page.section === value && !page.deletedAt)}
                  selectedId={pageId} onNavigate={navigate} />
              </div>}
            </li>;
          })}
        </ul>
      </section>
    </div>
    <footer className={styles.footer}>
      {link('Lixeira', <Icon name="trash" />, { view: 'trash' }, view === 'trash' && !pageId)}
      <Button className={styles.row} onClick={onLogout}><Icon name="logout" /><span className={styles.label}>Sair</span></Button>
    </footer>
  </nav>;

  if (desktop) return <aside className={styles.sidebar} aria-labelledby={titleId}>{content}</aside>;
  return <div className={styles.mobileHeader}>
    <Button ref={trigger} className={styles.menuTrigger} data-library-menu aria-haspopup="dialog" aria-controls={drawerId}
      aria-expanded={drawerOpen} onClick={() => onDrawerChange(true)}><Icon name="menu" />Navegação</Button>
    <dialog ref={drawer} id={drawerId} className={styles.drawer} data-library-drawer aria-labelledby={titleId}
      onKeyDown={event => {
        containModalTab(event);
        if (event.key === 'Escape' && !event.nativeEvent.isComposing && event.nativeEvent.keyCode !== 229) {
          event.preventDefault();
          event.stopPropagation();
          closeDrawer();
        }
      }}
      onCancel={event => { event.preventDefault(); closeDrawer(); }}
      onClick={event => { if (event.target === event.currentTarget) closeDrawer(); }}>
      {content}
    </dialog>
  </div>;
}

export function PageTree({ pages, loading, selectedId, onNavigate }: { pages: Area[]; loading?: boolean; selectedId?: string; onNavigate: (route: LibraryRoute) => void }) {
  const selected = pages.find(page => page.id === selectedId);
  const [branches, setBranches] = useState(new Map<string, boolean>());
  const seen = new Set<string>();
  const ids = new Set(pages.map(page => page.id));
  const children = new Map<string, Area[]>();
  for (const page of pages) if (page.parentId) children.set(page.parentId, [...(children.get(page.parentId) ?? []), page]);
  const ancestors = new Set(pageAncestors(pages, selected?.parentId).map(page => page.id));
  const visit = (page: Area): ReactNode => {
    if (seen.has(page.id)) return null;
    seen.add(page.id);
    const childNodes = (children.get(page.id) ?? []).map(visit);
    const expanded = branches.get(page.id) ?? ancestors.has(page.id);
    const hasChildren = childNodes.some(Boolean);
    return <li key={page.id}>
      <div className={styles.treeRow}>
        {hasChildren && <Button className={styles.treeToggle} aria-label={`${expanded ? 'Recolher' : 'Expandir'} ${page.nome}`} aria-expanded={expanded} aria-controls={`children-${page.id}`} onClick={() => {
          setBranches(current => new Map(current).set(page.id, !expanded));
        }}><Icon name="chevron" /></Button>}
        <a className={styles.row} href={libraryUrl({ pageId: page.id })} aria-current={selectedId === page.id ? 'page' : undefined}
          onClick={event => followLibraryLink(event, { pageId: page.id }, onNavigate)}>
          {page.icone ? <span className={styles.pageIcon} aria-hidden="true">{page.icone}</span> : <Icon name="file" />}
          <span className={styles.label}>{page.nome}</span>
        </a>
      </div>
      {hasChildren && <ul id={`children-${page.id}`} hidden={!expanded}>{childNodes}</ul>}
    </li>;
  };
  const roots = pages.filter(page => !page.parentId || !ids.has(page.parentId)).map(visit);
  const remainder = pages.filter(page => !seen.has(page.id)).map(visit);
  return <section className={styles.tree} aria-label="Árvore de páginas" aria-busy={loading}>
    <ul>{roots}{remainder}</ul>
    {!loading && !pages.length && <p className={styles.treeStatus}>Nenhuma página nesta área.</p>}
  </section>;
}

export function PageBreadcrumb({ pages, parentId, section, name, onNavigate }: { pages: Area[]; parentId?: string | null; section: string; name: string; onNavigate: (route: LibraryRoute) => void }) {
  const items = [{ label: 'Biblioteca', route: {} }, { label: librarySections.find(item => item.value === section)?.label ?? section, route: { section: section as LibraryRoute['section'] } }, ...pageAncestors(pages, parentId).map(page => ({ label: page.nome, route: { pageId: page.id } }))];
  return <nav className="page-breadcrumb" aria-label="Caminho da página"><ol>{items.map((item, index) => <li key={index}><a href={libraryUrl(item.route)} onClick={event => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); onNavigate(item.route);
  }}>{item.label}</a></li>)}<li aria-current="page">{name || 'Sem título'}</li></ol></nav>;
}
