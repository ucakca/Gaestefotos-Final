'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import {
  Upload,
  Sparkles,
  FileSearch,
  Star,
  ExternalLink,
  Loader2,
  Copy,
  Check,
  Wand2,
  BookOpen,
  Image as ImageIcon,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Types ──────────────────────────────────────────────────

interface Img2PromptResult {
  clipTags: string;
  synthesizedPrompt: string;
  negativePrompt: string;
  suggestedStyle: string;
  suggestedStrength: number;
  metadata: { clipModel: string; llmModel: string; durationMs: number; costEstimateCents: number };
}

interface MetadataResult {
  filename: string;
  basic: { width: number; height: number; format: string; space: string; channels: number; hasAlpha: boolean; fileSize: number; megapixels: number };
  exif: Record<string, any> | null;
  aiGeneration: { source: string; prompt?: string; negativePrompt?: string; model?: string; steps?: number; cfgScale?: number; seed?: number; software?: string; rawText?: string } | null;
  pngChunks: Record<string, string> | null;
  xmp: Record<string, any> | null;
  icc: { description?: string } | null;
}

interface QualityResult {
  score: number | null;
  analysis?: {
    structure?: { score: number; comment: string };
    keywords?: { score: number; comment: string; missing?: string[] };
    negativePrompt?: { score: number; comment: string; missing?: string[] };
    strengthFit?: { score: number; comment: string };
    facePreservation?: { score: number; comment: string; missing?: string[] };
  };
  optimizedPrompt?: string;
  optimizedNegativePrompt?: string;
  suggestions?: string[];
  rawAnalysis?: string;
}

interface Resource { name: string; url: string; type: string; description: string }

interface PatternData {
  qualityBoosters: { title: string; keywords: string[] };
  negativePrompts: { title: string; keywords: string[] };
  facePreservation: { title: string; keywords: string[] };
  styles: { title: string; items: { name: string; keywords: string[] }[] };
  strengthGuide: { title: string; items: { range: string; useCase: string }[] };
}

// ─── Tab Components ─────────────────────────────────────────

type TabId = 'img2prompt' | 'metadata' | 'quality' | 'resources';

const TABS: { id: TabId; label: string; icon: any }[] = [
  { id: 'img2prompt', label: 'Image → Prompt', icon: Wand2 },
  { id: 'metadata', label: 'EXIF / Metadata', icon: FileSearch },
  { id: 'quality', label: 'Prompt-Check', icon: Star },
  { id: 'resources', label: 'Ressourcen', icon: BookOpen },
];

// ─── Helper: Copy to Clipboard ──────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); toast.success('Kopiert!'); }}
      className="p-1.5 rounded-md hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
      title="Kopieren"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

// ─── Image Upload Area ──────────────────────────────────────

