'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import AppLayout from '@/components/AppLayout';
import { FullPageLoader } from '@/components/ui/FullPageLoader';
import { ErrorState } from '@/components/ui/ErrorState';
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
import { useToastStore } from '@/store/toastStore';
import {
  Eye,
  EyeOff,
  MoreVertical,
  Plus,
  Link as LinkIcon,
  Users,
  Share2,
  Copy,
  QrCode,
  Calendar,
  Settings,
} from 'lucide-react';
import { InvitationConfigEditor } from '@/components/invitation-editor/InvitationConfigEditor';
import { InvitationConfig } from '@gaestefotos/shared';

interface Invitation {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  hasPassword: boolean;
  visibility: 'PUBLIC' | 'UNLISTED';
  opens: number;
  rsvp?: { yes: number; no: number; maybe: number };
  shortLinks?: { url: string }[];
}

export default function InvitationsPage({ params }: { params: Promise<{ id: string }> }) {
  const [eventId, setEventId] = React.useState<string | null>(null);

  React.useEffect(() => {
    params.then(p => setEventId(p.id));
  }, []);
  const { showToast } = useToastStore();

  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create new invitation
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  // Edit invitation
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editVisibility, setEditVisibility] = useState<'PUBLIC' | 'UNLISTED'>('UNLISTED');
  const [editPassword, setEditPassword] = useState('');
  const [editHasPassword, setEditHasPassword] = useState(false);
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  // Shortlink generation
  const [generatingShortlink, setGeneratingShortlink] = useState<string | null>(null);

  // Copy feedback
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // Config editor
  const [editingConfigId, setEditingConfigId] = useState<string | null>(null);
  const [editingConfig, setEditingConfig] = useState<Partial<InvitationConfig> | null>(null);

  useEffect(() => {
    if (eventId) loadInvitations();
  }, [eventId]);

  const loadInvitations = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await api.get(`/events/${eventId}/invitations`);
      setInvitations(Array.isArray(data?.invitations) ? data.invitations : []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fehler beim Laden der Einladungen');
    } finally {
      setLoading(false);
    }
  };

  const createInvitation = async () => {
    const name = newName.trim();
    if (!name) return;
    
    try {
      setCreating(true);
      await api.post(`/events/${eventId}/invitations`, { name });
      setNewName('');
      await loadInvitations();
      showToast('Einladung erstellt', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Fehler beim Erstellen', 'error');
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (inv: Invitation) => {
    setEditingId(inv.id);
    setEditName(inv.name);
    setEditIsActive(inv.isActive);
    setEditVisibility(inv.visibility);
    setEditHasPassword(inv.hasPassword);
    setEditPassword('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditIsActive(true);
    setEditVisibility('UNLISTED');
    setEditPassword('');
    setEditHasPassword(false);
  };

  const saveInvitation = async (invId: string, opts?: { removePassword?: boolean }) => {
    try {
      setSaving(true);
      const body: any = {
        name: editName.trim() || undefined,
        isActive: editIsActive,
        visibility: editVisibility,
      };

      if (opts?.removePassword) {
        body.password = null;
      } else if (editPassword.trim()) {
        body.password = editPassword.trim();
      }

      await api.put(`/events/${eventId}/invitations/${invId}`, body);
      await loadInvitations();
      cancelEdit();
      showToast('Einladung gespeichert', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Fehler beim Speichern', 'error');
    } finally {
      setSaving(false);
    }
  };

  const generateShortlink = async (invId: string) => {
    try {
      setGeneratingShortlink(invId);
      await api.post(`/events/${eventId}/invitations/${invId}/shortlinks`, { channel: 'default' });
      await loadInvitations();
      showToast('Neuer Shortlink erstellt', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Fehler beim Erstellen des Shortlinks', 'error');
    } finally {
      setGeneratingShortlink(null);
    }
  };

  const copyToClipboard = async (text: string, message = 'Kopiert!') => {
    await navigator.clipboard.writeText(text);
    setCopyFeedback(message);
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  const openConfigEditor = async (inv: Invitation) => {
    try {
      const { data } = await api.get(`/invitations/slug/${inv.slug}`);
      setEditingConfigId(inv.id);
      setEditingConfig((data.invitation?.config as Partial<InvitationConfig>) || {});
    } catch (err: any) {
      showToast('Fehler beim Laden der Konfiguration', 'error');
    }
  };

  const saveConfig = async (config: Partial<InvitationConfig>) => {
    if (!editingConfigId) return;
    
    try {
      await api.put(`/events/${eventId}/invitations/${editingConfigId}`, { config });
      await loadInvitations();
      showToast('Einladung konfiguriert', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Fehler beim Speichern', 'error');
      throw err;
    }
  };

  const shareLink = async (url: string, title: string) => {
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
    } catch {}
    await copyToClipboard(url, 'Link kopiert');
  };

  if (loading) {
    return (
      <AppLayout showBackButton backUrl={`/events/${eventId}/dashboard`}>
        <FullPageLoader label="Lade Einladungen..." />
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout showBackButton backUrl={`/events/${eventId}/dashboard`}>
        <ErrorState message={error} />
      </AppLayout>
    );
  }

  return (
    <AppLayout showBackButton backUrl={`/events/${eventId}/dashboard`}>
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-foreground">Einladungsseiten</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Erstelle unterschiedliche Einladungen für verschiedene Gästegruppen (z.B. Familie, Freunde, Kollegen)
          </p>
        </div>

        {/* Copy Feedback Toast */}
        {copyFeedback && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-foreground text-background px-4 py-2 rounded-lg shadow-lg animate-fade-in z-50">
            {copyFeedback}
          </div>
        )}

        {/* Create New */}
        <div className="mb-6 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Name der Einladung (z.B. Familie, Freunde)"
              className="flex-1"
              onKeyDown={(e) => e.key === 'Enter' && createInvitation()}
            />
            <Button
              onClick={createInvitation}
              disabled={creating || !newName.trim()}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              {creating ? 'Erstelle...' : 'Erstellen'}
            </Button>
          </div>
        </div>

        {/* Invitations List */}
        <div className="space-y-4">
          {invitations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Noch keine Einladungen erstellt.</p>
              <p className="text-sm mt-1">
                Erstelle deine erste Einladung oben.
              </p>
            </div>
          ) : (
            invitations.map((inv) => {
              const shortUrl = inv.shortLinks?.[0]?.url;
              const publicUrl = typeof window !== 'undefined'
                ? `${window.location.origin}/i/${inv.slug}`
                : `/i/${inv.slug}`;
              const isEditing = editingId === inv.id;

              return (
                <div
                  key={inv.id}
                  className="rounded-xl border border-border bg-card overflow-hidden"
                >
                  {/* Header Row */}
                  <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <LinkIcon className="w-5 h-5 text-muted-foreground" />
                      <span className="font-medium text-foreground">{inv.name}</span>
                      {!inv.isActive && (
                        <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded">
                          Inaktiv
                        </span>
                      )}
                      {inv.hasPassword && (
                        <span className="text-xs bg-warning/10 text-warning px-2 py-0.5 rounded">
                          🔒 Passwort
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => isEditing ? cancelEdit() : startEdit(inv)}
                      >
                        {isEditing ? 'Abbrechen' : 'Bearbeiten'}
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <IconButton
                            icon={<MoreVertical className="w-4 h-4" />}
                            variant="ghost"
                            size="sm"
                            aria-label="Mehr Optionen"
                            title="Mehr Optionen"
                          />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openConfigEditor(inv)}>
                            <Settings className="w-4 h-4 mr-2" />
                            Einladungsseite konfigurieren
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => generateShortlink(inv.id)}
                            disabled={generatingShortlink === inv.id}
                          >
                            <QrCode className="w-4 h-4 mr-2" />
                            {generatingShortlink === inv.id ? 'Generiere...' : 'Neuer Shortlink'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {shortUrl && (
                            <DropdownMenuItem onClick={() => copyToClipboard(shortUrl, 'Shortlink kopiert')}>
                              <Copy className="w-4 h-4 mr-2" />
                              Shortlink kopieren
                            </DropdownMenuItem>
                          )}
                          {shortUrl && (
                            <DropdownMenuItem onClick={() => shareLink(shortUrl, `Einladung: ${inv.name}`)}>
                              <Share2 className="w-4 h-4 mr-2" />
                              Teilen
                            </DropdownMenuItem>
                          )}
                          {inv.visibility === 'PUBLIC' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => copyToClipboard(publicUrl, 'Direktlink kopiert')}>
                                <Copy className="w-4 h-4 mr-2" />
                                Direktlink kopieren
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    {isEditing ? (
                      /* Edit Form */
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-foreground block mb-1">Name</label>
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="Name der Einladung"
                          />
                        </div>

                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={editIsActive}
                              onCheckedChange={(checked) => setEditIsActive(Boolean(checked))}
                            />
                            Aktiv
                          </label>
                          <label className="flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={editVisibility === 'PUBLIC'}
                              onCheckedChange={(checked) => setEditVisibility(checked ? 'PUBLIC' : 'UNLISTED')}
                            />
                            Öffentlich
                          </label>
                        </div>

                        <div>
                          <label className="text-sm font-medium text-foreground block mb-1">
                            Passwort (optional)
                          </label>
                          <div className="relative">
                            <Input
                              type={showPassword[inv.id] ? 'text' : 'password'}
                              value={editPassword}
                              onChange={(e) => setEditPassword(e.target.value)}
                              placeholder={editHasPassword ? 'Neues Passwort (leer = unverändert)' : 'Passwort setzen'}
                              className="pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword((p) => ({ ...p, [inv.id]: !p[inv.id] }))}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              {showPassword[inv.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                          {editHasPassword && (
                            <Button
                              variant="danger"
                              size="sm"
                              className="mt-2"
                              onClick={() => saveInvitation(inv.id, { removePassword: true })}
                              disabled={saving}
                            >
                              Passwort entfernen
                            </Button>
                          )}
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                          <Button
                            onClick={() => saveInvitation(inv.id)}
                            disabled={saving || !editName.trim()}
                          >
                            {saving ? 'Speichere...' : 'Speichern'}
                          </Button>
                          <Button variant="ghost" onClick={cancelEdit}>
                            Abbrechen
                          </Button>
                        </div>
                      </div>
                    ) : (
                      /* View Mode */
                      <div className="space-y-3">
                        {/* Stats Row */}
                        <div className="flex items-center gap-6 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Eye className="w-4 h-4" />
                            <span>{inv.opens} Aufrufe</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4" />
                            <span>
                              RSVP: {inv.rsvp?.yes ?? 0} Ja / {inv.rsvp?.no ?? 0} Nein / {inv.rsvp?.maybe ?? 0} Vielleicht
                            </span>
                          </div>
                        </div>

                        {/* Links */}
                        {shortUrl && (
                          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                            <LinkIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-sm text-foreground truncate flex-1 font-mono">
                              {shortUrl}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(shortUrl, 'Shortlink kopiert')}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => shareLink(shortUrl, `Einladung: ${inv.name}`)}
                            >
                              <Share2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}

                        {inv.visibility === 'PUBLIC' && (
                          <div className="text-xs text-muted-foreground">
                            Direktlink: <span className="font-mono">{publicUrl}</span>
                          </div>
                        )}

                        {inv.visibility !== 'PUBLIC' && (
                          <p className="text-xs text-muted-foreground">
                            Diese Einladung ist nur über den Shortlink erreichbar.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Config Editor Modal */}
      {editingConfigId && editingConfig && (
        <InvitationConfigEditor
          invitationId={editingConfigId}
          initialConfig={editingConfig}
          onSave={saveConfig}
          onClose={() => {
            setEditingConfigId(null);
            setEditingConfig(null);
          }}
        />
      )}
    </AppLayout>
  );
}
