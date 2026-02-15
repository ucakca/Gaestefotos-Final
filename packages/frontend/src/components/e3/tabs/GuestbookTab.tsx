'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, User, Send, Heart, Camera, X, ImagePlus, Loader2, Workflow } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { FormInput } from '@/components/ui/FormInput';
import { FormTextarea } from '@/components/ui/FormTextarea';
import api from '@/lib/api';
import dynamic from 'next/dynamic';
import { useWorkflow } from '@/hooks/useWorkflow';

const guestbookSchema = z.object({
  name: z.string().min(1, 'Bitte gib deinen Namen ein').max(100),
  message: z.string().min(1, 'Bitte schreibe eine Nachricht').max(2000),
});
type GuestbookFormData = z.infer<typeof guestbookSchema>;

const WorkflowRunner = dynamic(
  () => import('@/components/workflow-runtime/WorkflowRunner'),
  { ssr: false }
);

/**
 * GuestbookTab - v0-Style Guestbook Tab
 * 
 * Display and submit guestbook entries with optional photo upload.
 * Timeline-style layout.
 */

export interface GuestbookEntry {
  id: string;
  message: string;
  authorName: string;
  createdAt: string;
  photoUrl?: string;
}

export interface GuestbookTabProps {
  entries: GuestbookEntry[];
  eventId: string;
  onEntrySubmit?: () => void;
}

interface PhotoUpload {
  file: File;
  preview: string;
  uploadId?: string;
  storagePath?: string;
  photoSizeBytes?: string;
  uploading: boolean;
  error?: string;
}

