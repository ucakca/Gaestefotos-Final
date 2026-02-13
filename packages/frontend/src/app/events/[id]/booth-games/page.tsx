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
import {
  Gamepad2, ArrowLeft, RotateCw, Trophy, Star, Send, Sparkles, Loader2, Pen,
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
  | { type: 'compliment_mirror'; compliment: string; verdict: string }
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

  const handleCompliment = async () => {
    try {
      const { data } = await api.post('/booth-games/compliment-mirror', { eventId });
      setActiveGame({ type: 'compliment_mirror', compliment: data.compliment, verdict: data.verdict });
    } catch { showToast('Fehler', 'error'); }
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
      case 'compliment_mirror': handleCompliment(); break;
      case 'mimik_duell': handleMimikChallenge(); break;
      case 'mystery_overlay': handleMysteryOverlay(); break;
      case 'vows_and_views': setActiveGame({ type: 'vows_and_views' }); break;
      case 'face_switch': setActiveGame({ type: 'face_switch', phase: 'input' }); break;
      case 'digital_graffiti': setActiveGame({ type: 'digital_graffiti' }); break;
      default: showToast('Dieses Spiel ist noch nicht verfügbar', 'info');
    }
  };

  if (loading || !eventId) return <FullPageLoader />;

  return (
    <AppLayout showBackButton backUrl={`/events/${eventId}/dashboard`}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          {activeGame && (
            <button onClick={() => setActiveGame(null)} className="p-2 rounded-lg hover:bg-app-surface transition">
              <ArrowLeft className="w-5 h-5 text-app-muted" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-app-fg flex items-center gap-2">
              <Gamepad2 className="w-6 h-6 text-primary" />
              Booth-Spielchen
            </h1>
            <p className="text-sm text-app-muted mt-0.5">{event?.title || 'Event'}</p>
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
                className="text-left p-5 rounded-2xl border border-app-border bg-app-card hover:border-primary/50 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-start gap-4">
                  <span className="text-3xl">{game.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-app-fg flex items-center gap-2">
                      {game.name}
                      {game.requiresAI && <Sparkles className="w-3.5 h-3.5 text-purple-500" />}
                    </div>
                    <p className="text-sm text-app-muted mt-1">{game.description}</p>
                    <div className="flex gap-2 mt-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        game.category === 'booth' ? 'bg-blue-100 text-blue-700' :
                        game.category === 'app' ? 'bg-green-100 text-green-700' :
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
                  <div className="font-semibold text-app-fg">Air Graffiti Wall</div>
                  <p className="text-sm text-app-muted mt-1">Male in der Luft mit Hand-Tracking (Webcam)</p>
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
            <h2 className="text-xl font-bold text-app-fg mb-6">Deine Aufgabe:</h2>
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
            <p className="text-app-muted mb-6">Du hast 5 Sekunden! 📸</p>
            <Button onClick={handleSlotSpin} disabled={spinning} className="gap-2">
              <RotateCw className={`w-4 h-4 ${spinning ? 'animate-spin' : ''}`} />
              Nochmal drehen
            </Button>
          </motion.div>
        )}

        {/* Compliment Mirror Result */}
        {activeGame?.type === 'compliment_mirror' && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8">
            <div className="text-5xl mb-6">🪞</div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="max-w-md mx-auto bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-2xl p-8 mb-6">
              <p className="text-lg font-medium text-app-fg mb-4">{activeGame.compliment}</p>
              <div className="inline-block px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full text-sm font-bold">
                {activeGame.verdict}
              </div>
            </motion.div>
            <Button onClick={handleCompliment} className="gap-2">
              <RotateCw className="w-4 h-4" /> Nochmal
            </Button>
          </motion.div>
        )}

        {/* Mimik-Duell */}
        {activeGame?.type === 'mimik_duell' && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8">
            {activeGame.phase === 'challenge' ? (
              <>
                <div className="text-6xl mb-4">{activeGame.challenge.emoji}</div>
                <h2 className="text-2xl font-bold text-app-fg mb-2">{activeGame.challenge.name}</h2>
                <p className="text-app-muted mb-8">{activeGame.challenge.description}</p>
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
                <p className="text-lg font-semibold text-app-fg mb-1">{activeGame.rank}</p>
                <p className="text-app-muted text-sm mb-8">{activeGame.challenge.name}: {activeGame.challenge.emoji}</p>
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
            <h2 className="text-xl font-bold text-app-fg mb-4">Dein Mystery Overlay:</h2>
            <motion.div initial={{ rotateY: 180 }} animate={{ rotateY: 0 }} transition={{ duration: 0.6 }}
              className="inline-block bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl p-8 mb-6">
              <div className="text-4xl mb-2">{activeGame.overlay.name}</div>
              <span className="text-sm text-app-muted px-3 py-1 bg-app-surface rounded-full">
                {activeGame.overlay.category}
              </span>
            </motion.div>
            <p className="text-app-muted mb-6">Posiere blind — das Overlay wird erst NACH dem Foto sichtbar!</p>
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
              <h2 className="text-xl font-bold text-app-fg">Face Switch</h2>
              <p className="text-sm text-app-muted mt-1">Gesichter in einem Gruppenfoto tauschen (AI)</p>
            </div>
            {activeGame.phase === 'input' && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-app-fg block mb-1">Foto-ID eingeben</label>
                  <input
                    value={facePhotoId}
                    onChange={e => setFacePhotoId(e.target.value)}
                    placeholder="Photo-ID (aus der Galerie)"
                    className="w-full px-4 py-2.5 bg-app-surface border border-app-border rounded-xl text-app-fg placeholder:text-app-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <p className="text-xs text-app-muted mt-1">Mindestens 2 Gesichter im Foto nötig</p>
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
                <p className="text-app-muted">KI tauscht Gesichter...</p>
              </div>
            )}
            {activeGame.phase === 'result' && activeGame.result && (
              <div className="text-center">
                <div className="text-4xl mb-4">✅</div>
                <p className="text-lg font-semibold text-app-fg mb-2">{activeGame.result.facesSwapped} Gesichter getauscht!</p>
                <p className="text-sm text-app-muted mb-6">Das neue Foto wurde gespeichert.</p>
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
              <h2 className="text-xl font-bold text-app-fg">Digital Graffiti</h2>
              <p className="text-sm text-app-muted mt-1">Male auf einem Foto — Emojis, Zeichnungen, Texte</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-app-fg block mb-1">Foto-URL eingeben</label>
                <input
                  value={graffitiPhotoUrl}
                  onChange={e => setGraffitiPhotoUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-4 py-2.5 bg-app-surface border border-app-border rounded-xl text-app-fg placeholder:text-app-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-app-fg block mb-1">Photo-ID (optional)</label>
                <input
                  value={graffitiPhotoId}
                  onChange={e => setGraffitiPhotoId(e.target.value)}
                  placeholder="Photo-ID für Verknüpfung"
                  className="w-full px-4 py-2.5 bg-app-surface border border-app-border rounded-xl text-app-fg placeholder:text-app-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
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
              <h2 className="text-xl font-bold text-app-fg">Vows & Views</h2>
              <p className="text-sm text-app-muted mt-1">Deine persönliche Botschaft im Polaroid-Style</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-app-fg block mb-1">Dein Name</label>
                <input
                  value={vowName}
                  onChange={e => setVowName(e.target.value)}
                  placeholder="Anonym"
                  className="w-full px-4 py-2.5 bg-app-surface border border-app-border rounded-xl text-app-fg placeholder:text-app-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-app-fg block mb-1">Deine Botschaft *</label>
                <textarea
                  value={vowMessage}
                  onChange={e => setVowMessage(e.target.value)}
                  placeholder="Schreib etwas Liebes, Lustiges oder Weises..."
                  rows={4}
                  className="w-full px-4 py-2.5 bg-app-surface border border-app-border rounded-xl text-app-fg placeholder:text-app-muted focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
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
