'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Mail, Download, Check, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

/**
 * BulkActionsToolbar - v0-Style Bulk Selection Toolbar
 * 
 * Erscheint wenn ≥1 Item ausgewählt ist
 */

export interface BulkActionsToolbarProps {
  selectedCount: number;
  totalCount: number;
  onClear: () => void;
  onDelete?: () => void;
  onSendEmail?: () => void;
  onExport?: () => void;
  onMarkConfirmed?: () => void;
  onMarkDeclined?: () => void;
}

export default function BulkActionsToolbar({
  selectedCount,
  totalCount,
  onClear,
  onDelete,
  onSendEmail,
  onExport,
  onMarkConfirmed,
  onMarkDeclined,
}: BulkActionsToolbarProps) {
  if (selectedCount === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-primary text-white rounded-full shadow-2xl px-6 py-3 flex items-center gap-4"
      >
        {/* Selected Count */}
        <div className="flex items-center gap-2">
          <span className="font-semibold">{selectedCount}</span>
          <span className="text-sm opacity-90">
            {selectedCount === 1 ? 'Gast' : 'Gäste'} ausgewählt
          </span>
        </div>

        <div className="w-px h-6 bg-white/20" />

        {/* Actions */}
        <div className="flex items-center gap-2">
          {onMarkConfirmed && (
            <motion.button
              onClick={onMarkConfirmed}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Als bestätigt markieren"
            >
              <Check className="w-4 h-4" />
            </motion.button>
          )}

          {onMarkDeclined && (
            <motion.button
              onClick={onMarkDeclined}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Als abgesagt markieren"
            >
              <XCircle className="w-4 h-4" />
            </motion.button>
          )}

          {onSendEmail && (
            <motion.button
              onClick={onSendEmail}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="E-Mail senden"
            >
              <Mail className="w-4 h-4" />
            </motion.button>
          )}

          {onExport && (
            <motion.button
              onClick={onExport}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Exportieren"
            >
              <Download className="w-4 h-4" />
            </motion.button>
          )}

          {onDelete && (
            <motion.button
              onClick={onDelete}
              className="p-2 rounded-lg hover:bg-red-500 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Löschen"
            >
              <Trash2 className="w-4 h-4" />
            </motion.button>
          )}
        </div>

        <div className="w-px h-6 bg-white/20" />

        {/* Clear Button */}
        <motion.button
          onClick={onClear}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title="Auswahl aufheben"
        >
          <X className="w-4 h-4" />
        </motion.button>
      </motion.div>
    </AnimatePresence>
  );
}
