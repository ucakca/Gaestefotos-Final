'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import api from '@/lib/api';
import { Event as EventType } from '@gaestefotos/shared';
import DashboardFooter from '@/components/DashboardFooter';
import AppLayout from '@/components/AppLayout';
import { FullPageLoader } from '@/components/ui/FullPageLoader';
import { ErrorState } from '@/components/ui/ErrorState';
import StatCard from '@/components/dashboard/StatCard';
import ChartCard from '@/components/dashboard/ChartCard';
import { Image as ImageIcon, Users, CheckCircle, Clock, XCircle, UserCheck, UserX, TrendingUp } from 'lucide-react';
import { CHART_COLORS } from '@/lib/chartColors';

const BarChart = dynamic(() => import('recharts').then(mod => mod.BarChart), { ssr: false });
const Bar = dynamic(() => import('recharts').then(mod => mod.Bar), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false });
const Legend = dynamic(() => import('recharts').then(mod => mod.Legend), { ssr: false });
const LineChart = dynamic(() => import('recharts').then(mod => mod.LineChart), { ssr: false });
const Line = dynamic(() => import('recharts').then(mod => mod.Line), { ssr: false });
const PieChart = dynamic(() => import('recharts').then(mod => mod.PieChart), { ssr: false });
const Pie = dynamic(() => import('recharts').then(mod => mod.Pie), { ssr: false });
const Cell = dynamic(() => import('recharts').then(mod => mod.Cell), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false });

interface Statistics {
  photos: {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
    byStatus: Record<string, number>;
  };
  guests: {
    total: number;
    accepted: number;
    pending: number;
    declined: number;
    byStatus: Record<string, number>;
  };
  uploadTrends: Record<string, { approved: number; pending: number }>;
  categories: Array<{
    id: string;
    name: string;
    photoCount: number;
  }>;
}

export default function StatisticsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [eventId, setEventId] = React.useState<string | null>(null);

  React.useEffect(() => {
    params.then(p => setEventId(p.id));
  }, []);

  const [event, setEvent] = useState<EventType | null>(null);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (eventId) {
      loadEvent();
      loadStatistics();
    }
  }, [eventId]);

  const loadEvent = async () => {
    try {
      const { data } = await api.get(`/events/${eventId}`);
      setEvent(data.event);
    } catch (err) {
      void err;
    }
  };

  const loadStatistics = async () => {
    try {
      const { data } = await api.get(`/events/${eventId}/statistics`);
      setStatistics(data);
    } catch (err) {
      void err;
    } finally {
      setLoading(false);
    }
  };

  if (loading || !eventId) {
    return (
      <AppLayout showBackButton backUrl={`/events/${eventId}/dashboard`}>
        <FullPageLoader label="Lade Statistiken..." />
      </AppLayout>
    );
  }

  if (!statistics) {
    return (
      <AppLayout showBackButton backUrl={`/events/${eventId}/dashboard`}>
        <ErrorState message="Fehler beim Laden der Statistiken" />
      </AppLayout>
    );
  }

  const statusData = [
    { name: 'Freigegeben', value: statistics.photos.approved, color: CHART_COLORS.success },
    { name: 'Ausstehend', value: statistics.photos.pending, color: CHART_COLORS.warning },
    { name: 'Abgelehnt', value: statistics.photos.rejected, color: CHART_COLORS.danger },
  ];

  const guestStatusData = [
    { name: 'Zugesagt', value: statistics.guests.accepted, color: CHART_COLORS.success },
    { name: 'Ausstehend', value: statistics.guests.pending, color: CHART_COLORS.warning },
    { name: 'Abgesagt', value: statistics.guests.declined, color: CHART_COLORS.danger },
  ];

  const trendData = Object.entries(statistics.uploadTrends)
    .map(([date, data]) => ({
      date: new Date(date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
      Freigegeben: data.approved,
      Ausstehend: data.pending,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const categoryData = statistics.categories.map((cat) => ({
    name: cat.name,
    Fotos: cat.photoCount,
  }));

  return (
    <AppLayout showBackButton backUrl={`/events/${eventId}/dashboard`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-foreground mb-2">Statistiken</h1>
          <p className="text-muted-foreground">{event?.title}</p>
        </motion.div>

        {/* Photo Stats */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-foreground mb-4">📸 Foto-Statistiken</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={ImageIcon}
              label="Fotos gesamt"
              value={statistics.photos.total}
              iconColor="primary"
            />
            <StatCard
              icon={CheckCircle}
              label="Freigegeben"
              value={statistics.photos.approved}
              iconColor="success"
            />
            <StatCard
              icon={Clock}
              label="Ausstehend"
              value={statistics.photos.pending}
              iconColor="warning"
            />
            <StatCard
              icon={XCircle}
              label="Abgelehnt"
              value={statistics.photos.rejected}
              iconColor="danger"
            />
          </div>
        </div>

        {/* Guest Stats */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-foreground mb-4">👥 Gäste-Statistiken</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={Users}
              label="Gäste gesamt"
              value={statistics.guests.total}
              iconColor="primary"
            />
            <StatCard
              icon={UserCheck}
              label="Zugesagt"
              value={statistics.guests.accepted}
              iconColor="success"
            />
            <StatCard
              icon={Clock}
              label="Ausstehend"
              value={statistics.guests.pending}
              iconColor="warning"
            />
            <StatCard
              icon={UserX}
              label="Abgesagt"
              value={statistics.guests.declined}
              iconColor="danger"
            />
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Photo Status Pie Chart */}
          <ChartCard title="Foto-Status Verteilung" subtitle="Aktuelle Moderation">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill={CHART_COLORS.info}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Guest Status Pie Chart */}
          <ChartCard title="Gäste-Status Verteilung" subtitle="Zusagen & Absagen">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={guestStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill={CHART_COLORS.info}
                  dataKey="value"
                >
                  {guestStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Upload Trends Line Chart */}
        {trendData.length > 0 && (
          <div className="mb-8">
            <ChartCard 
              title="Upload-Trends" 
              subtitle="Letzte 7 Tage"
            >
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                  <XAxis dataKey="date" stroke={CHART_COLORS.axis} />
                  <YAxis stroke={CHART_COLORS.axis} />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'var(--app-card)',
                      border: '1px solid var(--app-border)',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="Freigegeben" 
                    stroke={CHART_COLORS.success} 
                    strokeWidth={2}
                    dot={{ fill: CHART_COLORS.success, r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="Ausstehend" 
                    stroke={CHART_COLORS.warning} 
                    strokeWidth={2}
                    dot={{ fill: CHART_COLORS.warning, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        )}

        {/* Categories Bar Chart */}
        {categoryData.length > 0 && (
          <div className="mb-8">
            <ChartCard 
              title="Fotos nach Kategorie" 
              subtitle="Verteilung auf Alben"
            >
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                  <XAxis dataKey="name" stroke={CHART_COLORS.axis} />
                  <YAxis stroke={CHART_COLORS.axis} />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'var(--app-card)',
                      border: '1px solid var(--app-border)',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="Fotos" fill={CHART_COLORS.primary} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        )}
      </div>

      <DashboardFooter eventId={eventId!} />
    </AppLayout>
  );
}
