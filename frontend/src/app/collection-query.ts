import type { LibraryRoute } from './library-route';

export function collectionParameters(route: LibraryRoute): URLSearchParams {
  const params = new URLSearchParams({ page: String(route.listPage ?? 1), limit: '20', scope: route.scope ?? 'ALL', orderBy: route.order ?? (route.view === 'recent' ? 'lastOpenedAt' : 'updatedAt'), orderDirection: route.direction ?? (route.order === 'sortOrder' ? 'asc' : 'desc') });
  for (const key of ['section', 'subSection', 'q', 'categoria', 'minLevel', 'maxLevel'] as const) {
    if (route[key] !== undefined && route[key] !== '') params.set(key, String(route[key]));
  }
  if (route.view === 'favorites' || route.favorite) params.set('isFavorite', 'true');
  if (route.view === 'recent') params.set('recent', 'true');
  return params;
}

export function viewBody(route: LibraryRoute) {
  return { section: route.section ?? null, subSection: route.subSection ?? null,
    layout: route.layout ?? 'LIST', scope: route.scope ?? 'ALL',
    orderBy: route.order ?? (route.view === 'recent' ? 'lastOpenedAt' : 'updatedAt'), orderDirection: route.direction ?? (route.order === 'sortOrder' ? 'asc' : 'desc'),
    filters: { ...(route.q ? { search: route.q } : {}), ...(route.categoria ? { categoria: route.categoria } : {}),
      ...(route.minLevel === undefined ? {} : { minLevel: route.minLevel }), ...(route.maxLevel === undefined ? {} : { maxLevel: route.maxLevel }),
      ...(route.view === 'favorites' || route.favorite ? { isFavorite: true } : {}), ...(route.view === 'recent' ? { recent: true } : {}),
    },
  };
}

export type SavedView = ReturnType<typeof viewBody> & { id: string; name: string; configurationError?: string | null };
export function viewRoute(view: SavedView): LibraryRoute {
  if (view.configurationError) throw new Error(view.configurationError);
  return { view: view.filters.recent ? 'recent' : view.filters.isFavorite ? 'favorites' : 'all',
    section: view.section ?? undefined, subSection: view.subSection ?? undefined,
    layout: view.layout as LibraryRoute['layout'], scope: view.scope as LibraryRoute['scope'],
    q: view.filters.search, categoria: view.filters.categoria, minLevel: view.filters.minLevel, maxLevel: view.filters.maxLevel,
    favorite: view.filters.isFavorite || undefined, order: view.orderBy as LibraryRoute['order'], direction: view.orderDirection as LibraryRoute['direction'],
  };
}

export type LibraryRequest = (path: string, init?: RequestInit) => Promise<Response>;
export async function responseValue<T>(response: Response): Promise<T> {
  const value = await response.json().catch(() => null) as { message?: string | string[] } | null;
  if (!response.ok) throw new Error(Array.isArray(value?.message) ? value.message.join(' ') : value?.message ?? 'Não foi possível concluir a operação. Tente novamente.');
  return value as T;
}
