import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Toast from '../Toast';

describe('Toast', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('deve renderizar toast de sucesso', () => {
    render(
      <Toast
        id="1"
        type="success"
        title="Sucesso"
        message="Operação realizada com sucesso"
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Sucesso')).toBeInTheDocument();
    expect(screen.getByText('Operação realizada com sucesso')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('deve renderizar toast de erro', () => {
    render(
      <Toast
        id="1"
        type="error"
        title="Erro"
        message="Algo deu errado"
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Erro')).toBeInTheDocument();
    expect(screen.getByText('Algo deu errado')).toBeInTheDocument();
  });

  it('deve chamar onClose quando clicar no botão fechar', async () => {
    const user = userEvent.setup();
    
    render(
      <Toast
        id="1"
        type="info"
        title="Info"
        message="Informação"
        onClose={mockOnClose}
      />
    );

    await user.click(screen.getByRole('button'));
    
    // Avança os timers para completar a animação de saída
    vi.advanceTimersByTime(300);

    expect(mockOnClose).toHaveBeenCalledWith('1');
  });

  it('deve aplicar classes CSS corretas para cada tipo', () => {
    const { rerender, container } = render(
      <Toast
        id="1"
        type="success"
        title="Sucesso"
        message="Mensagem"
        onClose={mockOnClose}
      />
    );
    
    expect(container.firstChild).toHaveClass('border-green-200');

    rerender(
      <Toast
        id="1"
        type="error"
        title="Erro"
        message="Mensagem"
        onClose={mockOnClose}
      />
    );
    
    expect(container.firstChild).toHaveClass('border-red-200');
  });
});