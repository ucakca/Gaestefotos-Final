import logger from '@/lib/logger';
'use client';

/**
 * Guest Group Manager
 * 
 * Hauptkomponente für Gästegruppen-Verwaltung
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/Input';
import { GuestGroupForm } from './GuestGroupForm';
import { GuestGroupBadge } from './GuestGroupBadge';
import api from '@/lib/api';

interface GuestGroup {
  id: string;
  name: string;
  description?: string;
  color: string;
  order: number;
  _count: {
    guests: number;
  };
}

interface GuestGroupManagerProps {
  eventId: string;
}

export function GuestGroupManager({ eventId }: GuestGroupManagerProps) {
  const [groups, setGroups] = useState<GuestGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState<GuestGroup | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<GuestGroup | null>(null);

  useEffect(() => {
    loadGroups();
  }, [eventId]);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/events/${eventId}/guest-groups`);
      setGroups(response.data);
    } catch (error) {
      logger.error('Failed to load groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data: { name: string; description?: string; color: string }) => {
    try {
      await api.post(`/events/${eventId}/guest-groups`, data);
      await loadGroups();
      setShowCreateDialog(false);
    } catch (error) {
      logger.error('Failed to create group:', error);
      throw error;
    }
  };

  const handleUpdate = async (groupId: string, data: any) => {
    try {
      await api.put(`/events/${eventId}/guest-groups/${groupId}`, data);
      await loadGroups();
      setEditingGroup(null);
    } catch (error) {
      logger.error('Failed to update group:', error);
      throw error;
    }
  };

  const handleDelete = async () => {
    if (!deletingGroup) return;

    try {
      await api.delete(`/events/${eventId}/guest-groups/${deletingGroup.id}`);
      await loadGroups();
      setDeletingGroup(null);
    } catch (error) {
      logger.error('Failed to delete group:', error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-card rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Gästegruppen</h3>
        <Button
          onClick={() => setShowCreateDialog(true)}
          size="sm"
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Gruppe erstellen
        </Button>
      </div>

      {/* Groups List */}
      <div className="space-y-2">
        <AnimatePresence>
          {groups.map((group) => (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-card border border-border rounded-lg p-4 hover:border-app-accent transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: group.color }}
                  />
                  <div>
                    <div className="font-medium text-foreground">{group.name}</div>
                    {group.description && (
                      <div className="text-sm text-muted-foreground">{group.description}</div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground px-2 py-1 bg-background rounded">
                    <Users className="w-4 h-4" />
                    <span>{group._count.guests}</span>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingGroup(group)}
                    className="p-2"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeletingGroup(group)}
                    className="p-2 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {groups.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Noch keine Gruppen erstellt</p>
            <p className="text-sm">Erstelle Gruppen um Gäste zu organisieren</p>
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogTitle>Neue Gästegruppe</DialogTitle>
          <GuestGroupForm
            onSubmit={handleCreate}
            onCancel={() => setShowCreateDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingGroup} onOpenChange={(open) => !open && setEditingGroup(null)}>
        <DialogContent>
          <DialogTitle>Gruppe bearbeiten</DialogTitle>
          {editingGroup && (
            <GuestGroupForm
              initialData={editingGroup}
              onSubmit={(data) => handleUpdate(editingGroup.id, data)}
              onCancel={() => setEditingGroup(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deletingGroup} onOpenChange={(open) => !open && setDeletingGroup(null)}>
        <DialogContent>
          <DialogTitle>Gruppe löschen?</DialogTitle>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Möchtest du die Gruppe "{deletingGroup?.name}" wirklich löschen?
            </p>
            <p className="text-sm text-muted-foreground">
              Die Gäste werden nicht gelöscht, nur aus der Gruppe entfernt.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setDeletingGroup(null)}>
                Abbrechen
              </Button>
              <Button variant="primary" onClick={handleDelete} className="bg-status-danger">
                Löschen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
