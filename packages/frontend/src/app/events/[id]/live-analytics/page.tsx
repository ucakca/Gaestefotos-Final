'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { Event as EventType } from '@gaestefotos/shared';
import { wsManager } from '@/lib/websocket';
import AppLayout from '@/components/AppLayout';
import DashboardFooter from '@/components/DashboardFooter';
import { FullPageLoader } from '@/components/ui/FullPageLoader';
import {
  Camera, Users, TrendingUp, Clock, Activity, Zap,
  Image as ImageIcon, CheckCircle, XCircle, Eye, Upload,
  BarChart3, Wifi, WifiOff, RefreshCw,
} from 'lucide-react';
import { CHART_COLORS } from '@/lib/chartColors';

const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false });
const AreaChart = dynamic(() => import('recharts').then(m => m.AreaChart), { ssr: false });
const Area = dynamic(() => import('recharts').then(m => m.Area), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(m => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(m => m.YAxis), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false });

interface LiveStats {
  totalPhotos: number;
  approvedPhotos: number;
  pendingPhotos: number;
  rejectedPhotos: number;
  totalGuests: number;
  acceptedGuests: number;
  totalViews: number;
  uploadsPerHour: { hour: string; count: number }[];
}

interface ActivityItem {
  id: string;
  type: 'upload' | 'approve' | 'reject' | 'guest_join';
  message: string;
  timestamp: Date;
}

