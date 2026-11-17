export type LibrarySection = 'LINGUAGENS' | 'FACULDADE' | 'PROJETOS' | 'OUTROS';
export type LibraryStatus = 'ESTUDANDO' | 'ESTUDADO';
export type LibraryRoute = { pageId?: string; section?: LibrarySection; subSection?: LibraryStatus; view?: 'all' | 'favorites' | 'recent' | 'trash'; q?: string; categoria?: string; minLevel?: number; maxLevel?: number; favorite?: boolean; scope?: 'ROOTS' | 'ALL'; layout?: 'LIST' | 'TABLE' | 'BOARD'; order?: 'updatedAt' | 'nome' | 'nivelEntendimento' | 'sortOrder' | 'lastOpenedAt'; direction?: 'asc' | 'desc'; listPage?: number };
export function readLibraryRoute(url: URL): LibraryRoute {
  const pageId = url.searchParams.get('page');
  if (pageId) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pageId)) throw new Error('Endereço de página inválido.');
    return { pageId };
  }
  const section = url.searchParams.get('section');
  const status = url.searchParams.get('status');
  const route: LibraryRoute = {};
  if (['LINGUAGENS', 'FACULDADE', 'PROJETOS', 'OUTROS'].includes(section ?? '')) {
    route.section = section as LibrarySection;
  }
  const view = url.searchParams.get('view');
  if (view === 'all' || view === 'favorites' || view === 'recent' || view === 'trash') route.view = view;
  if ((route.section || route.view) && (status === 'ESTUDANDO' || status === 'ESTUDADO')) route.subSection = status;
  for (const [key, choices] of Object.entries({ scope: ['ROOTS','ALL'], layout: ['LIST','TABLE','BOARD'], order: ['updatedAt','nome','nivelEntendimento','sortOrder','lastOpenedAt'], direction: ['asc','desc'] })) {
    const value = url.searchParams.get(key);
    if (value && choices.includes(value)) Object.assign(route, { [key]: value });
  }
  const q = url.searchParams.get('q')?.trim();
  if (q) route.q = q;
  const categoria = url.searchParams.get('categoria')?.trim();
  if (categoria) route.categoria = categoria;
  if (url.searchParams.get('favorite') === 'true') route.favorite = true;
  for (const key of ['minLevel', 'maxLevel'] as const) {
    const raw = url.searchParams.get(key);
    if (raw !== null && raw !== '') {
      const value = Number(raw);
      if (!Number.isInteger(value) || value < 0 || value > 5) throw new Error('Filtro de nível inválido.');
      route[key] = value;
    }
  }
  if ((route.minLevel ?? 0) > (route.maxLevel ?? 5)) throw new Error('Nível mínimo deve ser menor ou igual ao máximo.');
  const listPage = Number(url.searchParams.get('listPage'));
  if (Number.isSafeInteger(listPage) && listPage > 1) route.listPage = listPage;
  return route;
}
export function libraryUrl(route: LibraryRoute): string {
  const query = new URLSearchParams();
  if (route.pageId) query.set('page', route.pageId);
  else {
    if (route.section) query.set('section', route.section);
    if (route.subSection) query.set('status', route.subSection);
    for (const key of ['view', 'q', 'categoria', 'minLevel', 'maxLevel', 'favorite', 'scope', 'layout', 'order', 'direction', 'listPage'] as const) {
      if (route[key] !== undefined && route[key] !== '') query.set(key, String(route[key]));
    }
  }
  return query.size ? `/?${query}` : '/';
}
