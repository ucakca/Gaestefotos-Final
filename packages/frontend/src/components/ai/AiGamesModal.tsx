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

type GameKey = 'compliment_mirror' | 'fortune_teller' | 'ai_roast' | 'caption_generator' | 'persona_quiz' | 'wedding_speech' | 'ai_stories' | 'celebrity_lookalike' | 'ai_bingo' | 'ai_dj';
type Step = 'select' | 'name' | 'quiz' | 'wedding_input' | 'words_input' | 'mood_input' | 'processing' | 'result' | 'error';

const QUIZ_QUESTIONS = [
  { key: 'drink', label: 'Dein Lieblingsdrink auf der Party?', placeholder: 'z.B. Aperol Spritz, Bier, Wasser...' },
  { key: 'dance', label: 'Dein Party-Move auf der Tanzfläche?', placeholder: 'z.B. Macarena, Headbang, Barhocker...' },
  { key: 'late', label: 'Was machst du um 3 Uhr nachts?', placeholder: 'z.B. Tanzen, Döner holen, schlafen...' },
];

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
  {
    key: 'caption_generator',
    name: 'Caption Generator',
    emoji: '📝',
    description: '3 kreative Instagram-Captions für dein Foto!',
    gradient: 'from-sky-500 to-blue-600',
    endpoint: '/booth-games/caption-generator',
  },
  {
    key: 'persona_quiz',
    name: 'Persona Quiz',
    emoji: '🧬',
    description: 'Welcher Party-Typ bist du? 3 Fragen verraten es!',
    gradient: 'from-emerald-500 to-teal-600',
    endpoint: '/booth-games/persona-quiz',
  },
  {
    key: 'wedding_speech',
    name: 'Hochzeitsrede',
    emoji: '🎙️',
    description: 'KI schreibt dir eine lustige Mini-Rede!',
    gradient: 'from-rose-400 to-pink-600',
    endpoint: '/booth-games/wedding-speech',
  },
  {
    key: 'ai_stories',
    name: 'Story Generator',
    emoji: '📖',
    description: 'Gib 3 Wörter — die KI erzählt eine Geschichte!',
    gradient: 'from-violet-500 to-purple-600',
    endpoint: '/booth-games/ai-stories',
  },
  {
    key: 'celebrity_lookalike',
    name: 'Promi-Doppelgänger',
    emoji: '🌟',
    description: 'Welchem Promi siehst du ähnlich?',
    gradient: 'from-amber-400 to-orange-600',
    endpoint: '/booth-games/celebrity-lookalike',
  },
  {
    key: 'ai_bingo',
    name: 'Foto-Bingo',
    emoji: '🎲',
    description: 'KI erstellt deine persönliche Bingo-Karte!',
    gradient: 'from-green-500 to-emerald-700',
    endpoint: '/booth-games/ai-bingo',
  },
  {
    key: 'ai_dj',
    name: 'AI DJ',
    emoji: '🎧',
    description: 'KI schlägt die perfekten Party-Songs vor!',
    gradient: 'from-fuchsia-500 to-pink-700',
    endpoint: '/booth-games/ai-dj',
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
  const [quizAnswers, setQuizAnswers] = useState<string[]>(['', '', '']);
  const [weddingCouple, setWeddingCouple] = useState('');
  const [weddingRole, setWeddingRole] = useState('');
  const [storyWords, setStoryWords] = useState<string[]>(['', '', '']);
  const [djMood, setDjMood] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);

  const handleClose = useCallback(() => {
    setStep('select');
    setSelectedGame(null);
    setResult(null);
    setError(null);
    setQuizAnswers(['', '', '']);
    setWeddingCouple('');
    setWeddingRole('');
    setStoryWords(['', '', '']);
    setDjMood('');
    onClose();
  }, [onClose]);

  const handleSelectGame = useCallback((game: GameDef) => {
    setSelectedGame(game);
    setStep('name');
    setTimeout(() => nameInputRef.current?.focus(), 100);
  }, []);

  const handleWeddingSpeechSubmit = useCallback(async () => {
    if (!selectedGame) return;
    setStep('processing');
    setError(null);
    if (guestName.trim() && typeof window !== 'undefined') localStorage.setItem('guestUploaderName', guestName.trim());
    try {
      const res = await api.post(selectedGame.endpoint, {
        eventId, eventType, eventTitle,
        guestName: guestName.trim() || undefined,
        coupleName: weddingCouple.trim() || undefined,
        role: weddingRole.trim() || undefined,
      });
      setResult(res.data);
      setStep('result');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Etwas ist schiefgelaufen');
      setStep('error');
    }
  }, [selectedGame, eventId, eventType, eventTitle, guestName, weddingCouple, weddingRole]);

  const handleDjSubmit = useCallback(async () => {
    if (!selectedGame) return;
    setStep('processing');
    setError(null);
    if (guestName.trim() && typeof window !== 'undefined') localStorage.setItem('guestUploaderName', guestName.trim());
    try {
      const res = await api.post(selectedGame.endpoint, {
        eventId, eventType, eventTitle,
        guestName: guestName.trim() || undefined,
        mood: djMood.trim() || undefined,
      });
      setResult(res.data);
      setStep('result');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Etwas ist schiefgelaufen');
      setStep('error');
    }
  }, [selectedGame, eventId, eventType, eventTitle, guestName, djMood]);

  const handleStoriesSubmit = useCallback(async () => {
    if (!selectedGame || storyWords.some(w => !w.trim())) return;
    setStep('processing');
    setError(null);
    if (guestName.trim() && typeof window !== 'undefined') localStorage.setItem('guestUploaderName', guestName.trim());
    try {
      const res = await api.post(selectedGame.endpoint, {
        eventId, eventType, eventTitle,
        guestName: guestName.trim() || undefined,
        words: storyWords.map(w => w.trim()),
      });
      setResult(res.data);
      setStep('result');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Etwas ist schiefgelaufen');
      setStep('error');
    }
  }, [selectedGame, eventId, eventType, eventTitle, guestName, storyWords]);

  const handleQuizSubmit = useCallback(async () => {
    if (!selectedGame || quizAnswers.some(a => !a.trim())) return;

    setStep('processing');
    setError(null);

    if (guestName.trim() && typeof window !== 'undefined') {
      localStorage.setItem('guestUploaderName', guestName.trim());
    }

    try {
      const res = await api.post(selectedGame.endpoint, {
        eventId,
        eventType,
        eventTitle,
        guestName: guestName.trim() || undefined,
        answers: quizAnswers.map(a => a.trim()),
      });

      setResult(res.data);
      setStep('result');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Etwas ist schiefgelaufen');
      setStep('error');
    }
  }, [selectedGame, eventId, eventType, eventTitle, guestName, quizAnswers]);

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
    } else if (selectedGame.key === 'caption_generator' && result.captions) {
      text = result.captions.join('\n\n');
    } else if (selectedGame.key === 'persona_quiz' && result.persona) {
      text = `${result.emoji} ${result.persona}\n\n${result.description}\n\n⚡ Superkraft: ${result.superpower}`;
    } else if (selectedGame.key === 'wedding_speech' && result.speech) {
      text = `🎙️ ${result.speech}\n\n🥂 ${result.toast}`;
    } else if (selectedGame.key === 'ai_stories' && result.story) {
      text = `${result.emoji} ${result.title}\n\n${result.story}\n\n🎭 Genre: ${result.genre}`;
    } else if (selectedGame.key === 'celebrity_lookalike' && result.celebrity) {
      text = `${result.emoji} Du siehst aus wie ${result.celebrity}! (${result.similarity}%)\n\n${result.reason}\n\n💡 ${result.funFact}`;
    } else if (selectedGame.key === 'ai_bingo' && result.tasks) {
      text = `🎲 ${result.title}\n\n${result.tasks.map((t: string, i: number) => `${i + 1}. ${t}`).join('\n')}\n\n⭐ Bonus: ${result.bonusTask}`;
    } else if (selectedGame.key === 'ai_dj' && result.songs) {
      text = `🎧 ${result.djName}\n\n${result.songs.map((s: any) => `🎵 ${s.title} — ${s.artist}`).join('\n')}\n\n${result.vibe}`;
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
                onClick={() => {
                  if (step === 'quiz' || step === 'wedding_input' || step === 'words_input' || step === 'mood_input') { setStep('name'); }
                  else { setStep('select'); setSelectedGame(null); setResult(null); setQuizAnswers(['', '', '']); setStoryWords(['', '', '']); setWeddingCouple(''); setWeddingRole(''); setDjMood(''); }
                }}
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
                {step === 'quiz' && 'Persona Quiz'}
                {step === 'wedding_input' && 'Hochzeitsrede'}
                {step === 'words_input' && 'Story Generator'}
                {step === 'mood_input' && 'AI DJ'}
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
                  onClick={() => {
                    if (selectedGame.key === 'persona_quiz') setStep('quiz');
                    else if (selectedGame.key === 'wedding_speech') setStep('wedding_input');
                    else if (selectedGame.key === 'ai_stories') setStep('words_input');
                    else if (selectedGame.key === 'ai_dj') setStep('mood_input');
                    else handlePlay();
                  }}
                  className={`mt-5 w-full py-3.5 bg-gradient-to-r ${selectedGame.gradient} text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-lg`}
                >
                  <Wand2 className="w-4 h-4" />
                  {selectedGame.key === 'persona_quiz' ? 'Zum Quiz!' : selectedGame.key === 'wedding_speech' ? 'Rede schreiben!' : selectedGame.key === 'ai_stories' ? 'Geschichte starten!' : selectedGame.key === 'ai_dj' ? 'Musik bitte!' : 'Los geht\'s!'}
                </button>
              </motion.div>
            )}

            {/* ═══ Quiz Questions (Persona Quiz) ═══ */}
            {step === 'quiz' && selectedGame?.key === 'persona_quiz' && (
              <motion.div key="quiz" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="p-5">
                <div className="text-center mb-5">
                  <div className="text-5xl mb-2">🧬</div>
                  <p className="text-sm text-muted-foreground">Beantworte 3 schnelle Fragen!</p>
                </div>

                <div className="space-y-4">
                  {QUIZ_QUESTIONS.map((q, i) => (
                    <div key={q.key}>
                      <label className="block text-sm font-semibold text-foreground mb-1.5">
                        {i + 1}. {q.label}
                      </label>
                      <input
                        type="text"
                        value={quizAnswers[i]}
                        onChange={(e) => {
                          const next = [...quizAnswers];
                          next[i] = e.target.value;
                          setQuizAnswers(next);
                        }}
                        placeholder={q.placeholder}
                        className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      />
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleQuizSubmit}
                  disabled={quizAnswers.some(a => !a.trim())}
                  className={`mt-5 w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-lg disabled:opacity-50 disabled:pointer-events-none`}
                >
                  <Sparkles className="w-4 h-4" />
                  KI analysieren!
                </button>
              </motion.div>
            )}

            {/* ═══ Wedding Speech Input ═══ */}
            {step === 'wedding_input' && selectedGame?.key === 'wedding_speech' && (
              <motion.div key="wedding" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="p-5">
                <div className="text-center mb-5">
                  <div className="text-5xl mb-2">🎙️</div>
                  <p className="text-sm text-muted-foreground">Ein paar Details für deine Rede!</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">Name des Brautpaars</label>
                    <input type="text" value={weddingCouple} onChange={(e) => setWeddingCouple(e.target.value)} placeholder="z.B. Anna & Max" className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/50" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">Deine Beziehung zum Paar <span className="text-muted-foreground font-normal">(optional)</span></label>
                    <input type="text" value={weddingRole} onChange={(e) => setWeddingRole(e.target.value)} placeholder="z.B. Trauzeuge, beste Freundin, Kollege..." className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/50" />
                  </div>
                </div>
                <button onClick={handleWeddingSpeechSubmit} className="mt-5 w-full py-3.5 bg-gradient-to-r from-rose-400 to-pink-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-lg">
                  <Sparkles className="w-4 h-4" />
                  Rede generieren!
                </button>
              </motion.div>
            )}

            {/* ═══ Words Input (AI Stories) ═══ */}
            {step === 'words_input' && selectedGame?.key === 'ai_stories' && (
              <motion.div key="words" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="p-5">
                <div className="text-center mb-5">
                  <div className="text-5xl mb-2">📖</div>
                  <p className="text-sm text-muted-foreground">Gib 3 Wörter — die KI macht eine Geschichte daraus!</p>
                </div>
                <div className="space-y-3">
                  {['Erstes Wort', 'Zweites Wort', 'Drittes Wort'].map((label, i) => (
                    <div key={i}>
                      <label className="block text-sm font-semibold text-foreground mb-1.5">{label}</label>
                      <input type="text" value={storyWords[i]} onChange={(e) => { const next = [...storyWords]; next[i] = e.target.value; setStoryWords(next); }} placeholder={['z.B. Disco', 'z.B. Einhorn', 'z.B. Pizza'][i]} className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/50" />
                    </div>
                  ))}
                </div>
                <button onClick={handleStoriesSubmit} disabled={storyWords.some(w => !w.trim())} className="mt-5 w-full py-3.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-lg disabled:opacity-50 disabled:pointer-events-none">
                  <Sparkles className="w-4 h-4" />
                  Geschichte erzählen!
                </button>
              </motion.div>
            )}

            {/* ═══ Mood Input (AI DJ) ═══ */}
            {step === 'mood_input' && selectedGame?.key === 'ai_dj' && (
              <motion.div key="mood" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="p-5">
                <div className="text-center mb-5">
                  <div className="text-5xl mb-2">🎧</div>
                  <p className="text-sm text-muted-foreground">Welche Stimmung soll die Musik haben?</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Stimmung <span className="text-muted-foreground font-normal">(optional)</span></label>
                  <input type="text" value={djMood} onChange={(e) => setDjMood(e.target.value)} placeholder="z.B. Romantisch, Party, Chill, 80er Vibes..." className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50" />
                </div>
                <button onClick={handleDjSubmit} className="mt-5 w-full py-3.5 bg-gradient-to-r from-fuchsia-500 to-pink-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-lg">
                  <Sparkles className="w-4 h-4" />
                  Playlist mixen!
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
                    {selectedGame.key === 'caption_generator' && 'Kreative Captions werden generiert...'}
                    {selectedGame.key === 'persona_quiz' && 'Deine Persönlichkeit wird analysiert...'}
                    {selectedGame.key === 'wedding_speech' && 'Die Rede wird geschrieben...'}
                    {selectedGame.key === 'ai_stories' && 'Eine Geschichte entsteht...'}
                    {selectedGame.key === 'celebrity_lookalike' && 'Promi-Datenbank wird durchsucht...'}
                    {selectedGame.key === 'ai_bingo' && 'Bingo-Karte wird erstellt...'}
                    {selectedGame.key === 'ai_dj' && 'Die perfekte Playlist wird gemischt...'}
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

                {/* Caption Generator */}
                {selectedGame.key === 'caption_generator' && result.captions && (
                  <div>
                    <div className="text-center mb-4">
                      <div className="text-6xl mb-2">📝</div>
                      <p className="text-sm text-muted-foreground">Tippe auf eine Caption zum Kopieren</p>
                    </div>
                    <div className="space-y-2.5">
                      {result.captions.map((caption: string, i: number) => (
                        <button
                          key={i}
                          onClick={() => {
                            navigator.clipboard.writeText(caption).catch(() => {});
                          }}
                          className="w-full text-left bg-gradient-to-br from-sky-500/10 to-blue-500/10 border border-sky-500/20 rounded-2xl p-4 hover:from-sky-500/20 hover:to-blue-500/20 active:scale-[0.98] transition-all"
                        >
                          <div className="flex items-start gap-3">
                            <span className="text-lg shrink-0 mt-0.5">#{i + 1}</span>
                            <p className="text-foreground text-sm leading-relaxed">{caption}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Persona Quiz */}
                {selectedGame.key === 'persona_quiz' && result.persona && (
                  <div className="text-center">
                    <div className="text-6xl mb-3">{result.emoji || '🧬'}</div>
                    <div className="inline-block px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-full font-bold text-lg mb-4">
                      {result.persona}
                    </div>
                    <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-2xl p-5 mb-3">
                      <p className="text-foreground text-base leading-relaxed">{result.description}</p>
                    </div>
                    <div className="bg-gradient-to-br from-amber-500/10 to-yellow-500/10 border border-amber-500/20 rounded-2xl p-4">
                      <p className="text-sm text-muted-foreground mb-1">Deine Superkraft:</p>
                      <p className="text-foreground font-bold">⚡ {result.superpower}</p>
                    </div>
                  </div>
                )}

                {/* Wedding Speech */}
                {selectedGame.key === 'wedding_speech' && result.speech && (
                  <div className="text-center">
                    <div className="text-6xl mb-3">{result.emoji || '🎙️'}</div>
                    <div className="bg-gradient-to-br from-rose-500/10 to-pink-500/10 border border-rose-500/20 rounded-2xl p-5 mb-3">
                      <p className="text-foreground text-base leading-relaxed italic">„{result.speech}“</p>
                    </div>
                    <div className="bg-gradient-to-br from-amber-500/10 to-yellow-500/10 border border-amber-500/20 rounded-2xl p-4">
                      <p className="text-sm text-muted-foreground mb-1">Trinkspruch:</p>
                      <p className="text-foreground font-bold">🥂 {result.toast}</p>
                    </div>
                  </div>
                )}

                {/* AI Stories */}
                {selectedGame.key === 'ai_stories' && result.story && (
                  <div className="text-center">
                    <div className="text-6xl mb-3">{result.emoji || '📖'}</div>
                    <div className="inline-block px-4 py-1.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-full font-bold text-sm mb-3">
                      {result.title}
                    </div>
                    <div className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-500/20 rounded-2xl p-5 mb-3 text-left">
                      <p className="text-foreground text-base leading-relaxed">{result.story}</p>
                    </div>
                    <div className="inline-block px-3 py-1 bg-muted rounded-full text-xs text-muted-foreground">
                      🎭 Genre: {result.genre}
                    </div>
                  </div>
                )}

                {/* Celebrity Lookalike */}
                {selectedGame.key === 'celebrity_lookalike' && result.celebrity && (
                  <div className="text-center">
                    <div className="text-6xl mb-3">{result.emoji || '🌟'}</div>
                    <div className="inline-block px-5 py-2 bg-gradient-to-r from-amber-400 to-orange-600 text-white rounded-full font-bold text-lg mb-4">
                      {result.celebrity}
                    </div>
                    <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl p-5 mb-3">
                      <div className="text-3xl font-bold text-amber-500 mb-2">{result.similarity}%</div>
                      <p className="text-foreground text-base leading-relaxed">{result.reason}</p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-2xl p-4">
                      <p className="text-sm text-muted-foreground mb-1">Fun Fact:</p>
                      <p className="text-foreground font-medium">💡 {result.funFact}</p>
                    </div>
                  </div>
                )}

                {/* AI Bingo */}
                {selectedGame.key === 'ai_bingo' && result.tasks && (
                  <div className="text-center">
                    <div className="text-5xl mb-2">{result.emoji || '🎲'}</div>
                    <div className="inline-block px-4 py-1.5 bg-gradient-to-r from-green-500 to-emerald-700 text-white rounded-full font-bold text-sm mb-4">
                      {result.title}
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 mb-3">
                      {result.tasks.slice(0, 9).map((task: string, i: number) => (
                        <div key={i} className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-2.5 flex items-center justify-center min-h-[70px]">
                          <p className="text-foreground text-[11px] font-medium leading-tight text-center">{task}</p>
                        </div>
                      ))}
                    </div>
                    {result.bonusTask && (
                      <div className="bg-gradient-to-br from-amber-500/10 to-yellow-500/10 border border-amber-500/20 rounded-2xl p-3">
                        <p className="text-xs text-muted-foreground mb-0.5">⭐ Bonus-Aufgabe:</p>
                        <p className="text-foreground font-bold text-sm">{result.bonusTask}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* AI DJ */}
                {selectedGame.key === 'ai_dj' && result.songs && (
                  <div className="text-center">
                    <div className="text-5xl mb-2">{result.emoji || '🎧'}</div>
                    <div className="inline-block px-4 py-1.5 bg-gradient-to-r from-fuchsia-500 to-pink-700 text-white rounded-full font-bold text-sm mb-3">
                      {result.djName}
                    </div>
                    <div className="space-y-2 mb-3 text-left">
                      {result.songs.map((song: any, i: number) => (
                        <div key={i} className="bg-gradient-to-br from-fuchsia-500/10 to-pink-500/10 border border-fuchsia-500/20 rounded-xl p-3 flex items-start gap-3">
                          <span className="text-lg">🎵</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-foreground font-bold text-sm">{song.title}</p>
                            <p className="text-muted-foreground text-xs">{song.artist}</p>
                            <p className="text-muted-foreground text-[10px] mt-0.5 italic">{song.reason}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {result.vibe && (
                      <p className="text-muted-foreground text-xs italic">{result.vibe}</p>
                    )}
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
