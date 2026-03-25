import type { RouteObject } from 'react-router-dom';
import Home from '../pages/home/page';
import Login from '../pages/login/page';
import Laudos from '../pages/laudos/page';
import Usuarios from '../pages/usuarios/page';
import NotFound from '../pages/NotFound';
import Relatorios from '../pages/relatorios/page';
import ProtectedRoute from '../components/ProtectedRoute';
import Settings from '../pages/settings/page'; // 1. Importar a nova página

const routes: RouteObject[] = [
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <Home />
      </ProtectedRoute>
    )
  },
  {
    path: '/home',
    element: (
      <ProtectedRoute>
        <Home />
      </ProtectedRoute>
    )
  },
  {
    path: '/login',
    element: <Login />
  },
  {
    path: '/laudos',
    element: (
      <ProtectedRoute>
        <Laudos />
      </ProtectedRoute>
    )
  },
  {
    path: '/usuarios',
    element: (
      <ProtectedRoute requireAdmin>
        <Usuarios />
      </ProtectedRoute>
    )
  },
  {
    path: '/relatorios',
    element: (
      <ProtectedRoute>
        <Relatorios />
      </ProtectedRoute>
    )
  },
  // 2. Adicionar nova rota protegida para administradores
  {
    path: '/settings',
    element: (
      <ProtectedRoute requireAdmin>
        <Settings />
      </ProtectedRoute>
    )
  },
  {
    path: '*',
    element: <NotFound />
  }
];

export default routes;