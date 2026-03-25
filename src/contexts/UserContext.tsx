// src/contexts/UserContext.tsx
import { createContext, useContext, useState, useEffect, type ReactNode, useCallback, useMemo } from 'react';

interface User {
  id: string;
  nome: string;
  email: string;
  tipo: 'admin' | 'usuario';
  ativo: boolean;
  dataCriacao: string;
}

interface UserContextType {
  user: User | null;
  login: (userData: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const USER_STORAGE_KEY = 'sistema_laudos_user';

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem(USER_STORAGE_KEY);
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        if (userData && userData.id && userData.nome && userData.email) {
          setUser(userData);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados do utilizador:', error);
      localStorage.removeItem(USER_STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback((userData: User) => {
    try {
      setUser(userData);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
    } catch (error) {
      console.error('Erro ao salvar dados do utilizador:', error);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(USER_STORAGE_KEY);
  }, []);

  const value = useMemo(() => ({
    user,
    login,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.tipo === 'admin',
    isLoading
  }), [user, isLoading, login, logout]);

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser deve ser usado dentro de um UserProvider');
  }
  return context;
}