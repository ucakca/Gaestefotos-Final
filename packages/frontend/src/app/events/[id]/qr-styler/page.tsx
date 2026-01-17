'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import AppLayout from '@/components/AppLayout';
import { QRCodeSVG } from 'qrcode.react';
import { Download, ChevronLeft, Image as ImageIcon, Save, FileText, RotateCcw } from 'lucide-react';
import { createRoot } from 'react-dom/client';
import { Button } from '@/components/ui/Button';
import { ColorInput } from '@/components/ui/ColorInput';
import { Input } from '@/components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';

type Format = 'A6' | 'A5';

type TemplateDef = { slug: string; label: string };

const TEMPLATES: TemplateDef[] = [
  { slug: 'minimal-classic', label: 'Minimal Classic' },
  { slug: 'minimal-floral', label: 'Minimal Floral' },
  { slug: 'minimal-modern', label: 'Minimal Modern' },
  { slug: 'elegant-floral', label: 'Elegant Floral' },
];

type Preset = {
  key: string;
  label: string;
  bgColor: string;
  textColor: string;
  accentColor: string;
};

function resolveRootCssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

const PRESETS: Preset[] = [
  {
    key: 'classic-green',
    label: 'Classic Green',
    bgColor: resolveRootCssVar('--app-card', '#ffffff'),
    textColor: resolveRootCssVar('--app-fg', '#111827'),
    accentColor: resolveRootCssVar('--app-accent', '#295B4D'),
  },
  {
    key: 'modern-blue',
    label: 'Modern Blue',
    bgColor: resolveRootCssVar('--app-card', '#ffffff'),
    textColor: resolveRootCssVar('--app-fg', '#111827'),
    accentColor: resolveRootCssVar('--status-info', '#2563eb'),
  },
  { key: 'soft-floral', label: 'Soft Floral', bgColor: '#fbf7f1', textColor: '#2b2b2b', accentColor: '#6c7a5f' },
  { key: 'elegant-rose', label: 'Elegant Rose', bgColor: '#fffaf7', textColor: '#2a2220', accentColor: '#b7798a' },
];

function getDefaultsForTemplate(templateSlug: string) {
  if (templateSlug === 'minimal-modern') {
    return {
      headline: 'Unsere Fotogalerie',
      subline: 'Fotos & Videos sammeln',
      callToAction: 'QR-Code scannen & los geht’s',
      bgColor: resolveRootCssVar('--app-card', '#ffffff'),
      textColor: resolveRootCssVar('--app-fg', '#111827'),
      accentColor: resolveRootCssVar('--status-info', '#2563eb'),
    };
  }
  if (templateSlug === 'elegant-floral') {
    return {
      headline: 'Unsere Fotogalerie',
      subline: 'Teilt eure Fotos mit uns',
      callToAction: 'Einfach scannen & hochladen',
      bgColor: '#fffaf7',
      textColor: '#2a2220',
      accentColor: '#b7798a',
    };
  }
  if (templateSlug === 'minimal-floral') {
    return {
      headline: 'Unsere Fotogalerie',
      subline: 'Teilt eure Fotos mit uns',
      callToAction: 'Einfach scannen & hochladen',
      bgColor: '#fbf7f1',
      textColor: '#2b2b2b',
      accentColor: '#6c7a5f',
    };
  }
  return {
    headline: 'Unsere Fotogalerie',
    subline: 'Fotos & Videos sammeln',
    callToAction: 'QR-Code scannen & los geht’s',
    bgColor: resolveRootCssVar('--app-card', '#ffffff'),
    textColor: resolveRootCssVar('--app-fg', '#111827'),
    accentColor: resolveRootCssVar('--app-accent', '#295B4D'),
  };
}

function clampColor(input: string): string {
  const v = input.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v;
  return resolveRootCssVar('--app-fg', '#000000');
}

function getAttrNumber(el: Element | null, name: string): number | null {
  if (!el) return null;
  const raw = el.getAttribute(name);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function serializeSvg(svg: SVGSVGElement): string {
  const serializer = new XMLSerializer();
  return serializer.serializeToString(svg);
}

async function renderQrToSvgMarkup(value: string): Promise<string> {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-10000px';
  container.style.top = '-10000px';
  container.style.width = '0';
  container.style.height = '0';
  container.style.overflow = 'hidden';
  document.body.appendChild(container);

  const root = createRoot(container);
  root.render(<QRCodeSVG value={value} level="H" includeMargin={true} size={512} />);

  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });

  const svg = container.querySelector('svg');
  const markup = svg ? new XMLSerializer().serializeToString(svg) : '';

  root.unmount();
  container.remove();

  if (!markup) throw new Error('QR konnte nicht gerendert werden');
  return markup;
}

