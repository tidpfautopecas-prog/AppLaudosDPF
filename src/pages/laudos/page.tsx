// src/pages/laudos/page.tsx
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext';
import TicketMaster from './components/TicketMaster';
import TicketDetails from './components/TicketDetails';
import { supabase } from '../../utils/supabaseClient';
import { useToastContext } from '../../contexts/ToastContext';
import LoadingSpinner from '../../components/LoadingSpinner';

export interface TicketItem {
  id: string;
  numeroItem: string;
  quantidade: number;
  motivo: string[]; // <-- ALTERADO
  origemDefeito: string;
  anotacoes?: string;
  fotos: string[];
  nomeCliente?: string; 
  disposicao: string;
  disposicaoPecas: string;
}

export interface Ticket {
  id: string;
  numero: string;
  titulo: string;
  nomeCliente: string;
  fornecedor: string;
  disposicao: string;
  dataCreacao: string;
  status: 'novo' | 'concluido';
  responsavel: string;
  itens: TicketItem[];
}

// Interfaces para as novas opções
export interface DefeitoOption {
  codigo: string;
  descricao: string;
}

export interface FormOption {
  value: string;
  label: string;
}

const LAUDOS_PER_PAGE = 20;

export default function Laudos() {
  const { user, logout, isAuthenticated } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToastContext();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string>('');
  const [showMaster, setShowMaster] = useState(true);
  const [pendingTicket, setPendingTicket] = useState<Ticket | null>(null);
  const [shouldOpenItemForm, setShouldOpenItemForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [defeitosOptions, setDefeitosOptions] = useState<DefeitoOption[]>([]);
  const [origemDefeitoOptions, setOrigemDefeitoOptions] = useState<FormOption[]>([]);
  const [disposicaoOptions, setDisposicaoOptions] = useState<FormOption[]>([]);
  const [disposicaoPecasOptions, setDisposicaoPecasOptions] = useState<FormOption[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);

  const fetchLaudos = useCallback(async (currentPage: number, reset = false) => {
    if (reset) setIsLoading(true);
    else setIsLoadingMore(true);

    const from = currentPage * LAUDOS_PER_PAGE;
    const to = from + LAUDOS_PER_PAGE - 1;

    try {
      const { data, error, count } = await supabase
        .from('laudos')
        .select('*, laudos_itens(*)', { count: 'exact' })
        .order('data_criacao', { ascending: false })
        .range(from, to);

      if (error) throw error;

      const formattedData = (data || []).map(laudo => ({
        id: laudo.id,
        numero: laudo.numero,
        titulo: laudo.titulo,
        nomeCliente: laudo.nome_cliente,
        fornecedor: laudo.fornecedor,
        disposicao: laudo.disposicao,
        dataCreacao: laudo.data_criacao,
        status: laudo.status,
        responsavel: laudo.responsavel_nome,
        itens: (laudo.laudos_itens || []).map((item: any) => ({
          id: item.id,
          numeroItem: item.numero_item,
          quantidade: item.quantidade,
          motivo: item.motivo,
          origemDefeito: item.origem_defeito,
          anotacoes: item.anotacoes,
          fotos: item.fotos || [],
          disposicao: item.disposicao,
          disposicaoPecas: item.disposicao_pecas,
        })),
      })) as Ticket[];

      setTickets(prev => reset ? formattedData : [...prev, ...formattedData]);
      setHasMore((count || 0) > (currentPage + 1) * LAUDOS_PER_PAGE);

    } catch (err: any) {
      console.error("❌ Erro ao buscar laudos:", err);
      toast.error("Erro ao buscar laudos", err.message || 'Erro desconhecido.');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [toast]);

  const fetchFormOptions = useCallback(async () => {
    setIsLoadingOptions(true);
    try {
      // --- INÍCIO DA OTIMIZAÇÃO: Carregamento em Paralelo ---
      const [defeitosRes, origemRes, disposicaoRes, disposicaoPecasRes] = await Promise.all([
        supabase.from('defeitos').select('codigo, descricao'), 
        supabase.from('origens_defeito').select('value, label'),
        supabase.from('disposicoes').select('value, label'),
        supabase.from('disposicoes_pecas').select('value, label')
      ]);
      // --- FIM DA OTIMIZAÇÃO ---

      if (defeitosRes.error) throw defeitosRes.error;
      if (origemRes.error) throw origemRes.error;
      if (disposicaoRes.error) throw disposicaoRes.error;
      if (disposicaoPecasRes.error) throw disposicaoPecasRes.error;

      const sortedDefeitos = (defeitosRes.data as DefeitoOption[]).sort((a, b) => {
        return parseInt(a.codigo, 10) - parseInt(b.codigo, 10);
      });
      
      setDefeitosOptions(sortedDefeitos); 
      setOrigemDefeitoOptions(origemRes.data as FormOption[]);
      setDisposicaoOptions(disposicaoRes.data as FormOption[]);
      setDisposicaoPecasOptions(disposicaoPecasRes.data as FormOption[]);

    } catch (err: any) {
      console.error("❌ Erro ao buscar opções do formulário:", err);
      toast.error("Erro ao carregar opções do formulário", err.message || 'Erro desconhecido.');
    } finally {
      setIsLoadingOptions(false);
    }
  }, [toast]);
  
  useEffect(() => {
    if (isAuthenticated) {
      fetchLaudos(0, true);
      fetchFormOptions(); 
    }
  }, [isAuthenticated, fetchLaudos, fetchFormOptions]);

  const loadMoreTickets = () => {
      if (hasMore && !isLoadingMore) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchLaudos(nextPage);
      }
  }
  
  useEffect(() => {
    const action = new URLSearchParams(location.search).get('action');
    if (action === 'nova-devolucao' && !pendingTicket) prepareNewTicket();
  }, [location.search, pendingTicket]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  const prepareNewTicket = () => {
    sessionStorage.removeItem('itemFormBackup');
    sessionStorage.removeItem('itemFormWasOpen');

    const newTicket: Ticket = {
      id: `pending_${Date.now()}`,
      numero: '#SR-',
      titulo: 'Laudo Técnico de Garantia',
      nomeCliente: '',
      fornecedor: 'N/A',
      disposicao: 'N/A',
      dataCreacao: new Date().toISOString(),
      status: 'novo',
      responsavel: user?.nome || 'Utilizador Desconhecido',
      itens: [],
    };
    setPendingTicket(newTicket);
    setSelectedTicketId(newTicket.id);
    setShouldOpenItemForm(true);
    setShowMaster(false);
  };
  
  const confirmNewTicket = async (ticketToConfirm: Ticket): Promise<boolean> => {
    if (!user) {
      toast.error("Erro ao salvar o Laudo", "Utilizador não encontrado.");
      return false;
    }
    if (!ticketToConfirm.nomeCliente?.trim()) {
      toast.error("Erro ao salvar o Laudo", "Nome do cliente não informado.");
      return false;
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData?.user) throw new Error("Utilizador não autenticado.");
      
      const authId = authData.user.id;
      const { id: tempId, itens, ...laudoData } = ticketToConfirm;
      const { data: newLaudo, error: laudoError } = await supabase.from('laudos').insert({
        numero: laudoData.numero,
        titulo: laudoData.titulo,
        nome_cliente: laudoData.nomeCliente,
        fornecedor: laudoData.fornecedor,
        disposicao: laudoData.disposicao,
        status: laudoData.status,
        responsavel_id: authId,
        responsavel_nome: user.nome,
      }).select().single();
      if (laudoError) throw laudoError;

      const itensToInsert = itens.map(item => ({
        laudo_id: newLaudo.id,
        numero_item: item.numeroItem,
        quantidade: item.quantidade,
        motivo: item.motivo,
        origem_defeito: item.origemDefeito,
        anotacoes: item.anotacoes,
        fotos: item.fotos,
        disposicao: item.disposicao,
        disposicao_pecas: item.disposicaoPecas,
        nome_cliente: newLaudo.nome_cliente,
      }));
      const { data: newItens, error: itensError } = await supabase.from('laudos_itens').insert(itensToInsert).select();
      if (itensError) throw itensError;

      const finalLaudo: Ticket = {
        id: newLaudo.id,
        numero: newLaudo.numero,
        titulo: newLaudo.titulo,
        nomeCliente: newLaudo.nome_cliente,
        fornecedor: newLaudo.fornecedor,
        disposicao: newLaudo.disposicao,
        dataCreacao: newLaudo.data_criacao,
        status: newLaudo.status,
        responsavel: newLaudo.responsavel_nome,
        itens: (newItens || []).map((item: any) => ({
          id: item.id,
          numeroItem: item.numero_item,
          quantidade: item.quantidade,
          motivo: item.motivo,
          origemDefeito: item.origem_defeito,
          anotacoes: item.anotacoes,
          fotos: item.fotos || [],
          disposicao: item.disposicao,
          disposicaoPecas: item.disposicao_pecas,
        })),
      };

      setTickets(prev => [finalLaudo, ...prev]);
      setPendingTicket(null);
      setSelectedTicketId(finalLaudo.id);
      
      return true; // Sucesso
    } catch (err: any) {
      toast.error("Erro ao salvar o Laudo", err.message);
      return false; // Falha
    }
  };

  const updateTicket = async (updatedTicket: Ticket): Promise<boolean> => {
    const originalTicket = tickets.find(t => t.id === updatedTicket.id);
    if (!originalTicket) {
      toast.error("Erro ao salvar", "O laudo original não foi encontrado.");
      return false;
    }
    
    const originalTickets = [...tickets];
    setTickets(prev => prev.map(t => t.id === updatedTicket.id ? updatedTicket : t));

    try {
      const { error: laudoError } = await supabase.from('laudos').update({
        titulo: updatedTicket.titulo,
        fornecedor: updatedTicket.fornecedor,
        disposicao: updatedTicket.disposicao,
        status: updatedTicket.status, 
        nome_cliente: updatedTicket.nomeCliente,
      }).eq('id', updatedTicket.id);
      if (laudoError) throw laudoError;
      
      const originalItemIds = new Set(originalTicket.itens.map(i => i.id));
      const updatedItemIds = new Set(updatedTicket.itens.map(i => i.id));

      const itemIdsToDelete = [...originalItemIds].filter(id => !updatedItemIds.has(id));
      
      const itemsToUpsert = updatedTicket.itens.map(item => ({
        // ✅ CORREÇÃO APLICADA AQUI:
        // Passa o ID do item (novo ou existente) diretamente.
        // O `crypto.randomUUID()` gerado em TicketDetails será usado.
        id: item.id, 
        laudo_id: updatedTicket.id,
        numero_item: item.numeroItem,
        quantidade: item.quantidade,
        motivo: item.motivo,
        origem_defeito: item.origemDefeito,
        anotacoes: item.anotacoes,
        fotos: item.fotos,
        disposicao: item.disposicao,
        disposicao_pecas: item.disposicaoPecas,
        nome_cliente: updatedTicket.nomeCliente,
      }));

      const [deleteResult, upsertResult] = await Promise.all([
        itemIdsToDelete.length > 0
          ? supabase.from('laudos_itens').delete().in('id', itemIdsToDelete)
          : Promise.resolve({ error: null }),
        itemsToUpsert.length > 0
          // Agora o upsert usará o 'id' fornecido
          ? supabase.from('laudos_itens').upsert(itemsToUpsert) 
          : Promise.resolve({ error: null })
      ]);

      if (deleteResult.error) throw deleteResult.error;
      if (upsertResult.error) throw upsertResult.error;
      
      // Recarrega os laudos para garantir consistência total com o banco
      await fetchLaudos(0, true); 
      
      return true; // Sucesso
    } catch (err: any) {
      console.error("❌ Erro ao salvar o Laudo:", err); // Log do erro
      toast.error("Erro ao salvar o Laudo", err.message);
      setTickets(originalTickets); 
      return false; // Falha
    }
  };
  
  const deleteTicket = async (ticketId: string) => {
    try {
      const { error } = await supabase.from('laudos').delete().eq('id', ticketId);
      if (error) throw error;
      setTickets(prev => prev.filter(t => t.id !== ticketId));
      setSelectedTicketId(tickets.length > 1 ? tickets[0].id : '');
      toast.success("Laudo excluído com sucesso!");
    } catch (err: any) {
      console.error("❌ Erro ao excluir laudo:", err);
      toast.error("Erro ao excluir laudo", err.message);
    }
  };

  const cancelNewTicket = () => {
    setPendingTicket(null);
    setSelectedTicketId(tickets.length > 0 ? tickets[0].id : '');
    setShowMaster(true);
    sessionStorage.removeItem('itemFormBackup');
    sessionStorage.removeItem('itemFormWasOpen');
  };

  const handleTicketSelectedOnMobile = () => {
    setShowMaster(false);
  }

  const ticketToShow =
    pendingTicket && selectedTicketId === pendingTicket.id
      ? pendingTicket
      : tickets.find(t => t.id === selectedTicketId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900">
      <div className="bg-slate-800 shadow-lg border-b border-orange-500/20">
        <div className="px-2 sm:px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <button
                onClick={() => setShowMaster(prev => !prev)}
                className="text-gray-400 hover:text-orange-400 p-2 rounded-full hover:bg-slate-700/50"
                title={showMaster ? "Ocultar lista" : "Mostrar lista"}
              >
                <i className={`${showMaster ? 'ri-menu-fold-line' : 'ri-menu-unfold-line'} text-xl`}></i>
              </button>
              <div className="w-8 h-8 bg-white rounded-lg flex-shrink-0 flex items-center justify-center p-1">
                <img
                  src="https://i.postimg.cc/bJ3kwSbw/DPF.png"
                  alt="DPF Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-white">Laudos para Devolução</h1>
                <p className="text-xs text-orange-200">Sistema de Laudos Técnicos</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              {user && (
                <div className="hidden md:flex items-center space-x-2 text-sm text-gray-300">
                  <i className="ri-user-line"></i>
                  <span>{user.nome}</span>
                </div>
              )}
              <button onClick={() => navigate('/')} className="btn-secondary btn-sm">
                <i className="ri-home-4-line"></i>
                <span className="hidden sm:inline">Início</span>
              </button>
              <button onClick={prepareNewTicket} className="btn-primary btn-sm">
                <i className="ri-add-line"></i>
                <span className="hidden sm:inline">Nova Devolução</span>
              </button>
              <button onClick={handleLogout} className="btn-danger btn-sm">
                <i className="ri-logout-box-line"></i>
                <span className="hidden sm:inline">Sair</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-68px)]">
        <div className={`w-full sm:w-80 bg-slate-800/90 backdrop-blur-sm border-r border-orange-500/20 flex flex-col flex-shrink-0 ${!showMaster ? 'hidden' : 'block absolute sm:relative z-20'}`}>
          <TicketMaster
            tickets={tickets}
            selectedTicketId={selectedTicketId}
            onSelectTicket={setSelectedTicketId}
            onDeleteTicket={deleteTicket}
            pendingTicket={pendingTicket}
            onTicketSelected={handleTicketSelectedOnMobile}
            hasMore={hasMore}
            isLoadingMore={isLoadingMore}
            onLoadMore={loadMoreTickets}
          />
        </div>
        
        <div className={`flex-1 bg-slate-900/50 ${!showMaster ? 'block' : 'hidden sm:block'}`}>
          {isLoading || isLoadingOptions ? ( 
            <div className="flex items-center justify-center h-full">
              <LoadingSpinner size="lg" />
              <span className="ml-4 text-gray-300">{isLoadingOptions ? "Carregando configurações..." : "Carregando laudos..."}</span>
            </div>
          ) : ticketToShow ? (
            <TicketDetails
              ticket={ticketToShow}
              onUpdateTicket={updateTicket}
              onConfirmNewTicket={confirmNewTicket}
              onDeleteTicket={deleteTicket}
              shouldOpenItemForm={shouldOpenItemForm}
              onItemFormOpened={() => setShouldOpenItemForm(false)}
              onCancelNewTicket={cancelNewTicket}
              isPendingTicket={!!pendingTicket && ticketToShow.id === pendingTicket.id}
              defeitosOptions={defeitosOptions}
              origemDefeitoOptions={origemDefeitoOptions}
              disposicaoOptions={disposicaoOptions}
              disposicaoPecasOptions={disposicaoPecasOptions}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-center p-4">
              <div>
                <i className="ri-file-text-line text-gray-500 text-6xl mb-4"></i>
                <p className="text-gray-400">Nenhum laudo encontrado. Crie um novo para começar.</p>
                <button onClick={prepareNewTicket} className="mt-4 btn-primary">
                  <i className="ri-add-line"></i>
                  <span>Criar Novo Laudo</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}