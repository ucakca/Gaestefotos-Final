'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

interface ThemeToggleProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function ThemeToggle({ className = '', size = 'md' }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        className={`p-2 rounded-lg bg-app-card border border-app-border ${className}`}
        disabled
      >
        <div className={`${size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5'}`} />
      </button>
    );
  }

  const isDark = resolvedTheme === 'dark';
  const iconSize = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={`p-2 rounded-lg bg-app-card border border-app-border hover:border-app-accent/50 transition-all ${className}`}
      aria-label={isDark ? 'Hellen Modus aktivieren' : 'Dunklen Modus aktivieren'}
      title={isDark ? 'Heller Modus' : 'Dunkler Modus'}
    >
      {isDark ? (
        <Sun className={`${iconSize} text-yellow-400`} />
      ) : (
        <Moon className={`${iconSize} text-app-muted`} />
      )}
    </button>
  );
}

export function ThemeToggleText({ className = '' }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-app-card transition-colors text-sm ${className}`}
    >
      {isDark ? (
        <>
          <Sun className="w-4 h-4 text-yellow-400" />
          <span>Heller Modus</span>
        </>
      ) : (
        <>
          <Moon className="w-4 h-4" />
          <span>Dunkler Modus</span>
        </>
      )}
    </button>
  );
}
