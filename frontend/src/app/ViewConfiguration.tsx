import { useEffect, useEffectEvent, useId, useRef, useState, type FormEvent } from 'react';
import { Button, Input, Select } from './ui';
import { advancedFilters, collectionOrder, type AdvancedFilters, type LibraryRequest } from './collection-query';
import type { LibraryRoute } from './library-route';
import { SavedViews } from './SavedViews';
import styles from './page.module.css';

const statuses = [
  { value: undefined, label: 'Todos os status' },
  { value: 'ESTUDANDO', label: 'Estudando' },
  { value: 'ESTUDADO', label: 'Estudado' },
] as const;

const orders = [
  ['updatedAt', 'desc', 'Atualizadas primeiro'],
  ['updatedAt', 'asc', 'Mais antigas primeiro'],
  ['nome', 'asc', 'Nome A–Z'],
  ['nome', 'desc', 'Nome Z–A'],
  ['nivelEntendimento', 'asc', 'Menor nível primeiro'],
  ['nivelEntendimento', 'desc', 'Maior nível primeiro'],
  ['lastOpenedAt', 'desc', 'Abertas recentemente'],
  ['lastOpenedAt', 'asc', 'Aberturas mais antigas'],
  ['sortOrder', 'asc', 'Ordem manual'],
  ['sortOrder', 'desc', 'Ordem manual inversa'],
] as const;

function appliedChips(route: LibraryRoute) {
  const filters = advancedFilters(route);
  const advanced: { label: string; remove: AdvancedFilters }[] = [];
  if (filters.categoria) advanced.push({ label: `Categoria · ${filters.categoria}`, remove: { categoria: undefined } });
  const { minLevel, maxLevel } = filters;
  if (minLevel !== undefined || maxLevel !== undefined) {
    const range = minLevel === undefined ? `até ${maxLevel}` : maxLevel === undefined ? `a partir de ${minLevel}` : `${minLevel} a ${maxLevel}`;
    advanced.push({ label: `Nível · ${range}`, remove: { minLevel: undefined, maxLevel: undefined } });
  }
  if (filters.scope) advanced.push({ label: 'Só páginas principais', remove: { scope: undefined } });
  if (filters.favorite) advanced.push({ label: 'Somente favoritos', remove: { favorite: undefined } });
  const chips: { label: string; remove: Partial<LibraryRoute> }[] = [];
  if (route.q) chips.push({ label: `Busca · ${route.q}`, remove: { q: undefined } });
  if (route.subSection) chips.push({ label: statuses.find(status => status.value === route.subSection)!.label, remove: { subSection: undefined } });
  return { chips: [...chips, ...advanced], advancedCount: advanced.length };
}

