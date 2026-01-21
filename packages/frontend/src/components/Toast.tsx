'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { IconButton } from '@/components/ui/IconButton';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

function ToastItem({ toast, onRemove }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, 5000);

    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-status-success" />,
    error: <AlertCircle className="w-5 h-5 text-status-danger" />,
    info: <Info className="w-5 h-5 text-status-info" />,
  };

  const bgColors = {
    success: 'bg-app-bg border-status-success',
    error: 'bg-app-bg border-status-danger',
    info: 'bg-app-bg border-status-info',
  };

  return (
    <motion.div
      initial={slideUp.initial}
      animate={slideUp.animate}
      exit={{ opacity: 0, x: 50, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={`${bgColors[toast.type]} border rounded-lg shadow-lg p-4 min-w-[300px] max-w-md flex items-start gap-3`}
    >
      {icons[toast.type]}
      <div className="flex-1">
        <p className="text-sm font-medium text-app-fg">{toast.message}</p>
      </div>
      <IconButton
        onClick={() => onRemove(toast.id)}
        icon={<X className="w-4 h-4" />}
        variant="ghost"
        size="sm"
        aria-label="Schließen"
        title="Schließen"
        className="text-app-muted hover:text-app-fg"
      />
    </motion.div>
  );
});

export default function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
        ))}
      </AnimatePresence>
    </div>
  );
}

