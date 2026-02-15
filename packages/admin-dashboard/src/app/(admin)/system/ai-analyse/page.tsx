'use client';

import { useState } from 'react';
import {
  Bot,
  Play,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  Wrench,
  Clock,
} from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';

interface AnalysisResult {
  summary: string;
  healthScore: number;
  issues: {
    id: string;
    severity: 'critical' | 'warning' | 'info';
    title: string;
    description: string;
    recommendation: string;
    canAutoFix: boolean;
  }[];
  analyzedLogs: number;
  analyzedAt: string;
}

export default function AIAnalysePage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [timeRange, setTimeRange] = useState('24h');
  const [fixingIssue, setFixingIssue] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const res = await api.post<AnalysisResult>('/admin/ai/analyze-logs', {
        timeRange,
      });
      setResult(res.data);
      toast.success('Analyse abgeschlossen');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Analyse fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoFix = async (issueId: string) => {
    setFixingIssue(issueId);
    try {
      await api.post(`/admin/ai/auto-fix/${issueId}`);
      toast.success('Auto-Fix ausgeführt');
      // Remove fixed issue from list
      if (result) {
        setResult({
          ...result,
          issues: result.issues.filter((i) => i.id !== issueId),
        });
      }
    } catch (err: any) {
      toast.error('Auto-Fix fehlgeschlagen');
    } finally {
      setFixingIssue(null);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'border-destructive/30 bg-destructive/100/5';
      case 'warning':
        return 'border-yellow-500/30 bg-warning/5';
      default:
        return 'border-blue-500/30 bg-blue-500/5';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="w-5 h-5 text-destructive" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-warning" />;
      default:
        return <Lightbulb className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-app-fg flex items-center gap-2">
            <Bot className="w-6 h-6 text-app-accent" />
            AI Log Analyse
          </h1>
          <p className="mt-1 text-sm text-app-muted">
            KI-gestützte Fehleranalyse und Empfehlungen
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="rounded-2xl border border-app-border bg-app-card p-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Zeitraum
            </label>
            <div className="flex gap-2">
              {['1h', '6h', '24h', '7d'].map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    timeRange === range
                      ? 'bg-app-accent text-white'
                      : 'bg-app-bg border border-app-border text-app-muted hover:text-app-fg'
                  }`}
                >
                  {range === '1h' ? 'Letzte Stunde' : 
                   range === '6h' ? '6 Stunden' : 
                   range === '24h' ? '24 Stunden' : '7 Tage'}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={handleAnalyze} disabled={loading} className="gap-2">
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {loading ? 'Analysiere...' : 'Analyse starten'}
          </Button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <>
          {/* Summary */}
          <div className="rounded-2xl border border-app-border bg-app-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Zusammenfassung</h2>
              <div
                className={`px-4 py-2 rounded-full text-lg font-bold ${
                  result.healthScore >= 80
                    ? 'bg-success/100/10 text-success'
                    : result.healthScore >= 60
                    ? 'bg-warning/10 text-warning'
                    : 'bg-destructive/100/10 text-destructive'
                }`}
              >
                {result.healthScore}%
              </div>
            </div>
            <p className="text-app-muted">{result.summary}</p>
            <div className="flex gap-4 mt-4 text-xs text-app-muted">
              <span>{result.analyzedLogs} Logs analysiert</span>
              <span>•</span>
              <span>{new Date(result.analyzedAt).toLocaleString('de-DE')}</span>
            </div>
          </div>

          {/* Issues */}
          {result.issues.length > 0 ? (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-app-accent" />
                Erkannte Probleme ({result.issues.length})
              </h2>
              {result.issues.map((issue) => (
                <div
                  key={issue.id}
                  className={`rounded-2xl border p-5 ${getSeverityColor(issue.severity)}`}
                >
                  <div className="flex items-start gap-4">
                    {getSeverityIcon(issue.severity)}
                    <div className="flex-1">
                      <h3 className="font-semibold text-app-fg">{issue.title}</h3>
                      <p className="text-sm text-app-muted mt-1">{issue.description}</p>
                      <div className="mt-3 p-3 rounded-xl bg-app-bg/50 border border-app-border">
                        <p className="text-xs font-medium text-app-muted mb-1">💡 Empfehlung</p>
                        <p className="text-sm">{issue.recommendation}</p>
                      </div>
                      {issue.canAutoFix && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAutoFix(issue.id)}
                          disabled={fixingIssue === issue.id}
                          className="mt-3"
                        >
                          {fixingIssue === issue.id ? (
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          ) : (
                            <Wrench className="w-4 h-4 mr-1" />
                          )}
                          Auto-Fix
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-success/30 bg-success/100/5 p-6 text-center">
              <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-success">Keine Probleme erkannt</h3>
              <p className="text-sm text-app-muted mt-1">
                Das System läuft einwandfrei.
              </p>
            </div>
          )}
        </>
      )}

      {/* Info */}
      {!result && !loading && (
        <div className="rounded-2xl border border-app-border bg-app-card p-6 text-center">
          <Bot className="w-12 h-12 text-app-accent mx-auto mb-3 opacity-50" />
          <h3 className="text-lg font-semibold">Bereit zur Analyse</h3>
          <p className="text-sm text-app-muted mt-1">
            Wähle einen Zeitraum und klicke auf "Analyse starten"
          </p>
        </div>
      )}
    </div>
  );
}