function embedQrIntoTemplateSvg(svgMarkup: string, qrMarkup: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgMarkup, 'image/svg+xml');

  const qrPlaceholder = doc.getElementById('gf:qr');
  if (!qrPlaceholder) return svgMarkup;

  const x = getAttrNumber(qrPlaceholder, 'x') ?? 0;
  const y = getAttrNumber(qrPlaceholder, 'y') ?? 0;
  const w = getAttrNumber(qrPlaceholder, 'width') ?? 0;
  const h = getAttrNumber(qrPlaceholder, 'height') ?? 0;
  if (w <= 0 || h <= 0) return svgMarkup;

  // Keep placeholder border/background, but hide its fill to avoid covering QR.
  if (qrPlaceholder.tagName.toLowerCase() === 'rect') {
    (qrPlaceholder as any).setAttribute('fill', 'transparent');
  }

  const qrDoc = parser.parseFromString(qrMarkup, 'image/svg+xml');
  const qrSvg = qrDoc.documentElement as unknown as SVGSVGElement;

  const embedded = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
  embedded.setAttribute('id', 'gf:qr:embedded');
  embedded.setAttribute('x', String(x));
  embedded.setAttribute('y', String(y));
  embedded.setAttribute('width', String(w));
  embedded.setAttribute('height', String(h));
  embedded.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  const vb = qrSvg.getAttribute('viewBox');
  if (vb) {
    embedded.setAttribute('viewBox', vb);
  }

  // Import inner nodes from QR SVG
  const qrChildren = Array.from(qrSvg.childNodes);
  for (const node of qrChildren) {
    embedded.appendChild(doc.importNode(node, true));
  }

  // Insert right after placeholder
  const parent = qrPlaceholder.parentNode;
  if (parent) {
    parent.insertBefore(embedded, qrPlaceholder.nextSibling);
  }

  return serializeSvg(doc.documentElement as unknown as SVGSVGElement);
}

