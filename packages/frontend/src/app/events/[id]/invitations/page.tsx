'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
} from '@tanstack/react-table';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Edit,
  Lock,
} from 'lucide-react';
import { InvitationConfigEditor } from '@/components/invitation-editor/InvitationConfigEditor';
import DashboardFooter from '@/components/DashboardFooter';
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

  // TanStack Table State
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [searchQuery, setSearchQuery] = useState('');

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

  // TanStack Table Column Definitions
  const columns: ColumnDef<Invitation>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="hover:bg-transparent p-0 h-auto font-medium"
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const inv = row.original;
        return (
          <div className="flex items-center gap-2">
            <LinkIcon className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">{inv.name}</span>
            {!inv.isActive && (
              <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded">
                Inaktiv
              </span>
            )}
            {inv.hasPassword && (
              <Lock className="w-3 h-3 text-warning" />
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'opens',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="hover:bg-transparent p-0 h-auto font-medium"
        >
          Aufrufe
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Eye className="w-4 h-4" />
          <span>{row.original.opens}</span>
        </div>
      ),
    },
    {
      accessorKey: 'visibility',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="hover:bg-transparent p-0 h-auto font-medium"
        >
          Sichtbarkeit
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const isPublic = row.original.visibility === 'PUBLIC';
        return (
          <span className={`text-xs px-2 py-0.5 rounded ${isPublic ? 'bg-green-500/10 text-green-700' : 'bg-muted text-muted-foreground'}`}>
            {isPublic ? 'Öffentlich' : 'Unlisted'}
          </span>
        );
      },
    },
    {
      id: 'rsvp',
      header: 'RSVP',
      cell: ({ row }) => {
        const rsvp = row.original.rsvp;
        return (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="text-green-600">✓ {rsvp?.yes ?? 0}</span>
            <span className="text-red-600">✗ {rsvp?.no ?? 0}</span>
            <span className="text-yellow-600">? {rsvp?.maybe ?? 0}</span>
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: 'Aktionen',
      cell: ({ row }) => {
        const inv = row.original;
        const shortUrl = inv.shortLinks?.[0]?.url;
        const publicUrl = typeof window !== 'undefined'
          ? `${window.location.origin}/i/${inv.slug}`
          : `/i/${inv.slug}`;
        
        return (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editingId === inv.id ? cancelEdit() : startEdit(inv)}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <IconButton
                  icon={<MoreVertical className="w-4 h-4" />}
                  variant="ghost"
                  size="sm"
                  aria-label="Mehr"
                  title="Mehr"
                />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openConfigEditor(inv)}>
                  <Settings className="w-4 h-4 mr-2" />
                  Konfigurieren
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => generateShortlink(inv.id)}
                  disabled={generatingShortlink === inv.id}
                >
                  <QrCode className="w-4 h-4 mr-2" />
                  {generatingShortlink === inv.id ? 'Generiere...' : 'Neuer Shortlink'}
                </DropdownMenuItem>
                {shortUrl && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => copyToClipboard(shortUrl, 'Shortlink kopiert')}>
                      <Copy className="w-4 h-4 mr-2" />
                      Shortlink kopieren
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => shareLink(shortUrl, `Einladung: ${inv.name}`)}>
                      <Share2 className="w-4 h-4 mr-2" />
                      Teilen
                    </DropdownMenuItem>
                  </>
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
        );
      },
    },
  ];

  const table = useReactTable({
    data: invitations,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: {
      sorting,
      columnFilters,
      globalFilter: searchQuery,
    },
    onGlobalFilterChange: setSearchQuery,
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

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

        {/* Search */}
        <div className="mb-4">
          <Input
            placeholder="Einladungen durchsuchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
        </div>

        {/* Invitations Table with TanStack */}
        <div className="bg-card border border-border rounded-lg shadow overflow-hidden">
          {invitations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Noch keine Einladungen erstellt.</p>
              <p className="text-sm mt-1">
                Erstelle deine erste Einladung oben.
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => {
                      const inv = row.original;
                      const isEditing = editingId === inv.id;
                      
                      return (
                        <React.Fragment key={row.id}>
                          <TableRow className="border-b border-border">
                            {row.getVisibleCells().map((cell) => (
                              <TableCell key={cell.id}>
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </TableCell>
                            ))}
                          </TableRow>
                          {isEditing && (
                            <TableRow>
                              <TableCell colSpan={columns.length} className="bg-muted/30 p-4">
                                <div className="space-y-4 max-w-2xl">
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
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                        {searchQuery ? 'Keine Einladungen gefunden.' : 'Noch keine Einladungen vorhanden.'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              {table.getPageCount() > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-border">
                  <div className="text-sm text-muted-foreground">
                    Seite {table.getState().pagination.pageIndex + 1} von {table.getPageCount()}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => table.previousPage()}
                      disabled={!table.getCanPreviousPage()}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Zurück
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => table.nextPage()}
                      disabled={!table.getCanNextPage()}
                    >
                      Weiter
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
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
      <DashboardFooter eventId={eventId!} />
    </AppLayout>
  );
}
