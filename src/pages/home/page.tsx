import { useNavigate } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext';
import { useToastContext } from '../../contexts/ToastContext';
import DarkModeToggle from '../../components/DarkModeToggle';

export default function Home() {
  const { logout, isAdmin } = useUser();
  const navigate = useNavigate();
  const toast = useToastContext();

  const handleLogout = () => {
    logout();
    toast.info('Logout realizado', 'Até logo!');
    navigate('/login');
  };

  const menuItems = [
    {
      title: 'Criar Laudo',
      description: 'Gerenciar laudos técnicos',
      icon: 'ri-file-text-line',
      path: '/laudos',
      color: 'from-blue-700 to-blue-900',
      available: true
    },
    {
      title: 'Gerenciar Usuários',
      description: 'Administração de acessos',
      icon: 'ri-team-line',
      path: '/usuarios',
      color: 'from-slate-700 to-slate-900',
      available: isAdmin
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="nav-header bg-white dark:bg-slate-800 border-b border-blue-900/10">
        <div className="nav-content px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-white dark:bg-slate-700 rounded-xl p-2 shadow-sm">
              <img 
                alt="DPF AUTO PEÇAS LTDA Logo" 
                className="w-full h-full object-contain" 
                src="https://i.postimg.cc/bJ3kwSbw/DPF.png" 
              />
            </div>
            <div>
              <h1 className="text-lg font-bold dark:text-white">DPF AUTO PEÇAS LTDA</h1>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <DarkModeToggle />
            <button onClick={handleLogout} className="text-red-500 hover:text-red-700 font-medium">Sair</button>
          </div>
        </div>
      </div>

      <div className="container mx-auto py-12 px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {menuItems.map((item) => item.available && (
            <div 
              key={item.path} 
              onClick={() => navigate(item.path)}
              className="p-8 bg-white dark:bg-slate-800 rounded-2xl shadow-xl cursor-pointer hover:scale-[1.02] transition-transform border-l-8 border-blue-900"
            >
              <div className={`w-14 h-14 rounded-full bg-gradient-to-r ${item.color} flex items-center justify-center mb-4`}>
                <i className={`${item.icon} text-white text-2xl`}></i>
              </div>
              <h3 className="text-xl font-bold mb-2 dark:text-white">{item.title}</h3>
              <p className="text-gray-600 dark:text-gray-400">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}