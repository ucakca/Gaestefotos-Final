'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Monitor,
  LayoutGrid,
  Sparkles,
  Heart,
  Snowflake,
  Star,
  CircleDot,
  PartyPopper,
  QrCode,
  MessageSquare,
  Send,
  ChevronDown,
  ChevronUp,
  Settings,
  X,
} from 'lucide-react';
import type { WallControlState } from '@/hooks/useWallControl';
import type { OverlayType } from '@/components/event-theme/WallThemeOverlay';

interface WallAdminControlProps {
  state: WallControlState;
  sendCommand: (update: Partial<WallControlState>) => void;
  className?: string;
}

const VIEW_MODES = [
  { key: 'grid', label: 'Grid', icon: LayoutGrid },
  { key: 'slideshow', label: 'Slideshow', icon: Monitor },
  { key: 'masonry', label: 'Masonry', icon: LayoutGrid },
  { key: 'collage', label: 'Collage', icon: LayoutGrid },
  { key: 'cinematic', label: 'Cinematic', icon: Monitor },
  { key: 'polaroid', label: 'Polaroid', icon: Monitor },
  { key: 'coverflow', label: 'CoverFlow', icon: Monitor },
  { key: 'bento', label: 'Bento', icon: LayoutGrid },
  { key: 'mosaic', label: 'Mosaik', icon: LayoutGrid },
  { key: 'mixed', label: 'Mixed', icon: Monitor },
] as const;

const OVERLAY_OPTIONS: { key: OverlayType; label: string; icon: React.ComponentType<any> }[] = [
  { key: 'none', label: 'Aus', icon: X },
  { key: 'particles', label: 'Partikel', icon: Sparkles },
  { key: 'confetti', label: 'Konfetti', icon: PartyPopper },
  { key: 'hearts', label: 'Herzen', icon: Heart },
  { key: 'snowflakes', label: 'Schnee', icon: Snowflake },
  { key: 'stars', label: 'Sterne', icon: Star },
  { key: 'bubbles', label: 'Blasen', icon: CircleDot },
];

export default function WallAdminControl({ state, sendCommand, className = '' }: WallAdminControlProps) {
  const [expanded, setExpanded] = useState(true);
  const [messageInput, setMessageInput] = useState('');

  const handleSendMessage = () => {
    if (!messageInput.trim()) return;
    sendCommand({ message: messageInput.trim(), messageVisible: true });
    setMessageInput('');
  };

  return (
    <div className={`bg-card border border-border rounded-2xl shadow-xl overflow-hidden ${className}`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm text-foreground">Wall-Fernsteuerung</span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4 border-t border-border pt-3">

              {/* ─── Play / Pause + Sound ───────────────────── */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => sendCommand({ isPlaying: !state.isPlaying })}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    state.isPlaying
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {state.isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  {state.isPlaying ? 'Pause' : 'Play'}
                </button>

                <button
                  onClick={() => sendCommand({ soundEnabled: !state.soundEnabled })}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    state.soundEnabled
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {state.soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                  Sound
                </button>

                <button
                  onClick={() => sendCommand({ showQR: !state.showQR })}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    state.showQR
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5" />
                  QR
                </button>
              </div>

              {/* ─── Interval slider ────────────────────────── */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Intervall: <span className="font-mono font-semibold text-foreground">{state.intervalSec}s</span>
                </label>
                <input
                  type="range"
                  min={3}
                  max={20}
                  value={state.intervalSec}
                  onChange={e => sendCommand({ intervalSec: Number(e.target.value) })}
                  className="w-full accent-primary h-1.5"
                />
              </div>

              {/* ─── View Mode ──────────────────────────────── */}
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Ansicht</label>
                <div className="flex flex-wrap gap-1">
                  {VIEW_MODES.map(m => (
                    <button
                      key={m.key}
                      onClick={() => sendCommand({ viewMode: m.key })}
                      className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                        state.viewMode === m.key
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ─── Overlay Type ───────────────────────────── */}
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Overlay-Effekt</label>
                <div className="flex flex-wrap gap-1">
                  {OVERLAY_OPTIONS.map(o => {
                    const Icon = o.icon;
                    return (
                      <button
                        key={o.key}
                        onClick={() => sendCommand({ overlayType: o.key })}
                        className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                          state.overlayType === o.key
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        <Icon className="w-3 h-3" />
                        {o.label}
                      </button>
                    );
                  })}
                </div>
                {state.overlayType !== 'none' && (
                  <div className="mt-2">
                    <label className="text-xs text-muted-foreground">
                      Intensität: <span className="font-mono">{Math.round(state.overlayIntensity * 100)}%</span>
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={state.overlayIntensity * 100}
                      onChange={e => sendCommand({ overlayIntensity: Number(e.target.value) / 100 })}
                      className="w-full accent-primary h-1.5"
                    />
                  </div>
                )}
              </div>

              {/* ─── Custom Message / Announcement ──────────── */}
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">
                  <MessageSquare className="w-3 h-3 inline mr-1" />
                  Ankündigung auf der Wall
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={e => setMessageInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                    placeholder="z.B. Torte wird angeschnitten!"
                    className="flex-1 px-2.5 py-1.5 rounded-lg bg-muted/60 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim()}
                    className="px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground disabled:opacity-40 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
                {state.messageVisible && (
                  <button
                    onClick={() => sendCommand({ messageVisible: false })}
                    className="mt-1.5 text-xs text-destructive hover:underline"
                  >
                    Ankündigung ausblenden
                  </button>
                )}
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
