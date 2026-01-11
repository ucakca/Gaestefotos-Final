'use client';

import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/Checkbox';
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
  
  // Storage & Duration
  storageLimitBytes: string | null;
  storageLimitPhotos: number | null;
  storageDurationDays: number | null;
  
  // Feature Flags
  allowVideoUpload: boolean;
  allowStories: boolean;
  allowPasswordProtect: boolean;
  allowGuestbook: boolean;
  allowZipDownload: boolean;
  allowBulkOperations: boolean;
  allowLiveWall: boolean;
  allowFaceSearch: boolean;
  allowGuestlist: boolean;
  allowFullInvitation: boolean;
  allowCoHosts: boolean;
  isAdFree: boolean;
  
  // Limits
  maxCategories: number | null;
  maxChallenges: number | null;
  maxZipDownloadPhotos: number | null;
  maxCoHosts: number | null;
  
  // Display & Pricing
  displayOrder: number;
  priceEurCents: number | null;
  description: string | null;
  
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
    storageLimitPhotos: '',
    storageDurationDays: '',
    
    // Feature Flags
    allowVideoUpload: false,
    allowStories: false,
    allowPasswordProtect: false,
    allowGuestbook: false,
    allowZipDownload: false,
    allowBulkOperations: false,
    allowLiveWall: false,
    allowFaceSearch: false,
    allowGuestlist: false,
    allowFullInvitation: false,
    allowCoHosts: false,
    isAdFree: false,
    
    // Limits
    maxCategories: '',
    maxChallenges: '',
    maxZipDownloadPhotos: '',
    maxCoHosts: '',
    
    // Display & Pricing
    displayOrder: '0',
    priceEurCents: '',
    description: '',
    
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
        
        // Storage & Duration
        storageLimitBytes: newPkg.storageLimitBytes.trim() || null,
        storageLimitPhotos: parseOptionalNumber(newPkg.storageLimitPhotos),
        storageDurationDays: parseOptionalNumber(newPkg.storageDurationDays),
        
        // Feature Flags
        allowVideoUpload: newPkg.allowVideoUpload,
        allowStories: newPkg.allowStories,
        allowPasswordProtect: newPkg.allowPasswordProtect,
        allowGuestbook: newPkg.allowGuestbook,
        allowZipDownload: newPkg.allowZipDownload,
        allowBulkOperations: newPkg.allowBulkOperations,
        allowLiveWall: newPkg.allowLiveWall,
        allowFaceSearch: newPkg.allowFaceSearch,
        allowGuestlist: newPkg.allowGuestlist,
        allowFullInvitation: newPkg.allowFullInvitation,
        allowCoHosts: newPkg.allowCoHosts,
        isAdFree: newPkg.isAdFree,
        
        // Limits
        maxCategories: parseOptionalNumber(newPkg.maxCategories),
        maxChallenges: parseOptionalNumber(newPkg.maxChallenges),
        maxZipDownloadPhotos: parseOptionalNumber(newPkg.maxZipDownloadPhotos),
        maxCoHosts: parseOptionalNumber(newPkg.maxCoHosts),
        
        // Display & Pricing
        displayOrder: parseOptionalNumber(newPkg.displayOrder) || 0,
        priceEurCents: parseOptionalNumber(newPkg.priceEurCents),
        description: newPkg.description.trim() || null,
        
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
        storageLimitPhotos: '',
        storageDurationDays: '',
        allowVideoUpload: false,
        allowStories: false,
        allowPasswordProtect: false,
        allowGuestbook: false,
        allowZipDownload: false,
        allowBulkOperations: false,
        allowLiveWall: false,
        allowFaceSearch: false,
        allowGuestlist: false,
        allowFullInvitation: false,
        allowCoHosts: false,
        isAdFree: false,
        maxCategories: '',
        maxChallenges: '',
        maxZipDownloadPhotos: '',
        maxCoHosts: '',
        displayOrder: '0',
        priceEurCents: '',
        description: '',
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
      storageLimitPhotosStr: typeof p.storageLimitPhotos === 'number' ? String(p.storageLimitPhotos) : '',
      storageDurationDaysStr: typeof p.storageDurationDays === 'number' ? String(p.storageDurationDays) : '',
      maxCategoriesStr: typeof p.maxCategories === 'number' ? String(p.maxCategories) : '',
      maxChallengesStr: typeof p.maxChallenges === 'number' ? String(p.maxChallenges) : '',
      maxZipDownloadPhotosStr: typeof p.maxZipDownloadPhotos === 'number' ? String(p.maxZipDownloadPhotos) : '',
      maxCoHostsStr: typeof p.maxCoHosts === 'number' ? String(p.maxCoHosts) : '',
      displayOrderStr: String(p.displayOrder || 0),
      priceEurCentsStr: typeof p.priceEurCents === 'number' ? String(p.priceEurCents) : '',
      isActiveStr: p.isActive ? 'true' : 'false',
    } as any);
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
        
        // Storage & Duration
        storageLimitBytes: (editing as any).storageLimitBytesStr.trim() || null,
        storageLimitPhotos: parseOptionalNumber((editing as any).storageLimitPhotosStr),
        storageDurationDays: parseOptionalNumber((editing as any).storageDurationDaysStr),
        
        // Feature Flags
        allowVideoUpload: editing.allowVideoUpload,
        allowStories: editing.allowStories,
        allowPasswordProtect: editing.allowPasswordProtect,
        allowGuestbook: editing.allowGuestbook,
        allowZipDownload: editing.allowZipDownload,
        allowBulkOperations: editing.allowBulkOperations,
        allowLiveWall: editing.allowLiveWall,
        allowFaceSearch: editing.allowFaceSearch,
        allowGuestlist: editing.allowGuestlist,
        allowFullInvitation: editing.allowFullInvitation,
        allowCoHosts: editing.allowCoHosts,
        isAdFree: editing.isAdFree,
        
        // Limits
        maxCategories: parseOptionalNumber((editing as any).maxCategoriesStr),
        maxChallenges: parseOptionalNumber((editing as any).maxChallengesStr),
        maxZipDownloadPhotos: parseOptionalNumber((editing as any).maxZipDownloadPhotosStr),
        maxCoHosts: parseOptionalNumber((editing as any).maxCoHostsStr),
        
        // Display & Pricing
        displayOrder: parseOptionalNumber((editing as any).displayOrderStr) || 0,
        priceEurCents: parseOptionalNumber((editing as any).priceEurCentsStr),
        description: editing.description?.trim() || null,
        
        isActive: (editing as any).isActiveStr === 'true',
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
        <div className="text-sm font-semibold text-app-fg mb-4">Neues Paket</div>
        
        {/* Basic Info */}
        <div className="text-xs font-semibold text-app-muted mb-2">Basic Info</div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 mb-4">
          <Input value={newPkg.sku} onChange={(e) => setNewPkg({ ...newPkg, sku: e.target.value })} placeholder="SKU *" className="font-mono" />
          <Input value={newPkg.name} onChange={(e) => setNewPkg({ ...newPkg, name: e.target.value })} placeholder="Name *" />
          <Select value={newPkg.type} onValueChange={(v) => setNewPkg({ ...newPkg, type: v })}>
            <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="BASE">BASE</SelectItem>
              <SelectItem value="UPGRADE">UPGRADE</SelectItem>
            </SelectContent>
          </Select>
          <Input value={newPkg.resultingTier} onChange={(e) => setNewPkg({ ...newPkg, resultingTier: e.target.value })} placeholder="resultingTier *" />
          <Input value={newPkg.upgradeFromTier} onChange={(e) => setNewPkg({ ...newPkg, upgradeFromTier: e.target.value })} placeholder="upgradeFromTier" />
        </div>

        {/* Storage */}
        <div className="text-xs font-semibold text-app-muted mb-2 mt-4">Storage & Duration</div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 mb-4">
          <Input value={newPkg.storageLimitBytes} onChange={(e) => setNewPkg({ ...newPkg, storageLimitBytes: e.target.value })} placeholder="storageLimitBytes" className="font-mono" />
          <Input value={newPkg.storageLimitPhotos} onChange={(e) => setNewPkg({ ...newPkg, storageLimitPhotos: e.target.value })} placeholder="storageLimitPhotos" className="font-mono" />
          <Input value={newPkg.storageDurationDays} onChange={(e) => setNewPkg({ ...newPkg, storageDurationDays: e.target.value })} placeholder="storageDurationDays" className="font-mono" />
        </div>

        {/* Feature Flags */}
        <div className="text-xs font-semibold text-app-muted mb-2 mt-4">Feature Flags</div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 mb-4">
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <Checkbox checked={newPkg.allowVideoUpload} onCheckedChange={(c) => setNewPkg({ ...newPkg, allowVideoUpload: !!c })} />
            <span>Video Upload</span>
          </label>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <Checkbox checked={newPkg.allowStories} onCheckedChange={(c) => setNewPkg({ ...newPkg, allowStories: !!c })} />
            <span>Stories</span>
          </label>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <Checkbox checked={newPkg.allowPasswordProtect} onCheckedChange={(c) => setNewPkg({ ...newPkg, allowPasswordProtect: !!c })} />
            <span>Password Protect</span>
          </label>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <Checkbox checked={newPkg.allowGuestbook} onCheckedChange={(c) => setNewPkg({ ...newPkg, allowGuestbook: !!c })} />
            <span>Guestbook</span>
          </label>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <Checkbox checked={newPkg.allowZipDownload} onCheckedChange={(c) => setNewPkg({ ...newPkg, allowZipDownload: !!c })} />
            <span>Zip Download</span>
          </label>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <Checkbox checked={newPkg.allowBulkOperations} onCheckedChange={(c) => setNewPkg({ ...newPkg, allowBulkOperations: !!c })} />
            <span>Bulk Operations</span>
          </label>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <Checkbox checked={newPkg.allowLiveWall} onCheckedChange={(c) => setNewPkg({ ...newPkg, allowLiveWall: !!c })} />
            <span>Live Wall</span>
          </label>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <Checkbox checked={newPkg.allowFaceSearch} onCheckedChange={(c) => setNewPkg({ ...newPkg, allowFaceSearch: !!c })} />
            <span>Face Search</span>
          </label>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <Checkbox checked={newPkg.allowGuestlist} onCheckedChange={(c) => setNewPkg({ ...newPkg, allowGuestlist: !!c })} />
            <span>Guestlist</span>
          </label>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <Checkbox checked={newPkg.allowFullInvitation} onCheckedChange={(c) => setNewPkg({ ...newPkg, allowFullInvitation: !!c })} />
            <span>Full Invitation</span>
          </label>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <Checkbox checked={newPkg.allowCoHosts} onCheckedChange={(c) => setNewPkg({ ...newPkg, allowCoHosts: !!c })} />
            <span>Co-Hosts</span>
          </label>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <Checkbox checked={newPkg.isAdFree} onCheckedChange={(c) => setNewPkg({ ...newPkg, isAdFree: !!c })} />
            <span>Ad Free</span>
          </label>
        </div>

        {/* Limits */}
        <div className="text-xs font-semibold text-app-muted mb-2 mt-4">Limits (null = unbegrenzt)</div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4 mb-4">
          <Input value={newPkg.maxCategories} onChange={(e) => setNewPkg({ ...newPkg, maxCategories: e.target.value })} placeholder="maxCategories" className="font-mono" />
          <Input value={newPkg.maxChallenges} onChange={(e) => setNewPkg({ ...newPkg, maxChallenges: e.target.value })} placeholder="maxChallenges" className="font-mono" />
          <Input value={newPkg.maxZipDownloadPhotos} onChange={(e) => setNewPkg({ ...newPkg, maxZipDownloadPhotos: e.target.value })} placeholder="maxZipDownloadPhotos" className="font-mono" />
          <Input value={newPkg.maxCoHosts} onChange={(e) => setNewPkg({ ...newPkg, maxCoHosts: e.target.value })} placeholder="maxCoHosts" className="font-mono" />
        </div>

        {/* Display & Pricing */}
        <div className="text-xs font-semibold text-app-muted mb-2 mt-4">Display & Pricing</div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 mb-4">
          <Input value={newPkg.displayOrder} onChange={(e) => setNewPkg({ ...newPkg, displayOrder: e.target.value })} placeholder="displayOrder" className="font-mono" />
          <Input value={newPkg.priceEurCents} onChange={(e) => setNewPkg({ ...newPkg, priceEurCents: e.target.value })} placeholder="priceEurCents" className="font-mono" />
          <Input value={newPkg.description} onChange={(e) => setNewPkg({ ...newPkg, description: e.target.value })} placeholder="description" />
        </div>

        {/* Active Status */}
        <div className="mb-4">
          <Select value={newPkg.isActive} onValueChange={(v) => setNewPkg({ ...newPkg, isActive: v })}>
            <SelectTrigger className="w-32"><SelectValue placeholder="isActive" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="true">active</SelectItem>
              <SelectItem value="false">inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button variant="primary" size="sm" onClick={create}>Erstellen</Button>
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

          <div className="mt-4">
            {/* Basic Info */}
            <div className="text-xs font-semibold text-app-muted mb-2">Basic Info</div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 mb-4">
              <Input value={editing.sku} onChange={(e) => setEditing({ ...editing, sku: e.target.value })} placeholder="SKU" className="font-mono" />
              <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Name" />
              <Select value={String(editing.type)} onValueChange={(v) => setEditing({ ...editing, type: v })}>
                <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BASE">BASE</SelectItem>
                  <SelectItem value="UPGRADE">UPGRADE</SelectItem>
                </SelectContent>
              </Select>
              <Input value={editing.resultingTier} onChange={(e) => setEditing({ ...editing, resultingTier: e.target.value })} placeholder="resultingTier" />
              <Input value={editing.upgradeFromTier || ''} onChange={(e) => setEditing({ ...editing, upgradeFromTier: e.target.value })} placeholder="upgradeFromTier" />
            </div>

            {/* Storage */}
            <div className="text-xs font-semibold text-app-muted mb-2 mt-4">Storage & Duration</div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 mb-4">
              <Input value={(editing as any).storageLimitBytesStr} onChange={(e) => setEditing({ ...editing, storageLimitBytesStr: e.target.value } as any)} placeholder="storageLimitBytes" className="font-mono" />
              <Input value={(editing as any).storageLimitPhotosStr} onChange={(e) => setEditing({ ...editing, storageLimitPhotosStr: e.target.value } as any)} placeholder="storageLimitPhotos" className="font-mono" />
              <Input value={(editing as any).storageDurationDaysStr} onChange={(e) => setEditing({ ...editing, storageDurationDaysStr: e.target.value } as any)} placeholder="storageDurationDays" className="font-mono" />
            </div>

            {/* Feature Flags */}
            <div className="text-xs font-semibold text-app-muted mb-2 mt-4">Feature Flags</div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 mb-4">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <Checkbox checked={editing.allowVideoUpload} onCheckedChange={(c) => setEditing({ ...editing, allowVideoUpload: !!c })} />
                <span>Video Upload</span>
              </label>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <Checkbox checked={editing.allowStories} onCheckedChange={(c) => setEditing({ ...editing, allowStories: !!c })} />
                <span>Stories</span>
              </label>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <Checkbox checked={editing.allowPasswordProtect} onCheckedChange={(c) => setEditing({ ...editing, allowPasswordProtect: !!c })} />
                <span>Password Protect</span>
              </label>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <Checkbox checked={editing.allowGuestbook} onCheckedChange={(c) => setEditing({ ...editing, allowGuestbook: !!c })} />
                <span>Guestbook</span>
              </label>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <Checkbox checked={editing.allowZipDownload} onCheckedChange={(c) => setEditing({ ...editing, allowZipDownload: !!c })} />
                <span>Zip Download</span>
              </label>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <Checkbox checked={editing.allowBulkOperations} onCheckedChange={(c) => setEditing({ ...editing, allowBulkOperations: !!c })} />
                <span>Bulk Operations</span>
              </label>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <Checkbox checked={editing.allowLiveWall} onCheckedChange={(c) => setEditing({ ...editing, allowLiveWall: !!c })} />
                <span>Live Wall</span>
              </label>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <Checkbox checked={editing.allowFaceSearch} onCheckedChange={(c) => setEditing({ ...editing, allowFaceSearch: !!c })} />
                <span>Face Search</span>
              </label>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <Checkbox checked={editing.allowGuestlist} onCheckedChange={(c) => setEditing({ ...editing, allowGuestlist: !!c })} />
                <span>Guestlist</span>
              </label>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <Checkbox checked={editing.allowFullInvitation} onCheckedChange={(c) => setEditing({ ...editing, allowFullInvitation: !!c })} />
                <span>Full Invitation</span>
              </label>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <Checkbox checked={editing.allowCoHosts} onCheckedChange={(c) => setEditing({ ...editing, allowCoHosts: !!c })} />
                <span>Co-Hosts</span>
              </label>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <Checkbox checked={editing.isAdFree} onCheckedChange={(c) => setEditing({ ...editing, isAdFree: !!c })} />
                <span>Ad Free</span>
              </label>
            </div>

            {/* Limits */}
            <div className="text-xs font-semibold text-app-muted mb-2 mt-4">Limits (null = unbegrenzt)</div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4 mb-4">
              <Input value={(editing as any).maxCategoriesStr} onChange={(e) => setEditing({ ...editing, maxCategoriesStr: e.target.value } as any)} placeholder="maxCategories" className="font-mono" />
              <Input value={(editing as any).maxChallengesStr} onChange={(e) => setEditing({ ...editing, maxChallengesStr: e.target.value } as any)} placeholder="maxChallenges" className="font-mono" />
              <Input value={(editing as any).maxZipDownloadPhotosStr} onChange={(e) => setEditing({ ...editing, maxZipDownloadPhotosStr: e.target.value } as any)} placeholder="maxZipDownloadPhotos" className="font-mono" />
              <Input value={(editing as any).maxCoHostsStr} onChange={(e) => setEditing({ ...editing, maxCoHostsStr: e.target.value } as any)} placeholder="maxCoHosts" className="font-mono" />
            </div>

            {/* Display & Pricing */}
            <div className="text-xs font-semibold text-app-muted mb-2 mt-4">Display & Pricing</div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 mb-4">
              <Input value={(editing as any).displayOrderStr} onChange={(e) => setEditing({ ...editing, displayOrderStr: e.target.value } as any)} placeholder="displayOrder" className="font-mono" />
              <Input value={(editing as any).priceEurCentsStr} onChange={(e) => setEditing({ ...editing, priceEurCentsStr: e.target.value } as any)} placeholder="priceEurCents" className="font-mono" />
              <Input value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} placeholder="description" />
            </div>

            {/* Active Status */}
            <Select value={(editing as any).isActiveStr} onValueChange={(v) => setEditing({ ...editing, isActiveStr: v } as any)}>
              <SelectTrigger className="w-32"><SelectValue placeholder="isActive" /></SelectTrigger>
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
