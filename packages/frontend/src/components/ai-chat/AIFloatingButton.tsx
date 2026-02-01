'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AIBotIcon from '../icons/AIBotIcon';
import AIChatPanel from './AIChatPanel';

export default function AIFloatingButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-24 right-4 w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg flex items-center justify-center z-40 hover:shadow-xl transition-all border border-amber-400/30"
          >
            <AIBotIcon size={26} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AIChatPanel isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
