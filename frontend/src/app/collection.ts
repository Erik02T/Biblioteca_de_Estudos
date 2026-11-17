import type { Area } from './page';
import type { LibraryRoute } from './library-route';

export function collectionItems(items: Area[], route: LibraryRoute): Area[] {
  const query = route.q?.trim().toLocaleLowerCase('pt-BR');
  const result = items.filter(item => (!route.section || item.section === route.section)
    && (!route.subSection || item.subSection === route.subSection)
    && (route.view !== 'favorites' || item.isFavorite)
    && (route.scope !== 'ROOTS' || !item.parentId)
    && (!query || `${item.nome} ${item.categoria}`.toLocaleLowerCase('pt-BR').includes(query)));
  return result.sort((a, b) => {
    const key = route.order ?? 'updatedAt';
    const comparison = key === 'nome' ? a.nome.localeCompare(b.nome, 'pt-BR')
      : key === 'nivelEntendimento' ? a.nivelEntendimento - b.nivelEntendimento
      : key === 'sortOrder' ? (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
      : a.updatedAt.localeCompare(b.updatedAt);
    return (comparison || a.id.localeCompare(b.id)) * ((route.direction ?? (key === 'sortOrder' ? 'asc' : 'desc')) === 'asc' ? 1 : -1);
  });
}
