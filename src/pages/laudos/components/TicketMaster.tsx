// src/pages/laudos/components/TicketMaster.tsx
import { useState } from 'react';
import type { Ticket } from '../page';
import LoadingSpinner from '../../../components/LoadingSpinner';

interface TicketMasterProps {
  tickets: Ticket[];
  selectedTicketId: string | null;
  onSelectTicket: (id: string) => void;
  onDeleteTicket: (id: string) => void;
  pendingTicket: Ticket | null;
  onTicketSelected: () => void;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
}

const formatDate = (date: string | { toDate: () => Date }): Date => {
  if (typeof date === 'string') return new Date(date);
  if (date && typeof date.toDate === 'function') return date.toDate();
  return new Date();
};

const getStatusClass = (status: string) => {
  switch (status) {
    case 'novo': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    case 'concluido': return 'bg-green-500/20 text-green-300 border-green-500/30';
    default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
  }
};

const getStatusLabel = (status: string) => {
    switch (status) {
        case 'novo': return 'Novo';
        case 'concluido': return 'Concluído';
        default: return 'Indefinido';
    }
}

export default function TicketMaster({ tickets, selectedTicketId, onSelectTicket, onDeleteTicket, pendingTicket, onTicketSelected, hasMore, isLoadingMore, onLoadMore }: TicketMasterProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredTickets = tickets.filter(ticket => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = ticket.numero.toLowerCase().includes(searchLower) ||
                          ticket.titulo.toLowerCase().includes(searchLower) ||
                          ticket.responsavel.toLowerCase().includes(searchLower);
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleTicketClick = (id: string) => {
      onSelectTicket(id);
      onTicketSelected(); 
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-orange-500/20">
        <h2 className="text-lg font-semibold text-white">Lista de Laudos</h2>
        <p className="text-sm text-gray-300 mt-1">{tickets.length} laudos carregados</p>
      </div>

      <div className="p-4 border-b border-orange-500/20 space-y-4">
        <div className="relative">
            <i className="ri-search-line absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
            <input type="text" placeholder="Buscar laudos..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-700/50 border border-orange-500/20 rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent" />
        </div>
        <div className="flex space-x-2">
            <button onClick={() => setStatusFilter('all')} className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${statusFilter === 'all' ? 'bg-white text-black' : 'bg-slate-700/50 text-gray-300 hover:bg-slate-600/50 border border-orange-500/20'}`}>Todos</button>
            <button onClick={() => setStatusFilter('novo')} className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${statusFilter === 'novo' ? 'bg-blue-500 text-white' : 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border border-blue-500/30'}`}>Novo</button>
            <button onClick={() => setStatusFilter('concluido')} className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${statusFilter === 'concluido' ? 'bg-green-500 text-white' : 'bg-green-500/20 text-green-300 hover:bg-green-500/30 border border-green-500/30'}`}>Concluído</button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {pendingTicket && (
          <div onClick={() => handleTicketClick(pendingTicket.id)} className={`p-4 border-b border-slate-700/50 cursor-pointer hover:bg-slate-700/30 transition-colors group ${selectedTicketId === pendingTicket.id ? 'bg-orange-500/10 border-r-2 border-r-orange-500' : ''}`}>
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <h3 className="font-medium text-white truncate">{pendingTicket.numero || 'Novo Laudo'}</h3>
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">Não Salvo</span>
                </div>
                <p className="text-sm text-gray-300 mt-1 line-clamp-2">{pendingTicket.titulo}</p>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span className="flex items-center"><i className="ri-calendar-line mr-1"></i>{formatDate(pendingTicket.dataCreacao).toLocaleDateString('pt-BR')} às {formatDate(pendingTicket.dataCreacao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
              <span className="flex items-center"><i className="ri-list-unordered mr-1"></i>{pendingTicket.itens.length} itens</span>
            </div>
            <div className="mt-2 text-xs text-gray-400">
              <span className="flex items-center"><i className="ri-user-line mr-1"></i>{pendingTicket.responsavel}</span>
            </div>
          </div>
        )}

        {filteredTickets.map(ticket => (
          <div key={ticket.id} onClick={() => handleTicketClick(ticket.id)} className={`p-4 border-b border-slate-700/50 cursor-pointer hover:bg-slate-700/30 transition-colors group ${selectedTicketId === ticket.id ? 'bg-orange-500/10 border-r-2 border-r-orange-500' : ''}`}>
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-white truncate">{ticket.numero}</h3>
                <p className="text-sm text-gray-300 mt-1 line-clamp-2">{ticket.titulo}</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusClass(ticket.status)}`}>{getStatusLabel(ticket.status)}</span>
                {ticket.status !== 'concluido' && (
                  <button onClick={(e) => { e.stopPropagation(); onDeleteTicket(ticket.id); }} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 transition-all p-1 rounded-full hover:bg-red-500/20" title="Excluir laudo">
                    <i className="ri-delete-bin-line text-sm"></i>
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span className="flex items-center"><i className="ri-calendar-line mr-1"></i>{formatDate(ticket.dataCreacao).toLocaleDateString('pt-BR')} às {formatDate(ticket.dataCreacao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
              <span className="flex items-center"><i className="ri-list-unordered mr-1"></i>{ticket.itens.length} itens</span>
            </div>
            <div className="mt-2 text-xs text-gray-400">
                <span className="flex items-center"><i className="ri-user-line mr-1"></i>{ticket.responsavel}</span>
            </div>
          </div>
        ))}

        <div className="p-4 text-center">
            {isLoadingMore ? (
                <div className="flex justify-center items-center space-x-2 text-gray-400">
                    <LoadingSpinner size="sm" />
                    <span>Carregando...</span>
                </div>
            ) : hasMore ? (
                <button onClick={onLoadMore} className="btn-secondary w-full">
                    Carregar Mais
                </button>
            ) : (
                <p className="text-sm text-gray-500">Fim da lista de laudos.</p>
            )}
        </div>
        
        {filteredTickets.length === 0 && !pendingTicket && !isLoadingMore && (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <i className="ri-file-search-line text-4xl mb-3"></i>
                <p className="text-sm">{searchTerm || statusFilter !== 'all' ? "Nenhum laudo encontrado com os filtros." : "Nenhum laudo para exibir."}</p>
            </div>
        )}
      </div>
    </div>
  );
}