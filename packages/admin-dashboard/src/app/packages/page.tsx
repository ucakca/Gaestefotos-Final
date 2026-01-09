'use client';

import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
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

type PackageDef = {
  id: string;
  sku: string;
  name: string;
  type: 'BASE' | 'UPGRADE' | string;
  resultingTier: string;
  upgradeFromTier: string | null;
  storageLimitBytes: string | null;
  storageDurationDays: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type ListResponse = {
  packages: PackageDef[];
};

type CreateResponse = {
  package: PackageDef;
};

type UpdateResponse = {
  package: PackageDef;
};

function parseOptionalNumber(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  return n;
}

export default function PackagesPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<PackageDef[]>([]);

  const [newPkg, setNewPkg] = useState({
    sku: '',
    name: '',
    type: 'BASE',
    resultingTier: '',
    upgradeFromTier: '',
    storageLimitBytes: '',
    storageDurationDays: '',
    isActive: 'true',
  });

  const [editing, setEditing] = useState<null | (PackageDef & { storageDurationDaysStr: string; storageLimitBytesStr: string; isActiveStr: string })>(null);
  const [deactivateConfirm, setDeactivateConfirm] = useState<null | PackageDef>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<ListResponse>('/admin/package-definitions');
      setItems(Array.isArray(res.data?.packages) ? res.data.packages : []);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Fehler beim Laden der Pakete');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeCount = useMemo(() => items.filter((p) => p.isActive).length, [items]);

  const create = async () => {
    setError(null);
    try {
      const sku = newPkg.sku.trim();
      const name = newPkg.name.trim();
      const resultingTier = newPkg.resultingTier.trim();
      if (!sku || !name || !resultingTier) {
        toast.error('SKU, Name und resultingTier sind Pflicht');
        return;
      }

      await api.post<CreateResponse>('/admin/package-definitions', {
        sku,
        name,
        type: newPkg.type,
        resultingTier,
        upgradeFromTier: newPkg.upgradeFromTier.trim() || null,
        storageLimitBytes: newPkg.storageLimitBytes.trim() || null,
        storageDurationDays: parseOptionalNumber(newPkg.storageDurationDays),
        isActive: newPkg.isActive === 'true',
      });

      toast.success('Paket erstellt');
      setNewPkg({
        sku: '',
        name: '',
        type: 'BASE',
        resultingTier: '',
        upgradeFromTier: '',
        storageLimitBytes: '',
        storageDurationDays: '',
        isActive: 'true',
      });

      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Fehler beim Erstellen');
    }
  };

  const startEdit = (p: PackageDef) => {
    setEditing({
      ...p,
      storageLimitBytesStr: p.storageLimitBytes || '',
      storageDurationDaysStr: typeof p.storageDurationDays === 'number' ? String(p.storageDurationDays) : '',
      isActiveStr: p.isActive ? 'true' : 'false',
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    setError(null);
    try {
      const sku = editing.sku.trim();
      const name = editing.name.trim();
      const resultingTier = editing.resultingTier.trim();
      if (!sku || !name || !resultingTier) {
        toast.error('SKU, Name und resultingTier sind Pflicht');
        return;
      }

      await api.put<UpdateResponse>(`/admin/package-definitions/${encodeURIComponent(editing.id)}`, {
        sku,
        name,
        type: editing.type,
        resultingTier,
        upgradeFromTier: editing.upgradeFromTier?.trim() || null,
        storageLimitBytes: editing.storageLimitBytesStr.trim() || null,
        storageDurationDays: parseOptionalNumber(editing.storageDurationDaysStr),
        isActive: editing.isActiveStr === 'true',
      });

      toast.success('Gespeichert');
      setEditing(null);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Fehler beim Speichern');
    }
  };

  const deactivate = async (p: PackageDef) => {
    setError(null);
    try {
      await api.delete(`/admin/package-definitions/${encodeURIComponent(p.id)}`);
      toast.success('Deaktiviert');
      setDeactivateConfirm(null);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Fehler beim Deaktivieren');
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-app-fg">Packages</h1>
            <p className="mt-1 text-sm text-app-muted">Package Definitions (SKU → Tier/Storage)</p>
            <p className="mt-1 text-xs text-app-muted">Aktiv: {activeCount} / {items.length}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={load} disabled={loading}>
              {loading ? 'Lade…' : 'Reload'}
            </Button>
          </div>
        </div>
      </div>

      {error ? <div className="mb-4 text-sm text-[var(--status-danger)]">{String(error)}</div> : null}

      <Card className="p-5">
        <div className="text-sm font-semibold text-app-fg">Neues Paket</div>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          <Input value={newPkg.sku} onChange={(e) => setNewPkg({ ...newPkg, sku: e.target.value })} placeholder="SKU" className="font-mono" />
          <Input value={newPkg.name} onChange={(e) => setNewPkg({ ...newPkg, name: e.target.value })} placeholder="Name" />
          <Select value={newPkg.type} onValueChange={(v) => setNewPkg({ ...newPkg, type: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BASE">BASE</SelectItem>
              <SelectItem value="UPGRADE">UPGRADE</SelectItem>
            </SelectContent>
          </Select>
          <Input value={newPkg.resultingTier} onChange={(e) => setNewPkg({ ...newPkg, resultingTier: e.target.value })} placeholder="resultingTier" />
          <Input value={newPkg.upgradeFromTier} onChange={(e) => setNewPkg({ ...newPkg, upgradeFromTier: e.target.value })} placeholder="upgradeFromTier (optional)" />
          <Input value={newPkg.storageLimitBytes} onChange={(e) => setNewPkg({ ...newPkg, storageLimitBytes: e.target.value })} placeholder="storageLimitBytes (optional)" className="font-mono" />
          <Input value={newPkg.storageDurationDays} onChange={(e) => setNewPkg({ ...newPkg, storageDurationDays: e.target.value })} placeholder="storageDurationDays (optional)" className="font-mono" />
          <Select value={newPkg.isActive} onValueChange={(v) => setNewPkg({ ...newPkg, isActive: v })}>
            <SelectTrigger>
              <SelectValue placeholder="isActive" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">active</SelectItem>
              <SelectItem value="false">inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mt-4">
          <Button variant="primary" size="sm" onClick={create}>
            Erstellen
          </Button>
        </div>
      </Card>

      {editing ? (
        <Card className="mt-4 p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-app-fg">Paket bearbeiten</div>
              <div className="mt-1 text-xs text-app-muted font-mono">{editing.id}</div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditing(null)}>
                Abbrechen
              </Button>
              <Button size="sm" variant="primary" onClick={saveEdit}>
                Speichern
              </Button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            <Input value={editing.sku} onChange={(e) => setEditing({ ...editing, sku: e.target.value })} placeholder="SKU" className="font-mono" />
            <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Name" />
            <Select value={String(editing.type)} onValueChange={(v) => setEditing({ ...editing, type: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BASE">BASE</SelectItem>
                <SelectItem value="UPGRADE">UPGRADE</SelectItem>
              </SelectContent>
            </Select>
            <Input value={editing.resultingTier} onChange={(e) => setEditing({ ...editing, resultingTier: e.target.value })} placeholder="resultingTier" />
            <Input
              value={editing.upgradeFromTier || ''}
              onChange={(e) => setEditing({ ...editing, upgradeFromTier: e.target.value })}
              placeholder="upgradeFromTier (optional)"
            />
            <Input
              value={editing.storageLimitBytesStr}
              onChange={(e) => setEditing({ ...editing, storageLimitBytesStr: e.target.value })}
              placeholder="storageLimitBytes (optional)"
              className="font-mono"
            />
            <Input
              value={editing.storageDurationDaysStr}
              onChange={(e) => setEditing({ ...editing, storageDurationDaysStr: e.target.value })}
              placeholder="storageDurationDays (optional)"
              className="font-mono"
            />
            <Select value={editing.isActiveStr} onValueChange={(v) => setEditing({ ...editing, isActiveStr: v })}>
              <SelectTrigger>
                <SelectValue placeholder="isActive" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">active</SelectItem>
                <SelectItem value="false">inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>
      ) : null}

      <Card className="mt-4 p-5">
        <div className="text-sm font-semibold text-app-fg">Pakete</div>
        <div className="mt-3 overflow-auto">
          <table className="w-full min-w-[1050px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-app-border text-xs text-app-muted">
                <th className="py-2 pr-4">sku</th>
                <th className="py-2 pr-4">name</th>
                <th className="py-2 pr-4">type</th>
                <th className="py-2 pr-4">resultingTier</th>
                <th className="py-2 pr-4">upgradeFromTier</th>
                <th className="py-2 pr-4">storageLimitBytes</th>
                <th className="py-2 pr-4">storageDurationDays</th>
                <th className="py-2 pr-4">active</th>
                <th className="py-2 pr-4">actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-4 text-sm text-app-muted">
                    Keine Daten
                  </td>
                </tr>
              ) : (
                items.map((p) => (
                  <tr key={p.id} className="border-b border-app-border">
                    <td className="py-2 pr-4 font-mono text-xs text-app-fg">{p.sku}</td>
                    <td className="py-2 pr-4 text-app-fg">{p.name}</td>
                    <td className="py-2 pr-4 text-app-fg">{p.type}</td>
                    <td className="py-2 pr-4 text-app-fg">{p.resultingTier}</td>
                    <td className="py-2 pr-4 text-app-fg">{p.upgradeFromTier || '—'}</td>
                    <td className="py-2 pr-4 font-mono text-xs text-app-fg">{p.storageLimitBytes || '—'}</td>
                    <td className="py-2 pr-4 text-app-fg">{typeof p.storageDurationDays === 'number' ? p.storageDurationDays : '—'}</td>
                    <td className="py-2 pr-4 text-app-fg">{p.isActive ? 'true' : 'false'}</td>
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => startEdit(p)}>
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (!p.isActive) {
                              toast.error('Ist bereits inaktiv');
                              return;
                            }
                            setDeactivateConfirm(p);
                          }}
                        >
                          Deactivate
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <AlertDialog open={!!deactivateConfirm} onOpenChange={(open) => (!open ? setDeactivateConfirm(null) : null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Paket deaktivieren?</AlertDialogTitle>
            <AlertDialogDescription>
              Dieses Paket wird nicht gelöscht, sondern serverseitig auf <span className="font-mono">isActive=false</span> gesetzt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deactivateConfirm) return;
                void deactivate(deactivateConfirm);
              }}
            >
              Deaktivieren
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
