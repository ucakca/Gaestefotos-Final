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

  const aiFeatures = [
    { id: 'mosaic-upload' as const, label: 'Mosaic Wall', desc: 'Ich will auch drauf! Foto hochladen', icon: Puzzle, show: hasMosaicWall },
    { id: 'game' as const, label: 'Foto-Spiele', desc: 'Challenges & Wettbewerbe', icon: Gamepad2, show: showFotoSpass },
    { id: 'face-search' as const, label: 'Finde meine Fotos', desc: 'Gesichtserkennung', icon: ScanFace, show: showFaceSearch },
    { id: 'ki-style' as const, label: 'KI Foto-Stil', desc: 'AI Style Transfer', icon: Sparkles, show: true },
    { id: 'filter-roulette' as const, label: 'Filter Roulette', desc: 'Zufälliger KI-Effekt', icon: Shuffle, show: showFotoSpass },
    { id: 'emoji-challenge' as const, label: 'Emoji Challenge', desc: 'Emoji nachstellen', icon: Camera, show: showFotoSpass },
  ].filter(f => f.show);

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

              <div className="px-6 pb-2 flex items-center justify-between">
                <h3 className="text-lg font-bold">Foto-Spaß & KI</h3>
                <button
                  onClick={() => setAiSheetOpen(false)}
                  className="p-2 rounded-full hover:bg-muted/50 transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              <div className="px-4 pb-8 space-y-1">
                {aiFeatures.map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <button
                      key={feature.id}
                      onClick={() => {
                        setAiSheetOpen(false);
                        if (feature.id === 'game' || feature.id === 'filter-roulette' || feature.id === 'emoji-challenge') {
                          onCameraAction?.('game');
                        } else if (feature.id === 'mosaic-upload') {
                          onCameraAction?.('mosaic-upload');
                        } else {
                          onCameraAction?.(feature.id);
                        }
                      }}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-muted/50 active:bg-muted/70 transition-colors"
                    >
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: 'hsl(var(--primary) / 0.1)' }}
                      >
                        <Icon className="w-6 h-6" style={{ color: 'hsl(var(--primary))' }} />
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-semibold">{feature.label}</div>
                        <div className="text-xs text-muted-foreground">{feature.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