export default function GuestbookTab({
  entries,
  eventId,
  onEntrySubmit,
}: GuestbookTabProps) {
  const [photo, setPhoto] = useState<PhotoUpload | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [useWorkflowMode, setUseWorkflowMode] = useState(true);
  const { definition: workflowDef, loading: wfLoading } = useWorkflow('GUESTBOOK');

  const { register, handleSubmit: rhfHandleSubmit, reset, formState: { errors, isSubmitting } } = useForm<GuestbookFormData>({
    resolver: zodResolver(guestbookSchema),
    defaultValues: { name: '', message: '' },
  });

  const handleWorkflowComplete = useCallback(async (collectedData: Record<string, any>) => {
    try {
      const authorName = collectedData.text || collectedData.gb2_text || '';
      const msg = collectedData.gb3_text || '';
      if (!authorName.trim() || !msg.trim()) return;

      const payload: any = { authorName: authorName.trim(), message: msg.trim() };

      // If a photo was captured, upload it first
      if (collectedData.photo && collectedData.hasPhoto) {
        try {
          const response = await fetch(collectedData.photo);
          const blob = await response.blob();
          const formData = new FormData();
          formData.append('photo', blob, 'guestbook-photo.jpg');
          const uploadRes = await api.post(`/events/${eventId}/guestbook/upload-photo`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          if (uploadRes.data?.uploadId) {
            payload.photoUploadId = uploadRes.data.uploadId;
            payload.photoStoragePath = uploadRes.data.storagePath;
            payload.photoSizeBytes = uploadRes.data.photoSizeBytes;
          }
        } catch {
          // Photo upload failed — submit without photo
        }
      }

      await api.post(`/events/${eventId}/guestbook`, payload);
      onEntrySubmit?.();
    } catch {
      // Submit failed
    }
  }, [eventId, onEntrySubmit]);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return;
    }

    // Create preview
    const preview = URL.createObjectURL(file);
    setPhoto({ file, preview, uploading: true });

    // Upload immediately
    try {
      const formData = new FormData();
      formData.append('photo', file);

      const response = await api.post(`/events/${eventId}/guestbook/upload-photo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setPhoto(prev => prev ? {
        ...prev,
        uploading: false,
        uploadId: response.data.uploadId,
        storagePath: response.data.storagePath,
        photoSizeBytes: response.data.photoSizeBytes,
      } : null);
    } catch (err: any) {
      setPhoto(prev => prev ? {
        ...prev,
        uploading: false,
        error: err?.response?.data?.error || 'Upload fehlgeschlagen',
      } : null);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePhoto = () => {
    if (photo?.preview) {
      URL.revokeObjectURL(photo.preview);
    }
    setPhoto(null);
  };

  const onClassicSubmit = async (data: GuestbookFormData) => {
    if (photo?.uploading) return; // Wait for upload

    try {
      const payload: any = {
        authorName: data.name.trim(),
        message: data.message.trim(),
      };

      // Add photo data if uploaded
      if (photo?.uploadId) {
        payload.photoUploadId = photo.uploadId;
        payload.photoStoragePath = photo.storagePath;
        payload.photoSizeBytes = photo.photoSizeBytes;
      }

      await api.post(`/events/${eventId}/guestbook`, payload);

      // Clear form
      reset();
      removePhoto();
      
      // Callback
      onEntrySubmit?.();
    } catch (err) {
      void err;
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Gästebuch</h2>
            <p className="text-muted-foreground">
              Hinterlasse eine Nachricht für das Brautpaar!
            </p>
          </div>
          {workflowDef && (
            <button
              onClick={() => setUseWorkflowMode(!useWorkflowMode)}
              className="p-2 rounded-lg hover:bg-background transition-colors text-muted-foreground hover:text-foreground"
              title={useWorkflowMode ? 'Klassisches Formular' : 'Geführter Modus'}
            >
              <Workflow className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Workflow-driven Submit Form */}
      {useWorkflowMode && workflowDef && !wfLoading ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-2xl mb-8 shadow-sm overflow-hidden"
        >
          <WorkflowRunner
            definition={workflowDef}
            eventId={eventId}
            autoStart
            onComplete={handleWorkflowComplete}
          />
        </motion.div>
      ) : (

      /* Classic Submit Form */
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-2xl p-6 mb-8 shadow-sm"
      >
        <form onSubmit={rhfHandleSubmit(onClassicSubmit)} className="space-y-4">
          <FormInput
            label="Dein Name"
            placeholder="Max Mustermann"
            required
            error={errors.name?.message}
            {...register('name')}
          />

          <FormTextarea
            label="Deine Nachricht"
            placeholder="Schreibe deine Glückwünsche..."
            rows={4}
            required
            error={errors.message?.message}
            {...register('message')}
          />

          {/* Photo Upload Section */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Foto hinzufügen (optional)
            </label>
            
            {!photo ? (
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="hidden"
                  id="guestbook-photo"
                />
                <label
                  htmlFor="guestbook-photo"
                  className="flex-1 flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <ImagePlus className="w-5 h-5 text-muted-foreground" />
                  <span className="text-muted-foreground">Foto auswählen</span>
                </label>
                <label
                  htmlFor="guestbook-photo"
                  className="flex items-center justify-center p-4 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
                  onClick={(e) => {
                    e.preventDefault();
                    if (fileInputRef.current) {
                      fileInputRef.current.setAttribute('capture', 'environment');
                      fileInputRef.current.click();
                    }
                  }}
                >
                  <Camera className="w-5 h-5 text-muted-foreground" />
                </label>
              </div>
            ) : (
              <div className="relative">
                <div className="relative rounded-xl overflow-hidden bg-background">
                  <img
                    src={photo.preview}
                    alt="Preview"
                    className="w-full h-48 object-cover"
                  />
                  {photo.uploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                    </div>
                  )}
                  {photo.error && (
                    <div className="absolute inset-0 bg-red-500/80 flex items-center justify-center">
                      <p className="text-white text-sm px-4 text-center">{photo.error}</p>
                    </div>
                  )}
                  {photo.uploadId && !photo.error && (
                    <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                      ✓ Hochgeladen
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={removePhoto}
                  className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            )}
          </div>

          <Button
            type="submit"
            loading={isSubmitting}
            disabled={photo?.uploading}
            className="w-full"
            leftIcon={<Send className="w-4 h-4" />}
          >
            Nachricht senden
          </Button>
        </form>
      </motion.div>
      )}

      {/* Entries Timeline */}
      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
            <MessageSquare className="w-10 h-10 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">
            Noch keine Einträge. Sei der Erste!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {entries.map((entry, index) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-card border border-border rounded-2xl p-6 shadow-sm"
              >
                {/* Author */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">{entry.authorName}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(entry.createdAt).toLocaleDateString('de-DE', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>

                {/* Photo if exists */}
                {entry.photoUrl && (
                  <div className="mb-3 rounded-xl overflow-hidden">
                    <img
                      src={entry.photoUrl}
                      alt="Gästebuch Foto"
                      className="w-full max-h-64 object-cover"
                    />
                  </div>
                )}

                {/* Message */}
                <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                  {entry.message}
                </p>

                {/* Like Button (optional - could be added later) */}
                <div className="mt-4 pt-4 border-t border-border">
                  <button className="flex items-center gap-2 text-muted-foreground hover:text-red-500 transition-colors">
                    <Heart className="w-4 h-4" />
                    <span className="text-sm">Gefällt mir</span>
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
