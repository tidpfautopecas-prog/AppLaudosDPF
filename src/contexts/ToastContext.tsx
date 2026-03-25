// src/contexts/ToastContext.tsx
import { createContext, useContext, type ReactNode, useState, useCallback, useMemo } from 'react';
import ToastContainer from '../components/ToastContainer';
import type { ToastProps } from '../components/Toast';

interface ToastData extends Omit<ToastProps, 'onClose'> {
  id: string;
}

interface ToastContextType {
  success: (title: string, message?: string, duration?: number) => void;
  error: (title: string, message?: string, duration?: number) => void;
  warning: (title: string, message?: string, duration?: number) => void;
  info: (title: string, message?: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback((type: ToastProps['type'], title: string, message?: string, duration?: number) => {
    setToasts(prev => [...prev, { id: `toast-${++toastId}`, type, title, message, duration }]);
  }, []);

  const success = useCallback((title: string, message?: string, duration?: number) => addToast('success', title, message, duration), [addToast]);
  const error = useCallback((title: string, message?: string, duration?: number) => addToast('error', title, message, duration), [addToast]);
  const warning = useCallback((title: string, message?: string, duration?: number) => addToast('warning', title, message, duration), [addToast]);
  const info = useCallback((title: string, message?: string, duration?: number) => addToast('info', title, message, duration), [addToast]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const contextValue = useMemo(() => ({
    success,
    error,
    warning,
    info,
  }), [success, error, warning, info]);
  
  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToastContext() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToastContext must be used within a ToastProvider');
  }
  return context;
}