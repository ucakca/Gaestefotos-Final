'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface EnvelopeProps {
  children: React.ReactNode;
  onOpen?: () => void;
}

export default function Envelope({ children, onOpen }: EnvelopeProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpen = () => {
    setIsOpen(true);
    onOpen?.();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <AnimatePresence mode="wait">
        {!isOpen ? (
          <motion.div
            key="envelope"
            className="relative cursor-pointer"
            onClick={handleOpen}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Envelope */}
            <div className="relative w-96 h-64">
              {/* Back */}
              <div className="absolute inset-0 bg-gradient-to-br from-status-warning to-primary rounded-lg shadow-2xl" />
              
              {/* Flap */}
              <motion.div
                className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-status-warning to-primary rounded-t-lg origin-top [transform-style:preserve-3d]"
                animate={{ rotateX: isOpen ? -180 : 0 }}
                transition={{ duration: 0.6, ease: 'easeInOut' }}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 border-4 border-foreground/50 rounded-full opacity-50" />
                </div>
              </motion.div>
              
              {/* Front */}
              <div className="absolute inset-0 bg-gradient-to-br from-status-warning to-primary rounded-lg flex items-center justify-center">
                <div className="text-center text-background">
                  <p className="text-2xl font-bold mb-2">📧</p>
                  <p className="text-sm">Klicken zum Öffnen</p>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="content"
            className="w-full max-w-4xl"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

