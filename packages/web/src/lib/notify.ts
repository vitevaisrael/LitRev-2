import toast from 'react-hot-toast';

// Toast notification types
export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

// Toast configuration options
export interface ToastOptions {
  duration?: number;
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  icon?: string;
  style?: React.CSSProperties;
  className?: string;
  id?: string;
}

// Standard toast configurations
const defaultConfig: ToastOptions = {
  duration: 4000,
  position: 'top-right',
};

// Success notification
export const notifySuccess = (message: string, options?: ToastOptions) => {
  return toast.success(message, {
    ...defaultConfig,
    ...options,
    style: {
      background: '#10b981',
      color: '#fff',
      ...options?.style,
    },
  });
};

// Error notification
export const notifyError = (message: string, options?: ToastOptions) => {
  return toast.error(message, {
    ...defaultConfig,
    duration: 6000, // Longer duration for errors
    ...options,
    style: {
      background: '#ef4444',
      color: '#fff',
      ...options?.style,
    },
  });
};

// Warning notification
export const notifyWarning = (message: string, options?: ToastOptions) => {
  return toast(message, {
    ...defaultConfig,
    icon: '⚠️',
    ...options,
    style: {
      background: '#f59e0b',
      color: '#fff',
      ...options?.style,
    },
  });
};

// Info notification
export const notifyInfo = (message: string, options?: ToastOptions) => {
  return toast(message, {
    ...defaultConfig,
    icon: 'ℹ️',
    ...options,
    style: {
      background: '#3b82f6',
      color: '#fff',
      ...options?.style,
    },
  });
};

// Loading notification
export const notifyLoading = (message: string, options?: ToastOptions) => {
  return toast.loading(message, {
    ...defaultConfig,
    duration: Infinity, // Loading toasts don't auto-dismiss
    ...options,
    style: {
      background: '#6b7280',
      color: '#fff',
      ...options?.style,
    },
  });
};

// Promise-based notification (for async operations)
export const notifyPromise = <T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((error: any) => string);
  },
  options?: ToastOptions
) => {
  return toast.promise(promise, messages, {
    ...defaultConfig,
    ...options,
    style: {
      background: '#374151',
      color: '#fff',
      ...options?.style,
    },
  });
};

// Dismiss specific toast
export const dismissToast = (toastId: string) => {
  toast.dismiss(toastId);
};

// Dismiss all toasts
export const dismissAllToasts = () => {
  toast.dismiss();
};

// Update existing toast
export const updateToast = (toastId: string, message: string, type: ToastType = 'info') => {
  const updateOptions: ToastOptions = {
    style: {
      background: type === 'success' ? '#10b981' : 
                 type === 'error' ? '#ef4444' : 
                 type === 'warning' ? '#f59e0b' : 
                 type === 'loading' ? '#6b7280' : '#3b82f6',
      color: '#fff',
    },
  };

  toast(message, {
    id: toastId,
    ...updateOptions,
  });
};

// Error helper utilities
export class NotificationError extends Error {
  constructor(
    message: string,
    public readonly type: ToastType = 'error',
    public readonly options?: ToastOptions
  ) {
    super(message);
    this.name = 'NotificationError';
  }
}

// Standardized error handler
export const handleError = (error: unknown, fallbackMessage: string = 'An unexpected error occurred') => {
  let message = fallbackMessage;
  let type: ToastType = 'error';

  if (error instanceof NotificationError) {
    message = error.message;
    type = error.type;
  } else if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  }

  // Log error for debugging
  console.error('Notification error:', error);

  // Show appropriate notification
  switch (type) {
    case 'success':
      notifySuccess(message);
      break;
    case 'warning':
      notifyWarning(message);
      break;
    case 'info':
      notifyInfo(message);
      break;
    case 'loading':
      notifyLoading(message);
      break;
    default:
      notifyError(message);
  }
};

// API error handler with improved error parsing
export const handleApiError = (error: any, context?: string) => {
  let message = 'An error occurred';
  let shouldLog = true;
  
  // Handle different error types
  if (error?.response?.data?.error?.message) {
    message = error.response.data.error.message;
  } else if (error?.response?.data?.message) {
    message = error.response.data.message;
  } else if (error?.response?.data?.error) {
    message = error.response.data.error;
  } else if (error?.message) {
    message = error.message;
  }

  // Handle specific error codes
  if (error?.response?.status) {
    switch (error.response.status) {
      case 401:
        message = 'Authentication required. Please log in again.';
        shouldLog = false; // Don't log auth errors
        break;
      case 403:
        message = 'Access denied. You do not have permission to perform this action.';
        break;
      case 404:
        message = 'Resource not found.';
        break;
      case 409:
        message = 'Conflict. The resource already exists or has been modified.';
        break;
      case 422:
        message = 'Validation error. Please check your input.';
        break;
      case 429:
        message = 'Too many requests. Please wait a moment and try again.';
        break;
      case 500:
        message = 'Server error. Please try again later.';
        break;
      case 502:
      case 503:
      case 504:
        message = 'Service temporarily unavailable. Please try again later.';
        break;
    }
  }

  if (context) {
    message = `${context}: ${message}`;
  }

  // Log error for debugging (except auth errors)
  if (shouldLog) {
    console.error('API Error:', {
      context,
      error,
      message,
      status: error?.response?.status,
      url: error?.config?.url
    });
  }

  notifyError(message);
};

// Success handler for common operations
export const handleSuccess = (message: string, context?: string) => {
  const fullMessage = context ? `${context}: ${message}` : message;
  notifySuccess(fullMessage);
};

// Loading handler for async operations
export const handleLoading = (message: string, context?: string) => {
  const fullMessage = context ? `${context}: ${message}` : message;
  return notifyLoading(fullMessage);
};

// Export toast instance for advanced usage
export { toast };