export function ViewConfiguration({ route, categories, manualOrder, request, onChange, onOpenView }: {
  route: LibraryRoute;
  categories?: string[];
  manualOrder: boolean;
  request: LibraryRequest;
  onChange: (patch: Partial<LibraryRoute>) => void;
  onOpenView: (route: LibraryRoute) => void;
}) {
  const [search, setSearch] = useState({ applied: route.q, text: route.q ?? '' });
  if (search.applied !== route.q) setSearch({ applied: route.q, text: route.q ?? '' });
  const composing = useRef(false);
  const [isComposing, setIsComposing] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const searchInput = useRef<HTMLInputElement>(null);
  const filtersButton = useRef<HTMLButtonElement>(null);
  const viewsButton = useRef<HTMLButtonElement>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [viewsOpen, setViewsOpen] = useState(false);
  const filtersId = useId();
  const { order, direction } = collectionOrder(route);
  const { chips, advancedCount } = appliedChips(route);

  const applySearch = (value: string) => {
    const q = value.trim() || undefined;
    if (q !== route.q) onChange({ q });
  };
  const applyPendingSearch = useEffectEvent(applySearch);
  useEffect(() => {
    if (isComposing || search.text.trim() === (route.q ?? '')) return;
    searchTimer.current = setTimeout(() => {
      if (!composing.current) applyPendingSearch(search.text);
    }, 300);
    return () => clearTimeout(searchTimer.current);
  }, [isComposing, route.q, search.text]);

  useEffect(() => {
    const restore = () => {
      clearTimeout(searchTimer.current);
      const q = new URLSearchParams(window.location.search).get('q')?.trim() || undefined;
      composing.current = false;
      setIsComposing(false);
      setSearch({ applied: q, text: q ?? '' });
      setFiltersOpen(false);
      setViewsOpen(false);
    };
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, []);

  const closeFilters = () => {
    setFiltersOpen(false);
    filtersButton.current?.focus();
  };
  useEffect(() => {
    if (!filtersOpen) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented || event.isComposing || event.keyCode === 229 || document.querySelector('dialog:modal')) return;
      event.preventDefault();
      closeFilters();
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [filtersOpen]);
  const resetSearch = () => {
    clearTimeout(searchTimer.current);
    setSearch({ applied: route.q, text: '' });
    searchInput.current?.focus();
  };
  const clearFilters = () => {
    setFiltersOpen(false);
    resetSearch();
    onChange({ q: undefined, subSection: undefined, categoria: undefined, minLevel: undefined, maxLevel: undefined, scope: undefined, favorite: undefined });
  };
  const closeViews = () => {
    setViewsOpen(false);
    viewsButton.current?.focus();
  };
  const filters = advancedFilters(route);

  return <div className={styles.collectionControls}>
    <div className={styles.collectionToolbar} role="group" aria-label="Controles da coleção">
      <label className={styles.collectionSearch}>
        <span className="sr-only">Buscar por título ou categoria</span>
        <span className={styles.searchIcon} aria-hidden="true" />
        <Input
          ref={searchInput}
          type="search"
          value={search.text}
          maxLength={255}
          placeholder="Buscar por título ou categoria"
          onChange={event => setSearch({ applied: route.q, text: event.target.value })}
          onCompositionStart={() => {
            clearTimeout(searchTimer.current);
            composing.current = true;
            setIsComposing(true);
          }}
          onCompositionEnd={event => {
            composing.current = false;
            setIsComposing(false);
            setSearch({ applied: route.q, text: event.currentTarget.value });
          }}
          onKeyDown={event => {
            if (event.key !== 'Enter' || composing.current || event.nativeEvent.isComposing || event.keyCode === 229) return;
            event.preventDefault();
            clearTimeout(searchTimer.current);
            applySearch(event.currentTarget.value);
          }}
        />
      </label>
      <Button ref={filtersButton} className={styles.filterTrigger} aria-expanded={filtersOpen} aria-controls={filtersId}
        aria-label={advancedCount ? `Filtros, ${advancedCount} ${advancedCount === 1 ? 'ativo' : 'ativos'}` : undefined}
        data-active={advancedCount > 0}
        onClick={() => filtersOpen ? closeFilters() : setFiltersOpen(true)}>
        Filtros{advancedCount > 0 && <span className={styles.filterCount} aria-hidden="true">{advancedCount}</span>}
      </Button>
      <label className={styles.collectionChoice}>
        <span>Ordem</span>
        <Select value={`${order}:${direction}`} onChange={event => {
          const chosen = orders.find(([field, dir]) => `${field}:${dir}` === event.target.value);
          if (chosen) onChange({ order: chosen[0], direction: chosen[1] });
        }}>
          {orders.map(([field, dir, label]) => <option key={`${field}:${dir}`} value={`${field}:${dir}`}>{label}</option>)}
        </Select>
      </label>
      <label className={styles.collectionChoice}>
        <span>Exibição</span>
        <Select value={route.layout ?? 'LIST'} onChange={event => onChange({ layout: event.target.value as LibraryRoute['layout'] })}>
          <option value="LIST">Lista</option>
          <option value="TABLE">Tabela</option>
          <option value="BOARD">Quadro</option>
        </Select>
      </label>
      <Button ref={viewsButton} aria-haspopup="dialog" aria-expanded={viewsOpen} onClick={() => {
        setFiltersOpen(false);
        clearTimeout(searchTimer.current);
        setSearch({ applied: route.q, text: route.q ?? '' });
        setViewsOpen(true);
      }}>Visões salvas</Button>
    </div>

    <div className={styles.statusFilters} role="group" aria-label="Status da coleção">
      {statuses.map(({ value, label }) => <Button key={label} aria-pressed={route.subSection === value}
        onClick={() => { if (route.subSection !== value) onChange({ subSection: value }); }}>{label}</Button>)}
    </div>

    <div id={filtersId} hidden={!filtersOpen}>
      {filtersOpen && <FilterPanel key={JSON.stringify(filters)} filters={filters} categories={categories}
        favoritesCollection={route.view === 'favorites'} onCancel={closeFilters} onApply={next => {
          if (Object.entries(filters).some(([key, value]) => value !== next[key as keyof AdvancedFilters])) onChange(next);
          closeFilters();
        }} />}
    </div>

    {order === 'sortOrder' && !manualOrder &&
      <p className={styles.manualOrderHint}>Para reorganizar, escolha Lista, uma área, um status, só páginas principais e Ordem manual. Limpe a busca e os filtros de categoria, nível e favoritos.</p>}

    {chips.length > 0 && <div className={styles.activeFilters} role="group" aria-label="Filtros aplicados">
      <ul>
        {chips.map(({ label, remove }) => <li key={label}>
          <Button aria-label={`Remover filtro ${label}`} onClick={() => {
            setFiltersOpen(false);
            if ('q' in remove) resetSearch();
            else filtersButton.current?.focus();
            onChange(remove);
          }}><span>{label}</span><span aria-hidden="true">×</span></Button>
        </li>)}
      </ul>
      <Button className={styles.clearFilters} onClick={clearFilters}>Limpar filtros</Button>
    </div>}

    {viewsOpen && <SavedViews route={route} request={request} onClose={closeViews} onApply={onOpenView} />}
  </div>;
}

function FilterPanel({ filters, categories, favoritesCollection, onCancel, onApply }: {
  filters: AdvancedFilters;
  categories?: string[];
  favoritesCollection: boolean;
  onCancel: () => void;
  onApply: (filters: AdvancedFilters) => void;
}) {
  const [draft, setDraft] = useState(filters);
  // Keep the focused control stable if category metadata arrives during editing.
  const [availableCategories] = useState(categories);
  const [showError, setShowError] = useState(false);
  const headingId = useId();
  const errorId = useId();
  const minimum = useRef<HTMLSelectElement>(null);
  const invalid = showError && (draft.minLevel ?? 0) > (draft.maxLevel ?? 5);
  const apply = (event: FormEvent) => {
    event.preventDefault();
    if ((draft.minLevel ?? 0) > (draft.maxLevel ?? 5)) {
      setShowError(true);
      minimum.current?.focus();
      return;
    }
    onApply({ ...draft, categoria: draft.categoria?.trim() || undefined });
  };

  return <form className={styles.filterPanel} aria-labelledby={headingId} onSubmit={apply}>
    <h2 id={headingId}>Filtros da coleção</h2>
    <div className={styles.filterFields}>
      <label className="ui-field">Categoria exata
        {availableCategories?.length ? <Select autoFocus value={draft.categoria ?? ''} onChange={event => setDraft({ ...draft, categoria: event.target.value || undefined })}>
          <option value="">Todas as categorias</option>
          {draft.categoria && !availableCategories.includes(draft.categoria) && <option value={draft.categoria}>{draft.categoria}</option>}
          {availableCategories.map(category => <option key={category} value={category}>{category}</option>)}
        </Select> : <Input autoFocus value={draft.categoria ?? ''} maxLength={255} placeholder="Todas as categorias"
          onChange={event => setDraft({ ...draft, categoria: event.target.value })} />}
      </label>
      <fieldset className={styles.levelRange}>
        <legend>Nível de entendimento</legend>
        {(['minLevel', 'maxLevel'] as const).map((key, index) => <label key={key} className="ui-field">
          {index === 0 ? 'Mínimo' : 'Máximo'}
          <Select ref={index === 0 ? minimum : undefined} value={draft[key] ?? ''} aria-invalid={invalid || undefined}
            aria-describedby={invalid ? errorId : undefined} onChange={event =>
              setDraft({ ...draft, [key]: event.target.value === '' ? undefined : Number(event.target.value) })}>
            <option value="">{index === 0 ? 'Sem mínimo' : 'Sem máximo'}</option>
            {[0, 1, 2, 3, 4, 5].map(level => <option key={level} value={level}>{level}</option>)}
          </Select>
        </label>)}
      </fieldset>
      <label className="ui-field">Hierarquia
        <Select value={draft.scope ?? 'ALL'} onChange={event => setDraft({ ...draft, scope: event.target.value === 'ROOTS' ? 'ROOTS' : undefined })}>
          <option value="ALL">Todas as páginas</option>
          <option value="ROOTS">Só páginas principais</option>
        </Select>
      </label>
      <label className={styles.favoriteFilter}>
        <Input type="checkbox" checked={favoritesCollection || Boolean(draft.favorite)} disabled={favoritesCollection}
          onChange={event => setDraft({ ...draft, favorite: event.target.checked || undefined })} />
        Somente favoritos
      </label>
    </div>
    {invalid && <p id={errorId} className={styles.filterError} role="alert">Escolha um nível mínimo menor ou igual ao máximo.</p>}
    <div className={styles.filterActions}>
      <Button onClick={onCancel}>Cancelar</Button>
      <Button type="submit" className={styles.collectionPrimary}>Aplicar filtros</Button>
    </div>
  </form>;
}
