// src/pages/settings/page.tsx
import { useState, useEffect, useRef } from 'react';
import type { AppSettings } from '../../utils/settingsService';
import { getSettings, saveSettings, defaultSettings } from '../../utils/settingsService';
import PageHeader from '../../components/PageHeader';
import { useToastContext } from '../../contexts/ToastContext';
import LoadingSpinner, { LoadingButton } from '../../components/LoadingSpinner';
import { supabase } from '../../utils/supabaseClient';
import type { Ticket } from '../laudos/page'; 
import { pdfGenerator } from '../../utils/pdfGenerator';
import SharePointLogModal from '../../components/SharePointLogModal';

type PingStatus = 'idle' | 'loading' | 'success' | 'error';

interface PingResult {
  status: PingStatus;
  message: string;
  latency?: number;
}

interface LogEntry {
  id: string;
  timestamp: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  fileName?: string;
}

function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export default function Settings() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [pingResult, setPingResult] = useState<PingResult>({ status: 'idle', message: '' });
  const toast = useToastContext();

  // Monitoramento
  const [storageUsage, setStorageUsage] = useState<string | null>(null);
  const [isCheckingUsage, setIsCheckingUsage] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [databaseUsage, setDatabaseUsage] = useState<any | null>(null); 
  const [isCheckingDbUsage, setIsCheckingDbUsage] = useState(false);
  const [dbUsageError, setDbUsageError] = useState<string | null>(null);

  // Sincronização e Logs
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0, errors: 0 });
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false); 

  // Estado para limpeza da lista
  const [isClearingList, setIsClearingList] = useState(false);

  useEffect(() => {
    const loadedSettings = getSettings();
    setSettings(loadedSettings);
    checkStorageUsage();
    checkDatabaseUsage();
  }, []);

  const togglePause = () => {
    const newState = !isPausedRef.current;
    isPausedRef.current = newState;
    setIsPaused(newState);
  };

  const addLogEntry = (type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string) => {
    const newLog: LogEntry = {
      id: Date.now().toString() + Math.random().toString(),
      timestamp: new Date().toISOString(),
      type,
      title,
      message
    };
    const existingLogs = JSON.parse(localStorage.getItem('sharepoint_logs') || '[]');
    const updatedLogs = [newLog, ...existingLogs].slice(0, 5000); 
    localStorage.setItem('sharepoint_logs', JSON.stringify(updatedLogs));
  };

  const checkStorageUsage = async () => {
    setIsCheckingUsage(true);
    setStorageError(null);
    const { data, error } = await supabase.rpc('get_storage_usage');
    if (error) {
      setStorageError("Não foi possível buscar os dados.");
      setStorageUsage(null);
    } else {
      setStorageUsage(formatBytes(data || 0));
    }
    setIsCheckingUsage(false);
  };

  const checkDatabaseUsage = async () => {
    setIsCheckingDbUsage(true);
    setDbUsageError(null);
    const { data, error } = await supabase.rpc('get_database_usage');
    if (error) {
      if (error.message.includes("Acesso não autorizado")) {
        setDbUsageError("Apenas administradores podem ver esta informação.");
      } else {
        setDbUsageError(error.message || "Falha ao buscar dados.");
      }
      setDatabaseUsage(null);
    } else {
      setDatabaseUsage(data);
    }
    setIsCheckingDbUsage(false);
  };

  const handleClearSharePointList = async () => {
    const confirm1 = window.confirm("⚠️ PERIGO: Isso apagará TODOS os itens da lista do SharePoint.\n\nOs laudos no aplicativo NÃO serão afetados, apenas a lista remota.\n\nDeseja continuar?");
    if (!confirm1) return;

    const confirm2 = window.confirm("Tem certeza absoluta? Essa ação não pode ser desfeita.");
    if (!confirm2) return;

    setIsClearingList(true);
    addLogEntry('warning', 'Limpeza Iniciada', 'Usuário iniciou a limpeza total da lista do SharePoint.');

    try {
        await pdfGenerator.clearSharePointList();
        toast.success("Lista Limpa", "Todos os itens foram removidos do SharePoint.");
        addLogEntry('success', 'Lista Limpa', 'Operação de limpeza concluída com sucesso.');
    } catch (error: any) {
        console.error("Erro ao limpar lista:", error);
        addLogEntry('error', 'Falha na Limpeza', error.message || 'Erro desconhecido.');
    } finally {
        setIsClearingList(false);
    }
  };

  const handleSyncLegacyLaudos = async () => {
    if (!confirm("Isso iniciará a sincronização inteligente (apenas novos ou faltantes).\nDeseja continuar?")) {
      return;
    }

    setIsSyncing(true);
    isPausedRef.current = false;
    setIsPaused(false);
    setSyncProgress({ current: 0, total: 0, errors: 0 });
    addLogEntry('info', 'Início Sincronização', 'Verificando laudos...');

    try {
      toast.info("Iniciando...", "Buscando laudos no banco de dados.");

      const { data: laudosData, error } = await supabase
        .from('laudos')
        .select('*, laudos_itens(*)', { count: 'exact' })
        .order('data_criacao', { ascending: false });

      if (error) throw error;
      if (!laudosData || laudosData.length === 0) {
        toast.warning("Atenção", "Nenhum laudo encontrado para sincronizar.");
        addLogEntry('warning', 'Sincronização Cancelada', 'Nenhum laudo encontrado no banco.');
        setIsSyncing(false);
        return;
      }

      const ticketsToSync = laudosData.map(laudo => ({
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

      setSyncProgress({ current: 0, total: ticketsToSync.length, errors: 0 });

      let updatedCount = 0;
      let errorCount = 0;

      for (let i = 0; i < ticketsToSync.length; i++) {
        while (isPausedRef.current) {
            await new Promise(r => setTimeout(r, 500));
        }

        const ticket = ticketsToSync[i];
        
        try {
          // ✅ CHAMA O SMART SYNC
          const resultMsg = await pdfGenerator.syncSmartTicket(ticket);
          
          if (resultMsg.includes('Ignorado')) {
             // Ignorado (não conta como erro nem sucesso de envio, apenas ignora)
          } else {
             updatedCount++;
             addLogEntry('success', `Atualizado: ${ticket.numero}`, resultMsg);
          }
        } catch (err: any) {
          console.error(`Falha no ticket ${ticket.numero}`, err);
          errorCount++;
          addLogEntry('error', `Falha: ${ticket.numero}`, err.message || 'Erro desconhecido');
        }

        setSyncProgress(prev => ({ ...prev, current: i + 1, errors: errorCount }));
        await new Promise(r => setTimeout(r, 200));
      }

      const resultMessage = `Finalizado. ${updatedCount} laudos atualizados/enviados.`;
      if (errorCount === 0) {
        toast.success("Sincronização Finalizada", resultMessage);
        addLogEntry('success', 'Sincronização Finalizada', resultMessage);
      } else {
        toast.warning("Sincronização Parcial", `${errorCount} erros.`);
        addLogEntry('warning', 'Sincronização Parcial', resultMessage);
      }

    } catch (error: any) {
      console.error("Erro fatal na sincronização:", error);
      toast.error("Erro Crítico", error.message);
      addLogEntry('error', 'Erro Crítico na Sincronização', error.message);
    } finally {
      setIsSyncing(false);
      setIsPaused(false);
      isPausedRef.current = false;
    }
  };

  const handleInputChange = (field: keyof AppSettings, value: string) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    setIsSaving(true);
    try {
      saveSettings(settings);
      toast.success('Configurações Salvas!', 'Alterações aplicadas.');
    } catch (error) {
      toast.error('Erro ao Salvar', 'Não foi possível salvar.');
    } finally {
      setTimeout(() => setIsSaving(false), 500);
    }
  };

  const handlePingApi = async () => {
    setPingResult({ status: 'loading', message: 'Testando...' });
    const startTime = Date.now();
    try {
      await fetch(settings.sharepointApiUrl, { mode: 'no-cors' });
      const latency = Date.now() - startTime;
      setPingResult({ status: 'success', message: 'API Online', latency });
    } catch (error) {
      setPingResult({ status: 'error', message: 'Falha na conexão', latency: Date.now() - startTime });
    }
  };
  
  const getPingStatusColor = () => {
    switch(pingResult.status) {
        case 'success': return 'text-green-400';
        case 'error': return 'text-red-400';
        case 'loading': return 'text-blue-400';
        default: return 'text-gray-500';
    }
  };

  const StatRow = ({ label, value, loading }: { label: string, value: string | number | undefined, loading: boolean }) => (
    <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-slate-700">
      <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      {loading ? <LoadingSpinner size="sm" color="gray" /> : <span className="font-medium text-gray-900 dark:text-gray-200">{typeof value === 'number' ? formatBytes(value) : value}</span>}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <PageHeader title="Configurações" subtitle="Administração" iconClass="ri-settings-3-line" />

      <div className="container-responsive py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 space-y-8">
            
            {/* Card Storage */}
            <div className="card animate-scale-in" style={{ animationDelay: '100ms' }}>
              <div className="card-header">
                <div className="flex items-center space-x-3">
                  <i className="ri-hard-drive-2-line text-xl text-orange-500"></i>
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Storage (Fotos)</h2>
                </div>
              </div>
              <div className="card-body">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                  <div>
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Espaço Utilizado</span>
                    {isCheckingUsage ? <LoadingSpinner size="sm" className="mt-2" /> : storageError ? <span className="text-red-500 text-sm block mt-1">{storageError}</span> : <span className="text-3xl font-bold text-gray-900 dark:text-white mt-1 block">{storageUsage}</span>}
                  </div>
                  <button onClick={checkStorageUsage} disabled={isCheckingUsage} className="btn-secondary px-3 py-2 text-sm">
                    <i className="ri-refresh-line text-lg"></i>
                  </button>
                </div>
              </div>
            </div>

            {/* Card Database */}
            <div className="card animate-scale-in" style={{ animationDelay: '200ms' }}>
              <div className="card-header">
                <div className="flex items-center space-x-3">
                  <i className="ri-database-2-line text-xl text-orange-500"></i>
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Banco de Dados</h2>
                </div>
              </div>
              <div className="card-body">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Tamanho das Tabelas</h3>
                    <button onClick={checkDatabaseUsage} disabled={isCheckingDbUsage} className="btn-secondary px-3 py-2 text-sm"><i className="ri-refresh-line"></i></button>
                </div>
                {dbUsageError ? <p className="text-red-500 text-sm">{dbUsageError}</p> : (
                    <div className="space-y-1 mt-2">
                        <StatRow label="Total" value={databaseUsage?.total_database_size} loading={isCheckingDbUsage} />
                        <StatRow label="Laudos" value={databaseUsage?.laudos_table_size} loading={isCheckingDbUsage} />
                        <StatRow label="Itens" value={databaseUsage?.laudos_itens_table_size} loading={isCheckingDbUsage} />
                    </div>
                )}
              </div>
            </div>
            
            {/* Card API */}
            <div className="card animate-scale-in" style={{ animationDelay: '300ms' }}>
              <div className="card-header">
                <div className="flex items-center space-x-3">
                  <i className="ri-cloud-line text-xl text-orange-500"></i>
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">API SharePoint</h2>
                </div>
              </div>
              <div className="card-body space-y-4">
                <div className="flex items-center space-x-2">
                    <input type="url" value={settings.sharepointApiUrl} onChange={(e) => handleInputChange('sharepointApiUrl', e.target.value)} className="input-field flex-1" />
                    <button onClick={handlePingApi} disabled={pingResult.status === 'loading'} className="btn-secondary px-3"><i className="ri-wireless-charging-line"></i></button>
                </div>
                {pingResult.status !== 'idle' && <div className={`text-sm ${getPingStatusColor()}`}>{pingResult.message} {pingResult.latency && `(${pingResult.latency}ms)`}</div>}
              </div>
            </div>

            {/* ✅ CARD DE SINCRONIZAÇÃO COM PAUSA E LIMPEZA */}
            <div className="card animate-scale-in" style={{ animationDelay: '350ms' }}>
              <div className="card-header">
                <div className="flex items-center space-x-3">
                  <i className="ri-refresh-line text-xl text-orange-500"></i>
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Sincronizar Legado</h2>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Envie todos os laudos antigos para a lista e verifique o log.
                </p>
              </div>
              <div className="card-body">
                {!isSyncing ? (
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row justify-center gap-3">
                        <button onClick={handleSyncLegacyLaudos} disabled={isClearingList} className="btn-primary flex-1">
                            <i className="ri-database-2-line mr-2"></i>
                            Sincronizar Tudo
                        </button>
                        <button onClick={() => setIsLogOpen(true)} className="btn-secondary">
                            <i className="ri-file-list-3-line mr-2"></i>
                            Ver Logs / Histórico
                        </button>
                    </div>
                    
                    <div className="border-t border-gray-700 pt-4 mt-2">
                        <button 
                            onClick={handleClearSharePointList} 
                            disabled={isClearingList}
                            className="w-full btn-danger bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30"
                        >
                            {isClearingList ? (
                                <><LoadingSpinner size="sm" color="white" className="mr-2"/> Limpando Lista...</>
                            ) : (
                                <><i className="ri-delete-bin-2-line mr-2"></i> Apagar TODOS os dados da Lista SharePoint</>
                            )}
                        </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm font-medium text-gray-700 dark:text-gray-200">
                      <span>Progresso</span>
                      <span>{Math.round((syncProgress.current / syncProgress.total) * 100)}%</span>
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-slate-700">
                      <div 
                        className={`h-2.5 rounded-full transition-all duration-300 ${isPaused ? 'bg-yellow-500' : 'bg-orange-500'}`}
                        style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
                      ></div>
                    </div>

                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>{syncProgress.current} de {syncProgress.total} laudos</span>
                      {syncProgress.errors > 0 && <span className="text-red-500 font-bold">Erros: {syncProgress.errors}</span>}
                    </div>

                    <div className="flex items-center justify-center space-x-4 mt-2">
                        <button 
                            onClick={togglePause}
                            className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                                isPaused 
                                ? 'bg-green-500 text-white hover:bg-green-600' 
                                : 'bg-yellow-500 text-white hover:bg-yellow-600'
                            }`}
                        >
                            {isPaused ? (
                                <><i className="ri-play-fill mr-2"></i>Continuar</>
                            ) : (
                                <><i className="ri-pause-fill mr-2"></i>Pausar</>
                            )}
                        </button>
                        
                        {!isPaused && <LoadingSpinner size="sm" />}
                        {isPaused && <span className="text-sm text-yellow-500 font-medium">Pausado</span>}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Card Personalização */}
            <div className="card animate-scale-in" style={{ animationDelay: '400ms' }}>
              <div className="card-body">
                 <div className="form-group">
                  <label className="label">Formato do Nome do Arquivo</label>
                  <input type="text" value={settings.defaultFileNameFormat} onChange={(e) => handleInputChange('defaultFileNameFormat', e.target.value)} className="input-field font-mono" />
                </div>
              </div>
            </div>
          </div>

          {/* Card Salvar */}
          <div className="lg:col-span-1">
            <div className="card sticky top-24 animate-scale-in" style={{ animationDelay: '500ms' }}>
              <div className="card-body text-center">
                 <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Ações</h3>
                 <LoadingButton isLoading={isSaving} onClick={handleSave} className="w-full btn-lg">Salvar Configurações</LoadingButton>
              </div>
            </div>
          </div>
        </div>
      </div>

      <SharePointLogModal isOpen={isLogOpen} onClose={() => setIsLogOpen(false)} />
    </div>
  );
}