// src/components/ToastContainer.tsx
import Toast, { type ToastProps } from './Toast';

interface ToastData extends Omit<ToastProps, 'onClose'> {
  id: string;
}

interface ToastContainerProps {
  toasts: ToastData[];
  onRemove: (id: string) => void;
}

export default function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          {...toast}
          onClose={onRemove}
        />
      ))}
    </div>
  );
}