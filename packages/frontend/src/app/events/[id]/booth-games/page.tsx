'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import api from '@/lib/api';
import { Event as EventType } from '@gaestefotos/shared';
import AppLayout from '@/components/AppLayout';
import DashboardFooter from '@/components/DashboardFooter';
import { FullPageLoader } from '@/components/ui/FullPageLoader';
import { Button } from '@/components/ui/Button';
import { useToastStore } from '@/store/toastStore';
import { usePackageFeatures } from '@/hooks/usePackageFeatures';
import {
  Gamepad2, ArrowLeft, RotateCw, Trophy, Star, Send, Sparkles, Loader2, Pen, Camera, Video, FlipHorizontal2,
} from 'lucide-react';
import dynamic from 'next/dynamic';

const GraffitiCanvas = dynamic(() => import('@/components/booth/GraffitiCanvas'), { ssr: false });

interface GameInfo {
  type: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  requiresBooth: boolean;
  requiresAI: boolean;
}

type ActiveGame =
  | null
  | { type: 'slot_machine'; prop: string; accessory: string; challenge: string }
  | { type: 'compliment_mirror'; phase: 'selfie' | 'loading' | 'result'; compliment?: string; verdict?: string; source?: string; selfieUrl?: string }
  | { type: 'mimik_duell'; phase: 'challenge' | 'result'; challenge: any; sessionId?: string; score?: number; rank?: string }
  | { type: 'mystery_overlay'; overlay: any }
  | { type: 'vows_and_views' }
  | { type: 'face_switch'; phase: 'input' | 'processing' | 'result'; photoId?: string; result?: any }
  | { type: 'digital_graffiti'; photoUrl?: string; photoId?: string };

