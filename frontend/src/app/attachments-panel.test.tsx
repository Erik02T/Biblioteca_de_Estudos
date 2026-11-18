import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AttachmentsPanel } from './EditorLayout';
jest.mock('./EditorLayout.module.css', () => ({}));
afterEach(cleanup);

test('nome completo do arquivo permanece acessível e ações usam o ID original', () => {
  const label = 'Material_sem_espacos_'.repeat(12) + '.pdf';
  const remove = jest.fn();
  const add = jest.fn();
  render(<AttachmentsPanel items={[{ id: 'original-id', kind: 'file', label, href: 'https://example.invalid/material.pdf' }]} onAdd={add} onRemove={remove} />);
  expect(screen.getByRole('link', { name: label })).toHaveAttribute('href', 'https://example.invalid/material.pdf');
  fireEvent.click(screen.getByRole('button', { name: `Remover ${label}` }));
  expect(remove).toHaveBeenCalledWith('original-id');
  fireEvent.click(screen.getByRole('button', { name: 'Arquivo' }));
  expect(add).toHaveBeenCalledWith('file');
});

test('materiais diferenciam carregamento, falha recuperável e vazio confirmado', () => {
  const retry = jest.fn();
  const props = { items: [], onAdd: jest.fn(), onRemove: jest.fn(), onRetry: retry };
  const view = render(<AttachmentsPanel {...props} loading />);
  expect(screen.getByRole('status')).toHaveTextContent('Carregando materiais');
  expect(screen.queryByText(/Nenhum anexo ainda/)).not.toBeInTheDocument();
  view.rerender(<AttachmentsPanel {...props} loadError="Falha de teste" />);
  expect(screen.getByRole('alert')).toHaveTextContent('Falha de teste');
  expect(screen.queryByText(/Nenhum anexo ainda/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Tentar carregar materiais novamente' }));
  expect(retry).toHaveBeenCalledTimes(1);
  view.rerender(<AttachmentsPanel {...props} />);
  expect(screen.getByText(/Nenhum anexo ainda/)).toBeInTheDocument();
});
