'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface MosaicStats {
  totalCells: number;
  filledCells: number;
  progress: number;
  remaining: number;
  recentUploaders: string[];
  topUploaders: { name: string; count: number }[];
}

interface MosaicTickerProps {
  stats: MosaicStats | null;
  className?: string;
}

export default function MosaicTicker({ stats, className = '' }: MosaicTickerProps) {
  const [currentMessage, setCurrentMessage] = useState(0);

  const messages: string[] = [];

  if (stats) {
    // Recent uploader
    if (stats.recentUploaders.length > 0) {
      messages.push(`Zuletzt: ${stats.recentUploaders[0]} 📸`);
    }

    // Top uploader
    if (stats.topUploaders.length > 0) {
      const top = stats.topUploaders[0];
      messages.push(`Meiste Fotos: ${top.name} (${top.count}) 🏆`);
    }

    // Progress
    if (stats.progress < 100) {
      messages.push(`Noch ${stats.remaining} Tiles bis das Mosaik fertig ist!`);
      messages.push(`${stats.progress}% geschafft — ${stats.progress >= 50 ? 'das Bild wird sichtbar!' : 'weiter so!'}`);
    } else {
      messages.push('🎉 Das Mosaik ist komplett! Fantastisch!');
    }

    // Filled count
    messages.push(`${stats.filledCells} von ${stats.totalCells} Tiles platziert`);
  }

  useEffect(() => {
    if (messages.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentMessage(prev => (prev + 1) % messages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [messages.length]);

  if (!stats || messages.length === 0) return null;

  return (
    <div className={`bg-black/70 backdrop-blur-sm text-white px-6 py-3 ${className}`}>
      <div className="flex items-center justify-between max-w-screen-xl mx-auto">
        {/* Progress bar */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-32 h-2 bg-card/20 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-warning/80 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${stats.progress}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
          <span className="text-sm font-mono text-warning/70">{stats.progress}%</span>
        </div>

        {/* Scrolling messages */}
        <div className="flex-1 text-center overflow-hidden h-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentMessage}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="text-sm font-medium"
            >
              {messages[currentMessage % messages.length]}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Tile count */}
        <div className="shrink-0 text-sm text-white/60">
          {stats.filledCells}/{stats.totalCells}
        </div>
      </div>
    </div>
  );
}
