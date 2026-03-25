
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'white' | 'gray';
  className?: string;
}

export default function LoadingSpinner({ 
  size = 'md', 
  color = 'primary', 
  className = '' 
}: LoadingSpinnerProps) {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-4 h-4';
      case 'md':
        return 'w-6 h-6';
      case 'lg':
        return 'w-8 h-8';
      default:
        return 'w-6 h-6';
    }
  };

  const getColorClasses = () => {
    switch (color) {
      case 'primary':
        return 'border-gray-300 border-t-orange-500';
      case 'white':
        return 'border-white/30 border-t-white';
      case 'gray':
        return 'border-gray-300 border-t-gray-600';
      default:
        return 'border-gray-300 border-t-orange-500';
    }
  };

  return (
    <div
      className={`
        loading-spinner
        ${getSizeClasses()}
        ${getColorClasses()}
        ${className}
      `}
    />
  );
}

export function LoadingButton({ 
  isLoading, 
  children, 
  className = '', 
  ...props 
}: {
  isLoading: boolean;
  children: React.ReactNode;
  className?: string;
  [key: string]: any;
}) {
  return (
    <button
      {...props}
      disabled={isLoading || props.disabled}
      className={`btn-primary ${className}`}
    >
      {isLoading ? (
        <div className="flex items-center space-x-2">
          <LoadingSpinner size="sm" color="white" />
          <span>Carregando...</span>
        </div>
      ) : (
        children
      )}
    </button>
  );
}

export function LoadingOverlay({ isLoading, children }: { isLoading: boolean; children: React.ReactNode }) {
  return (
    <div className="relative">
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-10">
          <div className="flex flex-col items-center space-y-3">
            <LoadingSpinner size="lg" />
            <p className="text-sm text-gray-600 dark:text-gray-400">Carregando...</p>
          </div>
        </div>
      )}
    </div>
  );
}
