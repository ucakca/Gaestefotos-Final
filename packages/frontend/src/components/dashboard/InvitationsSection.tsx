'use client';

import { useState } from 'react';
import { Mail, MoreVertical, ChevronRight } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox';
import { IconButton } from '@/components/ui/IconButton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface InvitationsSectionProps {
  eventId: string;
  onCopy: (text: string, message?: string) => Promise<void>;
  onShare: (url: string, title: string) => Promise<void>;
  onToast: (message: string, type: 'success' | 'error') => void;
}

export function InvitationsSection({
  eventId,
  onCopy,
  onShare,
  onToast,
}: InvitationsSectionProps) {
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editActive, setEditActive] = useState(true);
  const [editPassword, setEditPassword] = useState('');
  const [editHasPassword, setEditHasPassword] = useState(false);
  const [editVisibility, setEditVisibility] = useState<'UNLISTED' | 'PUBLIC'>('UNLISTED');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [generatingShortLinkId, setGeneratingShortLinkId] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const loadInvitations = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await api.get(`/events/${eventId}/invitations`);
      setInvitations(Array.isArray(data?.invitations) ? data.invitations : []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  };

  const createInvitation = async () => {
    if (!newName.trim()) return;
    try {
      setCreating(true);
      await api.post(`/events/${eventId}/invitations`, { name: newName.trim() });
      setNewName('');
      await loadInvitations();
      onToast('Einladung erstellt', 'success');
    } catch (err: any) {
      onToast(err.response?.data?.error || 'Fehler', 'error');
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (inv: any) => {
    setEditingId(inv.id);
    setEditName(inv.name || '');
    setEditActive(inv.isActive !== false);
    setEditPassword('');
    setEditHasPassword(!!inv.hasPassword);
    setEditVisibility(inv.visibility || 'UNLISTED');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditPassword('');
    setEditHasPassword(false);
    setEditVisibility('UNLISTED');
  };

  const saveInvitation = async (invId: string, opts?: { removePassword?: boolean }) => {
    try {
      setSavingId(invId);
      const payload: any = {
        name: editName.trim(),
        isActive: editActive,
        visibility: editVisibility,
      };
      if (opts?.removePassword) {
        payload.removePassword = true;
      } else if (editPassword.trim()) {
        payload.password = editPassword.trim();
      }
      await api.put(`/events/${eventId}/invitations/${invId}`, payload);
      setEditingId(null);
      await loadInvitations();
      onToast('Gespeichert', 'success');
    } catch (err: any) {
      onToast(err.response?.data?.error || 'Fehler', 'error');
    } finally {
      setSavingId(null);
    }
  };

  const generateShortLink = async (invId: string) => {
    try {
      setGeneratingShortLinkId(invId);
      await api.post(`/events/${eventId}/invitations/${invId}/shortlinks`, { channel: 'default' });
      await loadInvitations();
      setCopyFeedback('Neuer Shortlink erzeugt');
      setTimeout(() => setCopyFeedback(null), 1500);
    } catch (err: any) {
      onToast(err.response?.data?.error || 'Fehler', 'error');
    } finally {
      setGeneratingShortLinkId(null);
    }
  };

  // Auto-load on mount
  useState(() => {
    loadInvitations();
  });

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <div className="text-sm font-semibold text-foreground">Einladungsseiten</div>
        <div className="text-xs text-muted-foreground">
          Erstelle mehrere Einladungen (z.B. Familie, Freunde) und teile Shortlinks.
        </div>
      </div>

      <div className="px-4 py-4">
        {copyFeedback && (
          <div className="mb-2 text-sm text-foreground">{copyFeedback}</div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Name (z.B. Familie)"
            className="flex-1 min-w-[220px]"
          />
          <Button
            onClick={createInvitation}
            disabled={creating || !newName.trim()}
          >
            {creating ? 'Erstelle…' : 'Neu erstellen'}
          </Button>
          <Button
            variant="secondary"
            onClick={loadInvitations}
            disabled={loading}
          >
            Aktualisieren
          </Button>
        </div>

        {error && <div className="mt-2 text-sm text-destructive">{error}</div>}

        <div className="mt-4 space-y-3">
          {loading && <div className="text-sm text-muted-foreground">Lade...</div>}
          {!loading && invitations.length === 0 && (
            <div className="text-sm text-muted-foreground">Noch keine Einladungen.</div>
          )}

          {invitations.map((inv: any) => {
            const shortUrl = inv?.shortLinks?.[0]?.url;
            const publicUrl = typeof window !== 'undefined'
              ? `${window.location.origin}/i/${inv.slug}`
              : `/i/${inv.slug}`;
            const isEditing = editingId === inv.id;
            const isSaving = savingId === inv.id;
            const isGenerating = generatingShortLinkId === inv.id;

            return (
              <div key={inv.id} className="rounded-xl border border-border bg-accent/5 p-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    {isEditing ? (
                      <div className="space-y-2">
                        <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Name" />
                        <label className="flex items-center gap-2 text-sm">
                          <Checkbox checked={editActive} onCheckedChange={setEditActive} />
                          Aktiv
                        </label>
                        <label className="flex items-center justify-between gap-2 text-sm">
                          <span>Öffentlich</span>
                          <Checkbox
                            checked={editVisibility === 'PUBLIC'}
                            onCheckedChange={(checked) => setEditVisibility(checked ? 'PUBLIC' : 'UNLISTED')}
                          />
                        </label>
                        <div>
                          <div className="text-xs text-muted-foreground">Passwort (optional)</div>
                          <Input
                            type="password"
                            value={editPassword}
                            onChange={(e) => setEditPassword(e.target.value)}
                            className="mt-1"
                            placeholder={editHasPassword ? 'Neues Passwort (leer = unverändert)' : 'Passwort setzen'}
                          />
                          {editHasPassword && (
                            <Button
                              onClick={() => saveInvitation(inv.id, { removePassword: true })}
                              disabled={isSaving}
                              variant="danger"
                              size="sm"
                              className="mt-2"
                            >
                              {isSaving ? 'Speichere…' : 'Passwort entfernen'}
                            </Button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm font-semibold text-foreground">{inv.name}</div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      Opens: {inv.opens || 0} · RSVP: {inv.rsvp?.yes ?? 0}/{inv.rsvp?.no ?? 0}/{inv.rsvp?.maybe ?? 0}
                      {inv.hasPassword && ' · 🔒'}
                      {!inv.isActive && ' · inaktiv'}
                      {inv.visibility === 'PUBLIC' && ' · öffentlich'}
                    </div>
                    {shortUrl && (
                      <div className="mt-1 text-xs text-muted-foreground break-all">{shortUrl}</div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <>
                        <Button onClick={() => saveInvitation(inv.id)} disabled={isSaving || !editName.trim()} size="sm">
                          {isSaving ? 'Speichere…' : 'Speichern'}
                        </Button>
                        <Button variant="ghost" onClick={cancelEdit} disabled={isSaving} size="sm">
                          Abbrechen
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button variant="secondary" onClick={() => startEdit(inv)} size="sm">
                          Bearbeiten
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <IconButton
                              icon={<MoreVertical className="h-4 w-4" />}
                              variant="ghost"
                              size="sm"
                              aria-label="Mehr"
                              title="Mehr"
                            />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => generateShortLink(inv.id)} disabled={isGenerating}>
                              {isGenerating ? 'Erzeuge…' : 'Neuen Shortlink'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {shortUrl && (
                              <>
                                <DropdownMenuItem onSelect={() => onCopy(shortUrl, 'Link kopiert')}>
                                  Link kopieren
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => onShare(shortUrl, `Einladung: ${inv.name}`)}>
                                  Teilen
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
