'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Play, BookOpen, Info, X, Gamepad2, ScanFace, Sparkles, Shuffle, Camera, Puzzle } from 'lucide-react';
import { DualFAB } from '@/components/ui/DualFAB';

/**
 * BottomNav - v0-Style Bottom Navigation with DualFAB
 *
 * 5-slot layout: Feed | ▶ Live | [+ | AI] | Gästebuch | Info
 *
 * - "Live" tab opens Event Wall (Diashow / Mosaic)
 * - AI (right FAB) opens Bottom Sheet with Foto-Spiele, Face Search, KI Foto-Stil, etc.
 * - "+" (left FAB) opens photo upload
 */

export type TabId = 'feed' | 'guestbook' | 'info';

export interface BottomNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  onCameraAction?: (action: 'photo' | 'game' | 'ki-style' | 'face-search' | 'mosaic-upload') => void;
  onLivePress?: () => void;
  challengeCount?: number;
  guestbookCount?: number;
  showFotoSpass?: boolean;
  showFaceSearch?: boolean;
  hasMosaicWall?: boolean;
}

export default function BottomNav({
  activeTab,
  onTabChange,
  onCameraAction,
  onLivePress,
  challengeCount = 0,
  guestbookCount = 0,
  showFotoSpass = true,
  showFaceSearch = true,
  hasMosaicWall = false,
}: BottomNavProps) {
  const [aiSheetOpen, setAiSheetOpen] = useState(false);

  const leftTabs = [
    { id: 'feed' as const, label: 'Feed', icon: Home },
  ];

  const rightTabs = [
    { id: 'guestbook' as const, label: 'Gästebuch', icon: BookOpen },
    { id: 'info' as const, label: 'Info', icon: Info },
  ];

  const handleAiAction = (id: string) => {
    setAiSheetOpen(false);
    if (id === 'game' || id === 'filter-roulette' || id === 'emoji-challenge') {
      onCameraAction?.('game');
    } else if (id === 'mosaic-upload') {
      onCameraAction?.('mosaic-upload');
    } else {
      onCameraAction?.(id as any);
    }
  };

  const renderTab = (tab: { id: TabId; label: string; icon: any }) => {
    const Icon = tab.icon;
    const isActive = activeTab === tab.id;
    const count = tab.id === 'guestbook' ? guestbookCount : 0;

    return (
      <motion.button
        key={tab.id}
        onClick={() => onTabChange(tab.id)}
        className="relative flex flex-col items-center justify-center gap-1 py-3 flex-1"
        whileTap={{ scale: 0.95 }}
      >
        {isActive && (
          <motion.div
            layoutId="activeTab"
            className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-1 bg-primary rounded-full"
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        )}
        <div className="relative">
          <Icon
            className={`w-6 h-6 transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
            strokeWidth={isActive ? 2 : 1.5}
          />
          {count > 0 && (
            <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center px-1">
              {count}
            </span>
          )}
        </div>
        <span className={`text-xs transition-colors ${isActive ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
          {tab.label}
        </span>
      </motion.button>
    );
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-lg">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-around">
            {/* Feed */}
            {leftTabs.map(renderTab)}

            {/* ▶ Live — opens Event Wall overlay */}
            <motion.button
              onClick={onLivePress}
              className="relative flex flex-col items-center justify-center gap-1 py-3 flex-1"
              whileTap={{ scale: 0.95 }}
            >
              <div className="relative">
                <Play
                  className="w-6 h-6 text-muted-foreground transition-colors"
                  strokeWidth={1.5}
                />
                {challengeCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center px-1">
                    !
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                Live
              </span>
            </motion.button>

            {/* Center DualFAB - Upload (+) | AI */}
            <DualFAB
              onUploadClick={() => onCameraAction?.('photo')}
              onKIStudioClick={() => setAiSheetOpen(true)}
            />

            {/* Right tabs: Gästebuch, Info */}
            {rightTabs.map(renderTab)}
          </div>
        </div>
      </div>

      {/* AI Bottom Sheet */}
      <AnimatePresence>
        {aiSheetOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
              onClick={() => setAiSheetOpen(false)}
            />
            {/* Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 350 }}
              className="fixed bottom-0 left-0 right-0 z-[61] bg-card rounded-t-3xl shadow-2xl max-h-[70vh] overflow-y-auto"
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
              </div>

              <div className="px-5 pb-2 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold">Foto-Spaß & KI</h3>
                  <p className="text-xs text-muted-foreground">Entdecke was AI alles kann ✨</p>
                </div>
                <button
                  onClick={() => setAiSheetOpen(false)}
                  className="p-2 rounded-full hover:bg-muted/50 transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              <div className="px-4 pb-8 space-y-3">
                {/* Hero: Mosaic Wall (if active) */}
                {hasMosaicWall && (
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    onClick={() => handleAiAction('mosaic-upload')}
                    className="w-full relative overflow-hidden rounded-2xl p-4 text-left active:scale-[0.98] transition-transform"
                    style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))' }}
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 opacity-20">
                      <Puzzle className="w-24 h-24 text-white" strokeWidth={0.5} />
                    </div>
                    <div className="relative">
                      <span className="text-2xl mb-1 block">🧩</span>
                      <div className="text-base font-bold text-white">Mosaic Wall</div>
                      <div className="text-xs text-white/80 mt-0.5">Ich will auch drauf! Foto hochladen</div>
                    </div>
                  </motion.button>
                )}

                {/* 2-Column Grid */}
                <div className="grid grid-cols-2 gap-2.5">
                  {/* Foto-Spiele */}
                  {showFotoSpass && (
                    <motion.button
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      onClick={() => handleAiAction('game')}
                      className="flex flex-col items-start gap-2 p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-200/30 hover:from-amber-500/20 hover:to-orange-500/20 active:scale-[0.97] transition-all text-left"
                    >
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md shadow-amber-500/20">
                        <Gamepad2 className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold">Foto-Spiele</div>
                        <div className="text-[10px] text-muted-foreground">Challenges & Fun</div>
                      </div>
                    </motion.button>
                  )}

                  {/* Finde meine Fotos */}
                  {showFaceSearch && (
                    <motion.button
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 }}
                      onClick={() => handleAiAction('face-search')}
                      className="flex flex-col items-start gap-2 p-4 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-200/30 hover:from-cyan-500/20 hover:to-blue-500/20 active:scale-[0.97] transition-all text-left"
                    >
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-md shadow-cyan-500/20">
                        <ScanFace className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold">Finde mich</div>
                        <div className="text-[10px] text-muted-foreground">AI Gesichtserkennung</div>
                      </div>
                    </motion.button>
                  )}

                  {/* KI Foto-Stil */}
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    onClick={() => handleAiAction('ki-style')}
                    className="flex flex-col items-start gap-2 p-4 rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-200/30 hover:from-purple-500/20 hover:to-pink-500/20 active:scale-[0.97] transition-all text-left"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center shadow-md shadow-purple-500/20">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">KI Foto-Stil</div>
                      <div className="text-[10px] text-muted-foreground">AI Style Transfer</div>
                    </div>
                  </motion.button>

                  {/* Filter Roulette */}
                  {showFotoSpass && (
                    <motion.button
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 }}
                      onClick={() => handleAiAction('filter-roulette')}
                      className="flex flex-col items-start gap-2 p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-200/30 hover:from-emerald-500/20 hover:to-teal-500/20 active:scale-[0.97] transition-all text-left"
                    >
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-md shadow-emerald-500/20">
                        <Shuffle className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold">Filter Roulette</div>
                        <div className="text-[10px] text-muted-foreground">Zufalls-KI-Effekt 🎰</div>
                      </div>
                    </motion.button>
                  )}

                  {/* Emoji Challenge */}
                  {showFotoSpass && (
                    <motion.button
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      onClick={() => handleAiAction('emoji-challenge')}
                      className="flex flex-col items-start gap-2 p-4 rounded-2xl bg-gradient-to-br from-rose-500/10 to-red-500/10 border border-rose-200/30 hover:from-rose-500/20 hover:to-red-500/20 active:scale-[0.97] transition-all text-left col-span-2 sm:col-span-1"
                    >
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-400 to-red-500 flex items-center justify-center shadow-md shadow-rose-500/20">
                        <Camera className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold">Emoji Challenge</div>
                        <div className="text-[10px] text-muted-foreground">Kannst du das? 😜</div>
                      </div>
                    </motion.button>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
