
import { useState, useEffect } from 'react';
import { pdfGenerator } from '../utils/pdfGenerator';

interface SharePointModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (config: { siteUrl: string; libraryName: string }) => void;
}

export default function SharePointModal({ isOpen, onClose, onConfirm }: SharePointModalProps) {
  const [siteUrl, setSiteUrl] = useState('');
  const [libraryName, setLibraryName] = useState('');
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const savedConfig = pdfGenerator.getSharePointConfig();
      if (savedConfig) {
        setSiteUrl(savedConfig.siteUrl);
        setLibraryName(savedConfig.libraryName);
      } else {
        setSiteUrl('https://suaempresa.sharepoint.com/sites/laudos');
        setLibraryName('Documentos');
      }
    }
  }, [isOpen]);

  const validateConfig = (url: string, library: string): boolean => {
    // Validar URL do SharePoint
    const sharePointPattern = /^https:\/\/[^\/]+\.sharepoint\.com\/sites\/[^\/]+$/;
    return sharePointPattern.test(url) && library.trim().length > 0;
  };

  const handleConfirm = async () => {
    if (!siteUrl.trim() || !libraryName.trim()) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (!validateConfig(siteUrl, libraryName)) {
      alert('URL do SharePoint inválida. Use o formato:\nhttps://suaempresa.sharepoint.com/sites/nomedosite');
      return;
    }

    setIsValidating(true);
    
    // Simular validação da conexão
    setTimeout(() => {
      setIsValidating(false);
      
      const config = { siteUrl, libraryName };
      
      if (saveAsDefault) {
        pdfGenerator.setSharePointConfig(siteUrl, libraryName);
      }
      
      onConfirm(config);
    }, 1000);
  };

  const configExamples = [
    'https://globalplastic.sharepoint.com/sites/laudos',
    'https://suaempresa.sharepoint.com/sites/documentos',
    'https://empresa.sharepoint.com/sites/qualidade'
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg border border-orange-500/20">
        <div className="p-6 border-b border-orange-500/20">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <i className="ri-cloud-line text-blue-400"></i>
            </div>
            <h3 className="text-lg font-semibold text-white">
              Configurar SharePoint
            </h3>
          </div>
          <p className="text-sm text-gray-300 mt-2">
            Configure a integração com o SharePoint para salvar os PDFs automaticamente
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              URL do Site SharePoint *
            </label>
            <input
              type="text"
              value={siteUrl}
              onChange={(e) => setSiteUrl(e.target.value)}
              placeholder="https://suaempresa.sharepoint.com/sites/laudos"
              className="w-full px-3 py-2 bg-slate-700/50 border border-orange-500/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nome da Biblioteca *
            </label>
            <input
              type="text"
              value={libraryName}
              onChange={(e) => setLibraryName(e.target.value)}
              placeholder="Documentos"
              className="w-full px-3 py-2 bg-slate-700/50 border border-orange-500/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-400">
              Nome da biblioteca de documentos onde os PDFs serão salvos
            </p>
          </div>

          <div className="mt-2 text-xs text-gray-400">
            <p className="mb-1">Exemplos de URLs válidas:</p>
            <ul className="space-y-1">
              {configExamples.map((example, index) => (
                <li key={index} className="flex items-center space-x-2">
                  <i className="ri-arrow-right-s-line text-orange-400"></i>
                  <code 
                    className="bg-slate-700/50 px-2 py-0.5 rounded text-orange-300 cursor-pointer hover:bg-slate-700"
                    onClick={() => setSiteUrl(example)}
                  >
                    {example}
                  </code>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="saveAsDefault"
              checked={saveAsDefault}
              onChange={(e) => setSaveAsDefault(e.target.checked)}
              className="w-4 h-4 text-orange-500 bg-slate-700 border-orange-500/20 rounded focus:ring-orange-500 focus:ring-2"
            />
            <label htmlFor="saveAsDefault" className="text-sm text-gray-300 cursor-pointer">
              Salvar como configuração padrão
            </label>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
            <div className="flex">
              <i className="ri-information-line text-blue-400 mr-2 mt-0.5"></i>
              <div className="text-sm text-blue-300">
                <p className="font-medium">Importante:</p>
                <p>Certifique-se de que você tem permissões de escrita na biblioteca do SharePoint e que está logado no Office 365.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex space-x-3 p-6 border-t border-orange-500/20">
          <button
            type="button"
            onClick={onClose}
            disabled={isValidating}
            className="flex-1 px-4 py-2 bg-slate-700 text-gray-300 rounded-lg hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirm({ siteUrl: '', libraryName: '' })}
            disabled={isValidating}
            className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            <i className="ri-download-line"></i>
            <span>Download Local</span>
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isValidating || !siteUrl.trim() || !libraryName.trim()}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isValidating ? (
              <>
                <i className="ri-loader-4-line animate-spin"></i>
                <span>Conectando...</span>
              </>
            ) : (
              <>
                <i className="ri-cloud-line"></i>
                <span>Salvar no SharePoint</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}