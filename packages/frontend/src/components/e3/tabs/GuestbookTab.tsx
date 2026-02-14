'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, User, Send, Heart, Camera, X, ImagePlus, Loader2, Workflow } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import api from '@/lib/api';
import dynamic from 'next/dynamic';
import { useWorkflow } from '@/hooks/useWorkflow';

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
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [photo, setPhoto] = useState<PhotoUpload | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [useWorkflowMode, setUseWorkflowMode] = useState(true);
  const { definition: workflowDef, loading: wfLoading } = useWorkflow('GUESTBOOK');

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !message.trim()) return;
    if (photo?.uploading) return; // Wait for upload

    try {
      setSubmitting(true);
      
      const payload: any = {
        authorName: name.trim(),
        message: message.trim(),
      };

      // Add photo data if uploaded
      if (photo?.uploadId) {
        payload.photoUploadId = photo.uploadId;
        payload.photoStoragePath = photo.storagePath;
        payload.photoSizeBytes = photo.photoSizeBytes;
      }

      await api.post(`/events/${eventId}/guestbook`, payload);

      // Clear form
      setName('');
      setMessage('');
      removePhoto();
      
      // Callback
      onEntrySubmit?.();
    } catch (err) {
      void err;
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-app-fg mb-2">Gästebuch</h2>
            <p className="text-app-muted">
              Hinterlasse eine Nachricht für das Brautpaar!
            </p>
          </div>
          {workflowDef && (
            <button
              onClick={() => setUseWorkflowMode(!useWorkflowMode)}
              className="p-2 rounded-lg hover:bg-app-bg transition-colors text-app-muted hover:text-app-fg"
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
          className="bg-app-card border border-app-border rounded-2xl mb-8 shadow-sm overflow-hidden"
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
        className="bg-app-card border border-app-border rounded-2xl p-6 mb-8 shadow-sm"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-app-fg mb-2">
              Dein Name *
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Max Mustermann"
              required
              disabled={submitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-app-fg mb-2">
              Deine Nachricht *
            </label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Schreibe deine Glückwünsche..."
              rows={4}
              required
              disabled={submitting}
            />
          </div>

          {/* Photo Upload Section */}
          <div>
            <label className="block text-sm font-medium text-app-fg mb-2">
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
                  className="flex-1 flex items-center justify-center gap-2 p-4 border-2 border-dashed border-app-border rounded-xl cursor-pointer hover:border-app-accent hover:bg-app-accent/5 transition-colors"
                >
                  <ImagePlus className="w-5 h-5 text-app-muted" />
                  <span className="text-app-muted">Foto auswählen</span>
                </label>
                <label
                  htmlFor="guestbook-photo"
                  className="flex items-center justify-center p-4 border-2 border-dashed border-app-border rounded-xl cursor-pointer hover:border-app-accent hover:bg-app-accent/5 transition-colors"
                  onClick={(e) => {
                    e.preventDefault();
                    if (fileInputRef.current) {
                      fileInputRef.current.setAttribute('capture', 'environment');
                      fileInputRef.current.click();
                    }
                  }}
                >
                  <Camera className="w-5 h-5 text-app-muted" />
                </label>
              </div>
            ) : (
              <div className="relative">
                <div className="relative rounded-xl overflow-hidden bg-app-bg">
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
            disabled={submitting || !name.trim() || !message.trim() || photo?.uploading}
            className="w-full"
          >
            {submitting ? (
              'Wird gesendet...'
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Nachricht senden
              </>
            )}
          </Button>
        </form>
      </motion.div>
      )}

      {/* Entries Timeline */}
      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-20 h-20 rounded-full bg-app-bg flex items-center justify-center mb-4">
            <MessageSquare className="w-10 h-10 text-app-muted" />
          </div>
          <p className="text-app-muted">
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
                className="bg-app-card border border-app-border rounded-2xl p-6 shadow-sm"
              >
                {/* Author */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-app-fg">{entry.authorName}</p>
                    <p className="text-xs text-app-muted">
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
                <p className="text-app-fg leading-relaxed whitespace-pre-wrap">
                  {entry.message}
                </p>

                {/* Like Button (optional - could be added later) */}
                <div className="mt-4 pt-4 border-t border-app-border">
                  <button className="flex items-center gap-2 text-app-muted hover:text-red-500 transition-colors">
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
