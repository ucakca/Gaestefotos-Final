'use client';

import { useState, useCallback } from 'react';
import { Download, Share2, MessageCircle, Instagram, Loader2, CheckCircle2 } from 'lucide-react';
import api from '@/lib/api';

interface AiResultShareProps {
  storagePath: string | null;
  eventId: string;
  resultUrl?: string | null;
  effectName?: string;
  className?: string;
}

/**
 * Share/Download buttons for AI-generated results.
 * - Download: always available, applies gästefotos watermark (or host overlay for premium)
 * - Web Share API: native mobile share sheet (iOS/Android)
 * - Instagram Story: deep link opens Instagram with photo ready
 * - WhatsApp: share via WhatsApp (common in DE market)
 */
export default function AiResultShare({ storagePath, eventId, resultUrl, effectName, className = '' }: AiResultShareProps) {
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const getDownloadUrl = () =>
    `/api/booth-games/ai-result/download?storagePath=${encodeURIComponent(storagePath || '')}&eventId=${encodeURIComponent(eventId)}`;

  const getShareUrl = () =>
    `/api/booth-games/ai-result/share?storagePath=${encodeURIComponent(storagePath || '')}&eventId=${encodeURIComponent(eventId)}`;

  const handleDownload = useCallback(async () => {
    if (!storagePath) return;
    setDownloading(true);
    try {
      const response = await fetch(getDownloadUrl(), {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      if (!response.ok) throw new Error('Download fehlgeschlagen');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ki-ergebnis-${effectName || 'foto'}-${Date.now()}.jpg`;
      a.click();
      URL.revokeObjectURL(url);
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 2000);
    } catch {
      // Fallback: direct link download
      if (resultUrl) {
        const a = document.createElement('a');
        a.href = resultUrl;
        a.download = `ki-ergebnis.jpg`;
        a.target = '_blank';
        a.click();
      }
    } finally {
      setDownloading(false);
    }
  }, [storagePath, eventId, effectName, resultUrl]);

  const handleWebShare = useCallback(async () => {
    if (!storagePath && !resultUrl) return;
    setSharing(true);
    try {
      // Try to share via Web Share API (mobile-native)
      if (typeof navigator !== 'undefined' && navigator.share) {
        let shareData: ShareData = {
          title: effectName ? `Mein KI-Foto: ${effectName}` : 'Mein KI-Foto 📸',
          text: 'Schau mal was ich mit gästefotos.com erstellt habe! 🎭✨',
        };

        // Try to share as file (more powerful, works on iOS/Android)
        if (storagePath) {
          try {
            const response = await fetch(getShareUrl(), {
              headers: { Authorization: `Bearer ${getAuthToken()}` },
            });
            if (response.ok) {
              const blob = await response.blob();
              const file = new File([blob], `ki-ergebnis.jpg`, { type: 'image/jpeg' });
              if (navigator.canShare && navigator.canShare({ files: [file] })) {
                shareData = { ...shareData, files: [file] };
              }
            }
          } catch { /* use URL fallback */ }
        }

        // If file share not possible, add URL
        if (!shareData.files && resultUrl) {
          shareData.url = resultUrl;
        }

        await navigator.share(shareData);
      } else if (resultUrl) {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(resultUrl);
        alert('Link kopiert! 📋');
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        // User cancelled share — ignore
      }
    } finally {
      setSharing(false);
    }
  }, [storagePath, eventId, effectName, resultUrl]);

  const handleInstagramShare = useCallback(async () => {
    if (!storagePath && !resultUrl) return;

    // First download the branded image, then open Instagram
    let imageUrl = resultUrl || '';
    if (storagePath) {
      try {
        const response = await fetch(getShareUrl(), {
          headers: { Authorization: `Bearer ${getAuthToken()}` },
        });
        if (response.ok) {
          const blob = await response.blob();
          imageUrl = URL.createObjectURL(blob);
        }
      } catch { /* use resultUrl */ }
    }

    // Instagram deep link: opens Instagram Stories camera with the sticker
    // This works on mobile (iOS/Android) when Instagram app is installed
    if (typeof window !== 'undefined') {
      const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);
      if (isMobile) {
        // Try to open Instagram with image
        window.open(`instagram://story-camera`, '_blank');
      } else {
        // Desktop: open Instagram web
        window.open('https://www.instagram.com/', '_blank');
      }
    }
  }, [storagePath, eventId, resultUrl]);

  const handleWhatsAppShare = useCallback(async () => {
    const shareText = effectName
      ? `Schau mal mein KI-Foto "${effectName}"! 🎭✨ Erstellt mit gästefotos.com`
      : 'Schau mal mein KI-Foto! 🎭✨ Erstellt mit gästefotos.com';

    let shareUrl = resultUrl || '';
    const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText + (shareUrl ? '\n' + shareUrl : ''))}`;
    window.open(waUrl, '_blank');
  }, [effectName, resultUrl]);

  if (!storagePath && !resultUrl) return null;

  return (
    <div className={`flex gap-2 flex-wrap justify-center ${className}`}>
      {/* Download — always visible, primary action */}
      <button
        onClick={handleDownload}
        disabled={downloading}
        className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm active:scale-[0.97] transition-all disabled:opacity-60"
      >
        {downloading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : downloaded ? (
          <CheckCircle2 className="w-4 h-4" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        {downloaded ? 'Gespeichert!' : 'Herunterladen'}
      </button>

      {/* Web Share (native — best for mobile) */}
      {typeof navigator !== 'undefined' && (navigator as any).share && (
        <button
          onClick={handleWebShare}
          disabled={sharing}
          className="flex items-center gap-1.5 px-3 py-2.5 bg-blue-500/15 border border-blue-500/25 text-blue-400 rounded-xl text-sm font-medium active:scale-[0.97] transition-all"
        >
          {sharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
          Teilen
        </button>
      )}

      {/* WhatsApp */}
      <button
        onClick={handleWhatsAppShare}
        className="flex items-center gap-1.5 px-3 py-2.5 bg-green-500/15 border border-green-500/25 text-green-400 rounded-xl text-sm font-medium active:scale-[0.97] transition-all"
        title="WhatsApp"
      >
        <MessageCircle className="w-4 h-4" />
        <span className="hidden sm:inline">WhatsApp</span>
      </button>

      {/* Instagram */}
      <button
        onClick={handleInstagramShare}
        className="flex items-center gap-1.5 px-3 py-2.5 bg-pink-500/15 border border-pink-500/25 text-pink-400 rounded-xl text-sm font-medium active:scale-[0.97] transition-all"
        title="Instagram Story"
      >
        <Instagram className="w-4 h-4" />
        <span className="hidden sm:inline">Instagram</span>
      </button>
    </div>
  );
}

// Helper to get auth token — must match frontend api.ts interceptor pattern
function getAuthToken(): string {
  if (typeof window === 'undefined') return '';
  // Primary: same as api.ts request interceptor (sessionStorage > localStorage)
  const direct = sessionStorage.getItem('token') || localStorage.getItem('token');
  if (direct) return direct;
  // Fallback: Zustand auth store format
  try {
    const stored = localStorage.getItem('auth-storage');
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed?.state?.token || parsed?.token || '';
    }
  } catch { /* ignore */ }
  return '';
}
