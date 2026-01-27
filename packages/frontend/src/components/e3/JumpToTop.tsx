'use client';

import { ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface JumpToTopProps {
  isVisible: boolean;
  onClick: () => void;
  className?: string;
}

export default function JumpToTop({ isVisible, onClick, className }: JumpToTopProps) {
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={onClick}
      className={`fixed bottom-28 right-4 z-30 h-10 w-10 rounded-full shadow-lg transition-all duration-300 ${
        isVisible
          ? 'translate-y-0 opacity-100'
          : 'translate-y-4 opacity-0 pointer-events-none'
      } ${className || ''}`}
    >
      <ChevronUp className="h-5 w-5" />
      <span className="sr-only">Nach oben scrollen</span>
    </Button>
  );
}

