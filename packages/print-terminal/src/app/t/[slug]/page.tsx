'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Printer, Keyboard, QrCode, Camera, CheckCircle, AlertTriangle, Loader2, RotateCcw, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import dynamic from 'next/dynamic';

const QrScanner = dynamic(() => import('@/components/QrScanner'), { ssr: false });

type TerminalState = 'IDLE' | 'PIN_ENTRY' | 'QR_SCAN' | 'PREVIEW' | 'PRINTING' | 'DONE' | 'ERROR';

interface PrintJobData {
  id: string;
  pinCode: string;
  status: string;
  photoUrl: string;
  gridX: number | null;
  gridY: number | null;
  printedAt: string | null;
  expiresAt: string | null;
}

interface EventInfo {
  id: string;
  title: string;
  slug: string;
}

export default function TerminalPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [state, setState] = useState<TerminalState>('IDLE');
  const [eventInfo, setEventInfo] = useState<EventInfo | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [printJob, setPrintJob] = useState<PrintJobData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [printResult, setPrintResult] = useState<{ label: string } | null>(null);

  const pinInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load event info by slug
  useEffect(() => {
    async function loadEvent() {
      try {
        const { data } = await api.get(`/events/by-slug/${slug}`);
        if (data?.event) {
          setEventInfo({ id: data.event.id, title: data.event.title, slug: data.event.slug });
          setEventId(data.event.id);
        }
      } catch {
        setError('Event nicht gefunden');
      } finally {
        setLoading(false);
      }
    }
    if (slug) loadEvent();
  }, [slug]);

  // Auto-reset to IDLE after 30s of inactivity in DONE/ERROR
  useEffect(() => {
    if (state === 'DONE' || state === 'ERROR') {
      idleTimerRef.current = setTimeout(() => resetTerminal(), 30000);
      return () => { if (idleTimerRef.current) clearTimeout(idleTimerRef.current); };
    }
  }, [state]);

  const resetTerminal = useCallback(() => {
    setState('IDLE');
    setPinInput('');
    setPrintJob(null);
    setError(null);
    setPrintResult(null);
  }, []);

  // Focus PIN input when entering PIN mode
  useEffect(() => {
    if (state === 'PIN_ENTRY' && pinInputRef.current) {
      pinInputRef.current.focus();
    }
  }, [state]);

  const lookupPin = async (code: string) => {
    if (!eventId || code.length !== 4) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/events/${eventId}/mosaic/print-job/${code.toUpperCase()}`);
      if (data.ok && data.printJob) {
        setPrintJob(data.printJob);
        setState('PREVIEW');
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Ungültiger Code';
      setError(msg);
      setState('ERROR');
    } finally {
      setLoading(false);
    }
  };

  const triggerPrint = async () => {
    if (!eventId || !printJob) return;
    setState('PRINTING');
    try {
      const { data } = await api.post(`/events/${eventId}/mosaic/print-job/${printJob.pinCode}/print`);
      if (data.ok) {
        const label = data.position?.label || '?';
        setPrintResult({ label });

        // Build sticker URL (300 DPI high-res image)
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
        const stickerUrl = `${baseUrl}/api/events/${eventId}/mosaic/print-job/${printJob.pinCode}/sticker?dpi=300`;

        // Open print window with sticker image
        try {
          const printWindow = window.open('', '_blank', 'width=600,height=700');
          if (printWindow) {
            printWindow.document.write(`
              <!DOCTYPE html>
              <html>
              <head>
                <title>Sticker ${label}</title>
                <style>
                  @page { margin: 0; size: auto; }
                  body { margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #000; }
                  img { max-width: 100%; max-height: 100vh; }
                  @media print {
                    body { background: #fff; }
                    img { width: 100%; height: auto; }
                  }
                </style>
              </head>
              <body>
                <img src="${stickerUrl}" onload="setTimeout(()=>{window.print();setTimeout(()=>window.close(),1000)},500)" />
              </body>
              </html>
            `);
            printWindow.document.close();
          }
        } catch { /* print window blocked — continue anyway */ }

        // Auto-confirm after delay
        setTimeout(async () => {
          try {
            await api.post(`/events/${eventId}/mosaic/print-job/${printJob.pinCode}/confirm`);
          } catch { /* best effort */ }
          setState('DONE');
        }, 5000);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Druckfehler');
      setState('ERROR');
    }
  };

  const handlePinKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && pinInput.length === 4) {
      lookupPin(pinInput);
    }
    if (e.key === 'Escape') {
      resetTerminal();
    }
  };

  if (loading && !eventInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <Loader2 className="w-8 h-8 animate-spin text-brand-300" />
      </div>
    );
  }

  if (error && !eventInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 p-8">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Event nicht gefunden</h1>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header Bar */}
      <header className="flex items-center justify-between px-6 py-4 bg-gray-900/50 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <Printer className="w-6 h-6 text-brand-300" />
          <span className="font-bold text-lg">gästefotos.com</span>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium">{eventInfo?.title}</div>
          <div className="text-xs text-gray-500">Print Terminal</div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-8">
        <AnimatePresence mode="wait">
          {/* ─── IDLE: Choose input method ─── */}
          {state === 'IDLE' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="text-center max-w-md"
            >
              <div className="w-24 h-24 rounded-3xl bg-brand-500/20 flex items-center justify-center mx-auto mb-8">
                <QrCode className="w-12 h-12 text-brand-300" />
              </div>
              <h2 className="text-3xl font-bold mb-3">Sticker drucken</h2>
              <p className="text-gray-400 mb-10">Scanne deinen QR-Code oder gib deinen 4-stelligen Code ein</p>

              <div className="grid grid-cols-1 gap-4">
                <button
                  onClick={() => setState('PIN_ENTRY')}
                  className="flex items-center justify-center gap-3 px-8 py-5 bg-brand-500 hover:bg-brand-600 rounded-2xl text-white font-semibold text-lg transition-all active:scale-95"
                >
                  <Keyboard className="w-6 h-6" />
                  Code eingeben
                </button>
                <button
                  onClick={() => setState('QR_SCAN')}
                  className="flex items-center justify-center gap-3 px-8 py-5 bg-gray-800 hover:bg-gray-700 rounded-2xl text-white font-semibold text-lg transition-all active:scale-95 border border-gray-700"
                >
                  <Camera className="w-6 h-6" />
                  QR-Code scannen
                </button>
              </div>
            </motion.div>
          )}

          {/* ─── PIN ENTRY ─── */}
          {state === 'PIN_ENTRY' && (
            <motion.div
              key="pin"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="text-center max-w-md w-full"
            >
              <button
                onClick={resetTerminal}
                className="absolute top-20 left-6 p-3 rounded-xl bg-gray-800 hover:bg-gray-700"
              >
                <X className="w-5 h-5" />
              </button>

              <Keyboard className="w-12 h-12 text-brand-300 mx-auto mb-6" />
              <h2 className="text-2xl font-bold mb-2">Code eingeben</h2>
              <p className="text-gray-400 mb-8">4-stelliger Code von deinem Handy</p>

              <input
                ref={pinInputRef}
                type="text"
                value={pinInput}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
                  setPinInput(val);
                }}
                onKeyDown={handlePinKeyDown}
                maxLength={4}
                className="w-full text-center text-5xl font-mono font-bold tracking-[0.5em] bg-gray-900 border-2 border-gray-700 focus:border-brand-500 rounded-2xl py-6 px-4 text-white outline-none transition-colors"
                placeholder="____"
                autoComplete="off"
                autoFocus
              />

              <div className="flex gap-3 mt-8">
                <button
                  onClick={resetTerminal}
                  className="flex-1 py-4 rounded-xl bg-gray-800 hover:bg-gray-700 font-medium transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  onClick={() => lookupPin(pinInput)}
                  disabled={pinInput.length !== 4 || loading}
                  className="flex-1 py-4 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-30 disabled:cursor-not-allowed font-semibold transition-all flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Weiter'}
                </button>
              </div>
            </motion.div>
          )}

          {/* ─── QR SCAN ─── */}
          {state === 'QR_SCAN' && (
            <motion.div
              key="qr"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="text-center max-w-lg w-full"
            >
              <Camera className="w-12 h-12 text-brand-300 mx-auto mb-6" />
              <h2 className="text-2xl font-bold mb-2">QR-Code scannen</h2>
              <p className="text-gray-400 mb-6">Halte den QR-Code von deinem Handy vor die Kamera</p>

              <div className="relative mb-6 border-2 border-gray-700 rounded-2xl overflow-hidden">
                <QrScanner
                  onScan={(text) => {
                    // QR payload format: print://<eventId>/<pinCode>
                    const match = text.match(/print:\/\/[^/]+\/([A-Z0-9]{4})/);
                    if (match) {
                      lookupPin(match[1]);
                    } else if (/^[A-Z0-9]{4}$/.test(text.trim().toUpperCase())) {
                      lookupPin(text.trim().toUpperCase());
                    } else {
                      setError('Ungültiger QR-Code');
                      setState('ERROR');
                    }
                  }}
                  onError={(err) => {
                    setError(err);
                    setState('ERROR');
                  }}
                />
              </div>

              <button
                onClick={() => { setState('PIN_ENTRY'); }}
                className="text-brand-300 hover:text-brand-200 text-sm font-medium"
              >
                Stattdessen Code eintippen →
              </button>

              <div className="mt-4">
                <button
                  onClick={resetTerminal}
                  className="py-3 px-8 rounded-xl bg-gray-800 hover:bg-gray-700 font-medium transition-colors"
                >
                  Abbrechen
                </button>
              </div>
            </motion.div>
          )}

          {/* ─── PREVIEW ─── */}
          {state === 'PREVIEW' && printJob && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center max-w-md w-full"
            >
              <h2 className="text-2xl font-bold mb-6">Dein Foto</h2>

              <div className="relative aspect-square max-w-xs mx-auto rounded-2xl overflow-hidden bg-gray-900 border-2 border-brand-500/30 mb-6">
                <img
                  src={printJob.photoUrl}
                  alt="Dein Foto"
                  className="w-full h-full object-cover"
                />
              </div>

              <p className="text-gray-400 mb-2">Code: <span className="font-mono font-bold text-white">{printJob.pinCode}</span></p>

              <div className="flex gap-3 mt-8">
                <button
                  onClick={resetTerminal}
                  className="flex-1 py-4 rounded-xl bg-gray-800 hover:bg-gray-700 font-medium transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  onClick={triggerPrint}
                  className="flex-1 py-4 rounded-xl bg-green-600 hover:bg-green-700 font-bold text-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Printer className="w-5 h-5" />
                  Jetzt drucken!
                </button>
              </div>
            </motion.div>
          )}

          {/* ─── PRINTING ─── */}
          {state === 'PRINTING' && (
            <motion.div
              key="printing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center max-w-md"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                className="w-24 h-24 rounded-3xl bg-brand-500/20 flex items-center justify-center mx-auto mb-8"
              >
                <Printer className="w-12 h-12 text-brand-300" />
              </motion.div>
              <h2 className="text-3xl font-bold mb-3">Wird gedruckt...</h2>
              {printResult && (
                <p className="text-xl text-brand-300 font-mono font-bold">
                  Position: {printResult.label}
                </p>
              )}
              <p className="text-gray-400 mt-4">Bitte warte einen Moment</p>
            </motion.div>
          )}

          {/* ─── DONE ─── */}
          {state === 'DONE' && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-center max-w-md"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
              >
                <CheckCircle className="w-24 h-24 text-green-400 mx-auto mb-6" />
              </motion.div>
              <h2 className="text-3xl font-bold mb-3">Fertig!</h2>
              {printResult && (
                <p className="text-2xl text-brand-300 font-mono font-bold mb-2">
                  Position: {printResult.label}
                </p>
              )}
              <p className="text-gray-400 mb-8">
                Nimm deinen Sticker und klebe ihn auf die Mosaic Wall!
              </p>
              <button
                onClick={resetTerminal}
                className="px-10 py-4 rounded-2xl bg-brand-500 hover:bg-brand-600 font-semibold text-lg transition-all active:scale-95 flex items-center justify-center gap-2 mx-auto"
              >
                <RotateCcw className="w-5 h-5" />
                Nächster Gast
              </button>
            </motion.div>
          )}

          {/* ─── ERROR ─── */}
          {state === 'ERROR' && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center max-w-md"
            >
              <AlertTriangle className="w-20 h-20 text-red-400 mx-auto mb-6" />
              <h2 className="text-2xl font-bold mb-3">Fehler</h2>
              <p className="text-gray-400 mb-8">{error}</p>
              <button
                onClick={resetTerminal}
                className="px-10 py-4 rounded-2xl bg-gray-800 hover:bg-gray-700 font-semibold text-lg transition-all flex items-center justify-center gap-2 mx-auto"
              >
                <RotateCcw className="w-5 h-5" />
                Nochmal versuchen
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="px-6 py-3 text-center text-xs text-gray-600 border-t border-gray-800/50">
        gästefotos.com Print Terminal • {eventInfo?.title}
      </footer>
    </div>
  );
}
