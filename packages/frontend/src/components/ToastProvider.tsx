'use client';

import ToastContainer from './Toast';
import { useToastStore } from '@/store/toastStore';

export default function ToastProvider() {
  const { toasts, removeToast } = useToastStore();
  return <ToastContainer toasts={toasts} onRemove={removeToast} />;
}

