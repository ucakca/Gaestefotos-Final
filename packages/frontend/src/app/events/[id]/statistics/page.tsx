'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import api from '@/lib/api';
import { Event as EventType } from '@gaestefotos/shared';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import DashboardFooter from '@/components/DashboardFooter';
import AppLayout from '@/components/AppLayout';

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

const COLORS = ['#295B4D', '#EAA48F', '#F9F5F2', '#8884d8'];

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
      console.error('Fehler beim Laden des Events:', err);
    }
  };

  const loadStatistics = async () => {
    try {
      const { data } = await api.get(`/events/${eventId}/statistics`);
      setStatistics(data);
    } catch (err) {
      console.error('Fehler beim Laden der Statistiken:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Laden...</div>
      </div>
    );
  }

  if (!statistics) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600">Fehler beim Laden der Statistiken</div>
      </div>
    );
  }

  // Prepare chart data
  const statusData = [
    { name: 'Freigegeben', value: statistics.photos.approved, color: '#10b981' },
    { name: 'Ausstehend', value: statistics.photos.pending, color: '#f59e0b' },
    { name: 'Abgelehnt', value: statistics.photos.rejected, color: '#ef4444' },
  ];

  const guestStatusData = [
    { name: 'Zugesagt', value: statistics.guests.accepted, color: '#10b981' },
    { name: 'Ausstehend', value: statistics.guests.pending, color: '#f59e0b' },
    { name: 'Abgesagt', value: statistics.guests.declined, color: '#ef4444' },
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Statistiken
          </h1>
          <p className="text-gray-600">{event?.title}</p>
        </motion.div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow p-6"
          >
            <h3 className="text-sm font-medium text-gray-500 mb-2">Fotos gesamt</h3>
            <p className="text-3xl font-bold text-gray-900">{statistics.photos.total}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-lg shadow p-6"
          >
            <h3 className="text-sm font-medium text-gray-500 mb-2">Freigegeben</h3>
            <p className="text-3xl font-bold text-green-600">{statistics.photos.approved}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-lg shadow p-6"
          >
            <h3 className="text-sm font-medium text-gray-500 mb-2">Gäste gesamt</h3>
            <p className="text-3xl font-bold text-gray-900">{statistics.guests.total}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-lg shadow p-6"
          >
            <h3 className="text-sm font-medium text-gray-500 mb-2">Zugesagt</h3>
            <p className="text-3xl font-bold text-green-600">{statistics.guests.accepted}</p>
          </motion.div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Photo Status Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow p-6"
          >
            <h2 className="text-xl font-semibold mb-4">Foto-Status</h2>
            <PieChart width={400} height={300}>
              <Pie
                data={statusData}
                cx={200}
                cy={150}
                labelLine={false}
                label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
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
            className="bg-white rounded-lg shadow p-6"
          >
            <h2 className="text-xl font-semibold mb-4">Gäste-Status</h2>
            <PieChart width={400} height={300}>
              <Pie
                data={guestStatusData}
                cx={200}
                cy={150}
                labelLine={false}
                label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
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
              className="bg-white rounded-lg shadow p-6 lg:col-span-2"
            >
              <h2 className="text-xl font-semibold mb-4">Upload-Trends (letzte 7 Tage)</h2>
              <LineChart width={800} height={300} data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="Freigegeben" stroke="#10b981" />
                <Line type="monotone" dataKey="Ausstehend" stroke="#f59e0b" />
              </LineChart>
            </motion.div>
          )}

          {/* Categories */}
          {categoryData.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-lg shadow p-6 lg:col-span-2"
            >
              <h2 className="text-xl font-semibold mb-4">Fotos nach Kategorie</h2>
              <BarChart width={800} height={300} data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="Fotos" fill="#295B4D" />
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















