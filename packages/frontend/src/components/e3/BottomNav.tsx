'use client';

import { motion } from 'framer-motion';
import { Home, Trophy, BookOpen, Info } from 'lucide-react';

/**
 * BottomNav - v0-Style Bottom Navigation
 * 
 * Simplified bottom nav for mobile-first design.
 * Cleaner than BottomNavigation (22KB)
 * 
 * Features:
 * - 4 Tabs: Feed, Challenges, Guestbook, Info
 * - Active state indicator
 * - Mobile-optimized
 */

export interface BottomNavProps {
  activeTab: 'feed' | 'challenges' | 'guestbook' | 'info';
  onTabChange: (tab: 'feed' | 'challenges' | 'guestbook' | 'info') => void;
  challengeCount?: number;
  guestbookCount?: number;
}

export default function BottomNav({
  activeTab,
  onTabChange,
  challengeCount = 0,
  guestbookCount = 0,
}: BottomNavProps) {
  const tabs = [
    { id: 'feed' as const, label: 'Feed', icon: Home },
    { id: 'challenges' as const, label: 'Challenges', icon: Trophy },
    { id: 'guestbook' as const, label: 'Gästebuch', icon: BookOpen },
    { id: 'info' as const, label: 'Info', icon: Info },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-app-card border-t border-app-border shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-around">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <motion.button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className="relative flex flex-col items-center justify-center gap-1 py-3 flex-1"
                whileTap={{ scale: 0.95 }}
              >
                {/* Active Indicator - centered above icon */}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-1 bg-app-accent rounded-full"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}

                {/* Icon */}
                <Icon
                  className={`w-6 h-6 transition-colors ${
                    isActive ? 'text-app-accent' : 'text-gray-400'
                  }`}
                  strokeWidth={isActive ? 2 : 1.5}
                />

                {/* Label */}
                <span
                  className={`text-xs transition-colors ${
                    isActive ? 'text-app-accent font-medium' : 'text-gray-400'
                  }`}
                >
                  {tab.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
