'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Crown, Medal, Award, Camera, Gamepad2, Sparkles } from 'lucide-react';
import api from '@/lib/api';

interface LeaderboardEntry {
  id: string;
  visitorId: string;
  name: string;
  photoCount: number;
  gameCount: number;
  kiCount: number;
  totalScore: number;
}

interface LeaderboardOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
}

const PODIUM_COLORS = [
  { bg: 'from-yellow-400 to-amber-500', shadow: 'shadow-amber-500/30', icon: Crown, label: '1.' },
  { bg: 'from-gray-300 to-slate-400', shadow: 'shadow-slate-400/30', icon: Medal, label: '2.' },
  { bg: 'from-orange-400 to-amber-600', shadow: 'shadow-orange-500/30', icon: Award, label: '3.' },
];

export default function LeaderboardOverlay({ isOpen, onClose, eventId }: LeaderboardOverlayProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !eventId) return;
    setLoading(true);
    api.get(`/events/${eventId}/leaderboard?limit=20`)
      .then(res => setEntries(res.data?.leaderboard || []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [isOpen, eventId]);

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[71] bg-card rounded-t-3xl shadow-2xl max-h-[85vh] overflow-hidden flex flex-col"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
            </div>

            {/* Header */}
            <div className="px-5 pb-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-md shadow-amber-500/20">
                  <Trophy className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Leaderboard</h3>
                  <p className="text-xs text-muted-foreground">Wer hat die meisten Punkte?</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-muted/50 transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 pb-8">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : entries.length === 0 ? (
                <div className="text-center py-16">
                  <Trophy className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Noch keine Teilnehmer</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Lade Fotos hoch und spiele Spiele!</p>
                </div>
              ) : (
                <>
                  {/* Podium — Top 3 */}
                  {top3.length > 0 && (
                    <div className="mb-5">
                      {/* Reorder: 2nd, 1st, 3rd for podium visual */}
                      <div className="flex items-end justify-center gap-2 pt-2">
                        {/* 2nd place */}
                        {top3[1] && (
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15 }}
                            className="flex-1 max-w-[110px]"
                          >
                            <PodiumCard entry={top3[1]} rank={1} />
                          </motion.div>
                        )}

                        {/* 1st place — tallest */}
                        <motion.div
                          initial={{ opacity: 0, y: 20, scale: 0.9 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ delay: 0.05 }}
                          className="flex-1 max-w-[120px] -mt-4"
                        >
                          <PodiumCard entry={top3[0]} rank={0} isWinner />
                        </motion.div>

                        {/* 3rd place */}
                        {top3[2] && (
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.25 }}
                            className="flex-1 max-w-[110px]"
                          >
                            <PodiumCard entry={top3[2]} rank={2} />
                          </motion.div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Rest of the list — with layout animations for reordering */}
                  {rest.length > 0 && (
                    <div className="space-y-1.5">
                      <AnimatePresence mode="popLayout">
                        {rest.map((entry, idx) => (
                          <motion.div
                            key={entry.id}
                            layout
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 50 }}
                            transition={{
                              layout: { type: 'spring', stiffness: 300, damping: 30 },
                              delay: 0.3 + idx * 0.04,
                            }}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                          >
                            <span className="text-sm font-bold text-muted-foreground w-6 text-center">
                              {idx + 4}
                            </span>
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-muted to-muted-foreground/20 flex items-center justify-center text-xs font-bold">
                              {getInitials(entry.name)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{entry.name}</div>
                              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                <StatBadge icon={Camera} count={entry.photoCount} />
                                <StatBadge icon={Gamepad2} count={entry.gameCount} />
                                <StatBadge icon={Sparkles} count={entry.kiCount} />
                              </div>
                            </div>
                            <motion.div
                              key={entry.totalScore}
                              initial={{ scale: 1.3, color: '#fbbf24' }}
                              animate={{ scale: 1, color: 'hsl(var(--primary))' }}
                              transition={{ duration: 0.3 }}
                              className="text-sm font-bold"
                            >
                              {entry.totalScore}
                            </motion.div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function PodiumCard({ entry, rank, isWinner = false }: { entry: LeaderboardEntry; rank: number; isWinner?: boolean }) {
  const style = PODIUM_COLORS[rank];
  const Icon = style.icon;

  return (
    <div className={`text-center ${isWinner ? 'pb-0' : 'pb-0'}`}>
      {/* Avatar + Crown */}
      <div className="relative mx-auto mb-1.5">
        {isWinner && (
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.3, type: 'spring' }}
            className="absolute -top-3 left-1/2 -translate-x-1/2 z-10"
          >
            <Crown className="w-5 h-5 text-warning drop-shadow-md" />
          </motion.div>
        )}
        <div
          className={`w-14 h-14 mx-auto rounded-full bg-gradient-to-br ${style.bg} flex items-center justify-center text-white font-bold text-lg shadow-lg ${style.shadow} ${isWinner ? 'ring-2 ring-yellow-300/50' : ''}`}
        >
          {getInitials(entry.name)}
        </div>
      </div>

      {/* Name */}
      <div className="text-xs font-semibold truncate px-1">{entry.name}</div>

      {/* Score */}
      <div className={`text-base font-black mt-0.5 bg-gradient-to-r ${style.bg} bg-clip-text text-transparent`}>
        {entry.totalScore}
      </div>

      {/* Podium block */}
      <div
        className={`mt-1.5 rounded-t-lg bg-gradient-to-b ${style.bg} text-white flex items-center justify-center font-bold shadow-md ${style.shadow}`}
        style={{ height: isWinner ? 56 : rank === 1 ? 40 : 28 }}
      >
        <Icon className={`${isWinner ? 'w-5 h-5' : 'w-4 h-4'}`} />
      </div>
    </div>
  );
}

function StatBadge({ icon: Icon, count }: { icon: any; count: number }) {
  if (!count) return null;
  return (
    <span className="flex items-center gap-0.5">
      <Icon className="w-2.5 h-2.5" />
      {count}
    </span>
  );
}

function getInitials(name: string): string {
  if (!name || name === 'Anonym') return '?';
  const parts = name.trim().split(/\s+/);
  return parts.length > 1
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.substring(0, 2).toUpperCase();
}
