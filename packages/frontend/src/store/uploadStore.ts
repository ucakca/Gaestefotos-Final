import { create } from 'zustand';

export interface UploadItem {
  id: string;
  filename: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

interface UploadState {
  uploads: UploadItem[];
  isUploading: boolean;
  totalProgress: number;
  
  addUpload: (id: string, filename: string) => void;
  updateProgress: (id: string, progress: number) => void;
  setStatus: (id: string, status: UploadItem['status'], error?: string) => void;
  removeUpload: (id: string) => void;
  clearCompleted: () => void;
}

export const useUploadStore = create<UploadState>((set, get) => ({
  uploads: [],
  isUploading: false,
  totalProgress: 0,
  
  addUpload: (id: string, filename: string) => {
    set((state) => ({
      uploads: [...state.uploads, { id, filename, progress: 0, status: 'pending' }],
      isUploading: true,
    }));
  },
  
  updateProgress: (id: string, progress: number) => {
    set((state) => {
      const uploads = state.uploads.map((u) =>
        u.id === id ? { ...u, progress, status: 'uploading' as const } : u
      );
      const activeUploads = uploads.filter((u) => u.status === 'uploading' || u.status === 'pending');
      const totalProgress = activeUploads.length > 0
        ? Math.round(activeUploads.reduce((sum, u) => sum + u.progress, 0) / activeUploads.length)
        : 100;
      return { uploads, totalProgress };
    });
  },
  
  setStatus: (id: string, status: UploadItem['status'], error?: string) => {
    set((state) => {
      const uploads = state.uploads.map((u) =>
        u.id === id ? { ...u, status, error, progress: status === 'success' ? 100 : u.progress } : u
      );
      const isUploading = uploads.some((u) => u.status === 'uploading' || u.status === 'pending');
      return { uploads, isUploading };
    });
  },
  
  removeUpload: (id: string) => {
    set((state) => ({
      uploads: state.uploads.filter((u) => u.id !== id),
    }));
  },
  
  clearCompleted: () => {
    set((state) => ({
      uploads: state.uploads.filter((u) => u.status !== 'success'),
    }));
  },
}));
