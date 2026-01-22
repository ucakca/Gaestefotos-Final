'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, Users, Calendar, Image } from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface Analytics {
  topEventsByPhotos: Array<{
    id: string;
    title: string;
    slug: string;
    dateTime: string;
    host: {
      name: string;
      email: string;
    };
    _count: {
      photos: number;
      guests: number;
      videos: number;
    };
  }>;
  topEventsByGuests: Array<{
    id: string;
    title: string;
    slug: string;
    dateTime: string;
    _count: {
      photos: number;
      guests: number;
    };
  }>;
  topHosts: Array<{
    id: string;
    email: string;
    name: string;
    role: string;
    createdAt: string;
    _count: {
      events: number;
    };
  }>;
  dailyActivity: Array<{
    date: string;
    photos: number;
    events: number;
  }>;
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('admin_token');
      const res = await fetch('/api/admin/dashboard/analytics', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setAnalytics(data.analytics);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Lädt Analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="p-12 text-center text-gray-500">
          Keine Analytics verfügbar
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
        <p className="mt-2 text-gray-600">Statistiken und Trends der Plattform</p>
      </div>

      {/* Top Events by Photos */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Image size={24} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Top Events nach Fotos</h2>
              <p className="text-sm text-gray-600">Events mit den meisten hochgeladenen Fotos</p>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Host</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Fotos</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Gäste</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {analytics.topEventsByPhotos.map((event) => (
                <tr key={event.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-gray-900">{event.title}</div>
                      <div className="text-sm text-gray-500">/{event.slug}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{event.host.name}</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-lg font-semibold text-blue-600">{event._count.photos}</span>
                  </td>
                  <td className="px-6 py-4 text-right text-gray-600">
                    {event._count.guests}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Events by Guests */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users size={24} className="text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Top Events nach Gästen</h2>
              <p className="text-sm text-gray-600">Events mit den meisten Teilnehmern</p>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Gäste</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Fotos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {analytics.topEventsByGuests.map((event) => (
                <tr key={event.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-gray-900">{event.title}</div>
                      <div className="text-sm text-gray-500">/{event.slug}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-lg font-semibold text-green-600">{event._count.guests}</span>
                  </td>
                  <td className="px-6 py-4 text-right text-gray-600">
                    {event._count.photos}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Hosts */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp size={24} className="text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Top Hosts</h2>
              <p className="text-sm text-gray-600">Hosts mit den meisten Events</p>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Host</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rolle</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Events</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {analytics.topHosts.map((host) => (
                <tr key={host.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-gray-900">{host.name}</div>
                      <div className="text-sm text-gray-500">{host.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {host.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-lg font-semibold text-purple-600">{host._count.events}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Daily Activity Chart */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Calendar size={24} className="text-orange-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Tägliche Aktivität (letzte 30 Tage)</h2>
              <p className="text-sm text-gray-600">Uploads und Events pro Tag</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics.dailyActivity}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(value) => new Date(value).toLocaleDateString('de-DE', { month: 'short', day: 'numeric' })}
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
              />
              <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
              <Tooltip 
                labelFormatter={(value) => new Date(value).toLocaleDateString('de-DE')}
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="photos" 
                stroke="#3b82f6" 
                strokeWidth={2}
                name="Fotos"
                dot={{ fill: '#3b82f6', r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line 
                type="monotone" 
                dataKey="events" 
                stroke="#10b981" 
                strokeWidth={2}
                name="Events"
                dot={{ fill: '#10b981', r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Events Bar Chart */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <TrendingUp size={24} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Event Performance</h2>
              <p className="text-sm text-gray-600">Fotos vs. Gäste pro Event</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={analytics.topEventsByPhotos.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="title" 
                angle={-45}
                textAnchor="end"
                height={100}
                stroke="#6b7280"
                style={{ fontSize: '11px' }}
              />
              <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
              />
              <Legend />
              <Bar dataKey="_count.photos" fill="#3b82f6" name="Fotos" radius={[8, 8, 0, 0]} />
              <Bar dataKey="_count.guests" fill="#10b981" name="Gäste" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
