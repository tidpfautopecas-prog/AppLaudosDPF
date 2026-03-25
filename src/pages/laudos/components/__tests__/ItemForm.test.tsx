import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ItemForm from '../ItemForm'; // Ajuste o caminho se necessário
import type { TicketItem } from '../../page'; // Ajuste o caminho se necessário
import type { DefeitoOption, FormOption } from '../../page'; // Importa os tipos necessários

// Mock das opções (pode usar listas vazias para a maioria dos testes)
const mockDefeitosOptions: DefeitoOption[] = [
    { codigo: "1", descricao: "PONTOS DE FIXAÇÕES NA PONTA SUPERIOR L/DIR" },
    // Adicione mais se um teste específico precisar delas
];
const mockOrigemDefeitoOptions: FormOption[] = [];
const mockDisposicaoOptions: FormOption[] = [];
const mockDisposicaoPecasOptions: FormOption[] = [];

const mockItem: TicketItem = {
  id: '1',
  numeroItem: '6440',
  quantidade: 2,
  motivo: ['1 - PONTOS DE FIXAÇÕES NA PONTA SUPERIOR L/DIR'], // <-- ALTERADO
  origemDefeito: '1 - Fornecedor',
  anotacoes: 'Teste de anotação',
  fotos: ['data:image/jpeg;base64,test'], // Note: Testes com fotos do Storage precisarão de mocks diferentes
  nomeCliente: 'Cliente Teste',
  disposicao: '1 - Aceito',
  disposicaoPecas: '1- Fornec Global Venda',
};

describe('ItemForm', () => {
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve renderizar o formulário corretamente para Adicionar Item', () => {
    render(
      <ItemForm
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        defeitosOptions={mockDefeitosOptions}
        origemDefeitoOptions={mockOrigemDefeitoOptions}
        disposicaoOptions={mockDisposicaoOptions}
        disposicaoPecasOptions={mockDisposicaoPecasOptions}
      />
    );

    expect(screen.getByText('Adicionar Item')).toBeInTheDocument();
    expect(screen.getByLabelText(/N° do Item/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Quantidade/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Motivo/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Origem do Defeito/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Anotações/)).toBeInTheDocument();
    expect(screen.getByText(/Adicionar Fotos/)).toBeInTheDocument();
  });

  it('deve preencher o formulário quando editando um item', () => {
    render(
      <ItemForm
        item={mockItem}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        defeitosOptions={mockDefeitosOptions}
        origemDefeitoOptions={mockOrigemDefeitoOptions}
        disposicaoOptions={mockDisposicaoOptions}
        disposicaoPecasOptions={mockDisposicaoPecasOptions}
      />
    );

    expect(screen.getByText('Editar Item')).toBeInTheDocument();
    expect(screen.getByDisplayValue('6440')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2')).toBeInTheDocument();
    // Verifica se a "tag" do motivo foi renderizada
    expect(screen.getByText('1 - PONTOS DE FIXAÇÕES NA PONTA SUPERIOR L/DIR')).toBeInTheDocument();
  });

  it('deve chamar onCancel quando cancelar', async () => {
    const user = userEvent.setup();

    render(
      <ItemForm
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        defeitosOptions={mockDefeitosOptions}
        origemDefeitoOptions={mockOrigemDefeitoOptions}
        disposicaoOptions={mockDisposicaoOptions}
        disposicaoPecasOptions={mockDisposicaoPecasOptions}
      />
    );

    await user.click(screen.getByRole('button', { name: /cancelar/i }));

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('deve filtrar defeitos na busca', async () => {
    const user = userEvent.setup();

    render(
      <ItemForm
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        defeitosOptions={mockDefeitosOptions}
        origemDefeitoOptions={mockOrigemDefeitoOptions}
        disposicaoOptions={mockDisposicaoOptions}
        disposicaoPecasOptions={mockDisposicaoPecasOptions}
      />
    );

    const motivoInput = screen.getByLabelText(/Motivo/);
    await user.type(motivoInput, 'PONTOS');

    await waitFor(() => {
        // ✅ CORREÇÃO APLICADA AQUI: O parâmetro 'content' foi removido
        const optionElement = screen.getByText((_content, element) => {
            const hasCode = element?.parentElement?.querySelector('span.bg-orange-500\\/20')?.textContent === '1';
            const hasDescription = element?.textContent === 'PONTOS DE FIXAÇÕES NA PONTA SUPERIOR L/DIR';
            return hasCode && hasDescription;
        });
        expect(optionElement).toBeInTheDocument();
    });
  });

  it('deve limitar anotações a 500 caracteres', async () => {
    const user = userEvent.setup();

    render(
      <ItemForm
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        defeitosOptions={mockDefeitosOptions}
        origemDefeitoOptions={mockOrigemDefeitoOptions}
        disposicaoOptions={mockDisposicaoOptions}
        disposicaoPecasOptions={mockDisposicaoPecasOptions}
      />
    );

    const anotacoesTextarea = screen.getByLabelText(/Anotações/);
    const longText = 'a'.repeat(600);

    await user.type(anotacoesTextarea, longText);

    expect(anotacoesTextarea).toHaveValue('a'.repeat(500));
  });
});