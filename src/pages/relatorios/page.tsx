// src/pages/relatorios/page.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import LoadingSpinner from '../../components/LoadingSpinner';
import { supabase } from '../../utils/supabaseClient'; // Importe o cliente Supabase

// ✅ REMOVIDO: A constante statusColors que causava o erro TS6133.

interface RelatorioDados {
  totalLaudos: number;
  laudosNovos: number;
  laudosEmAndamento: number;
  laudosConcluidos: number;
  totalItens: number;
  // A interface já corresponde ao retorno da nova RPC
  defeitosFrequentes: { item: string; codigo: string; descricao: string; quantidade: number }[];
  responsaveis: { nome: string; laudos: number }[];
  laudosPorMes: { mes: string; quantidade: number }[];
}


export default function Relatorios() {
  const { logout, isAuthenticated } = useUser();
  const navigate = useNavigate();
  const [dados, setDados] = useState<RelatorioDados | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // --- MELHORIA: Função otimizada para usar a RPC do Supabase ---
  const fetchRelatoriosData = async () => {
    try {
        // 1. Chama a função RPC 'get_defeitos_frequentes'
        const { data: defeitosData, error: defeitosError } = await supabase
            .rpc('get_defeitos_frequentes');
            
        if (defeitosError) throw defeitosError;

        // 2. (Opcional) Busca os outros dados agregados (total de laudos, etc.)
        // Esta parte pode ser expandida
        const { count: totalLaudos } = await supabase
            .from('laudos')
            .select('*', { count: 'exact', head: true });

        // 3. Formata os dados
        // O cast 'as any' é necessário porque o tipo da RPC não é perfeitamente inferido
        const defeitosFrequentes = (defeitosData as any || []) as RelatorioDados['defeitosFrequentes'];

        // 4. Preenche os dados do relatório 
        const finalData: RelatorioDados = {
            totalLaudos: totalLaudos || 0, 
            laudosNovos: 0, // Implementar lógica se necessário
            laudosEmAndamento: 0, // Implementar lógica se necessário
            laudosConcluidos: 0, // Implementar lógica se necessário
            totalItens: defeitosFrequentes.reduce((acc, d) => acc + d.quantidade, 0),
            defeitosFrequentes: defeitosFrequentes, 
            responsaveis: [], // Implementar lógica se necessário
            laudosPorMes: [], // Implementar lógica se necessário
        };
        
        setDados(finalData);

    } catch (error) {
        console.error("❌ Erro ao buscar dados reais do relatório:", error);
        setDados({
          totalLaudos: 0, laudosNovos: 0, laudosEmAndamento: 0, laudosConcluidos: 0, totalItens: 0,
          defeitosFrequentes: [], responsaveis: [], laudosPorMes: [],
        });
    }
  };
  // --- Fim da Melhoria ---


  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    // Chamada à nova função de busca de dados
    fetchRelatoriosData(); 
  }, [isAuthenticated, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const exportarParaPDF = async () => {
    if (!dados) return;
    setIsExporting(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      // Adicione aqui a lógica para incluir os dados reais no PDF
      pdf.text("Relatório de Laudos (Defeitos Mais Frequentes)", 10, 10);
      let y = 20;
      dados.defeitosFrequentes.forEach(defeito => {
        // Verifica se cabe na página
        if (y > 280) {
            pdf.addPage();
            y = 10;
        }
        const text = `N° Item: ${defeito.item} - ${defeito.codigo} - ${defeito.descricao}: ${defeito.quantidade}`;
        pdf.text(text, 10, y);
        y += 10;
      });

      const fileName = `Relatorio_Defeitos_${new Date().toISOString().split('T')[0]}.pdf`;
      
      pdf.save(fileName);
      alert(`✅ Relatório baixado localmente!\n\n📁 Arquivo: ${fileName}`);

    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setIsExporting(false);
      setShowExportModal(false);
    }
  };

    const exportarParaExcel = async () => {
    if (!dados) return;
    setIsExporting(true);
    try {
        const wb = XLSX.utils.book_new();
        // Incluir os dados de Defeitos Frequentes no Excel
        const ws = XLSX.utils.json_to_sheet(dados.defeitosFrequentes.map(d => ({
            'N° Item': d.item, // CAMPO JÁ EXISTENTE
            'Código': d.codigo,
            'Descrição': d.descricao,
            'Quantidade': d.quantidade
        })));
        XLSX.utils.book_append_sheet(wb, ws, "Defeitos Frequentes");
        
        const nomeArquivo = `Relatorio_Defeitos_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, nomeArquivo);
        alert(`✅ Arquivo Excel gerado!\n\n📁 Nome: ${nomeArquivo}`);
    } catch (error) {
        console.error('Erro ao gerar Excel:', error);
        alert(`❌ Erro ao gerar Excel.`);
    } finally {
        setIsExporting(false);
        setShowExportModal(false);
    }
  };


  if (!dados) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
        <p className="text-white ml-4">Carregando relatórios...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900">
      <div className="bg-slate-800 shadow-lg border-b border-orange-500/20 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
             <button onClick={() => navigate('/')} className="text-gray-400 hover:text-orange-400"><i className="ri-arrow-left-line text-xl"></i></button>
             <h1 className="text-xl font-bold text-white">Relatórios e Estatísticas</h1>
          </div>
          <div className="flex items-center space-x-4">
            <button onClick={() => setShowExportModal(true)} className="btn-success btn-sm"><i className="ri-download-line"></i><span>Exportar</span></button>
            <button onClick={handleLogout} className="btn-danger btn-sm"><i className="ri-logout-box-line"></i><span>Sair</span></button>
          </div>
        </div>
      </div>
      
      <div className="p-6 space-y-8">
         {/* Seção de Defeitos Frequentes */}
         <div className="animate-fade-in delay-100">
             <h2 className="text-2xl font-bold text-white mb-4">Defeitos Mais Frequentes</h2>
             <div className="card p-6 bg-slate-800/60 border border-orange-500/20">
                 <ul className="space-y-3">
                     {dados.defeitosFrequentes.length > 0 ? (
                         dados.defeitosFrequentes.map((defeito, index) => (
                            <li key={`${defeito.item}-${defeito.codigo}-${index}`} className="flex justify-between items-center text-white border-b border-slate-700/50 pb-2 last:border-b-0">
                                <span className="font-medium text-orange-300">
                                    N° Item: {defeito.item} - {defeito.codigo} - {defeito.descricao}
                                </span>
                                <span className="text-lg font-bold bg-orange-500/20 text-orange-300 px-3 py-1 rounded-full">{defeito.quantidade}</span>
                            </li>
                         ))
                     ) : (
                        <li className="text-gray-400 text-center py-4">Nenhum dado de defeito encontrado.</li>
                     )}
                 </ul>
             </div>
         </div>
         
         {/* (Outras seções de relatório podem ser adicionadas aqui) */}
         
      </div>
      
       {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-md border border-orange-500/20">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-white">Exportar Relatório</h3>
              <p className="text-sm text-gray-300 mt-2">Escolha o formato para exportar os dados.</p>
            </div>
            <div className="p-6 space-y-4">
              <button onClick={exportarParaPDF} disabled={isExporting} className="w-full btn-secondary">Exportar como PDF</button>
              <button onClick={exportarParaExcel} disabled={isExporting} className="w-full btn-secondary">Exportar como Excel</button>
               {isExporting && <p className="text-blue-300 text-sm">Gerando arquivo...</p>}
            </div>
            <div className="p-6 border-t border-orange-500/20">
              <button type="button" onClick={() => setShowExportModal(false)} disabled={isExporting} className="btn-secondary w-full">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}