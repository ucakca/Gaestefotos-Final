'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import {
  Zap,
  Users,
  TrendingUp,
  Plus,
  History,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Gift,
  CreditCard,
  RotateCcw,
  Loader2,
  CheckCircle2,
  XCircle,
  X,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface CreditBalance {
  id: string;
  userId: string;
  balance: number;
  totalPurchased: number;
  totalConsumed: number;
  autoRecharge: boolean;
  autoRechargeThreshold: number;
  autoRechargeAmount: number;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; name: string | null; email: string | null };
}

interface CreditTransaction {
  id: string;
  balanceId: string;
  type: string;
  amount: number;
  feature: string | null;
  description: string | null;
  stripePaymentId: string | null;
  createdAt: string;
}

interface OverviewData {
  totals: {
    totalBalance: number;
    totalPurchased: number;
    totalConsumed: number;
    userCount: number;
  };
  balances: CreditBalance[];
}

// ─── Toast ──────────────────────────────────────────────────────────────────

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-white
      ${type === 'success' ? 'bg-success' : 'bg-destructive'}`}>
      {type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
      <span className="text-sm">{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-80"><X className="w-3 h-3" /></button>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function CreditsPage() {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<CreditBalance | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [txPage, setTxPage] = useState(1);
  const [txTotal, setTxTotal] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ amount: 100, type: 'BONUS' as string, description: '' });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const loadOverview = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/credits/overview');
      setOverview(res.data);
    } catch (err) {
      setToast({ message: 'Fehler beim Laden der Übersicht', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadOverview(); }, [loadOverview]);

  const loadTransactions = useCallback(async (userId: string, page = 1) => {
    try {
      const res = await api.get(`/admin/credits/${userId}/history?page=${page}&limit=20`);
      setTransactions(res.data.transactions);
      setTxTotal(res.data.pagination.total);
      setTxPage(page);
    } catch {
      setToast({ message: 'Fehler beim Laden der Transaktionen', type: 'error' });
    }
  }, []);

  const selectUser = (balance: CreditBalance) => {
    setSelectedUser(balance);
    loadTransactions(balance.userId);
  };

  const handleAddCredits = async () => {
    if (!selectedUser || !addForm.description.trim()) return;
    setSaving(true);
    try {
      await api.post(`/admin/credits/${selectedUser.userId}/add`, addForm);
      setToast({ message: `${addForm.amount} Credits hinzugefügt`, type: 'success' });
      setShowAddModal(false);
      setAddForm({ amount: 100, type: 'BONUS', description: '' });
      loadOverview();
      loadTransactions(selectedUser.userId, 1);
    } catch {
      setToast({ message: 'Fehler beim Hinzufügen', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const filteredBalances = overview?.balances.filter(b => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      b.user?.name?.toLowerCase().includes(s) ||
      b.user?.email?.toLowerCase().includes(s) ||
      b.userId.toLowerCase().includes(s)
    );
  }) || [];

  const typeIcon = (type: string) => {
    switch (type) {
      case 'PURCHASE': return <CreditCard className="w-3.5 h-3.5 text-blue-500" />;
      case 'BONUS': return <Gift className="w-3.5 h-3.5 text-success" />;
      case 'REFUND': return <RotateCcw className="w-3.5 h-3.5 text-amber-500" />;
      case 'CONSUMPTION': return <ArrowDownRight className="w-3.5 h-3.5 text-destructive" />;
      case 'AUTO_RECHARGE': return <RefreshCw className="w-3.5 h-3.5 text-purple-500" />;
      default: return <Zap className="w-3.5 h-3.5 text-muted-foreground" />;
    }
  };

  const typeLabel = (type: string) => {
    const labels: Record<string, string> = {
      PURCHASE: 'Kauf', BONUS: 'Bonus', REFUND: 'Erstattung',
      CONSUMPTION: 'Verbrauch', AUTO_RECHARGE: 'Auto-Recharge',
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-app-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-app-foreground flex items-center gap-2">
            <Zap className="w-7 h-7 text-amber-500" />
            AI Credits
          </h1>
          <p className="text-sm text-app-muted mt-1">Credit-Verwaltung für AI-Features</p>
        </div>
        <button onClick={loadOverview} className="flex items-center gap-2 px-3 py-2 text-sm bg-app-card border border-app-border rounded-lg hover:bg-app-muted/10">
          <RefreshCw className="w-4 h-4" /> Aktualisieren
        </button>
      </div>

      {/* Stats */}
      {overview && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-app-card border border-app-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-app-muted text-sm mb-1">
              <Users className="w-4 h-4" /> Nutzer mit Credits
            </div>
            <div className="text-2xl font-bold text-app-foreground">{overview.totals.userCount}</div>
          </div>
          <div className="bg-app-card border border-app-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-app-muted text-sm mb-1">
              <Zap className="w-4 h-4 text-amber-500" /> Gesamt-Balance
            </div>
            <div className="text-2xl font-bold text-amber-600">{overview.totals.totalBalance.toLocaleString()}</div>
          </div>
          <div className="bg-app-card border border-app-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-app-muted text-sm mb-1">
              <ArrowUpRight className="w-4 h-4 text-success" /> Gesamt gekauft
            </div>
            <div className="text-2xl font-bold text-success">{overview.totals.totalPurchased.toLocaleString()}</div>
          </div>
          <div className="bg-app-card border border-app-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-app-muted text-sm mb-1">
              <ArrowDownRight className="w-4 h-4 text-destructive" /> Gesamt verbraucht
            </div>
            <div className="text-2xl font-bold text-destructive">{overview.totals.totalConsumed.toLocaleString()}</div>
          </div>
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: User list */}
        <div className="lg:col-span-1 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-muted" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Nutzer suchen..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-app-card border border-app-border rounded-lg text-app-foreground placeholder:text-app-muted"
            />
          </div>

          <div className="bg-app-card border border-app-border rounded-lg divide-y divide-app-border max-h-[600px] overflow-y-auto">
            {filteredBalances.length === 0 ? (
              <div className="p-4 text-sm text-app-muted text-center">Keine Nutzer gefunden</div>
            ) : (
              filteredBalances.map(b => (
                <button
                  key={b.userId}
                  onClick={() => selectUser(b)}
                  className={`w-full text-left px-4 py-3 hover:bg-app-muted/10 transition-colors ${
                    selectedUser?.userId === b.userId ? 'bg-amber-50 dark:bg-amber-900/10 border-l-2 border-amber-500' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm text-app-foreground">{b.user?.name || 'Unbekannt'}</div>
                      <div className="text-xs text-app-muted">{b.user?.email || b.userId}</div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm font-bold text-amber-600">
                        <Zap className="w-3.5 h-3.5" />{b.balance}
                      </div>
                      <div className="text-xs text-app-muted">
                        {b.totalConsumed} verbraucht
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right: User detail + transactions */}
        <div className="lg:col-span-2">
          {!selectedUser ? (
            <div className="bg-app-card border border-app-border rounded-lg p-8 text-center text-app-muted">
              <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Wähle einen Nutzer aus der Liste um Details und Transaktionen zu sehen.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* User header */}
              <div className="bg-app-card border border-app-border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-app-foreground">{selectedUser.user?.name || 'Unbekannt'}</h2>
                    <p className="text-sm text-app-muted">{selectedUser.user?.email}</p>
                  </div>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" /> Credits hinzufügen
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/10 rounded-lg">
                    <div className="text-2xl font-bold text-amber-600">{selectedUser.balance}</div>
                    <div className="text-xs text-app-muted">Balance</div>
                  </div>
                  <div className="text-center p-3 bg-success/10 dark:bg-success/10 rounded-lg">
                    <div className="text-2xl font-bold text-success">{selectedUser.totalPurchased}</div>
                    <div className="text-xs text-app-muted">Gekauft</div>
                  </div>
                  <div className="text-center p-3 bg-destructive/10 dark:bg-destructive/10 rounded-lg">
                    <div className="text-2xl font-bold text-destructive">{selectedUser.totalConsumed}</div>
                    <div className="text-xs text-app-muted">Verbraucht</div>
                  </div>
                </div>
                {selectedUser.autoRecharge && (
                  <div className="mt-3 text-xs text-purple-600 dark:text-purple-400 flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" />
                    Auto-Recharge aktiv: +{selectedUser.autoRechargeAmount} bei {'<'}{selectedUser.autoRechargeThreshold}
                  </div>
                )}
              </div>

              {/* Transactions */}
              <div className="bg-app-card border border-app-border rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-app-border flex items-center justify-between">
                  <h3 className="font-semibold text-app-foreground flex items-center gap-2">
                    <History className="w-4 h-4" /> Transaktionen
                  </h3>
                  <span className="text-xs text-app-muted">{txTotal} gesamt</span>
                </div>
                {transactions.length === 0 ? (
                  <div className="p-6 text-center text-sm text-app-muted">Keine Transaktionen vorhanden</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-app-border bg-app-muted/5">
                        <th className="text-left px-4 py-2 font-medium text-app-muted">Typ</th>
                        <th className="text-right px-4 py-2 font-medium text-app-muted">Credits</th>
                        <th className="text-left px-4 py-2 font-medium text-app-muted">Beschreibung</th>
                        <th className="text-left px-4 py-2 font-medium text-app-muted">Feature</th>
                        <th className="text-right px-4 py-2 font-medium text-app-muted">Datum</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map(tx => (
                        <tr key={tx.id} className="border-b border-app-border last:border-0 hover:bg-app-muted/5">
                          <td className="px-4 py-2">
                            <span className="inline-flex items-center gap-1.5">
                              {typeIcon(tx.type)}
                              <span className="text-xs font-medium">{typeLabel(tx.type)}</span>
                            </span>
                          </td>
                          <td className={`px-4 py-2 text-right font-mono font-bold ${
                            tx.amount > 0 ? 'text-success' : 'text-destructive'
                          }`}>
                            {tx.amount > 0 ? '+' : ''}{tx.amount}
                          </td>
                          <td className="px-4 py-2 text-app-muted text-xs max-w-[200px] truncate">
                            {tx.description || '—'}
                          </td>
                          <td className="px-4 py-2">
                            {tx.feature ? (
                              <span className="text-xs px-1.5 py-0.5 bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 rounded font-mono">
                                {tx.feature}
                              </span>
                            ) : '—'}
                          </td>
                          <td className="px-4 py-2 text-right text-xs text-app-muted">
                            {new Date(tx.createdAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {txTotal > 20 && (
                  <div className="px-4 py-3 border-t border-app-border flex items-center justify-between">
                    <button
                      disabled={txPage <= 1}
                      onClick={() => loadTransactions(selectedUser.userId, txPage - 1)}
                      className="flex items-center gap-1 text-xs text-app-muted hover:text-app-foreground disabled:opacity-30"
                    >
                      <ChevronLeft className="w-3 h-3" /> Zurück
                    </button>
                    <span className="text-xs text-app-muted">Seite {txPage} von {Math.ceil(txTotal / 20)}</span>
                    <button
                      disabled={txPage >= Math.ceil(txTotal / 20)}
                      onClick={() => loadTransactions(selectedUser.userId, txPage + 1)}
                      className="flex items-center gap-1 text-xs text-app-muted hover:text-app-foreground disabled:opacity-30"
                    >
                      Weiter <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Credits Modal */}
      {showAddModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-app-card border border-app-border rounded-xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-app-foreground mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" /> Credits hinzufügen
            </h3>
            <p className="text-sm text-app-muted mb-4">
              Für: <strong>{selectedUser.user?.name || selectedUser.userId}</strong>
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-app-foreground mb-1">Typ</label>
                <select
                  value={addForm.type}
                  onChange={e => setAddForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-transparent border border-app-border rounded-lg text-app-foreground"
                >
                  <option value="BONUS">Bonus</option>
                  <option value="PURCHASE">Kauf</option>
                  <option value="REFUND">Erstattung</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-app-foreground mb-1">Anzahl Credits</label>
                <input
                  type="number"
                  value={addForm.amount}
                  onChange={e => setAddForm(f => ({ ...f, amount: parseInt(e.target.value) || 0 }))}
                  min={1}
                  max={10000}
                  className="w-full px-3 py-2 text-sm bg-transparent border border-app-border rounded-lg text-app-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-app-foreground mb-1">Beschreibung *</label>
                <textarea
                  value={addForm.description}
                  onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Grund für die Gutschrift..."
                  rows={2}
                  className="w-full px-3 py-2 text-sm bg-transparent border border-app-border rounded-lg text-app-foreground placeholder:text-app-muted resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 text-sm bg-app-muted/10 border border-app-border rounded-lg hover:bg-app-muted/20"
              >
                Abbrechen
              </button>
              <button
                onClick={handleAddCredits}
                disabled={saving || !addForm.description.trim() || addForm.amount < 1}
                className="flex-1 px-4 py-2 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {addForm.amount} Credits hinzufügen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
