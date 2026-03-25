import { useState, useEffect } from 'react';

export default function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowPrompt(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm">
      <div className="bg-gradient-to-r from-blue-800 to-blue-900 text-white rounded-lg shadow-2xl border border-blue-400/30 backdrop-blur-sm">
        <div className="p-4">
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <i className="ri-download-cloud-line text-xl"></i>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm mb-1">
                Instalar DPF AUTO PEÇAS LTDA
              </h3>
              <p className="text-xs text-blue-100 mb-3">
                Instale o app para acesso rápido e uso offline
              </p>
              <div className="flex space-x-2">
                <button onClick={() => setShowPrompt(false)} className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors">
                  Instalar
                </button>
                <button onClick={() => setShowPrompt(false)} className="text-blue-100 hover:text-white px-2 py-1.5 rounded text-xs transition-colors">
                  Dispensar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}