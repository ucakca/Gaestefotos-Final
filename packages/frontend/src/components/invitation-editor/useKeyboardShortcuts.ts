import { useEffect } from 'react';
import { CanvasElementUnion } from '@gaestefotos/shared';

interface UseKeyboardShortcutsProps {
  selectedElementId: string | null;
  elements: CanvasElementUnion[];
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onMove: (id: string, dx: number, dy: number) => void;
  onCopy: () => void;
  onPaste: () => void;
  disabled?: boolean;
}

export function useKeyboardShortcuts({
  selectedElementId,
  elements,
  onDelete,
  onDuplicate,
  onMove,
  onCopy,
  onPaste,
  disabled = false,
}: UseKeyboardShortcutsProps) {
  useEffect(() => {
    if (disabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in input/textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true'
      ) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      // Delete
      if (
        (e.key === 'Delete' || e.key === 'Backspace') &&
        selectedElementId &&
        !cmdOrCtrl
      ) {
        e.preventDefault();
        onDelete(selectedElementId);
        return;
      }

      // Copy
      if (cmdOrCtrl && e.key === 'c' && selectedElementId) {
        e.preventDefault();
        onCopy();
        return;
      }

      // Paste
      if (cmdOrCtrl && e.key === 'v') {
        e.preventDefault();
        onPaste();
        return;
      }

      // Duplicate
      if (cmdOrCtrl && e.key === 'd' && selectedElementId) {
        e.preventDefault();
        onDuplicate(selectedElementId);
        return;
      }

      // Arrow keys for movement
      if (selectedElementId && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        
        const step = e.shiftKey ? 10 : 1; // Shift = 10px, normal = 1px
        
        let dx = 0;
        let dy = 0;
        
        switch (e.key) {
          case 'ArrowUp':
            dy = -step;
            break;
          case 'ArrowDown':
            dy = step;
            break;
          case 'ArrowLeft':
            dx = -step;
            break;
          case 'ArrowRight':
            dx = step;
            break;
        }
        
        onMove(selectedElementId, dx, dy);
        return;
      }

      // Select all (future feature)
      if (cmdOrCtrl && e.key === 'a') {
        e.preventDefault();
        // TODO: Select all elements
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedElementId, elements, onDelete, onDuplicate, onMove, onCopy, onPaste, disabled]);
}
