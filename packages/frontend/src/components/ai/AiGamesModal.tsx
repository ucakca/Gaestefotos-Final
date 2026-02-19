'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Camera, ImagePlus, Loader2, ArrowLeft, RotateCcw,
  Sparkles, Share2, Wand2,
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import api from '@/lib/api';

// ─── Types ──────────────────────────────────────────────────

type GameKey = 'compliment_mirror' | 'fortune_teller' | 'ai_roast';
type Step = 'select' | 'name' | 'processing' | 'result' | 'error';

interface GameDef {
  key: GameKey;
  name: string;
  emoji: string;
  description: string;
  gradient: string;
  endpoint: string;
}

interface AiGamesModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventType?: string;
  eventTitle?: string;
}

const GAMES: GameDef[] = [
  {
    key: 'compliment_mirror',
    name: 'Compliment Mirror',
    emoji: '🪞',
    description: 'Die KI gibt dir ein einzigartiges Kompliment!',
    gradient: 'from-pink-500 to-rose-500',
    endpoint: '/booth-games/compliment-mirror',
  },
  {
    key: 'fortune_teller',
    name: 'Fortune Teller',
    emoji: '🔮',
    description: 'Erfahre deine witzige Zukunftsvorhersage!',
    gradient: 'from-purple-600 to-indigo-600',
    endpoint: '/booth-games/fortune-teller',
  },
  {
    key: 'ai_roast',
    name: 'AI Roast',
    emoji: '🔥',
    description: 'Liebevoller Comedy-Roast — traust du dich?',
    gradient: 'from-orange-500 to-red-500',
    endpoint: '/booth-games/ai-roast',
  },
];

// ─── Component ──────────────────────────────────────────────