export default function BoothGamesPage({ params }: { params: Promise<{ id: string }> }) {
  const [eventId, setEventId] = useState<string | null>(null);
  const [event, setEvent] = useState<EventType | null>(null);
  const [games, setGames] = useState<GameInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeGame, setActiveGame] = useState<ActiveGame>(null);
  const [spinning, setSpinning] = useState(false);
  const [vowMessage, setVowMessage] = useState('');
  const [vowName, setVowName] = useState('');
  const [sending, setSending] = useState(false);
  const [facePhotoId, setFacePhotoId] = useState('');
  const [graffitiPhotoUrl, setGraffitiPhotoUrl] = useState('');
  const [graffitiPhotoId, setGraffitiPhotoId] = useState('');
  const { showToast } = useToastStore();

  React.useEffect(() => { params.then(p => setEventId(p.id)); }, [params]);

  const loadData = useCallback(async () => {
    if (!eventId) return;
    try {
      const [eventRes, catalogRes] = await Promise.all([
        api.get(`/events/${eventId}`),
        api.get('/booth-games/catalog'),
      ]);
      setEvent(eventRes.data.event || eventRes.data);
      setGames(catalogRes.data.games || []);
    } catch { /* */ } finally { setLoading(false); }
  }, [eventId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSlotSpin = async () => {
    setSpinning(true);
    try {
      const { data } = await api.post('/booth-games/slot-machine/spin', { eventId });
      setActiveGame({ type: 'slot_machine', prop: data.prop, accessory: data.accessory, challenge: data.challenge });
    } catch { showToast('Fehler beim Drehen', 'error'); }
    finally { setSpinning(false); }
  };

  const handleCompliment = async (selfieUrl?: string) => {
    setActiveGame({ type: 'compliment_mirror', phase: 'loading', selfieUrl });
    try {
      const { data } = await api.post('/booth-games/compliment-mirror', {
        eventId,
        eventType: (event as any)?.eventType || undefined,
        eventTitle: event?.title || undefined,
        useAI: true,
      });
      setActiveGame({
        type: 'compliment_mirror',
        phase: 'result',
        compliment: data.compliment,
        verdict: data.verdict,
        source: data.source || 'ai',
        selfieUrl,
      });
    } catch {
      showToast('Fehler', 'error');
      setActiveGame(null);
    }
  };

  const handleMimikChallenge = async () => {
    try {
      const { data } = await api.post('/booth-games/mimik-duell/challenge', { eventId });
      setActiveGame({ type: 'mimik_duell', phase: 'challenge', challenge: data.challenge, sessionId: data.sessionId });
    } catch { showToast('Fehler', 'error'); }
  };

  const handleMimikScore = async () => {
    if (activeGame?.type !== 'mimik_duell' || !activeGame.sessionId) return;
    try {
      const { data } = await api.post('/booth-games/mimik-duell/score', { sessionId: activeGame.sessionId });
      setActiveGame({ ...activeGame, phase: 'result', score: data.score, rank: data.rank });
    } catch { showToast('Bewertung fehlgeschlagen', 'error'); }
  };

  const handleMysteryOverlay = async () => {
    try {
      const { data } = await api.post('/booth-games/mystery-overlay', { eventId });
      setActiveGame({ type: 'mystery_overlay', overlay: data.overlay });
    } catch { showToast('Fehler', 'error'); }
  };

  const handleVowSubmit = async () => {
    if (!vowMessage.trim()) return;
    setSending(true);
    try {
      await api.post('/booth-games/vows-and-views', { eventId, message: vowMessage, guestName: vowName || 'Anonym' });
      showToast('Botschaft gespeichert! 💌', 'success');
      setVowMessage('');
      setVowName('');
      setActiveGame(null);
    } catch { showToast('Fehler beim Speichern', 'error'); }
    finally { setSending(false); }
  };

  const startGame = (type: string) => {
    switch (type) {
      case 'slot_machine': handleSlotSpin(); break;
      case 'compliment_mirror': setActiveGame({ type: 'compliment_mirror', phase: 'selfie' }); break;
      case 'mimik_duell': handleMimikChallenge(); break;
      case 'mystery_overlay': handleMysteryOverlay(); break;
      case 'vows_and_views': setActiveGame({ type: 'vows_and_views' }); break;
      case 'face_switch': setActiveGame({ type: 'face_switch', phase: 'input' }); break;
      case 'digital_graffiti': setActiveGame({ type: 'digital_graffiti' }); break;
      default: showToast('Dieses Spiel ist noch nicht verfügbar', 'info');
    }
  };

  const { features: pkgFeatures, loading: pkgLoading } = usePackageFeatures(eventId);

  if (loading || pkgLoading || !eventId) return <FullPageLoader />;

  const boothGamesEnabled = pkgFeatures?.boothGames === true;

  if (!boothGamesEnabled) {
    return (
      <AppLayout showBackButton backUrl={`/events/${eventId}/dashboard`}>
        <div className="max-w-md mx-auto px-4 py-20 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
            <Gamepad2 className="w-10 h-10 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Foto-Spiele</h1>
          <p className="text-muted-foreground mb-6">Interaktive Foto-Spiele sind in deinem aktuellen Paket nicht enthalten. Upgrade für Zugang.</p>
          <Button variant="primary" size="md" onClick={() => window.location.href = `/events/${eventId}/package`}>
            Paket upgraden
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout showBackButton backUrl={`/events/${eventId}/dashboard`}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          {activeGame && (
            <button onClick={() => setActiveGame(null)} className="p-2 rounded-lg hover:bg-muted transition">
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Gamepad2 className="w-6 h-6 text-primary" />
              Booth-Spielchen
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">{event?.title || 'Event'}</p>
          </div>
        </div>

        {/* Game Catalog */}
        {!activeGame && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {games.map(game => (
              <motion.button
                key={game.type}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => startGame(game.type)}
                className="text-left p-5 rounded-2xl border border-border bg-card hover:border-primary/50 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-start gap-4">
                  <span className="text-3xl">{game.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-foreground flex items-center gap-2">
                      {game.name}
                      {game.requiresAI && <Sparkles className="w-3.5 h-3.5 text-purple-500" />}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{game.description}</p>
                    <div className="flex gap-2 mt-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        game.category === 'booth' ? 'bg-blue-100 text-blue-700' :
                        game.category === 'app' ? 'bg-success/15 text-success' :
                        'bg-pink-100 text-pink-700'
                      }`}>
                        {game.category === 'booth' ? '📱 Booth' : game.category === 'app' ? '📱 App' : '📖 Gästebuch'}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.button>
            ))}

            {/* Air Graffiti — separate page */}
            <Link
              href={`/events/${eventId}/air-graffiti`}
              className="text-left p-5 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 hover:border-emerald-400 transition"
            >
              <div className="flex items-start gap-4">
                <span className="text-3xl">🖐️</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-foreground">Air Graffiti Wall</div>
                  <p className="text-sm text-muted-foreground mt-1">Male in der Luft mit Hand-Tracking (Webcam)</p>
                  <div className="flex gap-2 mt-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">🖐️ Webcam</span>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* Slot Machine Result */}
        {activeGame?.type === 'slot_machine' && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8">
            <div className="text-5xl mb-6">🎰</div>
            <h2 className="text-xl font-bold text-foreground mb-6">Deine Aufgabe:</h2>
            <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-8">
              {[
                { label: 'Pose', value: activeGame.prop, color: 'from-blue-500 to-cyan-500' },
                { label: 'Requisite', value: activeGame.accessory, color: 'from-purple-500 to-pink-500' },
                { label: 'Challenge', value: activeGame.challenge, color: 'from-orange-500 to-red-500' },
              ].map((slot, i) => (
                <motion.div key={slot.label}
                  initial={{ y: -50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: i * 0.3 }}>
                  <div className={`bg-gradient-to-br ${slot.color} text-white rounded-xl p-4 text-center`}>
                    <div className="text-xs font-medium opacity-80 mb-1">{slot.label}</div>
                    <div className="text-sm font-bold">{slot.value}</div>
                  </div>
                </motion.div>
              ))}
            </div>
            <p className="text-muted-foreground mb-6">Du hast 5 Sekunden! 📸</p>
            <Button onClick={handleSlotSpin} disabled={spinning} className="gap-2">
              <RotateCw className={`w-4 h-4 ${spinning ? 'animate-spin' : ''}`} />
              Nochmal drehen
            </Button>
          </motion.div>
        )}

        {/* Compliment Mirror */}
        {activeGame?.type === 'compliment_mirror' && (
          <ComplimentMirrorView
            phase={activeGame.phase}
            compliment={activeGame.compliment}
            verdict={activeGame.verdict}
            source={activeGame.source}
            selfieUrl={activeGame.selfieUrl}
            onCapture={(selfieUrl) => handleCompliment(selfieUrl)}
            onRetry={() => setActiveGame({ type: 'compliment_mirror', phase: 'selfie' })}
          />
        )}

        {/* Mimik-Duell */}
        {activeGame?.type === 'mimik_duell' && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8">
            {activeGame.phase === 'challenge' ? (
              <>
                <div className="text-6xl mb-4">{activeGame.challenge.emoji}</div>
                <h2 className="text-2xl font-bold text-foreground mb-2">{activeGame.challenge.name}</h2>
                <p className="text-muted-foreground mb-8">{activeGame.challenge.description}</p>
                <div className="flex gap-3 justify-center">
                  <Button onClick={handleMimikScore} className="gap-2" size="lg">
                    <Star className="w-5 h-5" /> Bewerten!
                  </Button>
                  <Button onClick={handleMimikChallenge} variant="secondary" className="gap-2">
                    <RotateCw className="w-4 h-4" /> Andere Challenge
                  </Button>
                </div>
              </>
            ) : (
              <>
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}
                  className="text-6xl mb-4">
                  {(activeGame.score || 0) >= 90 ? '🏆' : (activeGame.score || 0) >= 70 ? '🌟' : '😄'}
                </motion.div>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                  className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-600 mb-2">
                  {activeGame.score}/100
                </motion.div>
                <p className="text-lg font-semibold text-foreground mb-1">{activeGame.rank}</p>
                <p className="text-muted-foreground text-sm mb-8">{activeGame.challenge.name}: {activeGame.challenge.emoji}</p>
                <div className="flex gap-3 justify-center">
                  <Button onClick={handleMimikChallenge} className="gap-2">
                    <RotateCw className="w-4 h-4" /> Nochmal spielen
                  </Button>
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* Mystery Overlay */}
        {activeGame?.type === 'mystery_overlay' && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8">
            <div className="text-5xl mb-6">🎭</div>
            <h2 className="text-xl font-bold text-foreground mb-4">Dein Mystery Overlay:</h2>
            <motion.div initial={{ rotateY: 180 }} animate={{ rotateY: 0 }} transition={{ duration: 0.6 }}
              className="inline-block bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl p-8 mb-6">
              <div className="text-4xl mb-2">{activeGame.overlay.name}</div>
              <span className="text-sm text-muted-foreground px-3 py-1 bg-muted rounded-full">
                {activeGame.overlay.category}
              </span>
            </motion.div>
            <p className="text-muted-foreground mb-6">Posiere blind — das Overlay wird erst NACH dem Foto sichtbar!</p>
            <Button onClick={handleMysteryOverlay} className="gap-2">
              <RotateCw className="w-4 h-4" /> Anderes Overlay
            </Button>
          </motion.div>
        )}

        {/* Face Switch */}
        {activeGame?.type === 'face_switch' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="max-w-md mx-auto py-8">
            <div className="text-center mb-6">
              <div className="text-5xl mb-4">🔄</div>
              <h2 className="text-xl font-bold text-foreground">Face Switch</h2>
              <p className="text-sm text-muted-foreground mt-1">Gesichter in einem Gruppenfoto tauschen (AI)</p>
            </div>
            {activeGame.phase === 'input' && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1">Foto-ID eingeben</label>
                  <input
                    value={facePhotoId}
                    onChange={e => setFacePhotoId(e.target.value)}
                    placeholder="Photo-ID (aus der Galerie)"
                    className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Mindestens 2 Gesichter im Foto nötig</p>
                </div>
                <Button
                  onClick={async () => {
                    if (!facePhotoId.trim()) return;
                    setActiveGame({ type: 'face_switch', phase: 'processing', photoId: facePhotoId });
                    try {
                      const { data } = await api.post('/booth-games/face-switch', { photoId: facePhotoId });
                      setActiveGame({ type: 'face_switch', phase: 'result', photoId: facePhotoId, result: data });
                    } catch (err: any) {
                      showToast(err?.response?.data?.error || 'Face Switch fehlgeschlagen', 'error');
                      setActiveGame({ type: 'face_switch', phase: 'input' });
                    }
                  }}
                  disabled={!facePhotoId.trim()}
                  className="w-full gap-2" size="lg"
                >
                  <Sparkles className="w-4 h-4" /> Gesichter tauschen
                </Button>
              </div>
            )}
            {activeGame.phase === 'processing' && (
              <div className="text-center py-12">
                <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary mb-4" />
                <p className="text-muted-foreground">KI tauscht Gesichter...</p>
              </div>
            )}
            {activeGame.phase === 'result' && activeGame.result && (
              <div className="text-center">
                <div className="text-4xl mb-4">✅</div>
                <p className="text-lg font-semibold text-foreground mb-2">{activeGame.result.facesSwapped} Gesichter getauscht!</p>
                <p className="text-sm text-muted-foreground mb-6">Das neue Foto wurde gespeichert.</p>
                <Button onClick={() => setActiveGame({ type: 'face_switch', phase: 'input' })} className="gap-2">
                  <RotateCw className="w-4 h-4" /> Nochmal
                </Button>
              </div>
            )}
          </motion.div>
        )}

        {/* Digital Graffiti */}
        {activeGame?.type === 'digital_graffiti' && !activeGame.photoUrl && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="max-w-md mx-auto py-8">
            <div className="text-center mb-6">
              <div className="text-5xl mb-4">🎨</div>
              <h2 className="text-xl font-bold text-foreground">Digital Graffiti</h2>
              <p className="text-sm text-muted-foreground mt-1">Male auf einem Foto — Emojis, Zeichnungen, Texte</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">Foto-URL eingeben</label>
                <input
                  value={graffitiPhotoUrl}
                  onChange={e => setGraffitiPhotoUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">Photo-ID (optional)</label>
                <input
                  value={graffitiPhotoId}
                  onChange={e => setGraffitiPhotoId(e.target.value)}
                  placeholder="Photo-ID für Verknüpfung"
                  className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <Button
                onClick={() => {
                  if (!graffitiPhotoUrl.trim()) { showToast('Bitte Foto-URL eingeben', 'error'); return; }
                  setActiveGame({ type: 'digital_graffiti', photoUrl: graffitiPhotoUrl, photoId: graffitiPhotoId || undefined });
                }}
                disabled={!graffitiPhotoUrl.trim()}
                className="w-full gap-2" size="lg"
              >
                <Pen className="w-4 h-4" /> Graffiti starten
              </Button>
            </div>
          </motion.div>
        )}
        {activeGame?.type === 'digital_graffiti' && activeGame.photoUrl && (
          <GraffitiCanvas
            photoUrl={activeGame.photoUrl}
            photoId={activeGame.photoId || ''}
            eventId={eventId || ''}
            onSave={async (mergedDataUrl, drawingData) => {
              try {
                await api.post('/graffiti/save', {
                  photoId: activeGame.photoId,
                  eventId,
                  drawingData,
                });
                showToast('Graffiti gespeichert! 🎨', 'success');
                setActiveGame(null);
              } catch {
                showToast('Speichern fehlgeschlagen', 'error');
              }
            }}
            onClose={() => setActiveGame(null)}
          />
        )}

        {/* Vows & Views */}
        {activeGame?.type === 'vows_and_views' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="max-w-md mx-auto py-8">
            <div className="text-center mb-6">
              <div className="text-5xl mb-4">💌</div>
              <h2 className="text-xl font-bold text-foreground">Vows & Views</h2>
              <p className="text-sm text-muted-foreground mt-1">Deine persönliche Botschaft im Polaroid-Style</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">Dein Name</label>
                <input
                  value={vowName}
                  onChange={e => setVowName(e.target.value)}
                  placeholder="Anonym"
                  className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">Deine Botschaft *</label>
                <textarea
                  value={vowMessage}
                  onChange={e => setVowMessage(e.target.value)}
                  placeholder="Schreib etwas Liebes, Lustiges oder Weises..."
                  rows={4}
                  className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                />
              </div>
              <Button onClick={handleVowSubmit} disabled={!vowMessage.trim() || sending} className="w-full gap-2" size="lg">
                <Send className="w-4 h-4" />
                {sending ? 'Wird gespeichert...' : 'Botschaft absenden'}
              </Button>
            </div>
          </motion.div>
        )}
      </div>
      <DashboardFooter eventId={eventId} />
    </AppLayout>
  );
}

// ─── Compliment Mirror Component ────────────────────────────

function ComplimentMirrorView({
  phase,
  compliment,
  verdict,
  source,
  selfieUrl,
  onCapture,
  onRetry,
}: {
  phase: 'selfie' | 'loading' | 'result';
  compliment?: string;
  verdict?: string;
  source?: string;
  selfieUrl?: string;
  onCapture: (selfieUrl: string) => void;
  onRetry: () => void;
}) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [cameraReady, setCameraReady] = React.useState(false);
  const [facingMode, setFacingMode] = React.useState<'user' | 'environment'>('user');
  const [countdown, setCountdown] = React.useState<number | null>(null);

  // Start camera
  React.useEffect(() => {
    if (phase !== 'selfie') return;
    let stream: MediaStream | null = null;

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setCameraReady(true);
        }
      } catch (err) {
        console.error('Camera access denied:', err);
      }
    }

    startCamera();
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, [phase, facingMode]);

  const capturePhoto = React.useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Mirror for selfie camera
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

    // Stop camera
    const stream = video.srcObject as MediaStream;
    if (stream) stream.getTracks().forEach(t => t.stop());

    onCapture(dataUrl);
  }, [facingMode, onCapture]);

  const startCountdown = React.useCallback(() => {
    setCountdown(3);
    let count = 3;
    const interval = setInterval(() => {
      count--;
      if (count <= 0) {
        clearInterval(interval);
        setCountdown(null);
        capturePhoto();
      } else {
        setCountdown(count);
      }
    }, 1000);
  }, [capturePhoto]);

  // ─── Selfie Phase ─────────────────────────────────────────

  if (phase === 'selfie') {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="max-w-md mx-auto py-6 text-center">
        <div className="text-4xl mb-3">🪞</div>
        <h2 className="text-xl font-bold text-foreground mb-1">Compliment Mirror</h2>
        <p className="text-sm text-muted-foreground mb-4">Mach ein Selfie und erhalte ein KI-Kompliment!</p>

        {/* Camera Preview */}
        <div className="relative rounded-2xl overflow-hidden bg-black mb-4 aspect-[4/3]">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
          />
          {!cameraReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          )}
          {/* Countdown overlay */}
          <AnimatePresence>
            {countdown !== null && (
              <motion.div
                key={countdown}
                initial={{ scale: 2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center bg-black/40"
              >
                <span className="text-7xl font-black text-white drop-shadow-lg">{countdown}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <canvas ref={canvasRef} className="hidden" />

        {/* Controls */}
        <div className="flex gap-3 justify-center">
          <Button
            onClick={() => setFacingMode(f => f === 'user' ? 'environment' : 'user')}
            variant="secondary"
            className="gap-2"
          >
            <FlipHorizontal2 className="w-4 h-4" />
          </Button>
          <Button
            onClick={startCountdown}
            disabled={!cameraReady || countdown !== null}
            className="gap-2 px-8"
            size="lg"
          >
            <Camera className="w-5 h-5" />
            {countdown !== null ? `${countdown}...` : 'Selfie!'}
          </Button>
          <Button
            onClick={capturePhoto}
            disabled={!cameraReady}
            variant="secondary"
            className="gap-2"
            title="Sofort auslösen"
          >
            <Sparkles className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>
    );
  }

  // ─── Loading Phase ────────────────────────────────────────

  if (phase === 'loading') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="max-w-md mx-auto py-12 text-center">
        <div className="text-5xl mb-6">🪞</div>
        {selfieUrl && (
          <div className="w-32 h-32 mx-auto mb-6 rounded-full overflow-hidden border-4 border-purple-500/30">
            <img src={selfieUrl} alt="Selfie" className="w-full h-full object-cover" />
          </div>
        )}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 mx-auto mb-4"
        >
          <Sparkles className="w-12 h-12 text-purple-500" />
        </motion.div>
        <p className="text-lg font-medium text-foreground">KI analysiert dein Foto...</p>
        <p className="text-sm text-muted-foreground mt-1">Einen Moment, dein Kompliment wird generiert ✨</p>
      </motion.div>
    );
  }

  // ─── Result Phase ─────────────────────────────────────────

  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
      className="max-w-md mx-auto py-8 text-center">
      {/* Selfie + Mirror frame */}
      {selfieUrl && (
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="relative w-40 h-40 mx-auto mb-6"
        >
          <div className="w-full h-full rounded-full overflow-hidden border-4 border-purple-500 shadow-lg shadow-purple-500/20">
            <img src={selfieUrl} alt="Selfie" className="w-full h-full object-cover" />
          </div>
          <div className="absolute -top-2 -right-2 text-3xl">🪞</div>
        </motion.div>
      )}
      {!selfieUrl && <div className="text-5xl mb-6">🪞</div>}

      {/* Compliment Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-2xl p-8 mb-6"
      >
        <p className="text-lg font-medium text-foreground mb-4">{compliment}</p>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.6, type: 'spring' }}
          className="inline-block px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full text-sm font-bold"
        >
          {verdict}
        </motion.div>
      </motion.div>

      {/* Source indicator */}
      {source && (
        <p className="text-xs text-muted-foreground mb-4">
          {source === 'ai' ? '✨ KI-generiert' : source === 'cache' ? '⚡ Aus Cache' : '🎲 Zufällig'}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-3 justify-center">
        <Button onClick={onRetry} className="gap-2">
          <Camera className="w-4 h-4" /> Neues Selfie
        </Button>
      </div>
    </motion.div>
  );
}
