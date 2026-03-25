
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';

// Rotas que não precisam de autenticação
const PUBLIC_ROUTES = ['/login'];

// Rotas que precisam de privilégios de admin
const ADMIN_ROUTES = ['/usuarios'];

export function useAuth() {
  const { isAuthenticated, isAdmin, isLoading } = useUser();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Aguardar carregamento dos dados do usuário
    if (isLoading) return;

    const currentPath = location.pathname;
    const isPublicRoute = PUBLIC_ROUTES.includes(currentPath);
    const isAdminRoute = ADMIN_ROUTES.includes(currentPath);

    // Se não está autenticado e não está em rota pública
    if (!isAuthenticated && !isPublicRoute) {
      navigate('/login', { 
        replace: true,
        state: { from: currentPath }
      });
      return;
    }

    // Se está autenticado e está na página de login
    if (isAuthenticated && currentPath === '/login') {
      const from = location.state?.from || '/';
      navigate(from, { replace: true });
      return;
    }

    // Se está tentando acessar rota de admin sem ser admin
    if (isAuthenticated && isAdminRoute && !isAdmin) {
      navigate('/', { replace: true });
      return;
    }
  }, [isAuthenticated, isAdmin, isLoading, navigate, location]);

  return {
    isAuthenticated,
    isAdmin,
    isLoading,
    canAccessAdminRoutes: isAuthenticated && isAdmin,
  };
}