export default function AiGamesModal({ isOpen, onClose, eventId, eventType, eventTitle }: AiGamesModalProps) {
  const [step, setStep] = useState<Step>('select');
  const [selectedGame, setSelectedGame] = useState<GameDef | null>(null);
  const [guestName, setGuestName] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem('guestUploaderName') || '' : ''
  );
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const handleClose = useCallback(() => {
    setStep('select');
    setSelectedGame(null);
    setResult(null);
    setError(null);
    onClose();
  }, [onClose]);

  const handleSelectGame = useCallback((game: GameDef) => {
    setSelectedGame(game);
    setStep('name');
    setTimeout(() => nameInputRef.current?.focus(), 100);
  }, []);

  const handlePlay = useCallback(async () => {
    if (!selectedGame) return;

    setStep('processing');
    setError(null);

    // Save name
    if (guestName.trim() && typeof window !== 'undefined') {
      localStorage.setItem('guestUploaderName', guestName.trim());
    }

    try {
      const res = await api.post(selectedGame.endpoint, {
        eventId,
        eventType,
        eventTitle,
        guestName: guestName.trim() || undefined,
        useAI: true,
      });

      setResult(res.data);
      setStep('result');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Etwas ist schiefgelaufen');
      setStep('error');
    }
  }, [selectedGame, eventId, eventType, eventTitle, guestName]);

  const handleShare = useCallback(() => {
    if (!result || !selectedGame) return;
    let text = '';
    if (selectedGame.key === 'compliment_mirror') {
      text = `${result.compliment}\n\n— ${result.verdict}`;
    } else if (selectedGame.key === 'fortune_teller') {
      text = `🔮 ${result.prediction}\n\nGlücksgegenstand: ${result.luckyItem} | Glückszahl: ${result.luckyNumber}`;
    } else if (selectedGame.key === 'ai_roast') {
      text = `🔥 ${result.roast}\n\n❤️ ${result.rescue}`;
    }
    if (navigator.share) {
      navigator.share({ text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).catch(() => {});
    }
  }, [result, selectedGame]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="bg-card border border-border rounded-2xl max-w-md w-full p-0 overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            {step !== 'select' && step !== 'processing' && (
              <button
                onClick={() => { setStep('select'); setSelectedGame(null); setResult(null); }}
                className="p-1.5 rounded-full hover:bg-muted/50 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-muted-foreground" />
              </button>
            )}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-lg font-bold text-foreground">
                {step === 'select' && 'KI Foto-Spiele'}
                {step === 'name' && selectedGame?.name}
                {step === 'processing' && 'KI denkt nach...'}
                {step === 'result' && selectedGame?.name}
                {step === 'error' && 'Fehler'}
              </h2>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 rounded-full hover:bg-muted/50 transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 60px)' }}>
          <AnimatePresence mode="wait">

            {/* ═══ Game Selection ═══ */}
            {step === 'select' && (
              <motion.div key="select" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 space-y-3">
                <p className="text-sm text-muted-foreground text-center mb-2">
                  Wähle ein KI-Spiel und lass dich überraschen!
                </p>
                {GAMES.map((game, i) => (
                  <motion.button
                    key={game.key}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    onClick={() => handleSelectGame(game)}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl border border-border hover:border-primary/40 hover:shadow-md active:scale-[0.98] transition-all text-left"
                  >
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${game.gradient} flex items-center justify-center text-2xl shadow-md shrink-0`}>
                      {game.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-foreground">{game.name}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">{game.description}</p>
                    </div>
                  </motion.button>
                ))}
              </motion.div>
            )}

            {/* ═══ Name Input ═══ */}
            {step === 'name' && selectedGame && (
              <motion.div key="name" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="p-5">
                <div className="text-center mb-6">
                  <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${selectedGame.gradient} flex items-center justify-center text-4xl shadow-lg mx-auto mb-3`}>
                    {selectedGame.emoji}
                  </div>
                  <p className="text-foreground font-bold text-lg">{selectedGame.name}</p>
                  <p className="text-sm text-muted-foreground mt-1">{selectedGame.description}</p>
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-medium text-foreground">
                    Dein Name <span className="text-muted-foreground">(optional)</span>
                  </label>
                  <input
                    ref={nameInputRef}
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="z.B. Max"
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    onKeyDown={(e) => e.key === 'Enter' && handlePlay()}
                  />
                </div>

                <button
                  onClick={handlePlay}
                  className={`mt-5 w-full py-3.5 bg-gradient-to-r ${selectedGame.gradient} text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-lg`}
                >
                  <Wand2 className="w-4 h-4" />
                  Los geht's!
                </button>
              </motion.div>
            )}

            {/* ═══ Processing ═══ */}
            {step === 'processing' && selectedGame && (
              <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-16 gap-5">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${selectedGame.gradient} flex items-center justify-center text-5xl shadow-lg`}
                >
                  {selectedGame.emoji}
                </motion.div>
                <div className="text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mx-auto mb-2" />
                  <p className="text-foreground font-bold">KI denkt nach...</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedGame.key === 'fortune_teller' && 'Die Sterne werden befragt...'}
                    {selectedGame.key === 'ai_roast' && 'Die KI feilt an einem Witz...'}
                    {selectedGame.key === 'compliment_mirror' && 'Der Spiegel poliert sich...'}
                  </p>
                </div>
              </motion.div>
            )}

            {/* ═══ Result ═══ */}
            {step === 'result' && selectedGame && result && (
              <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-5">
                {/* Compliment Mirror */}
                {selectedGame.key === 'compliment_mirror' && (
                  <div className="text-center">
                    <div className="text-6xl mb-4">🪞</div>
                    <div className="bg-gradient-to-br from-pink-500/10 to-rose-500/10 border border-pink-500/20 rounded-2xl p-5 mb-3">
                      <p className="text-foreground text-lg font-medium leading-relaxed">{result.compliment}</p>
                    </div>
                    <div className="inline-block px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-full font-bold text-sm">
                      {result.verdict}
                    </div>
                  </div>
                )}

                {/* Fortune Teller */}
                {selectedGame.key === 'fortune_teller' && (
                  <div className="text-center">
                    <div className="text-6xl mb-4">🔮</div>
                    <div className="bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border border-purple-500/20 rounded-2xl p-5 mb-4">
                      <p className="text-foreground text-lg font-medium leading-relaxed italic">"{result.prediction}"</p>
                    </div>
                    <div className="flex items-center justify-center gap-4">
                      <div className="text-center">
                        <p className="text-2xl">{result.luckyItem}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">Glücks-Item</p>
                      </div>
                      <div className="w-px h-8 bg-border" />
                      <div className="text-center">
                        <p className="text-2xl font-bold text-primary">{result.luckyNumber}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">Glückszahl</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Roast */}
                {selectedGame.key === 'ai_roast' && (
                  <div className="text-center">
                    <div className="text-6xl mb-4">🔥</div>
                    <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-2xl p-5 mb-3">
                      <p className="text-foreground text-lg font-medium leading-relaxed">{result.roast}</p>
                    </div>
                    <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-2xl p-4">
                      <p className="text-sm text-muted-foreground mb-1">Rettungs-Kompliment:</p>
                      <p className="text-foreground font-medium">{result.rescue}</p>
                    </div>
                  </div>
                )}

                {/* Source badge */}
                {result.source && (
                  <div className="flex justify-center mt-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${result.source === 'ai' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      {result.source === 'ai' ? '✨ KI-generiert' : '📦 Vorgefertigt'}
                    </span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-5">
                  <button
                    onClick={handlePlay}
                    className={`flex-1 py-3 bg-gradient-to-r ${selectedGame.gradient} text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform`}
                  >
                    <RotateCcw className="w-4 h-4" />
                    Nochmal!
                  </button>
                  <button
                    onClick={handleShare}
                    className="py-3 px-4 bg-muted text-foreground rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Try another game */}
                <button
                  onClick={() => { setStep('select'); setSelectedGame(null); setResult(null); }}
                  className="mt-3 w-full py-2.5 text-muted-foreground text-sm text-center"
                >
                  Anderes Spiel wählen
                </button>
              </motion.div>
            )}

            {/* ═══ Error ═══ */}
            {step === 'error' && (
              <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-12 gap-4 px-6">
                <div className="text-5xl">😅</div>
                <p className="text-foreground font-bold">Ups!</p>
                <p className="text-muted-foreground text-sm text-center">{error}</p>
                <button
                  onClick={handlePlay}
                  className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium"
                >
                  Nochmal versuchen
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