export default function LiveAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const [eventId, setEventId] = useState<string | null>(null);
  const [event, setEvent] = useState<EventType | null>(null);
  const [stats, setStats] = useState<LiveStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [uploadsNow, setUploadsNow] = useState(0);
  const lastRefresh = useRef(Date.now());

  React.useEffect(() => { params.then(p => setEventId(p.id)); }, [params]);

  const fetchStats = useCallback(async () => {
    if (!eventId) return;
    try {
      const [eventRes, statsRes] = await Promise.all([
        api.get(`/events/${eventId}`),
        api.get(`/statistics/events/${eventId}/statistics`),
      ]);
      setEvent(eventRes.data.event || eventRes.data);

      const s = statsRes.data;
      setStats({
        totalPhotos: s.photos?.total || 0,
        approvedPhotos: s.photos?.approved || 0,
        pendingPhotos: s.photos?.pending || 0,
        rejectedPhotos: s.photos?.rejected || 0,
        totalGuests: s.guests?.total || 0,
        acceptedGuests: s.guests?.accepted || 0,
        totalViews: s.views || 0,
        uploadsPerHour: Object.entries(s.uploadTrends || {}).map(([hour, data]: any) => ({
          hour: hour.slice(5),
          count: (data?.approved || 0) + (data?.pending || 0),
        })).slice(-24),
      });
      lastRefresh.current = Date.now();
    } catch (err) {
      console.error('Failed to load stats', err);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  // WebSocket real-time updates
  useEffect(() => {
    if (!eventId) return;

    wsManager.connect();
    wsManager.joinEvent(eventId);
    setConnected(true);

    const unsubUpload = wsManager.on('photo_uploaded', (data: any) => {
      setStats(prev => prev ? { ...prev, totalPhotos: prev.totalPhotos + 1, pendingPhotos: prev.pendingPhotos + 1 } : prev);
      setUploadsNow(p => p + 1);
      setTimeout(() => setUploadsNow(p => Math.max(0, p - 1)), 60000);
      setActivity(prev => [{
        id: crypto.randomUUID(),
        type: 'upload' as const,
        message: `Neues Foto hochgeladen${data?.photo?.guestName ? ` von ${data.photo.guestName}` : ''}`,
        timestamp: new Date(),
      }, ...prev].slice(0, 50));
    });

    const unsubApproved = wsManager.on('photo_approved', () => {
      setStats(prev => prev ? {
        ...prev,
        approvedPhotos: prev.approvedPhotos + 1,
        pendingPhotos: Math.max(0, prev.pendingPhotos - 1),
      } : prev);
      setActivity(prev => [{
        id: crypto.randomUUID(),
        type: 'approve' as const,
        message: 'Foto freigegeben',
        timestamp: new Date(),
      }, ...prev].slice(0, 50));
    });

    const unsubRejected = wsManager.on('photo_rejected', () => {
      setStats(prev => prev ? {
        ...prev,
        rejectedPhotos: prev.rejectedPhotos + 1,
        pendingPhotos: Math.max(0, prev.pendingPhotos - 1),
      } : prev);
      setActivity(prev => [{
        id: crypto.randomUUID(),
        type: 'reject' as const,
        message: 'Foto abgelehnt',
        timestamp: new Date(),
      }, ...prev].slice(0, 50));
    });

    return () => {
      unsubUpload();
      unsubApproved();
      unsubRejected();
      wsManager.leaveEvent(eventId);
      setConnected(false);
    };
  }, [eventId]);

  if (loading || !eventId) return <FullPageLoader />;

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Activity className="w-6 h-6 text-primary" />
              Live Analytics
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{event?.title || 'Event'}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full ${
              connected ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive'
            }`}>
              {connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {connected ? 'Live' : 'Offline'}
            </div>
            <button onClick={fetchStats} className="p-2 text-muted-foreground hover:text-foreground transition" title="Aktualisieren">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {stats && (
          <>
            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard icon={Camera} label="Fotos gesamt" value={stats.totalPhotos} color="text-blue-500" />
              <StatCard icon={CheckCircle} label="Freigegeben" value={stats.approvedPhotos} color="text-success" />
              <StatCard icon={Clock} label="Ausstehend" value={stats.pendingPhotos} color="text-amber-500" pulse={stats.pendingPhotos > 0} />
              <StatCard icon={Users} label="Gäste" value={stats.totalGuests} sub={`${stats.acceptedGuests} bestätigt`} color="text-purple-500" />
            </div>

            {/* Live Indicators */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
              {/* Upload Rate */}
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-muted-foreground">Uploads / Minute</span>
                  <Zap className="w-4 h-4 text-warning" />
                </div>
                <div className="text-3xl font-bold text-foreground">{uploadsNow}</div>
                <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full"
                    animate={{ width: `${Math.min(uploadsNow * 10, 100)}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>

              {/* Approval Rate */}
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-muted-foreground">Freigabequote</span>
                  <CheckCircle className="w-4 h-4 text-success" />
                </div>
                <div className="text-3xl font-bold text-foreground">
                  {stats.totalPhotos > 0 ? Math.round(stats.approvedPhotos / stats.totalPhotos * 100) : 0}%
                </div>
                <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all"
                    style={{ width: `${stats.totalPhotos > 0 ? (stats.approvedPhotos / stats.totalPhotos * 100) : 0}%` }}
                  />
                </div>
              </div>

              {/* Guest Participation */}
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-muted-foreground">Gäste-Teilnahme</span>
                  <Users className="w-4 h-4 text-purple-500" />
                </div>
                <div className="text-3xl font-bold text-foreground">
                  {stats.totalGuests > 0 ? Math.round(stats.acceptedGuests / stats.totalGuests * 100) : 0}%
                </div>
                <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-400 to-violet-500 rounded-full transition-all"
                    style={{ width: `${stats.totalGuests > 0 ? (stats.acceptedGuests / stats.totalGuests * 100) : 0}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Chart + Activity Feed */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Upload Trend Chart */}
              <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  Upload-Verlauf
                </h3>
                {stats.uploadsPerHour.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={stats.uploadsPerHour}>
                        <defs>
                          <linearGradient id="colorUploads" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="hour" tick={{ fontSize: 11 }} stroke={CHART_COLORS.axisLight} />
                        <YAxis tick={{ fontSize: 11 }} stroke={CHART_COLORS.axisLight} />
                        <Tooltip />
                        <Area type="monotone" dataKey="count" stroke={CHART_COLORS.primary} fill="url(#colorUploads)" strokeWidth={2} name="Uploads" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                    Noch keine Upload-Daten
                  </div>
                )}
              </div>

              {/* Live Activity Feed */}
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  Live-Aktivität
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {activity.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Warte auf Aktivität...</p>
                  ) : (
                    <AnimatePresence>
                      {activity.map(item => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0 }}
                          className="flex items-start gap-2 text-xs"
                        >
                          <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                            item.type === 'upload' ? 'bg-blue-100 text-blue-600' :
                            item.type === 'approve' ? 'bg-success/15 text-success' :
                            item.type === 'reject' ? 'bg-destructive/15 text-destructive' :
                            'bg-purple-100 text-purple-600'
                          }`}>
                            {item.type === 'upload' ? <Upload className="w-3 h-3" /> :
                             item.type === 'approve' ? <CheckCircle className="w-3 h-3" /> :
                             item.type === 'reject' ? <XCircle className="w-3 h-3" /> :
                             <Users className="w-3 h-3" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-foreground">{item.message}</span>
                            <span className="text-muted-foreground ml-2">
                              {new Date(item.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      <DashboardFooter eventId={eventId} />
    </AppLayout>
  );
}

// Local stat card component
function StatCard({ icon: Icon, label, value, color, sub, pulse }: {
  icon: any; label: string; value: number; color: string; sub?: string; pulse?: boolean;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className={`text-2xl font-bold text-foreground ${pulse ? 'animate-pulse' : ''}`}>
          {value.toLocaleString()}
        </span>
        {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
      </div>
    </div>
  );
}
