'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Edit,
  Trash2,
  Calendar,
  Monitor,
  Loader2,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  Package,
  AlertTriangle,
  Search,
} from 'lucide-react';
import api from '@/lib/api';

interface HardwareItem {
  id: string;
  name: string;
  type: string;
  serialNumber: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  bookings: Booking[];
}

interface Booking {
  id: string;
  hardwareId: string;
  eventId: string | null;
  customerName: string | null;
  customerEmail: string | null;
  startDate: string;
  endDate: string;
  setupDate: string | null;
  teardownDate: string | null;
  status: string;
  notes: string | null;
  totalPrice: number | null;
  hardware?: { id: string; name: string; type: string };
}

const TYPE_LABELS: Record<string, string> = {
  PHOTO_BOOTH: 'Photo Booth',
  MIRROR_BOOTH: 'Mirror Booth',
  KI_STATION: 'KI-Station',
  PRINT_TERMINAL: 'Print-Terminal',
  DISPLAY: 'Display',
  GROUND_SPINNER: '360° Spinner',
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  AVAILABLE: { label: 'Verfügbar', color: 'bg-success/15 text-success' },
  BOOKED: { label: 'Gebucht', color: 'bg-blue-100 text-blue-700' },
  IN_USE: { label: 'Im Einsatz', color: 'bg-purple-100 text-purple-700' },
  MAINTENANCE: { label: 'Wartung', color: 'bg-warning/15 text-warning' },
  RETIRED: { label: 'Ausgemustert', color: 'bg-muted text-muted-foreground' },
};

const BOOKING_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  RESERVED: { label: 'Reserviert', color: 'bg-blue-100 text-blue-700' },
  CONFIRMED: { label: 'Bestätigt', color: 'bg-success/15 text-success' },
  DELIVERED: { label: 'Geliefert', color: 'bg-purple-100 text-purple-700' },
  ACTIVE: { label: 'Aktiv', color: 'bg-indigo-100 text-indigo-700' },
  RETURNED: { label: 'Zurück', color: 'bg-teal-100 text-teal-700' },
  INSPECTED: { label: 'Geprüft', color: 'bg-success/15 text-success' },
  CANCELLED: { label: 'Storniert', color: 'bg-destructive/15 text-destructive' },
};

type ViewMode = 'inventory' | 'calendar';

