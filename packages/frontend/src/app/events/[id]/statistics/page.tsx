'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import api from '@/lib/api';
import { Event as EventType } from '@gaestefotos/shared';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import DashboardFooter from '@/components/DashboardFooter';
import AppLayout from '@/components/AppLayout';
import { FullPageLoader } from '@/components/ui/FullPageLoader';
import { ErrorState } from '@/components/ui/ErrorState';

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

const STATUS_COLORS = {
  success: 'var(--status-success)',
  warning: 'var(--status-warning)',
  danger: 'var(--status-danger)',
  info: 'var(--status-info)',
} as const;

const COLORS = [STATUS_COLORS.success, 'var(--app-accent)', 'var(--app-bg)', STATUS_COLORS.info];

export default function StatisticsPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [event, setEvent] = useState<EventType | null>(null);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvent();
    loadStatistics();
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

  if (loading) {
    return <FullPageLoader label="Laden..." />;
  }

  if (!statistics) {
    return <ErrorState message="Fehler beim Laden der Statistiken" />;
  }

  // Prepare chart data
  const statusData = [
    { name: 'Freigegeben', value: statistics.photos.approved, color: STATUS_COLORS.success },
    { name: 'Ausstehend', value: statistics.photos.pending, color: STATUS_COLORS.warning },
    { name: 'Abgelehnt', value: statistics.photos.rejected, color: STATUS_COLORS.danger },
  ];

  const guestStatusData = [
    { name: 'Zugesagt', value: statistics.guests.accepted, color: STATUS_COLORS.success },
    { name: 'Ausstehend', value: statistics.guests.pending, color: STATUS_COLORS.warning },
    { name: 'Abgesagt', value: statistics.guests.declined, color: STATUS_COLORS.danger },
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
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-2xl font-bold text-app-fg mb-2">
            Statistiken
          </h1>
          <p className="text-app-muted">{event?.title}</p>
        </motion.div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-app-card border border-app-border rounded-lg shadow p-6"
          >
            <h3 className="text-sm font-medium text-app-muted mb-2">Fotos gesamt</h3>
            <p className="text-3xl font-bold text-app-fg">{statistics.photos.total}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-app-card border border-app-border rounded-lg shadow p-6"
          >
            <h3 className="text-sm font-medium text-app-muted mb-2">Freigegeben</h3>
            <p className="text-3xl font-bold text-status-success">{statistics.photos.approved}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-app-card border border-app-border rounded-lg shadow p-6"
          >
            <h3 className="text-sm font-medium text-app-muted mb-2">Gäste gesamt</h3>
            <p className="text-3xl font-bold text-app-fg">{statistics.guests.total}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-app-card border border-app-border rounded-lg shadow p-6"
          >
            <h3 className="text-sm font-medium text-app-muted mb-2">Zugesagt</h3>
            <p className="text-3xl font-bold text-status-success">{statistics.guests.accepted}</p>
          </motion.div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Photo Status Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-app-card border border-app-border rounded-lg shadow p-6"
          >
            <h2 className="text-xl font-semibold mb-4 text-app-fg">Foto-Status</h2>
            <PieChart width={400} height={300}>
              <Pie
                data={statusData}
                cx={200}
                cy={150}
                labelLine={false}
                label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                outerRadius={80}
                fill={COLORS[3]}
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </motion.div>

          {/* Guest Status Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-app-card border border-app-border rounded-lg shadow p-6"
          >
            <h2 className="text-xl font-semibold mb-4 text-app-fg">Gäste-Status</h2>
            <PieChart width={400} height={300}>
              <Pie
                data={guestStatusData}
                cx={200}
                cy={150}
                labelLine={false}
                label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                outerRadius={80}
                fill={COLORS[3]}
                dataKey="value"
              >
                {guestStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </motion.div>

          {/* Upload Trends */}
          {trendData.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-app-card border border-app-border rounded-lg shadow p-6 lg:col-span-2"
            >
              <h2 className="text-xl font-semibold mb-4 text-app-fg">Upload-Trends (letzte 7 Tage)</h2>
              <LineChart width={800} height={300} data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="Freigegeben" stroke={STATUS_COLORS.success} />
                <Line type="monotone" dataKey="Ausstehend" stroke={STATUS_COLORS.warning} />
              </LineChart>
            </motion.div>
          )}

          {/* Categories */}
          {categoryData.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-app-card border border-app-border rounded-lg shadow p-6 lg:col-span-2"
            >
              <h2 className="text-xl font-semibold mb-4 text-app-fg">Fotos nach Kategorie</h2>
              <BarChart width={800} height={300} data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="Fotos" fill={STATUS_COLORS.success} />
              </BarChart>
            </motion.div>
          )}
        </div>
      </div>

      {/* Sticky Footer Navigation */}
      <DashboardFooter eventId={eventId} />
      
      {/* Padding for footer */}
      <div className="h-20" />
    </AppLayout>
  );
}















