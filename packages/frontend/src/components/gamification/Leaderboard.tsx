'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Crown, User } from 'lucide-react';
import api from '@/lib/api';

interface LeaderboardEntry {
  id: string;
  visitorId: string;
  name: string;
  avatarUrl?: string;
  photoCount: number;
  gameCount: number;
  kiCount: number;
  totalScore: number;
}

interface LeaderboardProps {
  eventId: string;
  visitorId?: string;
}

export default function Leaderboard({ eventId, visitorId }: LeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId) return;
    api.get(`/events/${eventId}/leaderboard`, { params: { limit: 20 } })
      .then(res => setEntries(res.data?.leaderboard || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [eventId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-12">
        <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" />
        <p className="text-muted-foreground text-sm">Noch keine Teilnehmer</p>
        <p className="text-muted-foreground text-xs mt-1">Lade Fotos hoch und spiele Spiele, um Punkte zu sammeln!</p>
      </div>
    );
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-warning" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-muted-foreground/70" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
    return <span className="w-5 h-5 flex items-center justify-center text-xs font-bold text-muted-foreground">{rank}</span>;
  };

  const getRankBg = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200';
    if (rank === 2) return 'bg-gradient-to-r from-gray-50 to-slate-50 border-border';
    if (rank === 3) return 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200';
    return 'bg-card border-border';
  };

  return (
    <div className="space-y-2">
      {entries.map((entry, index) => {
        const rank = index + 1;
        const isMe = visitorId && entry.visitorId === visitorId;
        return (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`flex items-center gap-3 p-3 rounded-xl border ${getRankBg(rank)} ${
              isMe ? 'ring-2 ring-blue-400 ring-offset-1' : ''
            }`}
          >
            <div className="flex-shrink-0 w-8 flex items-center justify-center">
              {getRankIcon(rank)}
            </div>
            <div className="flex-shrink-0">
              {entry.avatarUrl ? (
                <img src={entry.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                  <User className="w-4 h-4 text-blue-500" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-foreground truncate">
                  {entry.name || 'Anonym'}
                </span>
                {isMe && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600">
                    Du
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span>📸 {entry.photoCount}</span>
                <span>🎮 {entry.gameCount}</span>
                {entry.kiCount > 0 && <span>🎨 {entry.kiCount}</span>}
              </div>
            </div>
            <div className="flex-shrink-0 text-right">
              <div className="font-bold text-foreground">{entry.totalScore}</div>
              <div className="text-[10px] text-muted-foreground">Punkte</div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
