'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Lock, Star } from 'lucide-react';
import api from '@/lib/api';

interface Achievement {
  id: string;
  key: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  threshold: number;
  points: number;
  unlocked: boolean;
  unlockedAt: string | null;
}

interface AchievementListProps {
  eventId: string;
  visitorId: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  PHOTO: 'Fotos',
  GAME: 'Spiele',
  GUESTBOOK: 'Gästebuch',
  SOCIAL: 'Social',
  KI_KUNST: 'KI-Kunst',
  SPECIAL: 'Spezial',
};

export default function AchievementList({ eventId, visitorId }: AchievementListProps) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId) return;
    api.get(`/events/${eventId}/achievements`, { params: { visitorId } })
      .then(res => setAchievements(res.data?.achievements || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [eventId, visitorId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    );
  }

  const unlocked = achievements.filter(a => a.unlocked);
  const locked = achievements.filter(a => !a.unlocked);
  const totalPoints = unlocked.reduce((sum, a) => sum + a.points, 0);

  // Group by category
  const categories = Object.keys(CATEGORY_LABELS);
  const grouped = categories
    .map(cat => ({
      category: cat,
      label: CATEGORY_LABELS[cat],
      items: achievements.filter(a => a.category === cat),
    }))
    .filter(g => g.items.length > 0);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800">
          <Trophy className="w-5 h-5" />
          <span className="font-bold text-lg">{totalPoints}</span>
          <span className="text-sm">Punkte</span>
          <span className="text-amber-500 mx-1">•</span>
          <span className="text-sm">{unlocked.length}/{achievements.length} Badges</span>
        </div>
      </div>

      {/* Categories */}
      {grouped.map(({ category, label, items }) => (
        <div key={category}>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 px-1">
            {label}
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {items.map((achievement) => (
              <motion.div
                key={achievement.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`relative flex flex-col items-center text-center p-3 rounded-2xl border transition-all ${
                  achievement.unlocked
                    ? 'bg-gradient-to-b from-amber-50 to-yellow-50 border-amber-200 shadow-sm'
                    : 'bg-background/50 border-dashed border-border/60 opacity-60'
                }`}
              >
                <div className={`text-2xl mb-1 ${achievement.unlocked ? '' : 'grayscale'}`}>
                  {achievement.icon}
                </div>
                <h4 className={`text-xs font-semibold leading-tight ${
                  achievement.unlocked ? 'text-foreground' : 'text-muted-foreground'
                }`}>
                  {achievement.title}
                </h4>
                <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                  {achievement.description}
                </p>
                <div className="mt-1 flex items-center gap-1">
                  <Star className={`w-3 h-3 ${achievement.unlocked ? 'text-amber-500' : 'text-muted-foreground'}`} />
                  <span className="text-[10px] font-medium text-muted-foreground">{achievement.points}P</span>
                </div>
                {!achievement.unlocked && (
                  <div className="absolute top-1.5 right-1.5">
                    <Lock className="w-3 h-3 text-muted-foreground" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