async function downloadPng(eventId: string, format: Format, svg: string): Promise<void> {
  const res = await fetch(`/api/events/${eventId}/qr/export.png`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ format, svg }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Export fehlgeschlagen (${res.status})`);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `qr-aufsteller-${eventId}-${format}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function downloadPdf(eventId: string, format: Format, svg: string): Promise<void> {
  const res = await fetch(`/api/events/${eventId}/qr/export.pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ format, svg }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Export fehlgeschlagen (${res.status})`);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `qr-aufsteller-${eventId}-${format}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function QrStylerPage({ params }: { params: Promise<{ id: string }> }) {
  const [eventId, setEventId] = React.useState<string | null>(null);

  React.useEffect(() => {
    params.then(p => setEventId(p.id));
  }, []);

  const [format, setFormat] = useState<Format>('A6');
  const [templateSlug, setTemplateSlug] = useState<string>('minimal-classic');
  const [loading, setLoading] = useState(true);
  const [eventSlug, setEventSlug] = useState<string>('');
  const [eventTitle, setEventTitle] = useState<string>('');

  const [headline, setHeadline] = useState('Unsere Fotogalerie');
  const [subline, setSubline] = useState('Fotos & Videos sammeln');
  const [eventName, setEventName] = useState('');
  const [callToAction, setCallToAction] = useState('QR-Code scannen & los geht’s');

  const [bgColor, setBgColor] = useState(() => resolveRootCssVar('--app-card', '#ffffff'));
  const [textColor, setTextColor] = useState(() => resolveRootCssVar('--app-fg', '#111827'));
  const [accentColor, setAccentColor] = useState(() => resolveRootCssVar('--app-accent', '#295B4D'));

  const [templateSvg, setTemplateSvg] = useState<string>('');
  const [qrBox, setQrBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [viewBox, setViewBox] = useState<{ w: number; h: number } | null>(null);

  const [exportingPng, setExportingPng] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const [savingConfig, setSavingConfig] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState<string | null>(null);

  const didLoadConfigRef = useRef(false);
  const autosaveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const loadEvent = async () => {
      try {
        const { data } = await api.get(`/events/${eventId}`);
        const ev = data?.event;
        const slug = typeof ev?.slug === 'string' ? ev.slug : '';
        const title = typeof ev?.title === 'string' ? ev.title : '';

        setEventSlug(slug);
        setEventTitle(title);
        setEventName(title || '');

        // Load saved QR config (best-effort)
        try {
          const saved = await api.get(`/events/${eventId}/qr/config`);
          const cfg = saved?.data?.qrTemplateConfig;
          if (cfg && typeof cfg === 'object') {
            if (typeof cfg.templateSlug === 'string') setTemplateSlug(cfg.templateSlug);
            if (cfg.format === 'A6' || cfg.format === 'A5') setFormat(cfg.format);
            if (typeof cfg.headline === 'string') setHeadline(cfg.headline);
            if (typeof cfg.subline === 'string') setSubline(cfg.subline);
            if (typeof cfg.eventName === 'string') setEventName(cfg.eventName);
            if (typeof cfg.callToAction === 'string') setCallToAction(cfg.callToAction);
            if (typeof cfg.bgColor === 'string') setBgColor(cfg.bgColor);
            if (typeof cfg.textColor === 'string') setTextColor(cfg.textColor);
            if (typeof cfg.accentColor === 'string') setAccentColor(cfg.accentColor);
          }
        } catch {
          // ignore
        }

        didLoadConfigRef.current = true;
      } finally {
        setLoading(false);
      }
    };
    
    if (eventId) loadEvent();
  }, [eventId]);

  useEffect(() => {
    (async () => {
      const url = `/qr-templates/${templateSlug}/${format}.svg`;
      const res = await fetch(url);
      const text = await res.text();
      setTemplateSvg(text);
    })();
  }, [format, templateSlug]);

  const publicUrl = useMemo(() => {
    if (!eventSlug) return '';
    return `${window.location.origin}/e/${eventSlug}`;
  }, [eventSlug]);

  const computedSvg = useMemo(() => {
    if (!templateSvg) return { svg: '', qrBox: null as typeof qrBox, viewBox: null as typeof viewBox };

    const parser = new DOMParser();
    const doc = parser.parseFromString(templateSvg, 'image/svg+xml');
    const svg = doc.documentElement as unknown as SVGSVGElement;

    const vb = svg.getAttribute('viewBox');
    if (vb) {
      const parts = vb.split(/\s+/).map((p) => Number(p));
      if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
        setViewBox({ w: parts[2], h: parts[3] });
      }
    }

    // set colors via CSS custom properties
    const rootStyle = (svg as unknown as Element).getAttribute('style') || '';
    const nextStyle = [
      rootStyle,
      `--gf-bg:${clampColor(bgColor)};`,
      `--gf-text:${clampColor(textColor)};`,
      `--gf-accent:${clampColor(accentColor)};`,
    ]
      .filter(Boolean)
      .join(' ');
    (svg as unknown as Element).setAttribute('style', nextStyle);

    const setText = (id: string, value: string) => {
      const el = doc.getElementById(id);
      if (!el) return;
      el.textContent = value;
    };

    setText('gf:text:headline', headline);
    setText('gf:text:subline', subline);
    setText('gf:text:eventName', eventName);
    setText('gf:text:callToAction', callToAction);

    const qr = doc.getElementById('gf:qr');
    const x = getAttrNumber(qr, 'x');
    const y = getAttrNumber(qr, 'y');
    const w = getAttrNumber(qr, 'width');
    const h = getAttrNumber(qr, 'height');

    const qrData = x != null && y != null && w != null && h != null ? { x, y, w, h } : null;
    setQrBox(qrData);

    return { svg: serializeSvg(svg), qrBox: qrData, viewBox };
  }, [templateSvg, bgColor, textColor, accentColor, headline, subline, eventName, callToAction]);

  const handleResetDefaults = () => {
    const def = getDefaultsForTemplate(templateSlug);
    setHeadline(def.headline);
    setSubline(def.subline);
    setCallToAction(def.callToAction);
    setBgColor(def.bgColor);
    setTextColor(def.textColor);
    setAccentColor(def.accentColor);
  };

  const handleApplyPreset = (presetKey: string) => {
    const p = PRESETS.find((x) => x.key === presetKey);
    if (!p) return;
    setBgColor(p.bgColor);
    setTextColor(p.textColor);
    setAccentColor(p.accentColor);
  };

  // Auto-save (debounced)
  useEffect(() => {
    if (!didLoadConfigRef.current) return;
    if (loading) return;

    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = window.setTimeout(() => {
      handleSaveConfig();
    }, 1000);

    return () => {
      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateSlug, format, headline, subline, eventName, callToAction, bgColor, textColor, accentColor]);

  const downloadSvg = () => {
    if (!computedSvg.svg) return;
    const blob = new Blob([computedSvg.svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qr-template-${eventSlug || eventId}-${format}.svg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPng = async () => {
    if (!computedSvg.svg) return;
    try {
      setExportError(null);
      setExportingPng(true);
      if (!publicUrl) throw new Error('Kein QR-Ziel verfügbar');
      const qrSvg = await renderQrToSvgMarkup(publicUrl);
      const svgWithQr = embedQrIntoTemplateSvg(computedSvg.svg, qrSvg);
      await downloadPng(eventId!, format, svgWithQr);
    } catch (err: any) {
      setExportError(err?.message || 'Export fehlgeschlagen');
    } finally {
      setExportingPng(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!computedSvg.svg) return;
    try {
      setExportError(null);
      setExportingPdf(true);
      if (!publicUrl) throw new Error('Kein QR-Ziel verfügbar');
      const qrSvg = await renderQrToSvgMarkup(publicUrl);
      const svgWithQr = embedQrIntoTemplateSvg(computedSvg.svg, qrSvg);
      await downloadPdf(eventId!, format, svgWithQr);
    } catch (err: any) {
      setExportError(err?.message || 'Export fehlgeschlagen');
    } finally {
      setExportingPdf(false);
    }
  };

  const handleSaveConfig = async () => {
    try {
      setSaveError(null);
      setSaveOk(null);
      setSavingConfig(true);
      await api.put(`/events/${eventId}/qr/config`, {
        templateSlug,
        format,
        headline,
        subline,
        eventName,
        callToAction,
        bgColor,
        textColor,
        accentColor,
      });
      setSaveOk('Gespeichert');
      window.setTimeout(() => setSaveOk(null), 1500);
    } catch (err: any) {
      setSaveError(err?.response?.data?.error || err?.message || 'Speichern fehlgeschlagen');
    } finally {
      setSavingConfig(false);
    }
  };

  const aspect = useMemo(() => {
    if (!viewBox?.w || !viewBox?.h) return 1480 / 1050;
    return viewBox.h / viewBox.w;
  }, [viewBox]);

  const qrOverlayStyle = useMemo(() => {
    if (!qrBox || !viewBox) return null;
    return {
      left: `${(qrBox.x / viewBox.w) * 100}%`,
      top: `${(qrBox.y / viewBox.h) * 100}%`,
      width: `${(qrBox.w / viewBox.w) * 100}%`,
      height: `${(qrBox.h / viewBox.h) * 100}%`,
    };
  }, [qrBox, viewBox]);

  return (
    <AppLayout>
      <div className="min-h-screen bg-app-bg">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Link href={`/events/${eventId}/dashboard`} className="text-app-fg hover:opacity-80 flex items-center gap-2">
                <ChevronLeft className="w-4 h-4" />
                <span>Zurück</span>
              </Link>
              <div className="text-app-muted">/</div>
              <div>
                <div className="text-sm text-app-muted">QR-Aufsteller</div>
                <h1 className="text-xl font-semibold text-app-fg">QR‑Styler</h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={handleSaveConfig}
                className="border border-app-border bg-app-card hover:bg-app-bg"
                disabled={loading || savingConfig}
              >
                <Save className="h-4 w-4" />
                {savingConfig ? 'Speichere…' : saveOk || 'Speichern'}
              </Button>
              <Button
                type="button"
                onClick={handleResetDefaults}
                className="border border-app-border bg-app-card hover:bg-app-bg"
                disabled={loading}
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
              <Button
                type="button"
                onClick={handleDownloadPng}
                variant="primary"
                disabled={!computedSvg.svg || exportingPng}
              >
                <ImageIcon className="h-4 w-4" />
                {exportingPng ? 'Export…' : 'PNG (Print)'}
              </Button>
              <Button
                type="button"
                onClick={handleDownloadPdf}
                className="bg-app-fg text-app-bg hover:opacity-90"
                disabled={!computedSvg.svg || exportingPdf}
              >
                <FileText className="h-4 w-4" />
                {exportingPdf ? 'Export…' : 'PDF (Print)'}
              </Button>
              <Button
                type="button"
                onClick={downloadSvg}
                className="border border-app-border bg-app-card hover:bg-app-bg"
                disabled={!computedSvg.svg}
              >
                <Download className="h-4 w-4" />
                SVG
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 bg-app-card rounded-xl shadow p-4 space-y-4 border border-app-border">
              <div className="text-sm font-semibold text-app-fg">Inhalt</div>

              <div className="space-y-2">
                <label className="text-xs text-app-muted">Vorlage</label>
                <Select value={templateSlug} onValueChange={setTemplateSlug}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATES.map((t) => (
                      <SelectItem key={t.slug} value={t.slug}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-app-muted">Preset</label>
                <Select onValueChange={handleApplyPreset}>
                  <SelectTrigger>
                    <SelectValue placeholder="Preset auswählen…" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRESETS.map((p) => (
                      <SelectItem key={p.key} value={p.key}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-app-muted">Headline</label>
                <Input value={headline} onChange={(e) => setHeadline(e.target.value)} />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-app-muted">Subline</label>
                <Input value={subline} onChange={(e) => setSubline(e.target.value)} />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-app-muted">Eventname</label>
                <Input value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder={eventTitle} />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-app-muted">Call to Action</label>
                <Input value={callToAction} onChange={(e) => setCallToAction(e.target.value)} />
              </div>

              <div className="pt-2 border-t border-app-border" />

              <div className="text-sm font-semibold text-app-fg">Design</div>

              <div className="grid grid-cols-3 gap-3">
                <label className="text-xs text-app-muted">
                  Background
                  <ColorInput value={bgColor} onChange={setBgColor} className="mt-1 w-full" />
                </label>
                <label className="text-xs text-app-muted">
                  Text
                  <ColorInput value={textColor} onChange={setTextColor} className="mt-1 w-full" />
                </label>
                <label className="text-xs text-app-muted">
                  Accent
                  <ColorInput value={accentColor} onChange={setAccentColor} className="mt-1 w-full" />
                </label>
              </div>

              <div className="pt-2 border-t border-app-border" />

              <div className="text-sm font-semibold text-app-fg">Format</div>
              <div className="flex gap-2">
                {(['A6', 'A5'] as const).map((f) => (
                  <Button
                    key={f}
                    type="button"
                    onClick={() => setFormat(f)}
                    variant={format === f ? 'primary' : 'secondary'}
                  >
                    {f}
                  </Button>
                ))}
              </div>

              {saveError && <div className="text-sm text-status-danger">{saveError}</div>}

              <div className="pt-2 border-t border-app-border" />

              <div className="text-sm font-semibold text-app-fg">QR Ziel</div>
              <div className="text-xs text-app-muted break-all">
                {loading ? 'Lade…' : publicUrl || 'Kein Public-Link verfügbar'}
              </div>
            </div>

            <div className="lg:col-span-8">
              <div className="bg-app-card rounded-xl shadow p-4 border border-app-border">
                <div className="text-sm font-semibold text-app-fg mb-4">Vorschau</div>

                <div
                  className="relative w-full overflow-hidden rounded-lg bg-app-bg"
                  style={{ paddingTop: `${aspect * 100}%` }}
                >
                  <div
                    className="absolute inset-0"
                    dangerouslySetInnerHTML={{ __html: computedSvg.svg }}
                  />

                  {qrOverlayStyle && publicUrl && (
                    <div className="absolute" style={qrOverlayStyle}>
                      <div className="w-full h-full bg-app-card p-[6%] rounded-[12px]">
                        <QRCodeSVG value={publicUrl} level="H" includeMargin={true} className="w-full h-full" />
                      </div>
                    </div>
                  )}
                </div>

                {exportError && <div className="mt-3 text-sm text-status-danger">{exportError}</div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
