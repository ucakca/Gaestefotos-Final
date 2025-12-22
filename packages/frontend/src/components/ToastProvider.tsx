'use client';

import ToastContainer from './Toast';
import { useToastStore } from '@/store/toastStore';
import { useEffect } from 'react';

export default function ToastProvider() {
  const { toasts, removeToast } = useToastStore();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'manual';
      }
    } catch {
      // ignore
    }
    window.scrollTo(0, 0);
  }, []);

  return <ToastContainer toasts={toasts} onRemove={removeToast} />;
}

