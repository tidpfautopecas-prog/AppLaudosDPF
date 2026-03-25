// src/pages/dashboard/page.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext';
import DarkModeToggle from '../../components/DarkModeToggle';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function Dashboard() {
  const { user, logout, isAuthenticated, isAdmin } = useUser();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else {
      setIsLoading(false);
    }
  }, [isAuthenticated, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-gray-600 dark:text-gray-400 mt-4">Carregando painel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="nav-header">
        <div className="nav-content">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-white dark:bg-slate-700 rounded-xl flex items-center justify-center p-2 shadow-soft">
              <img
                src="https://static.readdy.ai/image/1b79fa8aad542b1373c756b32b7eeb63/51ad8b8951f238d939c10f8afdcbed6f.png"
                alt="Global Plastic Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Sistema de Laudos</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">Global Plastic</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <DarkModeToggle />
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.nome}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">{isAdmin ? 'Administrador' : 'Usuário'}</p>
              </div>
              <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center">
                <i className="ri-shield-user-line text-white text-sm"></i>
              </div>
            </div>
            <button onClick={handleLogout} className="btn-danger btn-sm hover-lift">
              <i className="ri-logout-box-line"></i>
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </div>

      <div className="container-responsive py-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 animate-fade-in">
          Bem-vindo, {user?.nome?.split(' ')[0]}!
        </h2>

        {/* Seções Principais (Laudos Técnicos, Gerenciar Usuários) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 animate-scale-in">
          <div
            onClick={() => navigate('/laudos?action=nova-devolucao')}
            className="card-feature group cursor-pointer hover-lift"
          >
            <div className="flex items-center space-x-4">
              <div className="icon-wrapper icon-blue">
                <i className="ri-file-text-line text-2xl"></i>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  Laudos Técnicos
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Gerenciar laudos e relatórios técnicos
                </p>
              </div>
            </div>
            <i className="ri-arrow-right-line text-xl text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"></i>
          </div>

          {isAdmin && (
            <div
              onClick={() => navigate('/usuarios')}
              className="card-feature group cursor-pointer hover-lift"
            >
              <div className="flex items-center space-x-4">
                <div className="icon-wrapper icon-purple">
                  <i className="ri-user-settings-line text-2xl"></i>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    Gerenciar Usuários
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Administrar usuários do sistema
                  </p>
                </div>
              </div>
              <i className="ri-arrow-right-line text-xl text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors"></i>
            </div>
          )}
        </div>

        {/* // ✅ Cartões de Métricas Removidos/Comentados (não há mais esse bloco) */}

        {/* Seção de Ações Rápidas */}
        <div className="animate-fade-in delay-200">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Ações Rápidas</h2>
          <div className="flex flex-wrap gap-4">
            {/* O botão 'Criar Laudo' foi removido daqui */}
            <button onClick={() => navigate('/relatorios')} className="btn-secondary hover-glow">
              <i className="ri-bar-chart-2-line"></i>
              <span>Relatórios</span>
            </button>
            <button className="btn-secondary hover-glow">
              <i className="ri-settings-3-line"></i>
              <span>Configurações</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}