// src/pages/laudos/components/TicketDetails.tsx

import { useState, useEffect } from 'react';
import { useUser } from '../../../contexts/UserContext';
import { useToastContext } from '../../../contexts/ToastContext';
import { pdfGenerator } from '../../../utils/pdfGenerator';
import ItemForm from './ItemForm';
import LoadingSpinner from '../../../components/LoadingSpinner';
import type { Ticket, TicketItem, DefeitoOption, FormOption } from '../page';
import { supabase } from '../../../utils/supabaseClient'; // ✅ IMPORTADO

interface TicketDetailsProps {
  ticket: Ticket;
  onUpdateTicket: (ticket: Ticket) => Promise<boolean>;
  onConfirmNewTicket: (ticket: Ticket) => Promise<boolean>;
  onDeleteTicket: (ticketId: string) => void;
  onCancelNewTicket: () => void;
  isPendingTicket: boolean;
  shouldOpenItemForm?: boolean;
  onItemFormOpened?: () => void;
  defeitosOptions: DefeitoOption[];
  origemDefeitoOptions: FormOption[];
  disposicaoOptions: FormOption[];
  disposicaoPecasOptions: FormOption[];
}

// ... (funções getStatusColor e getStatusText permanecem iguais) ...
function getStatusColor(status: Ticket['status']) {
  switch (status) {
    case 'novo':
      return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    case 'concluido':
      return 'bg-green-500/20 text-green-300 border-green-500/30';
    default:
      return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
  }
}

function getStatusText(status: Ticket['status']) {
  switch (status) {
    case 'novo':
      return 'Novo';
    case 'concluido':
      return 'Concluído';
    default:
      return 'Indefinido';
  }
}


// ✅ Componente auxiliar para lidar com a busca da URL pública
function StorageImage({ path, alt }: { path: string, alt: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (path) {
      const { data } = supabase
        .storage
        .from('fotos-laudos') // Mesmo nome do bucket
        .getPublicUrl(path);
      setUrl(data.publicUrl);
    }
  }, [path]);

  if (!url) {
    return (
        <div className="w-full h-24 bg-slate-700/50 rounded-lg flex items-center justify-center">
            <LoadingSpinner size="sm" />
        </div>
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      className="w-full h-24 object-cover rounded-lg border border-orange-500/20"
    />
  );
}


