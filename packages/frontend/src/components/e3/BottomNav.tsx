'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, PartyPopper, BookOpen, Info, Camera, X, Sparkles, Gamepad2, Search } from 'lucide-react';

/**
 * BottomNav - v0-Style Bottom Navigation
 * 
 * 5-slot layout: Feed, Foto-Spaß, [Camera FAB], Gästebuch, Info
 * Center camera button opens action sheet with photo actions.
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
  const [cameraOpen, setCameraOpen] = useState(false);

  const leftTabs = [
    { id: 'feed' as const, label: 'Feed', icon: Home },
    ...(showFotoSpass ? [{ id: 'fotospass' as const, label: 'Foto-Spaß', icon: PartyPopper }] : []),
  ];

  const rightTabs = [
    { id: 'guestbook' as const, label: 'Gästebuch', icon: BookOpen },
    { id: 'info' as const, label: 'Info', icon: Info },
  ];

  const cameraActions = [
    { id: 'photo' as const, label: 'Foto aufnehmen', icon: Camera, color: 'from-blue-500 to-cyan-500' },
    { id: 'game' as const, label: 'Foto-Spiel', icon: Gamepad2, color: 'from-pink-500 to-rose-500' },
    { id: 'ki-style' as const, label: 'KI Foto-Stil', icon: Sparkles, color: 'from-purple-500 to-violet-500' },
    ...(showFaceSearch ? [{ id: 'face-search' as const, label: 'Finde mein Foto', icon: Search, color: 'from-emerald-500 to-teal-500' }] : []),
  ];

  const renderTab = (tab: { id: TabId; label: string; icon: any }) => {
    const Icon = tab.icon;
    const isActive = activeTab === tab.id;
    const count = tab.id === 'fotospass' ? challengeCount : tab.id === 'guestbook' ? guestbookCount : 0;

    return (
      <motion.button
        key={tab.id}
        onClick={() => { setCameraOpen(false); onTabChange(tab.id); }}
        className="relative flex flex-col items-center justify-center gap-1 py-3 flex-1"
        whileTap={{ scale: 0.95 }}
      >
        {isActive && (
          <motion.div
            layoutId="activeTab"
            className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-1 bg-app-accent rounded-full"
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        )}
        <div className="relative">
          <Icon
            className={`w-6 h-6 transition-colors ${isActive ? 'text-app-accent' : 'text-gray-400'}`}
            strokeWidth={isActive ? 2 : 1.5}
          />
          {count > 0 && (
            <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 rounded-full bg-app-accent text-white text-[10px] font-bold flex items-center justify-center px-1">
              {count}
            </span>
          )}
        </div>
        <span className={`text-xs transition-colors ${isActive ? 'text-app-accent font-medium' : 'text-gray-400'}`}>
          {tab.label}
        </span>
      </motion.button>
    );
  };

  return (
    <>
      {/* Camera Action Sheet Overlay */}
      <AnimatePresence>
        {cameraOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
              onClick={() => setCameraOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="fixed bottom-24 left-4 right-4 z-[61] bg-app-card rounded-2xl shadow-2xl border border-app-border overflow-hidden"
            >
              <div className="p-4">
                <h3 className="text-lg font-bold text-app-fg mb-3">Was möchtest du tun?</h3>
                <div className="grid grid-cols-2 gap-3">
                  {cameraActions.map((action) => {
                    const ActionIcon = action.icon;
                    return (
                      <motion.button
                        key={action.id}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setCameraOpen(false);
                          onCameraAction?.(action.id);
                        }}
                        className="flex flex-col items-center gap-2 p-4 rounded-xl bg-app-bg border border-app-border hover:border-app-accent/50 transition-colors"
                      >
                        <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${action.color} flex items-center justify-center shadow-md`}>
                          <ActionIcon className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-sm font-medium text-app-fg text-center">{action.label}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-app-card border-t border-app-border shadow-lg">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-around">
            {/* Left tabs */}
            {leftTabs.map(renderTab)}

            {/* Center Camera Button */}
            <div className="flex flex-col items-center justify-center flex-1 py-1">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setCameraOpen(!cameraOpen)}
                className={`w-14 h-14 -mt-5 rounded-full shadow-lg flex items-center justify-center transition-all ${
                  cameraOpen
                    ? 'bg-gray-600 rotate-45'
                    : 'bg-gradient-to-br from-app-accent to-app-accent/80'
                }`}
              >
                {cameraOpen ? (
                  <X className="w-7 h-7 text-white" />
                ) : (
                  <Camera className="w-7 h-7 text-white" />
                )}
              </motion.button>
              <span className="text-[10px] text-gray-400 mt-0.5">Kamera</span>
            </div>

            {/* Right tabs */}
            {rightTabs.map(renderTab)}
          </div>
        </div>
      </div>
    </>
  );
}
