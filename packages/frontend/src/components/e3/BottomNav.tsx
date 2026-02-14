'use client';

import { motion } from 'framer-motion';
import { Home, PartyPopper, BookOpen, Info } from 'lucide-react';
import { DualFAB } from '@/components/ui/DualFAB';

/**
 * BottomNav - v0-Style Bottom Navigation with SplitFAB
 * 
 * 5-slot layout: Feed, Foto-Spaß, [SplitFAB], Gästebuch, Info
 * Center SplitFAB opens menu with Upload, KI Studio, Camera options.
 */

export type TabId = 'feed' | 'fotospass' | 'guestbook' | 'info';

export interface BottomNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  onCameraAction?: (action: 'photo' | 'game' | 'ki-style' | 'face-search') => void;
  challengeCount?: number;
  guestbookCount?: number;
  showFotoSpass?: boolean;
  showFaceSearch?: boolean;
}

export default function BottomNav({
  activeTab,
  onTabChange,
  onCameraAction,
  challengeCount = 0,
  guestbookCount = 0,
  showFotoSpass = true,
  showFaceSearch = true,
}: BottomNavProps) {

  const leftTabs = [
    { id: 'feed' as const, label: 'Feed', icon: Home },
    ...(showFotoSpass ? [{ id: 'fotospass' as const, label: 'Foto-Spaß', icon: PartyPopper }] : []),
  ];

  const rightTabs = [
    { id: 'guestbook' as const, label: 'Gästebuch', icon: BookOpen },
    { id: 'info' as const, label: 'Info', icon: Info },
  ];

  const renderTab = (tab: { id: TabId; label: string; icon: any }) => {
    const Icon = tab.icon;
    const isActive = activeTab === tab.id;
    const count = tab.id === 'fotospass' ? challengeCount : tab.id === 'guestbook' ? guestbookCount : 0;

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
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-around">
          {/* Left tabs */}
          {leftTabs.map(renderTab)}

          {/* Center SplitFAB */}
          <SplitFAB
            onUploadClick={() => onCameraAction?.('photo')}
            onKIStudioClick={() => onCameraAction?.('ki-style')}
            onCameraClick={() => onCameraAction?.('photo')}
          />

          {/* Right tabs */}
          {rightTabs.map(renderTab)}
        </div>
      </div>
    </div>
  );
}
