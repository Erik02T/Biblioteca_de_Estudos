import { collectionItems } from './collection';
import type { Area } from './page';

const items = [
  { id: 'a', nome: 'Álgebra', categoria: 'Exatas', section: 'FACULDADE', subSection: 'ESTUDADO', isFavorite: true, updatedAt: '2026-11-15', sortOrder: 2 },
  { id: 'b', nome: 'Japonês', categoria: 'Idioma', section: 'LINGUAGENS', subSection: 'ESTUDANDO', parentId: 'c', updatedAt: '2026-11-14', sortOrder: 1 },
  { id: 'c', nome: 'Vocabulário', categoria: 'Idioma', section: 'LINGUAGENS', subSection: 'ESTUDADO', isFavorite: true, updatedAt: '2026-11-13', sortOrder: 0 },
] as Area[];

test('combina área, status, favoritos e escopo sem alterar os objetos originais', () => {
  expect(collectionItems(items, {section:'LINGUAGENS',subSection:'ESTUDADO',view:'favorites',scope:'ROOTS'})).toEqual([items[2]]);
  expect(items.map(item => item.id)).toEqual(['a','b','c']);
});
test('pesquisa nome/categoria e ordena manualmente ou por nome', () => {
  expect(collectionItems(items, {q:'idioma', order:'sortOrder'}).map(item => item.id)).toEqual(['c','b']);
  expect(collectionItems(items, {q:'JAPONÊS'})).toEqual([items[1]]);
  expect(collectionItems(items, {order:'nome',direction:'asc'}).map(item => item.id)).toEqual(['a','b','c']);
  expect(collectionItems(items, {order:'sortOrder',direction:'desc'}).map(item => item.id)).toEqual(['a','b','c']);
});