export default function TicketDetails({
  ticket,
  onUpdateTicket,
  onConfirmNewTicket,
  onDeleteTicket,
  shouldOpenItemForm = false,
  onItemFormOpened,
  onCancelNewTicket,
  isPendingTicket,
  defeitosOptions,
  origemDefeitoOptions,
  disposicaoOptions,
  disposicaoPecasOptions
}: TicketDetailsProps) {
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState<TicketItem | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isOnSharePointCooldown, setIsOnSharePointCooldown] = useState(false);
  const { success, error, warning, info } = useToastContext();
  const { user } = useUser();
  const isConcluido = ticket.status === 'concluido';

  useEffect(() => {
    pdfGenerator.setToastCallback((type, title, message) => {
      switch (type) {
        case 'success': success(title, message); break;
        case 'error': error(title, message); break;
        case 'warning': warning(title, message); break;
        case 'info': info(title, message); break;
      }
    });
  }, [success, error, warning, info]);

  useEffect(() => {
    if (shouldOpenItemForm) {
      setShowItemForm(true);
      onItemFormOpened?.();
    }
  }, [shouldOpenItemForm, onItemFormOpened]);

  const handleSaveItem = async (data: { item: any, numeroTicket: string, nomeCliente: string }) => {
    setIsSaving(true);
    const savedItem: TicketItem = { 
        ...data.item, 
        id: editingItem ? editingItem.id : crypto.randomUUID(), 
        nomeCliente: data.nomeCliente 
    };
    
    let wasSuccessful = false;

    if (isPendingTicket) {
      const confirmedTicket: Ticket = {
        ...ticket,
        numero: data.numeroTicket || ticket.numero,
        nomeCliente: data.nomeCliente,
        itens: [...ticket.itens.map(i => ({...i, nomeCliente: data.nomeCliente})), savedItem],
      };
      wasSuccessful = await onConfirmNewTicket(confirmedTicket);
    } else {
      let updatedItens: TicketItem[];
      if (editingItem) {
        updatedItens = ticket.itens.map(i => i.id === editingItem.id ? savedItem : {...i, nomeCliente: data.nomeCliente});
      } else {
        updatedItens = [...ticket.itens.map(i => ({...i, nomeCliente: data.nomeCliente})), savedItem];
      }
      
      const updatedTicket: Ticket = {
          ...ticket,
          nomeCliente: data.nomeCliente,
          itens: updatedItens,
      };
      wasSuccessful = await onUpdateTicket(updatedTicket);
    }

    if (wasSuccessful) {
        setShowItemForm(false);
        setEditingItem(null);
    }
    setIsSaving(false);
  };
  
  const deleteItem = (itemId: string) => {
    if (window.confirm("Tem certeza que deseja excluir este item?")) {
      const itemToDelete = ticket.itens.find(i => i.id === itemId);
      
      // ✅ Deleta os arquivos do storage primeiro
      if (itemToDelete && itemToDelete.fotos.length > 0) {
        supabase.storage.from('fotos-laudos').remove(itemToDelete.fotos)
            .catch(err => console.error("Erro ao deletar arquivos do item:", err));
      }

      // Atualiza o ticket no estado
      const updatedTicket = {
        ...ticket,
        itens: ticket.itens.filter((i) => i.id !== itemId),
      };
      onUpdateTicket(updatedTicket);
    }
  };

  const handleFormCancel = () => {
    setShowItemForm(false);
    setEditingItem(null);
    if (isPendingTicket && ticket.itens.length === 0) {
      onCancelNewTicket();
    }
  };

  const handleExportToPDF = async (ticketToExport: Ticket = ticket) => {
    if (ticketToExport.itens.length === 0) {
      warning('Laudo Vazio', 'Adicione itens ao laudo antes de gerar o PDF.');
      return;
    }
    setIsGeneratingPDF(true);
    await pdfGenerator.generateTicketPDF(ticketToExport, user?.nome || 'Utilizador Desconhecido');
    setIsGeneratingPDF(false);
  };

  const handleConcluirTicket = async () => {
    if (ticket.itens.length === 0) {
      warning('Não é possível concluir', 'Adicione pelo menos um item.');
      return;
    }
    setIsSaving(true);
    const updatedTicket: Ticket = { ...ticket, status: 'concluido' };
    const wasSuccessful = await onUpdateTicket(updatedTicket);
    
    if (wasSuccessful) {
        success("Laudo concluído com sucesso");
        
        // --- PONTO 1: GERAÇÃO AUTOMÁTICA ---
        // A geração do PDF acontece aqui, automaticamente após salvar.
        await handleExportToPDF(updatedTicket);
        // --- FIM DO PONTO 1 ---

        // ✅ 2. INÍCIO DA MODIFICAÇÃO: Inicia o cooldown de 5 segundos
        // Isso acontece *depois* que o handleExportToPDF termina (e o toast "Salvo no Share Point" é disparado)
        setIsOnSharePointCooldown(true);
        setTimeout(() => {
            setIsOnSharePointCooldown(false);
        }, 5000); // 5000 milissegundos = 5 segundos
        // ✅ 2. FIM DA MODIFICAÇÃO
    }
    setIsSaving(false);
  };
  
  const handleCancelConcludedTicket = async () => {
    if (window.confirm(`Tem a certeza de que pretende cancelar o laudo ${ticket.numero}?\n\nEsta ação irá APAGAR PERMANENTEMENTE o laudo do sistema e o PDF correspondente do SharePoint.`)) {
        
        // ✅ Deleta todas as fotos de todos os itens do laudo
        const allPhotoPaths = ticket.itens.flatMap(item => item.fotos);
        if (allPhotoPaths.length > 0) {
            await supabase.storage.from('fotos-laudos').remove(allPhotoPaths);
        }

        await pdfGenerator.deletePDFByTicketNumber(ticket.numero);
        onDeleteTicket(ticket.id);
    }
  };

  // --- INÍCIO DA CORREÇÃO ---
  const handleDeleteTicket = async () => {
    if (isPendingTicket) {
      // ✅ CORREÇÃO:
      // Antes de cancelar o laudo pendente, apaga as fotos que já foram carregadas
      const allPhotoPaths = ticket.itens.flatMap(item => item.fotos);
      if (allPhotoPaths.length > 0) {
          try {
              // Apaga do bucket 'fotos-laudos'
              await supabase.storage.from('fotos-laudos').remove(allPhotoPaths);
          } catch (err) {
              console.error("Erro ao limpar fotos do laudo pendente cancelado:", err);
              // Continua mesmo se a exclusão falhar, para não prender o usuário
          }
      }
      onCancelNewTicket(); // Chama o cancelamento original
    } else {
      if (window.confirm(`Tem certeza que deseja excluir o laudo ${ticket.numero}?\nEsta ação não pode ser desfeita.`)) {
        
        // ✅ Deleta todas as fotos de todos os itens do laudo
        const allPhotoPaths = ticket.itens.flatMap(item => item.fotos);
        if (allPhotoPaths.length > 0) {
            // Apaga do bucket 'fotos-laudos'
            await supabase.storage.from('fotos-laudos').remove(allPhotoPaths);
        }
        
        onDeleteTicket(ticket.id);
      }
    }
  };
  // --- FIM DA CORREÇÃO ---

  return (
    <div className="h-full flex flex-col">
      <div className="bg-slate-800/90 backdrop-blur-sm border-b border-orange-500/20 p-4 sm:p-6">
        {/* ... (O header do TicketDetails não muda) ... */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-white">{ticket.numero || 'Novo Laudo'}</h1>
              {isPendingTicket ? (
                <span className="px-3 py-1 text-xs sm:text-sm font-medium rounded-full border bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
                  Não Salvo
                </span>
              ) : (
                <span className={`px-3 py-1 text-xs sm:text-sm font-medium rounded-full border ${getStatusColor(ticket.status)}`}>
                  {getStatusText(ticket.status)}
                </span>
              )}
            </div>
            <p className="text-gray-300 font-semibold">{ticket.titulo}</p>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
            {isConcluido && (
                <button
                    type="button"
                    onClick={handleCancelConcludedTicket}
                    className="btn-danger btn-sm"
                    // ✅ 3. MODIFICAÇÃO: Adiciona o estado de cooldown ao 'disabled'
                    disabled={isSaving || isGeneratingPDF || isOnSharePointCooldown}
                    title={isOnSharePointCooldown ? "Aguarde 5 segundos após salvar..." : "Cancelar laudo concluído"}
                >
                    {isOnSharePointCooldown ? (
                        <>
                            <LoadingSpinner size="sm" color="white" />
                            <span>Aguarde...</span>
                        </>
                    ) : (
                        <>
                            <i className="ri-delete-bin-line"></i>
                            <span>Cancelar</span>
                        </>
                    )}
                </button>
            )}
            
            {!isConcluido && !isPendingTicket && (
              <button
                type="button"
                onClick={handleConcluirTicket}
                disabled={ticket.itens.length === 0 || isSaving || isGeneratingPDF}
                className="btn-success btn-sm"
              >
                {(isSaving || isGeneratingPDF) ? <LoadingSpinner size="sm" color="white" /> : <i className="ri-check-line"></i>}
                <span>{(isSaving || isGeneratingPDF) ? 'A salvar...' : 'Concluir'}</span>
              </button>
            )}
            
            {/* --- INÍCIO DA ALTERAÇÃO (PONTO 2) --- */}
            {/* O botão de PDF manual só aparece se o laudo JÁ ESTIVER concluído */}
            {isConcluido && (
              <button
                type="button"
                onClick={() => handleExportToPDF()}
                disabled={isGeneratingPDF}
                className="btn-secondary btn-sm"
                title="Baixar PDF novamente"
              >
                {isGeneratingPDF ? (
                  <><LoadingSpinner size="sm" color="white" /><span>A gerar...</span></>
                ) : (
                  <><i className="ri-download-2-line"></i><span>Baixar PDF</span></>
                )}
              </button>
            )}
            {/* --- FIM DA ALTERAÇÃO (PONTO 2) --- */}
            
            {!isConcluido && (
              <button
                type="button"
                onClick={handleDeleteTicket}
                className="btn-danger btn-sm"
                title={isPendingTicket ? 'Cancelar criação' : 'Excluir laudo'}
                disabled={isSaving || isGeneratingPDF}
              >
                <i className="ri-delete-bin-line"></i>
                <span>{isPendingTicket ? 'Cancelar' : 'Excluir'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <h2 className="text-lg font-semibold text-white">
            Itens do Laudo ({ticket.itens.length})
          </h2>
          {!isConcluido && (
          <button
            type="button"
            onClick={() => { setEditingItem(null); setShowItemForm(true); }}
            className="btn-primary"
            disabled={isSaving || isGeneratingPDF}
          >
            <i className="ri-add-line"></i>
            <span>Adicionar Item</span>
          </button>
          )}
        </div>

        {ticket.itens.length > 0 ? (
          <div className="space-y-4">
            {ticket.itens.map((item) => (
              <div key={item.id} className="bg-slate-800/60 rounded-lg border border-orange-500/20 p-4 sm:p-6">
                {/* ... (A exibição de N° Item, Motivo, etc não muda) ... */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="bg-orange-500/20 text-orange-300 px-2 py-1 rounded text-sm font-medium border border-orange-500/30">
                        Item {item.numeroItem}
                      </span>
                      <span className="text-sm text-gray-400">Qtd: {item.quantidade}</span>
                    </div>

                    {/* */}
                    <div className="space-y-2 mb-3">
                      {item.motivo.map((motivo, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <span className="bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded text-xs font-medium border border-orange-500/30">
                            DEFEITO {index + 1}
                          </span>
                          <span className="font-medium text-white">{motivo}</span>
                        </div>
                      ))}
                    </div>
                    {/* */}
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 text-sm mb-3">
                        <div>
                            <span className="font-medium text-gray-400 block">Origem Defeito:</span>
                            <span className="text-gray-200">{item.origemDefeito}</span>
                        </div>
                        <div>
                            <span className="font-medium text-gray-400 block">Disposição:</span>
                            <span className="text-gray-200">{item.disposicao}</span>
                        </div>
                        <div>
                            <span className="font-medium text-gray-400 block">Disposição das Peças:</span>
                            <span className="text-gray-200">{item.disposicaoPecas}</span>
                        </div>
                    </div>

                    {item.anotacoes && (
                      <div className="bg-slate-700/50 rounded-lg p-3">
                        <p className="text-xs font-medium text-orange-300 mb-1">Anotações:</p>
                        <p className="text-gray-300 text-sm whitespace-pre-line">{item.anotacoes}</p>
                      </div>
                    )}
                  </div>
                  {!isConcluido && (
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      type="button"
                      onClick={() => { setEditingItem(item); setShowItemForm(true); }}
                      className="text-gray-400 hover:text-orange-400 transition-colors p-1"
                      title="Editar item"
                      disabled={isSaving || isGeneratingPDF}
                    >
                      <i className="ri-edit-line text-lg"></i>
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteItem(item.id)}
                      className="text-gray-400 hover:text-red-400 transition-colors p-1"
                      title="Excluir item"
                      disabled={isSaving || isGeneratingPDF}
                    >
                      <i className="ri-delete-bin-line text-lg"></i>
                    </button>
                  </div>
                  )}
                </div>

                {/* ✅ Atualizado para usar o componente StorageImage */}
                {item.fotos?.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {item.fotos.map((path, index) => (
                      <StorageImage
                        key={path}
                        path={path}
                        alt={`Foto ${index + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400 bg-slate-800/40 rounded-lg border-2 border-dashed border-orange-500/30 text-center p-4">
            <i className="ri-inbox-line text-6xl mb-4"></i>
            <p className="text-lg font-medium mb-2">
              {isPendingTicket ? 'Adicione o primeiro item para criar o laudo' : 'Nenhum item adicionado'}
            </p>
            {!isConcluido && (
            <button
              type="button"
              onClick={() => setShowItemForm(true)}
              className="btn-primary"
              disabled={isSaving || isGeneratingPDF}
            >
              <i className="ri-add-line"></i>
              <span>Adicionar Item</span>
            </button>
            )}
          </div>
        )}
      </div>

      {(showItemForm || editingItem) && (
        <ItemForm
          item={editingItem}
          onSave={handleSaveItem}
          onCancel={handleFormCancel}
          isPendingTicket={isPendingTicket && !editingItem}
          ticketNumero={ticket.numero}
          ticketNomeCliente={ticket.nomeCliente}
          isSaving={isSaving}
          defeitosOptions={defeitosOptions}
          origemDefeitoOptions={origemDefeitoOptions}
          disposicaoOptions={disposicaoOptions}
          disposicaoPecasOptions={disposicaoPecasOptions}
        />
      )}
    </div>
  );
}