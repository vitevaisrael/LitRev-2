import { createContext, useContext, useState, ReactNode } from 'react';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
  requestId?: string;
  retryAction?: () => void;
  retryLabel?: string;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  showError: (message: string, requestId?: string, retryAction?: () => void, retryLabel?: string) => void;
  showSuccess: (message: string) => void;
  showInfo: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { ...toast, id }]);
    
    // Auto-remove success and info toasts after 3 seconds
    if (toast.type === 'success' || toast.type === 'info') {
      setTimeout(() => removeToast(id), 3000);
    }
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const showError = (message: string, requestId?: string, retryAction?: () => void, retryLabel?: string) => {
    addToast({
      type: 'error',
      message,
      requestId,
      retryAction,
      retryLabel: retryLabel || 'Retry'
    });
  };

  const showSuccess = (message: string) => {
    addToast({
      type: 'success',
      message
    });
  };

  const showInfo = (message: string) => {
    addToast({
      type: 'info',
      message
    });
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, showError, showSuccess, showInfo }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const getToastStyles = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-green-100 border-green-300 text-green-800';
      case 'error':
        return 'bg-red-100 border-red-300 text-red-800';
      case 'info':
        return 'bg-blue-100 border-blue-300 text-blue-800';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  return (
    <div className={`max-w-sm p-4 border rounded-lg shadow-lg ${getToastStyles()}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium">{toast.message}</p>
          {toast.requestId && (
            <p className="text-xs mt-1 opacity-75">Request ID: {toast.requestId}</p>
          )}
        </div>
        <div className="flex items-center space-x-2 ml-2">
          {toast.retryAction && (
            <button
              onClick={toast.retryAction}
              className="text-xs px-2 py-1 bg-white bg-opacity-50 rounded hover:bg-opacity-75 transition-colors"
            >
              {toast.retryLabel}
            </button>
          )}
          <button
            onClick={() => onRemove(toast.id)}
            className="text-xs px-1 py-1 hover:bg-white hover:bg-opacity-50 rounded transition-colors"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
