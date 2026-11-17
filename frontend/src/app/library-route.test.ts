import { libraryUrl, readLibraryRoute } from './library-route';
test('endereço por ID independe de título, seção e status antigos', () => {
  const pageId = '11111111-1111-4111-8111-111111111111';
  expect(readLibraryRoute(new URL(`https://example.com/?page=${pageId}&section=OUTROS`))).toEqual({ pageId });
  expect(libraryUrl({ pageId, section: 'FACULDADE' })).toBe(`/?page=${pageId}`);
});
test('endereços de coleção permitem voltar sem ID de página', () => {
  const route = { section: 'FACULDADE', subSection: 'ESTUDADO' } as const;
  expect(readLibraryRoute(new URL(`https://example.com${libraryUrl(route)}`))).toEqual(route);
});
test('endereços inválidos não se tornam caminhos arbitrários de API', () => {
  expect(() => readLibraryRoute(new URL('https://example.com/?page=..%2Fauth'))).toThrow('inválido');
  expect(readLibraryRoute(new URL('https://example.com/?section=sql&status=invalid'))).toEqual({});
});
test('URL preserva filtros, paginação e apresentação da coleção', () => {
  const route = {section:'LINGUAGENS',subSection:'ESTUDADO',q:'日本語 & texto',scope:'ROOTS',layout:'TABLE',order:'nome',direction:'asc',listPage:2} as const;
  expect(readLibraryRoute(new URL(libraryUrl(route), 'https://example.com'))).toEqual(route);
  const favorites = {view:'favorites',subSection:'ESTUDANDO'} as const;
  expect(readLibraryRoute(new URL(libraryUrl(favorites), 'https://example.com'))).toEqual(favorites);
});
