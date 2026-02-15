'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import Image from 'next/image';

interface LeaderboardEntry {
  id: string;
  name: string;
  avatar: string;
  score: number;
  rank: number;
  previousRank?: number;
  isCurrentUser?: boolean;
}

interface AnimatedLeaderboardProps {
  entries: LeaderboardEntry[];
  highlightChanges?: boolean;
}

export default function AnimatedLeaderboard({ 
  entries, 
  highlightChanges = true 
}: AnimatedLeaderboardProps) {
  const [sortedEntries, setSortedEntries] = useState(entries);
  const [changingRanks, setChangingRanks] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Sort by score
    const sorted = [...entries].sort((a, b) => b.score - a.score);
    
    // Detect rank changes
    if (highlightChanges) {
      const changes = new Set<string>();
      sorted.forEach((entry, index) => {
        const newRank = index + 1;
        if (entry.previousRank && entry.previousRank !== newRank) {
          changes.add(entry.id);
        }
      });
      setChangingRanks(changes);
      
      // Clear changes after animation
      setTimeout(() => setChangingRanks(new Set()), 2000);
    }
    
    setSortedEntries(sorted);
  }, [entries, highlightChanges]);

  const getRankChange = (entry: LeaderboardEntry, newRank: number) => {
    if (!entry.previousRank) return null;
    const diff = entry.previousRank - newRank;
    if (diff > 0) return 'up';
    if (diff < 0) return 'down';
    return 'same';
  };

  const getRankIcon = (change: string | null) => {
    switch (change) {
      case 'up': return <TrendingUp className="w-4 h-4 text-success" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-destructive" />;
      default: return <Minus className="w-4 h-4 text-muted-foreground/70" />;
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-card rounded-2xl p-4 shadow-xl border border-border">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Trophy className="w-5 h-5 text-warning" />
          Bestenliste
        </h3>
        <span className="text-sm text-muted-foreground">Live</span>
      </div>

      {/* Top 3 Podium */}
      <div className="flex justify-center items-end gap-2 mb-8">
        {sortedEntries.slice(0, 3).map((entry, index) => {
          const heights = ['h-24', 'h-32', 'h-20'];
          const positions = [1, 0, 2]; // 2nd, 1st, 3rd
          const colors = ['from-muted-foreground to-muted-foreground/70', 'from-yellow-500 to-yellow-300', 'from-amber-700 to-amber-500'];
          const pos = positions[index];
          
          return (
            <motion.div
              key={entry.id}
              className="flex flex-col items-center"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <motion.div
                className="relative w-12 h-12 mb-2"
                whileHover={{ scale: 1.1 }}
              >
                <Image
                  src={entry.avatar}
                  alt={entry.name}
                  fill
                  className="rounded-full object-cover ring-2 ring-white"
                />
                <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-br ${colors[index]} flex items-center justify-center text-xs font-bold text-white`}>
                  {pos + 1}
                </div>
              </motion.div>
              <motion.div
                className={`w-16 ${heights[index]} rounded-t-lg bg-gradient-to-t ${colors[index]} opacity-80`}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ delay: 0.3 + index * 0.1, duration: 0.5 }}
                style={{ originY: 1 }}
              />
              <span className="text-xs text-foreground/80 mt-1 truncate w-16 text-center">
                {entry.name}
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* List */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {sortedEntries.map((entry, index) => {
            const rank = index + 1;
            const change = getRankChange(entry, rank);
            const isChanging = changingRanks.has(entry.id);
            const isTop3 = rank <= 3;
            
            if (isTop3) return null; // Already shown in podium
            
            return (
              <motion.div
                key={entry.id}
                layout
                initial={{ opacity: 0, x: -50 }}
                animate={{ 
                  opacity: 1, 
                  x: 0,
                  scale: isChanging ? [1, 1.05, 1] : 1,
                }}
                exit={{ opacity: 0, x: 50 }}
                transition={{ 
                  layout: { type: 'spring', stiffness: 300, damping: 30 },
                  scale: { duration: 0.3 },
                }}
                className={`flex items-center gap-3 p-3 rounded-xl ${
                  entry.isCurrentUser 
                    ? 'bg-primary/20 border border-primary/30' 
                    : 'bg-muted/50'
                }`}
              >
                {/* Rank */}
                <div className="w-8 text-center">
                  <span className="text-lg font-bold text-muted-foreground">{rank}</span>
                </div>

                {/* Avatar */}
                <div className="relative w-10 h-10">
                  <Image
                    src={entry.avatar}
                    alt={entry.name}
                    fill
                    className="rounded-full object-cover"
                  />
                </div>

                {/* Name */}
                <div className="flex-1">
                  <p className={`font-medium ${entry.isCurrentUser ? 'text-primary' : 'text-foreground'}`}>
                    {entry.name}
                  </p>
                </div>

                {/* Change Indicator */}
                <motion.div
                  animate={isChanging ? { rotate: [0, -10, 10, 0] } : {}}
                  transition={{ duration: 0.3 }}
                >
                  {getRankIcon(change)}
                </motion.div>

                {/* Score */}
                <motion.span
                  className="font-bold text-foreground tabular-nums"
                  key={entry.score}
                  initial={{ scale: 1.5, color: '#fbbf24' }}
                  animate={{ scale: 1, color: 'var(--foreground)' }}
                  transition={{ duration: 0.3 }}
                >
                  {entry.score.toLocaleString()}
                </motion.span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
