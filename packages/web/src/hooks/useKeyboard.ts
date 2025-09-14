import { useEffect } from 'react';

export function useKeyboard(onKey: (key: string) => void) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return; // Don't interfere with typing
      }
      
      switch (e.key) {
        case '1': case '2': case '3': case '4': case '5':
          onKey(`step-${e.key}`);
          break;
        case 'i': case 'I':
          onKey('include');
          break;
        case 'x': case 'X':
          onKey('exclude');
          break;
        case 'b': case 'B':
          onKey('better');
          break;
        case 'a': case 'A':
          onKey('explorer');
          break;
        case 'e': case 'E':
          onKey('export');
          break;
        case '?':
          onKey('help');
          break;
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onKey]);
}
