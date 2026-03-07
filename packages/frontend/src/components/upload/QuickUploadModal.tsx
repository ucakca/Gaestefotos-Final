'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Upload, ImagePlus, CheckCircle2, AlertCircle, RotateCcw,
  Loader2, Trash2, ChevronDown, Camera, FolderOpen, Share2, Mail,
} from 'lucide-react';
import { useTranslations } from '@/components/I18nProvider';
import * as tus from 'tus-js-client';

const MAX_FILES = 100;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const PARALLEL_UPLOADS = 5;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'video/mp4', 'video/quicktime', 'video/webm'];

type FileState = {
  id: string;
  file: File;
  preview: string | null;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  tusUpload?: tus.Upload;
};

type ModalPhase = 'select' | 'uploading' | 'success';

interface CategoryOption {
  id: string;
  name: string;
  icon?: string;
}

interface QuickUploadModalProps {
  open: boolean;
  onClose: () => void;
  eventId: string;
  eventSlug?: string;
  eventTitle?: string;
  categories?: CategoryOption[];
  onComplete?: (count: number) => void;
}

function getApiBase(): string {
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || window.location.origin;
  }
  return '';
}

function validateFile(file: File): string | null {
  if (!ACCEPTED_TYPES.some(t => file.type.startsWith(t.split('/')[0]))) {
    return `${file.name}: Dateityp nicht unterstützt`;
  }
  if (file.size > MAX_FILE_SIZE) {
    return `${file.name}: Datei zu groß (max ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB)`;
  }
  return null;
}