function ImageUploadArea({ onUpload, loading }: { onUpload: (file: File) => void; loading: boolean }) {
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error('Nur Bilddateien erlaubt'); return; }
    setPreview(URL.createObjectURL(file));
    onUpload(file);
  };

  return (
    <div
      className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer
        ${dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}
        ${loading ? 'opacity-60 pointer-events-none' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
      onClick={() => { const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'; input.onchange = (e: any) => { if (e.target.files[0]) handleFile(e.target.files[0]); }; input.click(); }}
    >
      {loading ? (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Analysiere Bild...</p>
        </div>
      ) : preview ? (
        <div className="flex flex-col items-center gap-3">
          <img src={preview} alt="Preview" className="w-24 h-24 object-cover rounded-lg" />
          <p className="text-xs text-muted-foreground">Klicke oder ziehe ein neues Bild hierher</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <Upload className="w-8 h-8 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">Bild hochladen</p>
          <p className="text-xs text-muted-foreground">Ziehe ein Bild hierher oder klicke zum Auswählen</p>
          <p className="text-xs text-muted-foreground/60">PNG, JPEG, WebP — max. 20MB</p>
        </div>
      )}
    </div>
  );
}

// ─── Score Badge ────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 8 ? 'bg-green-500' : score >= 6 ? 'bg-yellow-500' : score >= 4 ? 'bg-orange-500' : 'bg-red-500';
  return (
    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${color} text-white text-sm font-bold`}>
      {score}
    </span>
  );
}

// ─── Tab: Image to Prompt ───────────────────────────────────

function Img2PromptTab() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Img2PromptResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    setLoading(true); setError(null); setResult(null);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await api.post('/admin/prompt-analyzer/img2prompt', formData, {
        headers: { 'Content-Type': undefined },
        timeout: 120000,
      });
      setResult(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Analyse fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <ImageUploadArea onUpload={handleUpload} loading={loading} />
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}
      {result && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-card border border-border space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> Synthetisierter Prompt</h3>
              <CopyButton text={result.synthesizedPrompt} />
            </div>
            <p className="text-sm text-foreground bg-muted/30 p-3 rounded-lg font-mono leading-relaxed">{result.synthesizedPrompt}</p>
          </div>

          <div className="p-4 rounded-xl bg-card border border-border space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Negative Prompt</h3>
              <CopyButton text={result.negativePrompt} />
            </div>
            <p className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg font-mono">{result.negativePrompt}</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-muted/30 text-center">
              <p className="text-xs text-muted-foreground">Stil</p>
              <p className="text-sm font-medium mt-1">{result.suggestedStyle}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 text-center">
              <p className="text-xs text-muted-foreground">Strength</p>
              <p className="text-sm font-medium mt-1">{result.suggestedStrength}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 text-center">
              <p className="text-xs text-muted-foreground">Dauer</p>
              <p className="text-sm font-medium mt-1">{(result.metadata.durationMs / 1000).toFixed(1)}s</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 text-center">
              <p className="text-xs text-muted-foreground">Kosten</p>
              <p className="text-sm font-medium mt-1">~${(result.metadata.costEstimateCents / 100).toFixed(3)}</p>
            </div>
          </div>

          <details className="group">
            <summary className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground">
              <ChevronRight className="w-4 h-4 group-open:rotate-90 transition-transform" /> CLIP Tags (Rohdaten)
            </summary>
            <div className="mt-2 p-3 rounded-lg bg-muted/20 text-xs font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
              {result.clipTags}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Metadata Reader ───────────────────────────────────

function MetadataTab() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MetadataResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    setLoading(true); setError(null); setResult(null);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await api.post('/admin/prompt-analyzer/metadata', formData, {
        headers: { 'Content-Type': undefined },
        timeout: 30000,
      });
      setResult(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Metadaten-Extraktion fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <ImageUploadArea onUpload={handleUpload} loading={loading} />
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}
      {result && (
        <div className="space-y-4">
          {/* Basic Info */}
          <div className="p-4 rounded-xl bg-card border border-border space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Basis-Info</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2 rounded bg-muted/30"><span className="text-muted-foreground">Datei:</span> {result.filename}</div>
              <div className="p-2 rounded bg-muted/30"><span className="text-muted-foreground">Größe:</span> {result.basic.width}×{result.basic.height}</div>
              <div className="p-2 rounded bg-muted/30"><span className="text-muted-foreground">Format:</span> {result.basic.format.toUpperCase()}</div>
              <div className="p-2 rounded bg-muted/30"><span className="text-muted-foreground">MP:</span> {result.basic.megapixels}</div>
              <div className="p-2 rounded bg-muted/30"><span className="text-muted-foreground">Farbraum:</span> {result.basic.space}</div>
              <div className="p-2 rounded bg-muted/30"><span className="text-muted-foreground">Kanäle:</span> {result.basic.channels}</div>
              <div className="p-2 rounded bg-muted/30"><span className="text-muted-foreground">Alpha:</span> {result.basic.hasAlpha ? 'Ja' : 'Nein'}</div>
              <div className="p-2 rounded bg-muted/30"><span className="text-muted-foreground">Bytes:</span> {(result.basic.fileSize / 1024).toFixed(0)} KB</div>
            </div>
          </div>

          {/* AI Generation Parameters */}
          {result.aiGeneration && (
            <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/20 space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-green-600">
                <Sparkles className="w-4 h-4" /> AI-Generierungs-Parameter erkannt!
                <span className="text-xs font-normal bg-green-500/10 px-2 py-0.5 rounded-full">{result.aiGeneration.source}</span>
              </h3>
              {result.aiGeneration.prompt && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Prompt</span>
                    <CopyButton text={result.aiGeneration.prompt} />
                  </div>
                  <p className="text-sm bg-muted/30 p-3 rounded-lg font-mono">{result.aiGeneration.prompt}</p>
                </div>
              )}
              {result.aiGeneration.negativePrompt && (
                <div>
                  <span className="text-xs text-muted-foreground">Negative Prompt</span>
                  <p className="text-xs bg-muted/30 p-2 rounded-lg font-mono mt-1">{result.aiGeneration.negativePrompt}</p>
                </div>
              )}
              <div className="flex flex-wrap gap-2 text-xs">
                {result.aiGeneration.model && <span className="px-2 py-1 rounded bg-muted/40">Model: {result.aiGeneration.model}</span>}
                {result.aiGeneration.steps && <span className="px-2 py-1 rounded bg-muted/40">Steps: {result.aiGeneration.steps}</span>}
                {result.aiGeneration.cfgScale && <span className="px-2 py-1 rounded bg-muted/40">CFG: {result.aiGeneration.cfgScale}</span>}
                {result.aiGeneration.seed && <span className="px-2 py-1 rounded bg-muted/40">Seed: {result.aiGeneration.seed}</span>}
                {result.aiGeneration.software && <span className="px-2 py-1 rounded bg-muted/40">Software: {result.aiGeneration.software}</span>}
              </div>
            </div>
          )}

          {/* EXIF Data */}
          {result.exif && Object.keys(result.exif).length > 0 && (
            <details className="group">
              <summary className="flex items-center gap-2 cursor-pointer text-sm font-medium text-foreground hover:text-primary">
                <ChevronRight className="w-4 h-4 group-open:rotate-90 transition-transform" /> EXIF-Daten ({Object.keys(result.exif).length} Felder)
              </summary>
              <div className="mt-2 p-3 rounded-lg bg-muted/20 text-xs font-mono max-h-64 overflow-y-auto space-y-1">
                {Object.entries(result.exif).map(([key, value]) => (
                  <div key={key} className="flex gap-2">
                    <span className="text-muted-foreground min-w-[140px] shrink-0">{key}:</span>
                    <span className="break-all">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                  </div>
                ))}
              </div>
            </details>
          )}

          {/* PNG Chunks */}
          {result.pngChunks && (
            <details className="group">
              <summary className="flex items-center gap-2 cursor-pointer text-sm font-medium text-foreground hover:text-primary">
                <ChevronRight className="w-4 h-4 group-open:rotate-90 transition-transform" /> PNG Chunks ({Object.keys(result.pngChunks).length})
              </summary>
              <div className="mt-2 space-y-2">
                {Object.entries(result.pngChunks).map(([key, value]) => (
                  <div key={key} className="p-2 rounded-lg bg-muted/20">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium">{key}</span>
                      <CopyButton text={value} />
                    </div>
                    <p className="text-xs font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">{value.substring(0, 2000)}</p>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Prompt Quality Check ──────────────────────────────

function QualityCheckTab() {
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [strength, setStrength] = useState('0.65');
  const [targetEffect, setTargetEffect] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QualityResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCheck = async () => {
    if (!prompt.trim()) { toast.error('Bitte einen Prompt eingeben'); return; }
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await api.post('/admin/prompt-analyzer/quality-check', {
        prompt: prompt.trim(),
        negativePrompt: negativePrompt.trim() || undefined,
        strength: parseFloat(strength) || undefined,
        targetEffect: targetEffect.trim() || undefined,
      });
      setResult(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Check fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Prompt</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full mt-1 p-3 rounded-lg bg-muted/30 border border-border text-sm font-mono min-h-[80px] resize-y focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="oil painting style, thick brushstrokes, rich colors..."
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Negative Prompt (optional)</label>
          <textarea
            value={negativePrompt}
            onChange={(e) => setNegativePrompt(e.target.value)}
            className="w-full mt-1 p-3 rounded-lg bg-muted/30 border border-border text-sm font-mono min-h-[50px] resize-y focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="deformed, blurry, bad anatomy..."
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Strength</label>
            <input type="number" step="0.05" min="0" max="1" value={strength}
              onChange={(e) => setStrength(e.target.value)}
              className="w-full mt-1 p-2.5 rounded-lg bg-muted/30 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Ziel-Effekt (optional)</label>
            <input type="text" value={targetEffect}
              onChange={(e) => setTargetEffect(e.target.value)}
              className="w-full mt-1 p-2.5 rounded-lg bg-muted/30 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="z.B. oil-painting, cartoon, ghibli" />
          </div>
        </div>
        <button
          onClick={handleCheck}
          disabled={loading || !prompt.trim()}
          className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}
          {loading ? 'Analysiere...' : 'Prompt analysieren'}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          {/* Overall Score */}
          {result.score !== null && (
            <div className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border">
              <ScoreBadge score={result.score} />
              <div>
                <p className="text-sm font-semibold">Gesamt-Score: {result.score}/10</p>
                <p className="text-xs text-muted-foreground">
                  {result.score >= 8 ? 'Sehr gut!' : result.score >= 6 ? 'Gut, kleine Optimierungen möglich' : result.score >= 4 ? 'Verbesserungswürdig' : 'Grundlegende Probleme'}
                </p>
              </div>
            </div>
          )}

          {/* Detail Scores */}
          {result.analysis && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(result.analysis).map(([key, data]) => {
                const d = data as { score: number; comment: string; missing?: string[] };
                return (
                <div key={key} className="p-3 rounded-lg bg-muted/20 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                    {d.score && <ScoreBadge score={d.score} />}
                  </div>
                  <p className="text-xs text-muted-foreground">{d.comment}</p>
                  {d.missing && d.missing.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {d.missing.map((kw: string) => (
                        <span key={kw} className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-600 font-mono">{kw}</span>
                      ))}
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          )}

          {/* Optimized Prompt */}
          {result.optimizedPrompt && (
            <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/20 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-green-600 flex items-center gap-2"><Zap className="w-4 h-4" /> Optimierter Prompt</h3>
                <CopyButton text={result.optimizedPrompt} />
              </div>
              <p className="text-sm bg-muted/30 p-3 rounded-lg font-mono leading-relaxed">{result.optimizedPrompt}</p>
            </div>
          )}
          {result.optimizedNegativePrompt && (
            <div className="p-3 rounded-lg bg-muted/20 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">Optimierter Negative Prompt</span>
                <CopyButton text={result.optimizedNegativePrompt} />
              </div>
              <p className="text-xs font-mono bg-muted/30 p-2 rounded">{result.optimizedNegativePrompt}</p>
            </div>
          )}

          {/* Suggestions */}
          {result.suggestions && result.suggestions.length > 0 && (
            <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 space-y-2">
              <h3 className="text-xs font-semibold text-blue-600">Verbesserungsvorschläge</h3>
              <ul className="space-y-1">
                {result.suggestions.map((s, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex gap-2">
                    <span className="text-blue-500 shrink-0">•</span> {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.rawAnalysis && !result.analysis && (
            <div className="p-3 rounded-lg bg-muted/20 text-xs font-mono whitespace-pre-wrap">{result.rawAnalysis}</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Resources & Patterns ──────────────────────────────

function ResourcesTab() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [patterns, setPatterns] = useState<PatternData | null>(null);

  useEffect(() => {
    api.get('/admin/prompt-analyzer/resources').then(r => setResources(r.data.resources)).catch(() => {});
    api.get('/admin/prompt-analyzer/patterns').then(r => setPatterns(r.data.patterns)).catch(() => {});
  }, []);

  return (
    <div className="space-y-8">
      {/* Community Links */}
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><ExternalLink className="w-4 h-4" /> Prompt Communities & Quellen</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {resources.map((r) => (
            <a key={r.url} href={`https://${r.url}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border hover:border-primary/30 hover:shadow-sm transition-all group">
              <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{r.name}</p>
                <p className="text-xs text-muted-foreground truncate">{r.description}</p>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground shrink-0">{r.type}</span>
            </a>
          ))}
        </div>
      </div>

      {/* Patterns Cheat Sheet */}
      {patterns && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> Prompt-Patterns Cheat-Sheet</h3>

          {/* Quality Boosters */}
          <div className="p-4 rounded-xl bg-card border border-border space-y-2">
            <h4 className="text-xs font-semibold text-green-600">{patterns.qualityBoosters.title}</h4>
            <div className="flex flex-wrap gap-1.5">
              {patterns.qualityBoosters.keywords.map(kw => (
                <button key={kw} onClick={() => { navigator.clipboard.writeText(kw); toast.success(`"${kw}" kopiert`); }}
                  className="text-xs px-2 py-1 rounded-md bg-green-500/10 text-green-700 hover:bg-green-500/20 transition-colors font-mono cursor-pointer">{kw}</button>
              ))}
            </div>
          </div>

          {/* Negative Prompts */}
          <div className="p-4 rounded-xl bg-card border border-border space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-red-600">{patterns.negativePrompts.title}</h4>
              <CopyButton text={patterns.negativePrompts.keywords.join(', ')} />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {patterns.negativePrompts.keywords.map(kw => (
                <span key={kw} className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-600 font-mono">{kw}</span>
              ))}
            </div>
          </div>

          {/* Face Preservation */}
          <div className="p-4 rounded-xl bg-card border border-border space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-blue-600">{patterns.facePreservation.title}</h4>
              <CopyButton text={patterns.facePreservation.keywords.join(', ')} />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {patterns.facePreservation.keywords.map(kw => (
                <span key={kw} className="text-xs px-2 py-1 rounded-md bg-blue-500/10 text-blue-700 font-mono">{kw}</span>
              ))}
            </div>
          </div>

          {/* Style Patterns */}
          <div className="p-4 rounded-xl bg-card border border-border space-y-3">
            <h4 className="text-xs font-semibold text-purple-600">{patterns.styles.title}</h4>
            <div className="space-y-2">
              {patterns.styles.items.map(s => (
                <div key={s.name} className="flex items-start gap-3">
                  <span className="text-xs font-medium text-foreground min-w-[100px] shrink-0 pt-0.5">{s.name}</span>
                  <div className="flex flex-wrap gap-1">
                    {s.keywords.map(kw => (
                      <button key={kw} onClick={() => { navigator.clipboard.writeText(kw); toast.success(`"${kw}" kopiert`); }}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 cursor-pointer font-mono">{kw}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Strength Guide */}
          <div className="p-4 rounded-xl bg-card border border-border space-y-2">
            <h4 className="text-xs font-semibold text-orange-600">{patterns.strengthGuide.title}</h4>
            <div className="space-y-1.5">
              {patterns.strengthGuide.items.map(item => (
                <div key={item.range} className="flex items-center gap-3 text-xs">
                  <span className="font-mono font-medium text-foreground min-w-[60px]">{item.range}</span>
                  <span className="text-muted-foreground">{item.useCase}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────

export default function PromptAnalyzerPage() {
  const [activeTab, setActiveTab] = useState<TabId>('img2prompt');

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-primary" /> Prompt Analyzer
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Bilder analysieren, Prompts rekonstruieren, Qualität prüfen — alles an einem Ort.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 rounded-xl bg-muted/30 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap
              ${activeTab === tab.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'img2prompt' && <Img2PromptTab />}
      {activeTab === 'metadata' && <MetadataTab />}
      {activeTab === 'quality' && <QualityCheckTab />}
      {activeTab === 'resources' && <ResourcesTab />}
    </div>
  );
}
