'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
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
import { Guest, Event as EventType } from '@gaestefotos/shared';
import { Trash2, Mail, UserPlus, Upload, FileText, ArrowUpDown, ChevronLeft, ChevronRight, User } from 'lucide-react';
import GuestStatusBadge, { type GuestStatus } from '@/components/dashboard/GuestStatusBadge';
import GuestActionMenu from '@/components/dashboard/GuestActionMenu';
import BulkActionsToolbar from '@/components/dashboard/BulkActionsToolbar';
import { useToastStore } from '@/store/toastStore';
import { FullPageLoader } from '@/components/ui/FullPageLoader';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function GuestManagementPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [eventId, setEventId] = React.useState<string | null>(null);

  React.useEffect(() => {
    params.then(p => setEventId(p.id));
  }, []);
  const { showToast } = useToastStore();

  const confirmResolveRef = useRef<((value: boolean) => void) | null>(null);
  const [confirmState, setConfirmState] = useState<null | {
    title: string;
    description?: string;
    confirmText?: string;
    cancelText?: string;
  }>(null);

  const confirmOpen = confirmState !== null;

  function requestConfirm(opts: {
    title: string;
    description?: string;
    confirmText?: string;
    cancelText?: string;
  }) {
    return new Promise<boolean>((resolve) => {
      confirmResolveRef.current = resolve;
      setConfirmState(opts);
    });
  }

  function closeConfirm(result: boolean) {
    const resolve = confirmResolveRef.current;
    confirmResolveRef.current = null;
    setConfirmState(null);
    resolve?.(result);
  }

  const [event, setEvent] = useState<EventType | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showImportForm, setShowImportForm] = useState(false);
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    dietaryRequirements: '',
    plusOneCount: 0,
  });

  useEffect(() => {
    if (eventId) loadData();
  }, [eventId]);

  const loadData = async () => {
    await loadEvent();
    await loadGuests();
  };

  const loadEvent = async () => {
    try {
      const { data } = await api.get(`/events/${eventId}`);
      setEvent(data.event);
    } catch (err) {
      void err;
    }
  };

  const loadGuests = async () => {
    try {
      const { data } = await api.get(`/events/${eventId}/guests`);
      setGuests(data.guests || []);
    } catch (err) {
      void err;
    } finally {
      setLoading(false);
    }
  };

  const handleAddGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/events/${eventId}/guests`, formData);
      showToast('Gast hinzugefügt', 'success');
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        dietaryRequirements: '',
        plusOneCount: 0,
      });
      setShowAddForm(false);
      loadGuests();
    } catch (err: any) {
      showToast('Fehler beim Hinzufügen', 'error');
    }
  };

  const handleImportGuests = async () => {
    if (!importText.trim()) {
      showToast('Bitte Gästeliste eingeben', 'error');
      return;
    }
    
    setImporting(true);
    const lines = importText.split('\n').filter(line => line.trim());
    let added = 0;
    let failed = 0;
    
    for (const line of lines) {
      // Parse: "Vorname Nachname, email@example.com" or "Vorname Nachname" or "email@example.com"
      const parts = line.split(',').map(p => p.trim());
      let firstName = '';
      let lastName = '';
      let email = '';
      
      if (parts.length >= 2) {
        // "Name, Email" format
        const nameParts = parts[0].split(' ').filter(Boolean);
        firstName = nameParts[0] || '';
        lastName = nameParts.slice(1).join(' ') || '';
        email = parts[1] || '';
      } else if (parts[0].includes('@')) {
        // Just email
        email = parts[0];
        firstName = parts[0].split('@')[0];
      } else {
        // Just name
        const nameParts = parts[0].split(' ').filter(Boolean);
        firstName = nameParts[0] || '';
        lastName = nameParts.slice(1).join(' ') || '';
      }
      
      if (!firstName && !email) {
        failed++;
        continue;
      }
      
      try {
        await api.post(`/events/${eventId}/guests`, {
          firstName: firstName || 'Gast',
          lastName,
          email,
          dietaryRequirements: '',
          plusOneCount: 0,
        });
        added++;
      } catch {
        failed++;
      }
    }
    
    setImporting(false);
    setImportText('');
    setShowImportForm(false);
    showToast(`${added} Gäste importiert${failed > 0 ? `, ${failed} fehlgeschlagen` : ''}`, added > 0 ? 'success' : 'error');
    loadGuests();
  };

  const handleDelete = async (guestId: string) => {
    const ok = await requestConfirm({
      title: 'Gast wirklich löschen?',
      description: 'Kann nicht rückgängig gemacht werden.',
      confirmText: 'Löschen',
      cancelText: 'Abbrechen',
    });
    if (!ok) return;

    try {
      await api.delete(`/events/${eventId}/guests/${guestId}`);
      showToast('Gast gelöscht', 'success');
      loadGuests();
    } catch (err: any) {
      showToast('Fehler beim Löschen', 'error');
    }
  };

  const mapStatusToGuestStatus = (status: string): GuestStatus => {
    switch (status) {
      case 'accepted':
        return 'ZUSAGE';
      case 'declined':
        return 'ABSAGE';
      case 'pending':
        return 'AUSSTEHEND';
      default:
        return 'UNBEKANNT';
    }
  };

  const columns: ColumnDef<Guest>[] = [
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
      cell: ({ row }) => (
        <div className="font-medium text-app-fg">
          {row.original.firstName} {row.original.lastName}
        </div>
      ),
      accessorFn: (row) => `${row.firstName} ${row.lastName}`,
    },
    {
      accessorKey: 'email',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="hover:bg-transparent p-0 h-auto font-medium"
        >
          E-Mail
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-sm text-app-muted">{row.original.email || '-'}</div>
      ),
    },
    {
      accessorKey: 'plusOneCount',
      header: 'Begleitung',
      cell: ({ row }) => (
        <div className="text-sm text-app-muted">
          {(row.original.plusOneCount || 0) > 0 ? `+${row.original.plusOneCount}` : '-'}
        </div>
      ),
    },
    {
      id: 'actions',
      header: 'Aktionen',
      cell: ({ row }) => (
        <GuestActionMenu
          onDelete={() => handleDelete(row.original.id)}
          onSendEmail={() => {/* TODO: Implement email */}}
          onViewDetails={() => {/* TODO: Implement details */}}
        />
      ),
    },
  ];

  const table = useReactTable({
    data: guests,
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
    return <FullPageLoader label="Laden..." />;
  }

  return (
    <AlertDialog open={confirmOpen} onOpenChange={(open) => (open ? null : closeConfirm(false))}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{confirmState?.title}</AlertDialogTitle>
          {confirmState?.description ? (
            <AlertDialogDescription>{confirmState.description}</AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="secondary" onClick={() => closeConfirm(false)}>
              {confirmState?.cancelText || 'Abbrechen'}
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button variant="danger" onClick={() => closeConfirm(true)}>
              {confirmState?.confirmText || 'Bestätigen'}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>

      <div className="min-h-screen bg-app-bg">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Button type="button" variant="ghost" onClick={() => router.back()} className="mb-4">
            ← Zurück
          </Button>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-app-fg mb-2">
                Gäste-Verwaltung: {event?.title}
              </h1>
              <p className="text-app-muted">
                {guests.length} Gast{guests.length !== 1 ? 'e' : ''}
              </p>
            </div>
            <div className="flex gap-2">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  type="button"
                  onClick={() => { setShowImportForm(!showImportForm); setShowAddForm(false); }}
                  variant="secondary"
                >
                  <Upload className="h-5 w-5" />
                  Importieren
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  type="button"
                  onClick={() => { setShowAddForm(!showAddForm); setShowImportForm(false); }}
                  variant="primary"
                >
                  <UserPlus className="h-5 w-5" />
                  Hinzufügen
                </Button>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Import Guests Form */}
        <AnimatePresence>
          {showImportForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-app-card border border-app-border rounded-lg shadow p-6 mb-6"
            >
              <h2 className="text-xl font-semibold mb-2 text-app-fg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Gäste importieren
              </h2>
              <p className="text-sm text-app-muted mb-4">
                Füge mehrere Gäste auf einmal hinzu. Ein Gast pro Zeile.
              </p>
              
              <div className="mb-4 p-3 rounded-lg bg-app-bg border border-app-border">
                <div className="text-xs font-medium text-app-fg mb-1">Unterstützte Formate:</div>
                <div className="text-xs text-app-muted space-y-1">
                  <div>• <code>Vorname Nachname, email@example.com</code></div>
                  <div>• <code>Vorname Nachname</code></div>
                  <div>• <code>email@example.com</code></div>
                </div>
              </div>
              
              <Textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={`Max Mustermann, max@example.com\nAnna Schmidt\nmaria@example.com`}
                rows={8}
                className="font-mono text-sm"
              />
              
              <div className="flex gap-4 mt-4">
                <Button type="button" variant="secondary" onClick={() => setShowImportForm(false)}>
                  Abbrechen
                </Button>
                <Button 
                  type="button" 
                  variant="primary" 
                  onClick={handleImportGuests}
                  disabled={importing || !importText.trim()}
                >
                  {importing ? 'Importiere...' : `${importText.split('\n').filter(l => l.trim()).length} Gäste importieren`}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add Guest Form */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-app-card border border-app-border rounded-lg shadow p-6 mb-6"
            >
              <h2 className="text-xl font-semibold mb-4 text-app-fg">Neuer Gast</h2>
              <form onSubmit={handleAddGuest} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-app-fg mb-1">
                      Vorname *
                    </label>
                    <Input
                      type="text"
                      required
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-app-fg mb-1">
                      Nachname *
                    </label>
                    <Input
                      type="text"
                      required
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-app-fg mb-1">
                    E-Mail
                  </label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-app-fg mb-1">
                    Essenswünsche
                  </label>
                  <Textarea
                    value={formData.dietaryRequirements}
                    onChange={(e) => setFormData({ ...formData, dietaryRequirements: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="flex gap-4">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button type="button" variant="secondary" onClick={() => setShowAddForm(false)}>
                      Abbrechen
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button type="submit" variant="primary">
                      Hinzufügen
                    </Button>
                  </motion.div>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4"
        >
          <Input
            placeholder="Gäste durchsuchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
        </motion.div>

        {/* Guests Table with TanStack */}
        <div className="bg-app-card border border-app-border rounded-lg shadow overflow-hidden">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="bg-app-bg">
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
                table.getRowModel().rows.map((row, index) => (
                  <motion.tr
                    key={row.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b border-app-border"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </motion.tr>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center text-app-muted">
                    Noch keine Gäste vorhanden.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {table.getPageCount() > 1 && (
            <div className="flex items-center justify-between px-6 py-4 bg-app-bg border-t border-app-border">
              <div className="text-sm text-app-muted">
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
        </div>
      </div>
    </div>
    </AlertDialog>
  );
}