export default function QuickUploadModal({ open, onClose, eventId, eventSlug, eventTitle, categories, onComplete }: QuickUploadModalProps) {
  const [phase, setPhase] = useState<ModalPhase>('select');
  const [files, setFiles] = useState<FileState[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [uploaderName, setUploaderName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const activeUploadsRef = useRef<number>(0);
  const abortedRef = useRef(false);
  const uploadStartedRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);
  const [optInEmail, setOptInEmail] = useState('');
  const [optInConsent, setOptInConsent] = useState(false);
  const [optInStatus, setOptInStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const t = useTranslations('upload');

  // Load name + opt-in email from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('gf_uploader_name');
      if (saved) setUploaderName(saved);
      const savedEmail = localStorage.getItem('gf_optin_email');
      if (savedEmail) setOptInEmail(savedEmail);
    }
  }, []);

  // Save name to localStorage on change
  const handleNameChange = useCallback((name: string) => {
    setUploaderName(name);
    if (typeof window !== 'undefined') {
      localStorage.setItem('gf_uploader_name', name);
    }
  }, []);

  // Warn user before leaving during upload
  useEffect(() => {
    if (phase !== 'uploading') return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Uploads laufen noch. Wirklich verlassen?';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [phase]);

  // Abort active uploads + reset on close
  useEffect(() => {
    if (!open) {
      // Abort any running TUS uploads
      abortedRef.current = true;
      files.forEach(f => {
        if (f.tusUpload && f.status === 'uploading') {
          try { f.tusUpload.abort(); } catch {}
        }
        if (f.preview) URL.revokeObjectURL(f.preview);
      });
      setTimeout(() => {
        setPhase('select');
        setFiles([]);
        setValidationErrors([]);
        abortedRef.current = false;
        activeUploadsRef.current = 0;
        uploadStartedRef.current = false;
      }, 300);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Auto-start: skip confirmation step when user has a saved name
  const autoStartPendingRef = useRef(false);

  // File selection
  const handleFilesSelected = useCallback((selectedFiles: FileList | File[]) => {
    const fileArray = Array.from(selectedFiles);
    const errors: string[] = [];

    if (files.length + fileArray.length > MAX_FILES) {
      errors.push(`Maximal ${MAX_FILES} Dateien erlaubt`);
    }

    const validFiles: FileState[] = [];
    for (const file of fileArray.slice(0, MAX_FILES - files.length)) {
      const err = validateFile(file);
      if (err) {
        errors.push(err);
      } else {
        // Deduplicate by name + size
        const isDuplicate = files.some(f => f.file.name === file.name && f.file.size === file.size);
        if (isDuplicate) {
          errors.push(`${file.name}: bereits hinzugefügt`);
          continue;
        }
        const preview = file.type.startsWith('image/')
          ? URL.createObjectURL(file)
          : null;
        validFiles.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          file,
          preview,
          progress: 0,
          status: 'pending',
        });
      }
    }

    setValidationErrors(errors);
    setFiles(prev => [...prev, ...validFiles]);

    // Auto-start: if user already has a saved name and files are valid, skip the confirm step
    if (validFiles.length > 0 && uploaderName.trim() && files.length === 0) {
      autoStartPendingRef.current = true;
    }
  }, [files.length, uploaderName]);

  const removeFile = useCallback((id: string) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === id);
      if (file?.preview) URL.revokeObjectURL(file.preview);
      return prev.filter(f => f.id !== id);
    });
  }, []);

  // TUS Upload
  const uploadFile = useCallback((fileState: FileState): Promise<void> => {
    return new Promise((resolve) => {
      const apiBase = getApiBase();
      const endpoint = `${apiBase}/api/uploads`;

      const upload = new tus.Upload(fileState.file, {
        endpoint,
        retryDelays: [0, 1000, 3000, 5000],
        chunkSize: 5 * 1024 * 1024, // 5MB chunks
        metadata: {
          filename: fileState.file.name,
          filetype: fileState.file.type,
          eventId,
          uploadedBy: uploaderName || '',
          ...(selectedCategory ? { categoryId: selectedCategory } : {}),
        },
        onProgress: (bytesUploaded, bytesTotal) => {
          const pct = Math.round((bytesUploaded / bytesTotal) * 100);
          setFiles(prev => prev.map(f =>
            f.id === fileState.id ? { ...f, progress: pct } : f
          ));
        },
        onSuccess: () => {
          setFiles(prev => prev.map(f =>
            f.id === fileState.id ? { ...f, status: 'success', progress: 100 } : f
          ));
          activeUploadsRef.current--;
          resolve();
        },
        onError: (error) => {
          const msg = error.message || 'Upload fehlgeschlagen';
          const userMsg = msg.includes('Failed to fetch') || msg.includes('NetworkError')
            ? 'Netzwerkfehler — bitte Verbindung prüfen'
            : msg.includes('403') ? 'Kein Zugriff auf dieses Event'
            : msg.includes('413') ? 'Datei zu groß für den Server'
            : msg;
          setFiles(prev => prev.map(f =>
            f.id === fileState.id ? { ...f, status: 'error', error: userMsg } : f
          ));
          activeUploadsRef.current--;
          resolve();
        },
      });

      // Store reference for abort
      setFiles(prev => prev.map(f =>
        f.id === fileState.id ? { ...f, status: 'uploading', tusUpload: upload } : f
      ));

      activeUploadsRef.current++;
      upload.start();
    });
  }, [eventId, uploaderName]);

  // Start all uploads with concurrency control
  const startUpload = useCallback(async () => {
    if (uploadStartedRef.current) return; // prevent double-start
    uploadStartedRef.current = true;
    setPhase('uploading');
    abortedRef.current = false;

    const pendingFiles = files.filter(f => f.status === 'pending' || f.status === 'error');
    // Reset error files to pending
    setFiles(prev => prev.map(f =>
      f.status === 'error' ? { ...f, status: 'pending', progress: 0, error: undefined } : f
    ));

    const queue = [...pendingFiles];

    const processQueue = async () => {
      while (queue.length > 0 && !abortedRef.current) {
        if (activeUploadsRef.current >= PARALLEL_UPLOADS) {
          await new Promise(r => setTimeout(r, 200));
          continue;
        }
        const next = queue.shift();
        if (next) {
          uploadFile(next); // Don't await — fire and continue
        }
      }
      // Wait for all active uploads to finish
      while (activeUploadsRef.current > 0) {
        await new Promise(r => setTimeout(r, 200));
      }
    };

    await processQueue();

    // Check final state
    setPhase('success');
  }, [files, uploadFile]);

  // Auto-start effect: when files change and auto-start was flagged, trigger upload
  useEffect(() => {
    if (autoStartPendingRef.current && files.length > 0 && phase === 'select') {
      autoStartPendingRef.current = false;
      const timer = setTimeout(() => {
        if (!uploadStartedRef.current) {
          startUpload();
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files.length, phase, startUpload]);

  // Retry failed files
  const retryFailed = useCallback(() => {
    setPhase('uploading');
    const failedFiles = files.filter(f => f.status === 'error');
    setFiles(prev => prev.map(f =>
      f.status === 'error' ? { ...f, status: 'pending', progress: 0, error: undefined } : f
    ));

    const queue = [...failedFiles];
    const process = async () => {
      while (queue.length > 0) {
        if (activeUploadsRef.current >= PARALLEL_UPLOADS) {
          await new Promise(r => setTimeout(r, 200));
          continue;
        }
        const next = queue.shift();
        if (next) uploadFile(next);
      }
      while (activeUploadsRef.current > 0) {
        await new Promise(r => setTimeout(r, 200));
      }
      setPhase('success');
    };
    process();
  }, [files, uploadFile]);

  // Computed stats
  const totalFiles = files.length;
  const successCount = files.filter(f => f.status === 'success').length;
  const errorCount = files.filter(f => f.status === 'error').length;
  const uploadingCount = files.filter(f => f.status === 'uploading').length;
  const overallProgress = totalFiles > 0
    ? Math.round(files.reduce((sum, f) => sum + f.progress, 0) / totalFiles)
    : 0;

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center"
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={phase === 'uploading' ? undefined : onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          className="relative w-full max-w-lg max-h-[90vh] bg-card rounded-t-3xl sm:rounded-3xl shadow-2xl border border-border overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-lg font-bold text-foreground">
              {phase === 'select' && t('title')}
              {phase === 'uploading' && t('uploading')}
              {phase === 'success' && t('done')}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            <AnimatePresence mode="wait">
              {/* ─── SELECT PHASE ─── */}
              {phase === 'select' && (
                <motion.div
                  key="select"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  {/* Hidden file inputs */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) handleFilesSelected(e.target.files);
                      e.target.value = '';
                    }}
                  />
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) handleFilesSelected(e.target.files);
                      e.target.value = '';
                    }}
                  />

                  {/* Name input */}
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">{t('yourName')}</label>
                    <input
                      type="text"
                      value={uploaderName}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder={t('namePlaceholder')}
                      className="w-full px-3 py-2 bg-background border border-border rounded-xl text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>

                  {/* Category selector */}
                  {categories && categories.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">Album</label>
                      <div className="relative">
                        <select
                          value={selectedCategory}
                          onChange={(e) => setSelectedCategory(e.target.value)}
                          className="w-full px-3 py-2 bg-background border border-border rounded-xl text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none pr-8"
                        >
                          <option value="">Kein Album (Allgemein)</option>
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                  )}

                  {/* Drop zone / Select button */}
                  {files.length === 0 ? (
                    <div
                      onDragEnter={(e) => { e.preventDefault(); dragCounterRef.current++; setIsDragging(true); }}
                      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
                      onDragLeave={(e) => { e.preventDefault(); dragCounterRef.current--; if (dragCounterRef.current <= 0) { setIsDragging(false); dragCounterRef.current = 0; } }}
                      onDrop={(e) => { e.preventDefault(); setIsDragging(false); dragCounterRef.current = 0; if (e.dataTransfer.files.length) handleFilesSelected(e.dataTransfer.files); }}
                      className={`w-full flex flex-col items-center gap-3 p-8 border-2 border-dashed rounded-2xl transition-colors ${
                        isDragging
                          ? 'border-primary bg-primary/15 scale-[1.02]'
                          : 'border-primary/30 bg-primary/5 hover:bg-primary/10'
                      }`}
                    >
                      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <ImagePlus className="w-7 h-7 text-primary" />
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-foreground">
                          {isDragging ? t('dropFiles') : t('selectFiles')}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {t('maxFiles', { max: String(MAX_FILES), size: String(Math.round(MAX_FILE_SIZE / 1024 / 1024)) })}
                        </div>
                      </div>
                      <div className="flex gap-2 mt-1">
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
                        >
                          <ImagePlus className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                          {t('gallery')}
                        </button>
                        <button
                          onClick={() => cameraInputRef.current?.click()}
                          className="px-4 py-2 bg-muted text-foreground rounded-xl text-sm font-medium hover:bg-muted/80 transition-colors"
                        >
                          <Camera className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                          {t('camera')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Thumbnail grid */}
                      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                        {files.map(f => (
                          <div key={f.id} className="relative aspect-square rounded-xl overflow-hidden bg-muted group">
                            {f.preview ? (
                              <img src={f.preview} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                                Video
                              </div>
                            )}
                            <button
                              onClick={() => removeFile(f.id)}
                              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}

                        {/* Add more button */}
                        {files.length < MAX_FILES && (
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="aspect-square rounded-xl border-2 border-dashed border-border flex items-center justify-center hover:bg-muted/50 transition-colors"
                          >
                            <ImagePlus className="w-5 h-5 text-muted-foreground" />
                          </button>
                        )}
                      </div>

                      <div className="text-sm text-muted-foreground text-center">
                        {files.length} {files.length !== 1 ? 'files' : 'file'}
                      </div>
                    </>
                  )}

                  {/* Validation Errors */}
                  {validationErrors.length > 0 && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl">
                      {validationErrors.map((err, i) => (
                        <div key={i} className="text-xs text-destructive flex items-start gap-1.5">
                          <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                          {err}
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {/* ─── UPLOADING PHASE ─── */}
              {phase === 'uploading' && (
                <motion.div
                  key="uploading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  {/* Overall progress */}
                  <div className="text-center">
                    <div className="text-4xl font-bold text-foreground">{overallProgress}%</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {successCount}/{totalFiles}
                      {uploadingCount > 0 && ` · ${uploadingCount} active`}
                    </div>
                  </div>

                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary rounded-full"
                      animate={{ width: `${overallProgress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>

                  {/* File list */}
                  <div className="space-y-1.5 max-h-[40vh] overflow-y-auto">
                    {files.map(f => (
                      <div key={f.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                        {f.preview && (
                          <img src={f.preview} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-foreground truncate">{f.file.name}</div>
                          <div className="h-1 bg-muted rounded-full overflow-hidden mt-1">
                            <div
                              className={`h-full rounded-full transition-all ${
                                f.status === 'error' ? 'bg-destructive' :
                                f.status === 'success' ? 'bg-emerald-500' : 'bg-primary'
                              }`}
                              style={{ width: `${f.progress}%` }}
                            />
                          </div>
                        </div>
                        <div className="shrink-0">
                          {f.status === 'uploading' && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                          {f.status === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                          {f.status === 'error' && <AlertCircle className="w-4 h-4 text-destructive" />}
                          {f.status === 'pending' && <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* ─── SUCCESS PHASE ─── */}
              {phase === 'success' && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center space-y-4 py-4"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 12, delay: 0.1 }}
                  >
                    <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
                  </motion.div>

                  <div>
                    <h3 className="text-xl font-bold text-foreground">
                      {errorCount === 0 ? t('successTitle') : `${successCount}/${totalFiles}`}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t('successMessage', { count: String(successCount) })}
                      {errorCount > 0 && ` · ${errorCount} failed`}
                    </p>
                  </div>

                  {/* DSGVO Email Opt-in */}
                  {errorCount === 0 && eventId && optInStatus !== 'done' && (
                    <div className="bg-muted/50 border border-border rounded-xl p-4 text-left space-y-3">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-primary" />
                        <p className="text-sm font-medium text-foreground">Fotos per E-Mail erhalten</p>
                      </div>
                      <div className="space-y-2">
                        <input
                          type="email"
                          placeholder="deine@email.de"
                          value={optInEmail}
                          onChange={(e) => setOptInEmail(e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                        <label className="flex items-start gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={optInConsent}
                            onChange={(e) => setOptInConsent(e.target.checked)}
                            className="mt-0.5 rounded border-border"
                          />
                          <span className="text-xs text-muted-foreground leading-relaxed">
                            Ich stimme zu, Event-Fotos und Benachrichtigungen per E-Mail zu erhalten. Widerruf jederzeit möglich.
                          </span>
                        </label>
                      </div>
                      <button
                        disabled={!optInEmail || !optInConsent || optInStatus === 'sending'}
                        onClick={async () => {
                          setOptInStatus('sending');
                          try {
                            const res = await fetch(`/api/events/${eventId}/guests/email-optin`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ email: optInEmail, optIn: true, guestName: uploaderName || undefined }),
                            });
                            if (res.ok) {
                              setOptInStatus('done');
                              if (typeof window !== 'undefined') localStorage.setItem('gf_optin_email', optInEmail);
                            } else {
                              setOptInStatus('error');
                            }
                          } catch {
                            setOptInStatus('error');
                          }
                        }}
                        className="w-full py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {optInStatus === 'sending' ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Anmelden'}
                      </button>
                      {optInStatus === 'error' && (
                        <p className="text-xs text-destructive">Fehler beim Anmelden. Bitte versuche es erneut.</p>
                      )}
                    </div>
                  )}
                  {optInStatus === 'done' && (
                    <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      <p className="text-sm text-emerald-700 dark:text-emerald-400">Du erhältst die Event-Fotos per E-Mail!</p>
                    </div>
                  )}

                  {/* Social Share after successful upload */}
                  {errorCount === 0 && eventSlug && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-foreground">Event teilen</p>
                      <div className="flex justify-center gap-3">
                        <button
                          onClick={async () => {
                            const shareUrl = `${window.location.origin}/e3/${eventSlug}`;
                            if (navigator.share) {
                              try { await navigator.share({ title: eventTitle || 'Event Fotos', url: shareUrl }); } catch {}
                            } else {
                              navigator.clipboard.writeText(shareUrl);
                            }
                          }}
                          className="flex items-center gap-2 px-4 py-2.5 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-xl text-sm font-medium text-primary transition-colors"
                        >
                          <Share2 className="w-4 h-4" />
                          Foto teilen
                        </button>
                      </div>
                    </div>
                  )}

                  {errorCount > 0 && (
                    <div className="space-y-2">
                      <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl">
                        <div className="text-sm text-destructive font-medium mb-2">{errorCount} failed</div>
                        {files.filter(f => f.status === 'error').slice(0, 3).map(f => (
                          <div key={f.id} className="text-xs text-destructive/80 truncate">{f.file.name}: {f.error}</div>
                        ))}
                      </div>
                      <button
                        onClick={retryFailed}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-xl text-sm font-medium text-primary transition-colors"
                      >
                        <RotateCcw className="w-4 h-4" />
                        {t('retry')}
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border">
            {phase === 'select' && (
              <button
                onClick={startUpload}
                disabled={files.length === 0}
                className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
              >
                <Upload className="w-4 h-4" />
                {files.length > 0 ? `${t('startUpload')} (${files.length})` : t('selectFiles')}
              </button>
            )}

            {phase === 'uploading' && (
              <div className="text-center text-sm text-muted-foreground">
                {t('uploading')}
              </div>
            )}

            {phase === 'success' && (
              <button
                onClick={() => {
                  onComplete?.(successCount);
                  onClose();
                }}
                className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                {t('closeDone')}
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
