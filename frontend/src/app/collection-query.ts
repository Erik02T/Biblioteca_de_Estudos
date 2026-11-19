import type { LibraryRoute } from './library-route';

export type AdvancedFilters = Pick<LibraryRoute, 'categoria' | 'minLevel' | 'maxLevel' | 'scope' | 'favorite'>;
export type StatusCounts = { total: number; ESTUDANDO: number; ESTUDADO: number };

export function isLanguagesCollection(route: LibraryRoute) {
  return route.section === 'LINGUAGENS' && (!route.view || route.view === 'all');
}

export function collectionLayout(route: LibraryRoute) {
  return route.layout ?? (isLanguagesCollection(route) ? 'GRID' : 'LIST');
}

export function advancedFilters(route: LibraryRoute): AdvancedFilters {
  return {
    categoria: route.categoria,
    minLevel: route.minLevel,
    maxLevel: route.maxLevel,
    scope: route.scope === 'ROOTS' ? 'ROOTS' : undefined,
    favorite: route.view !== 'favorites' && route.favorite ? true : undefined,
  };
}

export function collectionOrder(route: LibraryRoute) {
  const order = route.order ?? (route.view === 'recent' ? 'lastOpenedAt' : 'updatedAt');
  return { order, direction: route.direction ?? (order === 'sortOrder' ? 'asc' : 'desc') } as const;
}

export function collectionParameters(route: LibraryRoute): URLSearchParams {
  const { order, direction } = collectionOrder(route);
  const params = new URLSearchParams({ page: String(route.listPage ?? 1), limit: '20', scope: route.scope ?? 'ALL', orderBy: order, orderDirection: direction });
  for (const key of ['section', 'subSection', 'q', 'categoria', 'minLevel', 'maxLevel'] as const) {
    if (route[key] !== undefined && route[key] !== '') params.set(key, String(route[key]));
  }
  if (route.view === 'favorites' || route.favorite) params.set('isFavorite', 'true');
  if (route.view === 'recent') params.set('recent', 'true');
  return params;
}

export function viewBody(route: LibraryRoute) {
  const { order, direction } = collectionOrder(route);
  return { section: route.section ?? null, subSection: route.subSection ?? null,
    layout: collectionLayout(route), scope: route.scope ?? 'ALL',
    orderBy: order, orderDirection: direction,
    filters: { ...(route.q ? { search: route.q } : {}), ...(route.categoria ? { categoria: route.categoria } : {}),
      ...(route.minLevel === undefined ? {} : { minLevel: route.minLevel }), ...(route.maxLevel === undefined ? {} : { maxLevel: route.maxLevel }),
      ...(route.view === 'favorites' || route.favorite ? { isFavorite: true } : {}), ...(route.view === 'recent' ? { recent: true } : {}),
    },
  };
}

export type SavedView = ReturnType<typeof viewBody> & { id: string; name: string; configurationError?: string | null };
export function viewRoute(view: SavedView): LibraryRoute {
  if (view.configurationError) throw new Error(view.configurationError);
  const collection = view.filters.recent ? 'recent' :
    view.section ? undefined : view.filters.isFavorite ? 'favorites' : 'all';
  return { view: collection,
    section: view.section ?? undefined, subSection: view.subSection ?? undefined,
    layout: view.layout, scope: view.scope,
    q: view.filters.search, categoria: view.filters.categoria, minLevel: view.filters.minLevel, maxLevel: view.filters.maxLevel,
    favorite: collection !== 'favorites' && view.filters.isFavorite ? true : undefined, order: view.orderBy, direction: view.orderDirection,
  };
}

export type LibraryRequest = (path: string, init?: RequestInit) => Promise<Response>;
export async function responseValue<T>(response: Response): Promise<T> {
  const value = await response.json().catch(() => null) as { message?: string | string[] } | null;
  if (!response.ok) throw new Error(Array.isArray(value?.message) ? value.message.join(' ') : value?.message ?? 'Não foi possível concluir a operação. Tente novamente.');
  return value as T;
}
