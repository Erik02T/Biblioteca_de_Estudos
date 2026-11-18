import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PortabilityDialog } from './PortabilityDialog';
jest.mock('./PortabilityDialog.module.css', () => ({}));

const response = (body: unknown, ok = true) => Promise.resolve({ ok, json: () => Promise.resolve(body) } as Response);
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});
const setup = (request: jest.Mock, checkpoint = jest.fn().mockResolvedValue('2026-11-13T12:00:00.000Z')) => {
  const onRestored = jest.fn();
  render(<PortabilityDialog mode="revisions" areaId="page-1" request={request} checkpoint={checkpoint} onBusy={jest.fn()} onRestored={onRestored} onClose={jest.fn()} />);
  return { checkpoint, onRestored };
};

test('salva pendências antes de criar versão e usa a revisão confirmada', async () => {
  const request = jest.fn().mockImplementation((path: string, init?: RequestInit) => response(init?.method === 'POST' ? { id: 'r1' } : []));
  const { checkpoint } = setup(request);
  fireEvent.change(screen.getByLabelText('Nome da versão'), { target: { value: 'Primeira' } });
  fireEvent.click(screen.getByRole('button', { name: 'Criar versão' }));
  await screen.findByText(/Versão criada/);
  expect(checkpoint).toHaveBeenCalledTimes(1);
  expect(request).toHaveBeenCalledWith('/areas/page-1/revisions', { method: 'POST', body: JSON.stringify({ name: 'Primeira', updatedAt: '2026-11-13T12:00:00.000Z' }) });
});

test('falha de salvamento preserva o diálogo e impede criar snapshot', async () => {
  const request = jest.fn().mockImplementation(() => response([]));
  setup(request, jest.fn().mockRejectedValue(new Error('Conflito: recarregue')));
  fireEvent.change(screen.getByLabelText('Nome da versão'), { target: { value: 'Primeira' } });
  fireEvent.click(screen.getByRole('button', { name: 'Criar versão' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Conflito: recarregue');
  expect(request.mock.calls.every((call: [string, RequestInit?]) => !call[1]?.method)).toBe(true);
  expect(screen.getByLabelText('Nome da versão')).toHaveValue('Primeira');
});

test('restauração exige confirmação e prévia permanece somente leitura', async () => {
  const revision = { id: 'r1', name: 'Com imagem', createdAt: '2026-11-13T12:00:00Z' };
  const request = jest.fn().mockImplementation((path: string, init?: RequestInit) => response(init?.method === 'POST' ? { id: 'page-1' } : path.endsWith('/r1') ? { ...revision, metadata: { nome: '日本語' }, document: { texto: '<script>malicioso</script>' }, files: [] } : [revision]));
  const { onRestored } = setup(request);
  fireEvent.click(await screen.findByRole('button', { name: /Com imagem/ }));
  expect(await screen.findByText('<script>malicioso</script>')).toBeInTheDocument();
  expect(document.querySelector('script')).toBeNull();
  expect(screen.getByRole('button', { name: 'Restaurar versão' })).toBeDisabled();
  fireEvent.click(screen.getByRole('checkbox', { name: /Restaurar esta versão/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Restaurar versão' }));
  await waitFor(() => expect(onRestored).toHaveBeenCalledWith({ id: 'page-1' }));
});

test('carregamento e erro da lista não aparentam histórico vazio e permitem tentar novamente', async () => {
  let rejectList!: (reason: Error) => void;
  const request = jest.fn()
    .mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectList = reject; }))
    .mockImplementation(() => response([{ id: 'r2', name: 'Versão recuperada', createdAt: '2026-11-15T12:00:00Z' }]));
  setup(request);
  expect(screen.getByRole('status')).toHaveTextContent('Carregando versões…');
  expect(screen.queryByText('Nenhuma versão listada.')).not.toBeInTheDocument();
  rejectList(new Error('Falha ao carregar versões'));
  expect(await screen.findByRole('alert')).toHaveTextContent('Falha ao carregar versões');
  expect(screen.queryByText('Nenhuma versão listada.')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Tentar carregar versões novamente' }));
  expect(await screen.findByRole('button', { name: /Versão recuperada/ })).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