export default function HardwareAdminPage() {
  const [items, setItems] = useState<HardwareItem[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('inventory');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [editItem, setEditItem] = useState<HardwareItem | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const loadData = useCallback(async () => {
    try {
      const [itemsRes, bookingsRes] = await Promise.all([
        api.get('/hardware'),
        api.get('/hardware/bookings'),
      ]);
      setItems(itemsRes.data?.items || []);
      setBookings(bookingsRes.data?.bookings || []);
    } catch {
      // Error loading
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredItems = items.filter(i =>
    !search || i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.type.toLowerCase().includes(search.toLowerCase()) ||
    (i.serialNumber && i.serialNumber.toLowerCase().includes(search.toLowerCase()))
  );

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Hardware-Eintrag wirklich löschen?')) return;
    try {
      await api.delete(`/hardware/${id}`);
      loadData();
    } catch { /* error */ }
  };

  // Calendar helpers
  const calendarDays = (() => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const offset = (firstDay + 6) % 7; // Monday first
    const days: (number | null)[] = [];
    for (let i = 0; i < offset; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  })();

  const getBookingsForDay = (day: number) => {
    const date = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), day);
    return bookings.filter(b => {
      const start = new Date(b.startDate);
      const end = new Date(b.endDate);
      return date >= new Date(start.getFullYear(), start.getMonth(), start.getDate()) &&
             date <= new Date(end.getFullYear(), end.getMonth(), end.getDate());
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-500" />
            Hardware-Inventar
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {items.length} Geräte • {bookings.length} aktive Buchungen
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg bg-background p-0.5">
            <button
              onClick={() => setViewMode('inventory')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'inventory' ? 'bg-blue-500 text-white' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Monitor className="w-4 h-4 inline mr-1" /> Inventar
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'calendar' ? 'bg-blue-500 text-white' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Calendar className="w-4 h-4 inline mr-1" /> Kalender
            </button>
          </div>
          <button
            onClick={() => { setEditItem(null); setShowAddModal(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-4 h-4" /> Hardware
          </button>
          <button
            onClick={() => setShowBookingModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success/100 text-white text-sm font-medium hover:bg-success transition-colors"
          >
            <Plus className="w-4 h-4" /> Buchung
          </button>
        </div>
      </div>

      {viewMode === 'inventory' ? (
        <>
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Suche nach Name, Typ oder Seriennummer..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Inventory Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map(item => {
              const status = STATUS_LABELS[item.status] || STATUS_LABELS.AVAILABLE;
              const activeBookings = item.bookings.filter(b => b.status !== 'CANCELLED');
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-border bg-card shadow-sm p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-foreground">{item.name}</h3>
                      <p className="text-xs text-muted-foreground">{TYPE_LABELS[item.type] || item.type}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                  {item.serialNumber && (
                    <p className="text-xs text-muted-foreground mb-2 font-mono">SN: {item.serialNumber}</p>
                  )}
                  {item.notes && (
                    <p className="text-xs text-muted-foreground mb-2">{item.notes}</p>
                  )}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                    <span className="text-xs text-muted-foreground">
                      {activeBookings.length} Buchung{activeBookings.length !== 1 ? 'en' : ''}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setEditItem(item); setShowAddModal(true); }}
                        className="p-1.5 rounded-lg hover:bg-background text-muted-foreground transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive/80 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {filteredItems.length === 0 && (
            <div className="text-center py-16">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" />
              <p className="text-muted-foreground">Keine Hardware gefunden</p>
            </div>
          )}
        </>
      ) : (
        /* Calendar View */
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <button
              onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1))}
              className="p-1.5 rounded-lg hover:bg-background transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <h3 className="font-semibold text-foreground">
              {selectedMonth.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
            </h3>
            <button
              onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1))}
              className="p-1.5 rounded-lg hover:bg-background transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
          <div className="grid grid-cols-7 text-center">
            {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(d => (
              <div key={d} className="text-xs font-medium text-muted-foreground py-2 border-b border-border">
                {d}
              </div>
            ))}
            {calendarDays.map((day, i) => {
              const dayBookings = day ? getBookingsForDay(day) : [];
              const isToday = day && new Date().toDateString() === new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), day).toDateString();
              return (
                <div
                  key={i}
                  className={`min-h-[80px] p-1 border-b border-r border-border/50 ${
                    !day ? 'bg-background/30' : ''
                  } ${isToday ? 'bg-blue-50' : ''}`}
                >
                  {day && (
                    <>
                      <div className={`text-xs font-medium mb-1 ${isToday ? 'text-blue-600 font-bold' : 'text-muted-foreground'}`}>
                        {day}
                      </div>
                      {dayBookings.slice(0, 3).map(b => (
                        <div
                          key={b.id}
                          className={`text-[10px] px-1 py-0.5 rounded mb-0.5 truncate ${
                            BOOKING_STATUS_LABELS[b.status]?.color || 'bg-muted text-muted-foreground'
                          }`}
                          title={`${b.hardware?.name || 'Hardware'} - ${b.customerName || 'N/A'}`}
                        >
                          {b.hardware?.name?.substring(0, 12) || 'Buchung'}
                        </div>
                      ))}
                      {dayBookings.length > 3 && (
                        <div className="text-[10px] text-muted-foreground">+{dayBookings.length - 3} mehr</div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add/Edit Hardware Modal */}
      <AnimatePresence>
        {showAddModal && (
          <HardwareModal
            item={editItem}
            onClose={() => { setShowAddModal(false); setEditItem(null); }}
            onSaved={() => { setShowAddModal(false); setEditItem(null); loadData(); }}
          />
        )}
      </AnimatePresence>

      {/* Add Booking Modal */}
      <AnimatePresence>
        {showBookingModal && (
          <BookingModal
            items={items}
            onClose={() => setShowBookingModal(false)}
            onSaved={() => { setShowBookingModal(false); loadData(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── HARDWARE MODAL ─────────────────────────────────────────────────────────

function HardwareModal({
  item,
  onClose,
  onSaved,
}: {
  item: HardwareItem | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(item?.name || '');
  const [type, setType] = useState(item?.type || 'PHOTO_BOOTH');
  const [serialNumber, setSerialNumber] = useState(item?.serialNumber || '');
  const [status, setStatus] = useState(item?.status || 'AVAILABLE');
  const [notes, setNotes] = useState(item?.notes || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (item) {
        await api.put(`/hardware/${item.id}`, { name, type, serialNumber: serialNumber || null, status, notes: notes || null });
      } else {
        await api.post('/hardware', { name, type, serialNumber: serialNumber || null, notes: notes || null });
      }
      onSaved();
    } catch {
      // error
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-md mx-auto z-50 bg-card rounded-2xl shadow-2xl p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg text-foreground">{item ? 'Hardware bearbeiten' : 'Hardware hinzufügen'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-background"><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Name</label>
            <input value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm" placeholder="Photo Booth Alpha" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Typ</label>
            <select value={type} onChange={e => setType(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm">
              {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Seriennummer</label>
            <input value={serialNumber} onChange={e => setSerialNumber(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm" placeholder="Optional" />
          </div>
          {item && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm">
                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Notizen</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm" placeholder="Optional" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:bg-background">Abbrechen</button>
          <button onClick={handleSave} disabled={!name.trim() || saving} className="px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 disabled:opacity-50 flex items-center gap-1.5">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {item ? 'Speichern' : 'Hinzufügen'}
          </button>
        </div>
      </motion.div>
    </>
  );
}

// ─── BOOKING MODAL ──────────────────────────────────────────────────────────

function BookingModal({
  items,
  onClose,
  onSaved,
}: {
  items: HardwareItem[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [hardwareId, setHardwareId] = useState(items[0]?.id || '');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [totalPrice, setTotalPrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!hardwareId || !startDate || !endDate) return;
    setSaving(true);
    setError(null);
    try {
      await api.post('/hardware/bookings', {
        hardwareId,
        customerName: customerName || null,
        customerEmail: customerEmail || null,
        startDate,
        endDate,
        notes: notes || null,
        totalPrice: totalPrice ? parseInt(totalPrice) * 100 : null,
      });
      onSaved();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fehler beim Erstellen der Buchung');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-md mx-auto z-50 bg-card rounded-2xl shadow-2xl p-6 max-h-[85vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg text-foreground">Neue Buchung</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-background"><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>
        {error && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-sm mb-3">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
        )}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Hardware</label>
            <select value={hardwareId} onChange={e => setHardwareId(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm">
              {items.map(i => <option key={i.id} value={i.id}>{i.name} ({TYPE_LABELS[i.type] || i.type})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Von</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Bis</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Kundenname</label>
            <input value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm" placeholder="Optional" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">E-Mail</label>
            <input type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm" placeholder="Optional" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Preis (€)</label>
            <input type="number" value={totalPrice} onChange={e => setTotalPrice(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm" placeholder="Optional" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Notizen</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm" placeholder="Optional" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:bg-background">Abbrechen</button>
          <button onClick={handleSave} disabled={!hardwareId || !startDate || !endDate || saving} className="px-4 py-2 rounded-lg bg-success/100 text-white text-sm font-medium hover:bg-success disabled:opacity-50 flex items-center gap-1.5">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Buchen
          </button>
        </div>
      </motion.div>
    </>
  );
}
