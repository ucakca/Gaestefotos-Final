'use client';

import { useEffect, useState } from 'react';
import { Search, Check, X, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';

interface Photo {
  id: string;
  filename: string;
  guestName: string;
  uploadedAt: string;
  moderatedAt: string | null;
  isApproved: boolean;
  rejectionReason: string | null;
  event: {
    id: string;
    title: string;
    slug: string;
  };
}

export default function PhotosPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected' | ''>('pending');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const limit = 20;

  const loadPhotos = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('admin_token');
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: (page * limit).toString(),
      });
      
      if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      if (search) params.set('q', search);

      const res = await fetch(`/api/admin/photos?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setPhotos(data.photos || []);
        setTotal(data.total || 0);
      }
    } catch (error) {
      console.error('Failed to load photos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPhotos();
    setSelectedPhotos(new Set());
  }, [page, search, statusFilter]);

  const toggleSelection = (photoId: string) => {
    const newSelection = new Set(selectedPhotos);
    if (newSelection.has(photoId)) {
      newSelection.delete(photoId);
    } else {
      newSelection.add(photoId);
    }
    setSelectedPhotos(newSelection);
  };

  const selectAll = () => {
    if (selectedPhotos.size === photos.length) {
      setSelectedPhotos(new Set());
    } else {
      setSelectedPhotos(new Set(photos.map(p => p.id)));
    }
  };

  const bulkModerate = async (isApproved: boolean) => {
    if (selectedPhotos.size === 0) return;

    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('/api/admin/photos/bulk-moderate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          photoIds: Array.from(selectedPhotos),
          isApproved,
          rejectionReason: isApproved ? null : 'Bulk rejected by admin',
        }),
      });

      if (res.ok) {
        setSelectedPhotos(new Set());
        loadPhotos();
      }
    } catch (error) {
      console.error('Failed to moderate photos:', error);
    }
  };

  const bulkDelete = async () => {
    if (selectedPhotos.size === 0) return;
    if (!confirm(`${selectedPhotos.size} Fotos wirklich löschen?`)) return;

    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('/api/admin/photos/bulk-delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          photoIds: Array.from(selectedPhotos),
        }),
      });

      if (res.ok) {
        setSelectedPhotos(new Set());
        loadPhotos();
      }
    } catch (error) {
      console.error('Failed to delete photos:', error);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Content Moderation</h1>
        <p className="mt-2 text-gray-600">Verwalte und moderiere hochgeladene Fotos</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <Input
                  type="text"
                  placeholder="Suche nach Filename oder Gast..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(0);
                  }}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => {
                setStatusFilter(v as any);
                setPage(0);
              }}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Status Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Alle</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <div className="text-sm text-gray-600">
                {total} Fotos
              </div>
            </div>
            
            {selectedPhotos.size > 0 && (
              <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium text-blue-900">
                  {selectedPhotos.size} ausgewählt
                </span>
                <div className="flex gap-2">
                  <Button
                    onClick={() => bulkModerate(true)}
                    variant="primary"
                    size="sm"
                  >
                    <Check size={16} className="mr-1" />
                    Approve
                  </Button>
                  <Button
                    onClick={() => bulkModerate(false)}
                    variant="secondary"
                    size="sm"
                  >
                    <X size={16} className="mr-1" />
                    Reject
                  </Button>
                  <Button
                    onClick={bulkDelete}
                    variant="destructive"
                    size="sm"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Lädt Fotos...</p>
          </div>
        ) : photos.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            Keine Fotos gefunden
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedPhotos.size === photos.length && photos.length > 0}
                        onChange={selectAll}
                        className="rounded border-gray-300"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Foto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Event
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Gast
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Upload
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {photos.map((photo) => (
                    <tr key={photo.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedPhotos.has(photo.id)}
                          onChange={() => toggleSelection(photo.id)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                            <ImageIcon size={24} className="text-gray-400" />
                          </div>
                          <div className="text-sm text-gray-900">{photo.filename}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm text-gray-900">{photo.event.title}</div>
                          <div className="text-xs text-gray-500">/{photo.event.slug}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {photo.guestName || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {new Date(photo.uploadedAt).toLocaleDateString('de-DE')}
                      </td>
                      <td className="px-6 py-4">
                        {photo.moderatedAt ? (
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              photo.isApproved
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {photo.isApproved ? 'Approved' : 'Rejected'}
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Seite {page + 1} von {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                    variant="secondary"
                    size="sm"
                  >
                    <ChevronLeft size={16} className="mr-1" />
                    Zurück
                  </Button>
                  <Button
                    onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                    disabled={page >= totalPages - 1}
                    variant="secondary"
                    size="sm"
                  >
                    Weiter
                    <ChevronRight size={16} className="ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
