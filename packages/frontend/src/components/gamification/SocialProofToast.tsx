'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Heart, MessageCircle, Share2, X } from 'lucide-react';

interface SocialProofToastProps {
  notifications: Array<{
    id: string;
    type: 'like' | 'comment' | 'share' | 'upload';
    user: {
      name: string;
      avatar: string;
    };
    content?: string;
    photo?: string;
  }>;
  maxVisible?: number;
}

export default function SocialProofToast({ 
  notifications, 
  maxVisible = 3 
}: SocialProofToastProps) {
  const [visible, setVisible] = useState<typeof notifications>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Show latest notifications
    const latest = notifications
      .filter(n => !dismissed.has(n.id))
      .slice(0, maxVisible);
    setVisible(latest);
  }, [notifications, dismissed, maxVisible]);

  const dismiss = (id: string) => {
    setDismissed(prev => new Set([...prev, id]));
    setVisible(prev => prev.filter(n => n.id !== id));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'like': return <Heart className="w-4 h-4 text-red-500 fill-red-500" />;
      case 'comment': return <MessageCircle className="w-4 h-4 text-blue-500 fill-blue-500" />;
      case 'share': return <Share2 className="w-4 h-4 text-green-500" />;
      default: return <Heart className="w-4 h-4 text-primary" />;
    }
  };

  const getText = (notification: typeof notifications[0]) => {
    switch (notification.type) {
      case 'like': return `${notification.user.name} hat ein Foto geliked`;
      case 'comment': return `${notification.user.name} hat kommentiert`;
      case 'share': return `${notification.user.name} hat geteilt`;
      case 'upload': return `${notification.user.name} hat ein Foto hochgeladen`;
      default: return '';
    }
  };

  return (
    <div className="fixed bottom-4 left-4 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {visible.map((notification, index) => (
          <motion.div
            key={notification.id}
            layout
            initial={{ opacity: 0, x: -100, scale: 0.8 }}
            animate={{ 
              opacity: 1, 
              x: 0, 
              scale: 1,
            }}
            exit={{ opacity: 0, x: -50, scale: 0.9 }}
            transition={{ 
              type: 'spring',
              stiffness: 400,
              damping: 25,
              delay: index * 0.1,
            }}
            className="pointer-events-auto"
          >
            <div className="flex items-center gap-3 p-3 bg-slate-800/95 backdrop-blur-sm rounded-xl shadow-lg border border-white/10 min-w-[300px]">
              {/* Avatar */}
              <div className="relative">
                <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-white/20">
                  <Image
                    src={notification.user.avatar}
                    alt={notification.user.name}
                    fill
                    className="object-cover"
                  />
                </div>
                {/* Pulse Indicator */}
                <motion.div
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary"
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [1, 0.7, 1],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                  }}
                >
                  {getIcon(notification.type)}
                </motion.div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">
                  {getText(notification)}
                </p>
                {notification.content && (
                  <p className="text-white/60 text-xs truncate">
                    "{notification.content}"
                  </p>
                )}
              </div>

              {/* Photo Thumbnail */}
              {notification.photo && (
                <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                  <Image
                    src={notification.photo}
                    alt=""
                    fill
                    className="object-cover"
                  />
                </div>
              )}

              {/* Dismiss */}
              <button
                onClick={() => dismiss(notification.id)}
                className="p-1 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-white/40" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
