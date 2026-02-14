'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MoreVertical, Edit, Mail, FileText, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/**
 * GuestActionMenu - v0-Style Action Dropdown
 * 
 * 3-Punkte Menü mit animierten Actions
 */

export interface GuestActionMenuProps {
  onEdit?: () => void;
  onSendEmail?: () => void;
  onViewDetails?: () => void;
  onDelete?: () => void;
}

export default function GuestActionMenu({
  onEdit,
  onSendEmail,
  onViewDetails,
  onDelete,
}: GuestActionMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <motion.button
          className="p-2 rounded-lg hover:bg-background transition-colors"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <MoreVertical className="w-4 h-4 text-muted-foreground" />
        </motion.button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-48">
        {onEdit && (
          <DropdownMenuItem
            onClick={() => {
              onEdit();
              setOpen(false);
            }}
            className="cursor-pointer"
          >
            <Edit className="w-4 h-4 mr-2" />
            <span>Bearbeiten</span>
          </DropdownMenuItem>
        )}

        {onSendEmail && (
          <DropdownMenuItem
            onClick={() => {
              onSendEmail();
              setOpen(false);
            }}
            className="cursor-pointer"
          >
            <Mail className="w-4 h-4 mr-2" />
            <span>E-Mail senden</span>
          </DropdownMenuItem>
        )}

        {onViewDetails && (
          <DropdownMenuItem
            onClick={() => {
              onViewDetails();
              setOpen(false);
            }}
            className="cursor-pointer"
          >
            <FileText className="w-4 h-4 mr-2" />
            <span>Details anzeigen</span>
          </DropdownMenuItem>
        )}

        {onDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                onDelete();
                setOpen(false);
              }}
              className="cursor-pointer text-red-600 focus:text-red-600"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              <span>Löschen</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
