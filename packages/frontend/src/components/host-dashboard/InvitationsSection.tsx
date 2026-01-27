'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mail, 
  Plus, 
  Copy, 
  Check, 
  Link as LinkIcon, 
  Trash2, 
  Eye, 
  EyeOff,
  MoreVertical,
  Pencil,
  Globe,
  Lock
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Invitation {
  id: string;
  name: string;
  isActive: boolean;
  hasPassword: boolean;
  visibility: 'UNLISTED' | 'PUBLIC';
  shortlinks?: { code: string }[];
  usageCount?: number;
}

interface InvitationsSectionProps {
  invitations: Invitation[];
  loading?: boolean;
  error?: string | null;
  onCreateInvitation: (name: string) => Promise<void>;
  onDeleteInvitation?: (id: string) => Promise<void>;
  onCopyLink: (invitation: Invitation) => void;
  onEditInvitation?: (invitation: Invitation) => void;
}

export default function InvitationsSection({
  invitations,
  loading = false,
  error,
  onCreateInvitation,
  onDeleteInvitation,
  onCopyLink,
  onEditInvitation,
}: InvitationsSectionProps) {
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await onCreateInvitation(newName.trim());
      setNewName('');
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = (invitation: Invitation) => {
    onCopyLink(invitation);
    setCopiedId(invitation.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-app-card border border-app-border rounded-2xl overflow-hidden"
    >
      <div className="p-4 border-b border-app-border">
        <h3 className="font-semibold text-app-fg flex items-center gap-2">
          <Mail className="w-4 h-4" />
          Einladungen
        </h3>
        <p className="text-xs text-app-muted mt-1">
          Erstelle verschiedene Einladungen für unterschiedliche Gästegruppen
        </p>
      </div>

      <div className="p-4 space-y-4">
        {/* Create New */}
        <div className="flex gap-2">
          <Input
            placeholder="z.B. Familie, Freunde..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            disabled={creating}
            className="flex-1"
          />
          <Button
            variant="primary"
            size="sm"
            onClick={handleCreate}
            disabled={creating || !newName.trim()}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {error && (
          <p className="text-xs text-red-500">{error}</p>
        )}

        {/* Invitations List */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 bg-app-bg rounded-xl animate-pulse" />
            ))}
          </div>
        ) : invitations.length === 0 ? (
          <div className="text-center py-8 text-app-muted">
            <Mail className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Noch keine Einladungen</p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {invitations.map((invitation, index) => (
                <motion.div
                  key={invitation.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-3 p-3 bg-app-bg rounded-xl"
                >
                  {/* Status Icon */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    invitation.isActive 
                      ? 'bg-green-500/10 text-green-500' 
                      : 'bg-yellow-500/10 text-yellow-500'
                  }`}>
                    {invitation.hasPassword ? (
                      <Lock className="w-4 h-4" />
                    ) : (
                      <Globe className="w-4 h-4" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-app-fg truncate">{invitation.name}</p>
                    <div className="flex items-center gap-2 text-xs text-app-muted">
                      <span>{invitation.isActive ? 'Aktiv' : 'Inaktiv'}</span>
                      {invitation.usageCount !== undefined && (
                        <span>• {invitation.usageCount} Nutzungen</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(invitation)}
                      className="p-2"
                    >
                      {copiedId === invitation.id ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="p-2">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {onEditInvitation && (
                          <DropdownMenuItem onClick={() => onEditInvitation(invitation)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Bearbeiten
                          </DropdownMenuItem>
                        )}
                        {onDeleteInvitation && (
                          <DropdownMenuItem 
                            onClick={() => onDeleteInvitation(invitation.id)}
                            className="text-red-500"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Löschen
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}
