// src/components/SharePointLogModal.tsx

import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx'; // ✅ Biblioteca para gerar o Excel

interface LogEntry {
  id: string;
  timestamp: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  fileName?: string;
}

interface SharePointLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SharePointLogModal({ isOpen, onClose }: SharePointLogModalProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    if (isOpen) {
      // Carregar logs do localStorage
      const savedLogs = localStorage.getItem('sharepoint_logs');
      if (savedLogs) {
        setLogs(JSON.parse(savedLogs));
      }
    }
  }, [isOpen]);

  const clearLogs = () => {
    if (confirm('Tem certeza que deseja limpar o histórico de logs?')) {
      setLogs([]);
      localStorage.removeItem('sharepoint_logs');
    }
  };

  // ✅ Nova Função: Exportar para Excel
  const exportToExcel = () => {
    if (logs.length === 0) {
        alert("Não há logs para exportar.");
        return;
    }

    // Formata os dados para o Excel
    const dataToExport = logs.map(log => {
        // Limpa o título para pegar só o número do ticket quando possível
        let ticket = log.title;
        ticket = ticket.replace('Sincronizado: ', '').replace('Falha: ', '');

        return {
            'Ticket / Evento': ticket, // Coluna principal com o número
            'Status': log.type === 'success' ? 'Sucesso' : (log.type === 'error' ? 'Erro' : 'Info'),
            'Mensagem Detalhada': log.message || '',
            'Data e Hora': new Date(log.timestamp).toLocaleString('pt-BR')
        };
    });

    // Cria a planilha
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(dataToExport);

    // Define largura das colunas para ficar bonito
    ws['!cols'] = [
        { wch: 25 }, // Largura Ticket
        { wch: 10 }, // Largura Status
        { wch: 50 }, // Largura Mensagem
        { wch: 20 }  // Largura Data
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Histórico Sincronização");
    
    // Baixa o arquivo
    const fileName = `Log_SharePoint_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const getIconForType = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return 'ri-check-line text-green-400';
      case 'error': return 'ri-close-line text-red-400';
      case 'warning': return 'ri-alert-line text-yellow-400';
      case 'info': return 'ri-information-line text-blue-400';
      default: return 'ri-information-line text-gray-400';
    }
  };

  const getColorForType = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return 'border-green-500/20 bg-green-500/10';
      case 'error': return 'border-red-500/20 bg-red-500/10';
      case 'warning': return 'border-yellow-500/20 bg-yellow-500/10';
      case 'info': return 'border-blue-500/20 bg-blue-500/10';
      default: return 'border-gray-500/20 bg-gray-500/10';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] border border-orange-500/20 flex flex-col">
        
        {/* Header */}
        <div className="p-6 border-b border-orange-500/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <i className="ri-file-list-3-line text-blue-400"></i>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Log do SharePoint</h3>
                <p className="text-sm text-gray-300">Histórico de operações</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* ✅ Botão de Exportar Excel */}
              <button
                onClick={exportToExcel}
                className="px-3 py-1.5 bg-green-600/20 text-green-300 rounded-lg text-sm hover:bg-green-600/30 transition-colors border border-green-500/20 flex items-center"
                title="Baixar Excel"
              >
                <i className="ri-file-excel-2-line mr-1"></i>
                Exportar XLSX
              </button>

              <button
                onClick={clearLogs}
                className="px-3 py-1.5 bg-red-600/20 text-red-300 rounded-lg text-sm hover:bg-red-600/30 transition-colors border border-red-500/20 flex items-center"
              >
                <i className="ri-delete-bin-line mr-1"></i>
                Limpar
              </button>
              
              <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-1">
                <i className="ri-close-line text-2xl"></i>
              </button>
            </div>
          </div>
        </div>

        {/* Lista de Logs */}
        <div className="flex-1 overflow-y-auto p-6">
          {logs.length > 0 ? (
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className={`rounded-lg border p-4 ${getColorForType(log.type)}`}>
                  <div className="flex items-start space-x-3">
                    <i className={`${getIconForType(log.type)} text-lg mt-0.5`}></i>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-white text-sm">{log.title}</h4>
                        <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                          {new Date(log.timestamp).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      {log.message && <p className="text-sm text-gray-300 whitespace-pre-line">{log.message}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <i className="ri-file-list-3-line text-6xl mb-4 opacity-50"></i>
              <p className="text-lg font-medium mb-2">Nenhum log disponível</p>
              <p className="text-sm text-center opacity-70">
                Execute a sincronização na tela de configurações para ver os resultados aqui.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-orange-500/20 bg-slate-800/50">
          <div className="flex flex-wrap items-center justify-between text-sm text-gray-400 gap-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1"><i className="ri-check-line text-green-400"></i><span>Sucesso</span></div>
              <div className="flex items-center space-x-1"><i className="ri-close-line text-red-400"></i><span>Erro</span></div>
            </div>
            <span>Total: {logs.length} entradas</span>
          </div>
        </div>
      </div>
    </div>
  );
}