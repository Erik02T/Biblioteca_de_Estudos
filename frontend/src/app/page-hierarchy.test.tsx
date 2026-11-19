import { fireEvent, render, screen, within } from '@testing-library/react';
import { PageTree, PageBreadcrumb } from './LibraryNavigation';
import { parentCandidates, pageAncestors } from './page-hierarchy';
import type { Area } from './page';

jest.mock('./EditorLayout.module.css', () => ({}));
jest.mock('./LibraryNavigation.module.css', () => ({}));

const page = (id: string, nome: string, parentId: string | null = null, subSection: Area['subSection'] = 'ESTUDANDO'): Area => ({ id, nome, parentId, subSection, section: 'LINGUAGENS', categoria: 'Geral', icone: '✦', nivelEntendimento: 0, updatedAt: '2026-11-16T12:00:00.000Z' });
const pages = [page('a', 'Japonês'), page('b', 'Partículas', 'a', 'ESTUDADO'), page('c', 'は e が', 'b'), page('d', 'Gramática')];

test('três níveis com status mistos expandem ancestrais e navegam por ID', () => {
  const navigate = jest.fn();
  render(<PageTree pages={pages} selectedId="c" onNavigate={navigate} />);
  const current = screen.getByRole('link', { name: /は e が/ });
  expect(current).toHaveAttribute('aria-current', 'page');
  fireEvent.click(current);
  expect(navigate).toHaveBeenCalledWith({ pageId: 'c' });
  fireEvent.click(screen.getByRole('button', { name: 'Recolher Partículas' }));
  expect(screen.queryByRole('link', { name: /は e が/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Expandir Partículas' }));
  expect(screen.getByRole('link', { name: /は e が/ })).toBe(current);
  expect(screen.getAllByRole('link', { name: /Japonês/ })).toHaveLength(1);
});

test('mover ramo recalcula caminho sem usar o status e sem perder descendentes', () => {
  const moved = pages.map(item => item.id === 'b' ? { ...item, parentId: 'd' } : item);
  expect(pageAncestors(moved, 'b').map(item => item.nome)).toEqual(['Gramática', 'Partículas']);
  expect(parentCandidates(moved, 'b').map(item => item.id)).toEqual(['a', 'd']);
  const navigate = jest.fn();
  render(<PageBreadcrumb pages={moved} parentId="b" section="LINGUAGENS" name="は e が" onNavigate={navigate} />);
  const breadcrumb = screen.getByRole('navigation', { name: 'Caminho da página' });
  expect(within(breadcrumb).getAllByRole('link').map(link => link.textContent)).toEqual(['Biblioteca', 'Idiomas', 'Gramática', 'Partículas']);
  fireEvent.click(within(breadcrumb).getByRole('link', { name: 'Gramática' }));
  expect(navigate).toHaveBeenCalledWith({ pageId: 'd' });
});

test('hierarquia legada com órfãos ou ciclos continua finita e não duplica IDs', () => {
  const legacy = [page('a', 'A', 'b'), page('b', 'B', 'a'), page('c', 'Órfã', 'missing')];
  expect(pageAncestors(legacy, 'a')).toHaveLength(2);
  expect(parentCandidates(legacy, 'a').map(item => item.id)).toEqual(['c']);
  render(<PageTree pages={legacy} selectedId="a" onNavigate={jest.fn()} />);
  expect(screen.getAllByRole('link')).toHaveLength(3);
});
