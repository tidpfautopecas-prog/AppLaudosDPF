import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import DarkModeToggle from './DarkModeToggle';

interface PageHeaderProps {
  title: string;
  subtitle: string;
  iconClass: string;
}

export default function PageHeader({ title, subtitle, iconClass }: PageHeaderProps) {
  const navigate = useNavigate();
  const { user, logout } = useUser();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="nav-header">
      <div className="nav-content">
        <div className="flex items-center space-x-4">
          <button onClick={() => navigate('/')} className="btn-ghost p-2 hover-lift">
            <i className="ri-arrow-left-line text-xl"></i>
          </button>
          <div className="w-10 h-10 bg-white dark:bg-slate-700 rounded-xl flex items-center justify-center p-2 shadow-soft">
            <img
              alt="DPF AUTO PEÇAS LTDA Logo"
              className="w-full h-full object-contain"
              src="https://i.postimg.cc/bJ3kwSbw/DPF.png"
            />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <DarkModeToggle />
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.nome}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {user?.tipo === 'admin' ? 'Administrador' : 'Usuário'}
              </p>
            </div>
            <div className="w-8 h-8 bg-gradient-to-r from-blue-800 to-blue-900 rounded-full flex items-center justify-center">
              <i className={`${iconClass} text-white text-sm`}></i>
            </div>
          </div>
          <button onClick={handleLogout} className="btn-danger btn-sm hover-lift">
            <i className="ri-logout-box-line"></i>
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </div>
    </div>
  );
}