'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';
import { authApi } from '@/lib/auth';
import api from '@/lib/api';
import { User } from '@gaestefotos/shared';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [packages, setPackages] = useState<any[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(false);
  const [packagesError, setPackagesError] = useState<string | null>(null);

  const [newPkg, setNewPkg] = useState({
    sku: '',
    name: '',
    type: 'BASE',
    resultingTier: 'SMART',
    upgradeFromTier: '',
    storageLimitBytes: '',
    storageDurationDays: '',
    isActive: true,
  });

  const [editingPkg, setEditingPkg] = useState<any | null>(null);

  const [usageEventId, setUsageEventId] = useState('');
  const [usageResult, setUsageResult] = useState<any | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [usageError, setUsageError] = useState<string | null>(null);

  const [upgradeEventId, setUpgradeEventId] = useState('');
  const [upgradeSku, setUpgradeSku] = useState('');
  const [upgradeProductId, setUpgradeProductId] = useState('');
  const [upgradeUrl, setUpgradeUrl] = useState<string | null>(null);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is authenticated and is admin
    const checkAuth = async () => {
      try {
        const response = await authApi.getMe();
        if (response.user) {
          const role = response.user.role?.toUpperCase();
          if (role !== 'ADMIN') {
            // Not an admin, redirect to regular dashboard
            router.push('/dashboard');
            return;
          }
          setUser(response.user);
        } else {
          router.push('/login');
        }
      } catch (error) {
        console.error('Auth check error:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const loadPackages = async () => {
    try {
      setPackagesLoading(true);
      setPackagesError(null);
      const { data } = await api.get('/admin/package-definitions');
      setPackages(Array.isArray(data.packages) ? data.packages : []);
    } catch (err: any) {
      setPackagesError(err.response?.data?.error || 'Fehler beim Laden der Pakete');
    } finally {
      setPackagesLoading(false);
    }
  };

  useEffect(() => {
    loadPackages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#F9F5F2'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            border: '4px solid #EAA48F',
            borderTop: '4px solid #295B4D',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }}></div>
          <p style={{ marginTop: '1rem', color: '#295B4D' }}>Lade Dashboard...</p>
        </div>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div style={{ 
      minHeight: '100vh',
      backgroundColor: '#F9F5F2'
    }}>
      {/* Header */}
      <header style={{
        backgroundColor: '#295B4D',
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <Logo width={150} height={60} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ color: '#F9F5F2', fontSize: '0.875rem' }}>
            {user.name} ({user.email})
          </span>
          <button
            onClick={() => {
              authApi.logout();
              router.push('/login');
            }}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#EAA48F',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}
          >
            Abmelden
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ 
          color: '#295B4D', 
          fontSize: '2rem', 
          fontWeight: 'bold',
          marginBottom: '2rem'
        }}>
          Admin Dashboard
        </h1>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.5rem',
          marginTop: '2rem'
        }}>
          {/* Stats Cards */}
          <div style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '0.5rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ color: '#295B4D', fontSize: '1.25rem', marginBottom: '0.5rem' }}>
              Willkommen, {user.name}!
            </h3>
            <p style={{ color: '#666', fontSize: '0.875rem' }}>
              Du bist als Administrator angemeldet.
            </p>
          </div>

          <div style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '0.5rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ color: '#295B4D', fontSize: '1.25rem', marginBottom: '0.5rem' }}>
              Events verwalten
            </h3>
            <p style={{ color: '#666', fontSize: '0.875rem' }}>
              Erstelle und verwalte Events.
            </p>
          </div>

          <div style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '0.5rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ color: '#295B4D', fontSize: '1.25rem', marginBottom: '0.5rem' }}>
              Benutzer verwalten
            </h3>
            <p style={{ color: '#666', fontSize: '0.875rem' }}>
              Verwalte Benutzer und Berechtigungen.
            </p>
          </div>
        </div>

        <div style={{ marginTop: '2rem', display: 'grid', gap: '1.5rem' }}>
            {/* Package Definitions */}
            <section style={{
              backgroundColor: 'white',
              borderRadius: '1rem',
              padding: '1.5rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                <h2 style={{ color: '#295B4D', fontSize: '1.25rem', fontWeight: 'bold' }}>Pakete / Upgrades (SKU → Limits)</h2>
                <button
                  onClick={loadPackages}
                  style={{
                    padding: '0.5rem 0.75rem',
                    backgroundColor: '#295B4D',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    fontSize: '0.875rem'
                  }}
                >
                  Aktualisieren
                </button>
              </div>

              {packagesError && (
                <p style={{ marginTop: '0.75rem', color: '#B00020' }}>{packagesError}</p>
              )}

              <div style={{ marginTop: '1rem', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}>
                      <th style={{ padding: '0.5rem' }}>SKU</th>
                      <th style={{ padding: '0.5rem' }}>Name</th>
                      <th style={{ padding: '0.5rem' }}>Typ</th>
                      <th style={{ padding: '0.5rem' }}>Tier</th>
                      <th style={{ padding: '0.5rem' }}>From</th>
                      <th style={{ padding: '0.5rem' }}>Limit (Bytes)</th>
                      <th style={{ padding: '0.5rem' }}>Dauer (Tage)</th>
                      <th style={{ padding: '0.5rem' }}>Aktiv</th>
                      <th style={{ padding: '0.5rem' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {packagesLoading ? (
                      <tr><td colSpan={9} style={{ padding: '0.75rem', color: '#666' }}>Lade…</td></tr>
                    ) : (
                      packages.map((p) => (
                        <tr key={p.id} style={{ borderBottom: '1px solid #f2f2f2' }}>
                          <td style={{ padding: '0.5rem', fontFamily: 'monospace' }}>{p.sku}</td>
                          <td style={{ padding: '0.5rem' }}>{p.name}</td>
                          <td style={{ padding: '0.5rem' }}>{p.type}</td>
                          <td style={{ padding: '0.5rem' }}>{p.resultingTier}</td>
                          <td style={{ padding: '0.5rem' }}>{p.upgradeFromTier || '-'}</td>
                          <td style={{ padding: '0.5rem', fontFamily: 'monospace' }}>{p.storageLimitBytes ?? '-'}</td>
                          <td style={{ padding: '0.5rem', fontFamily: 'monospace' }}>{p.storageDurationDays ?? '-'}</td>
                          <td style={{ padding: '0.5rem' }}>{p.isActive ? 'ja' : 'nein'}</td>
                          <td style={{ padding: '0.5rem', whiteSpace: 'nowrap' }}>
                            <button
                              onClick={() =>
                                setEditingPkg({
                                  ...p,
                                  storageLimitBytes: p.storageLimitBytes ?? '',
                                  storageDurationDays: p.storageDurationDays ?? '',
                                })
                              }
                              style={{
                                padding: '0.35rem 0.6rem',
                                backgroundColor: '#EAA48F',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.5rem',
                                cursor: 'pointer',
                                marginRight: '0.5rem'
                              }}
                            >
                              Bearbeiten
                            </button>
                            <button
                              onClick={async () => {
                                if (!confirm(`Paket deaktivieren? ${p.sku}`)) return;
                                setPackagesError(null);
                                try {
                                  await api.delete(`/admin/package-definitions/${p.id}`);
                                  await loadPackages();
                                } catch (err: any) {
                                  setPackagesError(err.response?.data?.error || 'Fehler beim Löschen');
                                }
                              }}
                              style={{
                                padding: '0.35rem 0.6rem',
                                backgroundColor: '#B00020',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.5rem',
                                cursor: 'pointer'
                              }}
                            >
                              Löschen
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Create */}
              <div style={{ marginTop: '1.25rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
                <h3 style={{ color: '#295B4D', fontSize: '1rem', fontWeight: 'bold', marginBottom: '0.75rem' }}>Neues Paket</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                  <input value={newPkg.sku} onChange={(e) => setNewPkg({ ...newPkg, sku: e.target.value })} placeholder="SKU" style={{ padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #ddd' }} />
                  <input value={newPkg.name} onChange={(e) => setNewPkg({ ...newPkg, name: e.target.value })} placeholder="Name" style={{ padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #ddd' }} />
                  <select value={newPkg.type} onChange={(e) => setNewPkg({ ...newPkg, type: e.target.value })} style={{ padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #ddd' }}>
                    <option value="BASE">BASE</option>
                    <option value="UPGRADE">UPGRADE</option>
                  </select>
                  <input value={newPkg.resultingTier} onChange={(e) => setNewPkg({ ...newPkg, resultingTier: e.target.value })} placeholder="resultingTier" style={{ padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #ddd' }} />
                  <input value={newPkg.upgradeFromTier} onChange={(e) => setNewPkg({ ...newPkg, upgradeFromTier: e.target.value })} placeholder="upgradeFromTier (optional)" style={{ padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #ddd' }} />
                  <input value={newPkg.storageLimitBytes} onChange={(e) => setNewPkg({ ...newPkg, storageLimitBytes: e.target.value })} placeholder="storageLimitBytes (optional)" style={{ padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #ddd', fontFamily: 'monospace' }} />
                  <input value={newPkg.storageDurationDays} onChange={(e) => setNewPkg({ ...newPkg, storageDurationDays: e.target.value })} placeholder="storageDurationDays (optional)" style={{ padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #ddd', fontFamily: 'monospace' }} />
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#295B4D' }}>
                    <input type="checkbox" checked={newPkg.isActive} onChange={(e) => setNewPkg({ ...newPkg, isActive: e.target.checked })} />
                    aktiv
                  </label>
                </div>
                <button
                  onClick={async () => {
                    setPackagesError(null);
                    try {
                      await api.post('/admin/package-definitions', {
                        sku: newPkg.sku.trim(),
                        name: newPkg.name.trim(),
                        type: newPkg.type,
                        resultingTier: newPkg.resultingTier.trim(),
                        upgradeFromTier: newPkg.upgradeFromTier.trim() || null,
                        storageLimitBytes: newPkg.storageLimitBytes.trim() || null,
                        storageDurationDays: newPkg.storageDurationDays.trim() ? Number(newPkg.storageDurationDays.trim()) : null,
                        isActive: newPkg.isActive,
                      });
                      setNewPkg({
                        sku: '',
                        name: '',
                        type: 'BASE',
                        resultingTier: 'SMART',
                        upgradeFromTier: '',
                        storageLimitBytes: '',
                        storageDurationDays: '',
                        isActive: true,
                      });
                      await loadPackages();
                    } catch (err: any) {
                      setPackagesError(err.response?.data?.error || 'Fehler beim Erstellen');
                    }
                  }}
                  style={{
                    marginTop: '0.75rem',
                    padding: '0.6rem 1rem',
                    backgroundColor: '#295B4D',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  Speichern
                </button>
              </div>

              {/* Edit */}
              {editingPkg && (
                <div style={{ marginTop: '1.25rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
                  <h3 style={{ color: '#295B4D', fontSize: '1rem', fontWeight: 'bold', marginBottom: '0.75rem' }}>
                    Paket bearbeiten: <span style={{ fontFamily: 'monospace' }}>{editingPkg.sku}</span>
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                    <input value={editingPkg.sku} onChange={(e) => setEditingPkg({ ...editingPkg, sku: e.target.value })} placeholder="SKU" style={{ padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #ddd' }} />
                    <input value={editingPkg.name} onChange={(e) => setEditingPkg({ ...editingPkg, name: e.target.value })} placeholder="Name" style={{ padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #ddd' }} />
                    <select value={editingPkg.type} onChange={(e) => setEditingPkg({ ...editingPkg, type: e.target.value })} style={{ padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #ddd' }}>
                      <option value="BASE">BASE</option>
                      <option value="UPGRADE">UPGRADE</option>
                    </select>
                    <input value={editingPkg.resultingTier} onChange={(e) => setEditingPkg({ ...editingPkg, resultingTier: e.target.value })} placeholder="resultingTier" style={{ padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #ddd' }} />
                    <input value={editingPkg.upgradeFromTier || ''} onChange={(e) => setEditingPkg({ ...editingPkg, upgradeFromTier: e.target.value })} placeholder="upgradeFromTier (optional)" style={{ padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #ddd' }} />
                    <input value={editingPkg.storageLimitBytes ?? ''} onChange={(e) => setEditingPkg({ ...editingPkg, storageLimitBytes: e.target.value })} placeholder="storageLimitBytes (optional)" style={{ padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #ddd', fontFamily: 'monospace' }} />
                    <input value={editingPkg.storageDurationDays ?? ''} onChange={(e) => setEditingPkg({ ...editingPkg, storageDurationDays: e.target.value })} placeholder="storageDurationDays (optional)" style={{ padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #ddd', fontFamily: 'monospace' }} />
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#295B4D' }}>
                      <input type="checkbox" checked={!!editingPkg.isActive} onChange={(e) => setEditingPkg({ ...editingPkg, isActive: e.target.checked })} />
                      aktiv
                    </label>
                  </div>
                  <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={async () => {
                        setPackagesError(null);
                        try {
                          await api.put(`/admin/package-definitions/${editingPkg.id}`, {
                            sku: editingPkg.sku.trim(),
                            name: editingPkg.name.trim(),
                            type: editingPkg.type,
                            resultingTier: editingPkg.resultingTier.trim(),
                            upgradeFromTier: (editingPkg.upgradeFromTier || '').trim() || null,
                            storageLimitBytes: (String(editingPkg.storageLimitBytes || '')).trim() || null,
                            storageDurationDays: (String(editingPkg.storageDurationDays || '')).trim() ? Number(String(editingPkg.storageDurationDays || '').trim()) : null,
                            isActive: !!editingPkg.isActive,
                          });
                          setEditingPkg(null);
                          await loadPackages();
                        } catch (err: any) {
                          setPackagesError(err.response?.data?.error || 'Fehler beim Aktualisieren');
                        }
                      }}
                      style={{
                        padding: '0.6rem 1rem',
                        backgroundColor: '#295B4D',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                        fontWeight: '500'
                      }}
                    >
                      Update
                    </button>
                    <button
                      onClick={() => setEditingPkg(null)}
                      style={{
                        padding: '0.6rem 1rem',
                        backgroundColor: '#ddd',
                        color: '#333',
                        border: 'none',
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                        fontWeight: '500'
                      }}
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              )}
            </section>

            {/* Usage Inspector */}
            <section style={{
              backgroundColor: 'white',
              padding: '1.5rem',
              borderRadius: '0.5rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <h2 style={{ color: '#295B4D', fontSize: '1.25rem', fontWeight: 'bold' }}>Event Usage / Limit Debug</h2>
              <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <input
                  value={usageEventId}
                  onChange={(e) => setUsageEventId(e.target.value)}
                  placeholder="eventId"
                  style={{
                    padding: '0.6rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #ddd',
                    minWidth: '320px',
                    fontFamily: 'monospace'
                  }}
                />
                <button
                  onClick={async () => {
                    setUsageError(null);
                    setUsageResult(null);
                    const eventId = usageEventId.trim();
                    if (!eventId) {
                      setUsageError('Bitte eventId eingeben');
                      return;
                    }
                    try {
                      setUsageLoading(true);
                      const { data } = await api.get(`/events/${eventId}/usage`);
                      setUsageResult(data);
                    } catch (err: any) {
                      setUsageError(err.response?.data?.error || 'Fehler beim Abrufen');
                    } finally {
                      setUsageLoading(false);
                    }
                  }}
                  style={{
                    padding: '0.6rem 1rem',
                    backgroundColor: '#295B4D',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  {usageLoading ? 'Lade…' : 'Abrufen'}
                </button>
              </div>
              {usageError && <p style={{ marginTop: '0.75rem', color: '#B00020' }}>{usageError}</p>}
              {usageResult && (
                <pre style={{
                  marginTop: '0.75rem',
                  padding: '0.75rem',
                  background: '#f7f7f7',
                  borderRadius: '0.5rem',
                  overflowX: 'auto',
                  fontSize: '0.8rem'
                }}>
                  {JSON.stringify(usageResult, null, 2)}
                </pre>
              )}
            </section>

            {/* Upgrade Link Generator */}
            <section style={{
              backgroundColor: 'white',
              padding: '1.5rem',
              borderRadius: '0.5rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <h2 style={{ color: '#295B4D', fontSize: '1.25rem', fontWeight: 'bold' }}>Upgrade-Link Generator</h2>
              <p style={{ marginTop: '0.25rem', color: '#666', fontSize: '0.875rem' }}>
                Generiert einen WooCommerce Add-to-Cart Link inkl. <span style={{ fontFamily: 'monospace' }}>eventCode</span>.
              </p>
              <div style={{ marginTop: '0.75rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
                <input value={upgradeEventId} onChange={(e) => setUpgradeEventId(e.target.value)} placeholder="eventId" style={{ padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #ddd', fontFamily: 'monospace' }} />
                <input value={upgradeSku} onChange={(e) => setUpgradeSku(e.target.value)} placeholder="sku (optional)" style={{ padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #ddd' }} />
                <input value={upgradeProductId} onChange={(e) => setUpgradeProductId(e.target.value)} placeholder="productId (optional)" style={{ padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #ddd' }} />
              </div>
              <button
                onClick={async () => {
                  setUpgradeError(null);
                  setUpgradeUrl(null);
                  const eventId = upgradeEventId.trim();
                  if (!eventId) {
                    setUpgradeError('Bitte eventId eingeben');
                    return;
                  }
                  try {
                    setUpgradeLoading(true);
                    const qs = new URLSearchParams();
                    if (upgradeSku.trim()) qs.set('sku', upgradeSku.trim());
                    if (upgradeProductId.trim()) qs.set('productId', upgradeProductId.trim());
                    const { data } = await api.get(`/events/${eventId}/upgrade-link?${qs.toString()}`);
                    setUpgradeUrl(data.url);
                  } catch (err: any) {
                    setUpgradeError(err.response?.data?.error || 'Fehler beim Erstellen des Links');
                  } finally {
                    setUpgradeLoading(false);
                  }
                }}
                style={{
                  marginTop: '0.75rem',
                  padding: '0.6rem 1rem',
                  backgroundColor: '#EAA48F',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                {upgradeLoading ? 'Erzeuge…' : 'Link erzeugen'}
              </button>
              {upgradeError && <p style={{ marginTop: '0.75rem', color: '#B00020' }}>{upgradeError}</p>}
              {upgradeUrl && (
                <div style={{ marginTop: '0.75rem' }}>
                  <p style={{ color: '#295B4D', fontWeight: '500' }}>Link:</p>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <a href={upgradeUrl} target="_blank" rel="noreferrer" style={{ color: '#295B4D', textDecoration: 'underline', wordBreak: 'break-all' }}>{upgradeUrl}</a>
                    <button
                      onClick={async () => {
                        await navigator.clipboard.writeText(upgradeUrl);
                      }}
                      style={{
                        padding: '0.4rem 0.75rem',
                        backgroundColor: '#295B4D',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.5rem',
                        cursor: 'pointer'
                      }}
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}
            </section>
          </div>
      </main>
    </div>
  );
}
