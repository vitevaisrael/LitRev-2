import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

interface KeyboardShortcutsOptions {
  onRunExplorer?: () => void;
  onExport?: () => void;
  onImport?: () => void;
  onNavigateToChat?: () => void;
  onInclude?: () => void;
  onExclude?: () => void;
  onMarkBetter?: () => void;
  onShowHelp?: () => void;
  onCloseModal?: () => void;
  disabled?: boolean;
}

export function useKeyboardShortcuts({
  onRunExplorer,
  onExport,
  onImport,
  onNavigateToChat,
  onInclude,
  onExclude,
  onMarkBetter,
  onShowHelp,
  onCloseModal,
  disabled = false
}: KeyboardShortcutsOptions) {
  const navigate = useNavigate();

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (disabled) return;

    const { key, ctrlKey, shiftKey, altKey, metaKey } = event;
    
    // Don't trigger shortcuts when typing in input fields
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
      return;
    }

    // Handle keyboard shortcuts
    switch (key) {
      case '?':
        if (!ctrlKey && !shiftKey && !altKey && !metaKey) {
          event.preventDefault();
          onShowHelp?.();
        }
        break;
        
      case 'Escape':
        event.preventDefault();
        onCloseModal?.();
        break;
        
      case '1':
        if (ctrlKey && !shiftKey && !altKey && !metaKey) {
          event.preventDefault();
          navigate('/projects');
        }
        break;
        
      case '2':
        if (ctrlKey && !shiftKey && !altKey && !metaKey) {
          event.preventDefault();
          // Navigate to screening - this would need to be implemented based on current route
          const currentPath = window.location.pathname;
          if (currentPath.includes('/project/')) {
            // Already on a project page, just scroll to screening section
            const screeningElement = document.querySelector('[data-section="screening"]');
            if (screeningElement) {
              screeningElement.scrollIntoView({ behavior: 'smooth' });
            }
          } else {
            // Navigate to first project's screening
            navigate('/projects');
          }
        }
        break;
        
      case 'I':
        if (!ctrlKey && !shiftKey && !altKey && !metaKey) {
          event.preventDefault();
          onInclude?.();
        } else if (ctrlKey && !shiftKey && !altKey && !metaKey) {
          event.preventDefault();
          onImport?.();
        }
        break;
        
      case 'X':
        if (!ctrlKey && !shiftKey && !altKey && !metaKey) {
          event.preventDefault();
          onExclude?.();
        }
        break;
        
      case 'B':
        if (!ctrlKey && !shiftKey && !altKey && !metaKey) {
          event.preventDefault();
          onMarkBetter?.();
        }
        break;
        
      case 'E':
        if (ctrlKey && !shiftKey && !altKey && !metaKey) {
          event.preventDefault();
          onExport?.();
        }
        break;
        
      case 'A':
        if (ctrlKey && shiftKey && !altKey && !metaKey) {
          event.preventDefault();
          onRunExplorer?.();
        }
        break;
        
      case 'C':
        if (ctrlKey && shiftKey && !altKey && !metaKey) {
          event.preventDefault();
          onNavigateToChat?.();
        }
        break;
        
        // Number keys for step navigation (3-5)
        case '3':
        case '4':
        case '5':
          if (!ctrlKey && !shiftKey && !altKey && !metaKey) {
            event.preventDefault();
            // This would need to be implemented based on the current component
            // For now, we'll just prevent default to avoid conflicts
          }
          break;
    }
  }, [
    disabled,
    navigate,
    onRunExplorer,
    onExport,
    onImport,
    onNavigateToChat,
    onInclude,
    onExclude,
    onMarkBetter,
    onShowHelp,
    onCloseModal
  ]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return {
    // Return any helper functions if needed
  };
}
