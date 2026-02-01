'use client';

import { useEffect, useState } from 'react';
import { Shield, Clock, AlertTriangle, RefreshCw, Activity } from 'lucide-react';

interface RateLimit {
  name: string;
  key: string;
  windowMs: number;
  max: number;
  description: string;
}

interface RateLimitsData {
  ok: boolean;
  checkedAt: string;
  environment: string;
  devMultiplier: number;
  limits: RateLimit[];
}

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${minutes} Min`;
  const hours = Math.floor(minutes / 60);
  return `${hours} Std`;
}

function getLimitColor(max: number): string {
  if (max >= 1000) return 'bg-green-500';
  if (max >= 100) return 'bg-blue-500';
  if (max >= 20) return 'bg-yellow-500';
  return 'bg-red-500';
}

export default function RateLimitsPage() {
  const [data, setData] = useState<RateLimitsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/ops/rate-limits', { credentials: 'include' });
      if (!res.ok) throw new Error('Fehler beim Laden');
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err?.message || 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <span className="text-red-700">{error}</span>
          <button onClick={fetchData} className="ml-auto text-red-600 hover:text-red-800">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const authLimits = data.limits.filter(l => 
    l.key.includes('auth') || l.key.includes('password') || l.key.includes('2fa') || l.key.includes('sso')
  );
  const uploadLimits = data.limits.filter(l => 
    l.key.includes('photo') || l.key.includes('video')
  );
  const generalLimits = data.limits.filter(l => 
    !authLimits.includes(l) && !uploadLimits.includes(l)
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-600" />
            Rate Limits
          </h1>
          <p className="text-gray-500 mt-1">
            Übersicht über alle aktiven Rate Limits
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Aktualisieren
        </button>
      </div>

      {/* Environment Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
        <Activity className="w-5 h-5 text-blue-600" />
        <div>
          <span className="font-medium text-blue-800">
            Umgebung: {data.environment}
          </span>
          {data.devMultiplier > 1 && (
            <span className="ml-2 text-blue-600 text-sm">
              (Dev-Multiplikator: {data.devMultiplier}x)
            </span>
          )}
        </div>
        <span className="ml-auto text-sm text-blue-600">
          Stand: {new Date(data.checkedAt).toLocaleTimeString('de-DE')}
        </span>
      </div>

      {/* Auth Limits */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <Shield className="w-5 h-5 text-red-500" />
          Authentifizierung
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {authLimits.map(limit => (
            <LimitCard key={limit.key} limit={limit} />
          ))}
        </div>
      </section>

      {/* Upload Limits */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <Activity className="w-5 h-5 text-green-500" />
          Uploads
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {uploadLimits.map(limit => (
            <LimitCard key={limit.key} limit={limit} />
          ))}
        </div>
      </section>

      {/* General Limits */}
      {generalLimits.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-500" />
            Allgemein
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {generalLimits.map(limit => (
              <LimitCard key={limit.key} limit={limit} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function LimitCard({ limit }: { limit: RateLimit }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-medium text-gray-900">{limit.name}</h3>
        <span className={`w-2 h-2 rounded-full ${getLimitColor(limit.max)}`} />
      </div>
      <p className="text-sm text-gray-500 mb-3">{limit.description}</p>
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-1 text-gray-600">
          <Clock className="w-4 h-4" />
          <span>{formatDuration(limit.windowMs)}</span>
        </div>
        <div className="font-mono font-medium text-gray-900">
          {limit.max.toLocaleString('de-DE')} Req
        </div>
      </div>
    </div>
  );
}
