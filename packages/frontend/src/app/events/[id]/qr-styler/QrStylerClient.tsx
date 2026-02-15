'use client';

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
// framer-motion removed to fix hydration/removeChild errors
import api from '@/lib/api';
import AppLayout from '@/components/AppLayout';
import { 
  ChevronLeft, RotateCcw, Download, FileImage, FileText, 
  Undo2, Redo2, Check, AlertCircle, Smartphone, Monitor,
  Palette, Type, QrCode, Share2, Loader2, Sparkles, Image,
  ChevronDown, Eye, Settings2, ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { BottomSheet } from '@/components/ui/BottomSheet';

import { sanitizeSvg } from '@/lib/sanitize';
import dynamic from 'next/dynamic';

const StyledQRCode = dynamic(() => import('@/components/qr-designer/StyledQRCode'), { 
  ssr: false,
  loading: () => <div className="w-full h-full bg-muted animate-pulse rounded" />
});

const SvgRenderer = dynamic(() => import('@/components/qr-designer/SvgRenderer'), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-muted animate-pulse" />
});

const ShareWizardModal = dynamic(() => import('@/components/qr-designer/ShareWizardModal'), {
  ssr: false,
});

const LogoUpload = dynamic(() => import('@/components/qr-designer/LogoUpload'), {
  ssr: false,
});

// Import for export functionality
import { generateQRSvgString } from '@/components/qr-designer/StyledQRCode';

// QR code styling will be imported dynamically when needed for export

// ============================================================================
// Types
// ============================================================================
type Format = 'A6' | 'A5' | 'story' | 'square';
type QRDotStyle = 'square' | 'rounded' | 'dots' | 'classy' | 'classy-rounded';
type QRCornerStyle = 'square' | 'extra-rounded' | 'dot';
type ActivePanel = 'template' | 'text' | 'colors' | 'qr' | 'export' | null;
type ActiveTextField = 'headline' | 'subline' | 'eventName' | 'callToAction' | null;

interface DesignState {
  templateSlug: string;
  format: Format;
  headline: string;
  subline: string;
  eventName: string;
  callToAction: string;
  bgColor: string;
  textColor: string;
  accentColor: string;
  qrColor: string;
  qrDotStyle: QRDotStyle;
  qrCornerStyle: QRCornerStyle;
  logoUrl: string | null;
}

interface DesignFeedback {
  warnings: { type: string; field?: string; message: string }[];
  tips: string[];
}

// ============================================================================
// Constants
// ============================================================================
type TemplateDef = { slug: string; label: string; category: string; previewUrl?: string | null; defaultBgColor?: string; defaultTextColor?: string; defaultAccentColor?: string };

const TEMPLATES: TemplateDef[] = [
  { slug: 'minimal-classic', label: 'Minimal Classic', category: 'minimal' },
  { slug: 'minimal-floral', label: 'Minimal Floral', category: 'minimal' },
  { slug: 'minimal-modern', label: 'Minimal Modern', category: 'minimal' },
  { slug: 'elegant-floral', label: 'Elegant Floral', category: 'elegant' },
  { slug: 'elegant-gold', label: 'Elegant Gold', category: 'elegant' },
  { slug: 'botanical-green', label: 'Botanical Green', category: 'natural' },
  { slug: 'rustic-wood', label: 'Rustic Wood', category: 'natural' },
  { slug: 'festive-celebration', label: 'Festive Celebration', category: 'festive' },
  { slug: 'modern-geometric', label: 'Modern Geometric', category: 'modern' },
  { slug: 'vintage-frame', label: 'Vintage Frame', category: 'classic' },
];

const TEMPLATE_CATEGORIES = [
  { key: 'all', label: 'Alle' },
  { key: 'minimal', label: 'Minimal' },
  { key: 'elegant', label: 'Elegant' },
  { key: 'natural', label: 'Natur' },
  { key: 'festive', label: 'Festlich' },
  { key: 'modern', label: 'Modern' },
  { key: 'classic', label: 'Klassisch' },
];

const FORMAT_OPTIONS: { key: Format; label: string; desc: string; aspect: number }[] = [
  { key: 'A6', label: 'A6', desc: 'Tischaufsteller', aspect: 148/105 },
  { key: 'A5', label: 'A5', desc: 'Groß', aspect: 210/148 },
  { key: 'story', label: 'Story', desc: 'Instagram', aspect: 1920/1080 },
  { key: 'square', label: 'Quadrat', desc: 'Social', aspect: 1 },
];

const QR_DOT_STYLES: { key: QRDotStyle; label: string; icon: string }[] = [
  { key: 'square', label: 'Eckig', icon: '■' },
  { key: 'rounded', label: 'Rund', icon: '●' },
  { key: 'dots', label: 'Punkte', icon: '○' },
  { key: 'classy', label: 'Elegant', icon: '◆' },
  { key: 'classy-rounded', label: 'Soft', icon: '◇' },
];

const QR_CORNER_STYLES: { key: QRCornerStyle; label: string; icon: string }[] = [
  { key: 'square', label: 'Eckig', icon: '▢' },
  { key: 'extra-rounded', label: 'Rund', icon: '◯' },
  { key: 'dot', label: 'Punkt', icon: '◉' },
];

const COLOR_PRESETS = [
  { key: 'classic-white', label: 'Klassisch', bg: '#ffffff', text: '#1a1a1a', accent: '#295B4D' },
  { key: 'elegant-cream', label: 'Elegant', bg: '#faf8f5', text: '#2c2c2c', accent: '#8b7355' },
  { key: 'modern-blue', label: 'Modern', bg: '#f8fafc', text: '#0f172a', accent: '#3b82f6' },
  { key: 'soft-rose', label: 'Rosé', bg: '#fdf2f4', text: '#4a2c32', accent: '#be5a7a' },
  { key: 'nature-green', label: 'Natur', bg: '#f0fdf4', text: '#14532d', accent: '#16a34a' },
  { key: 'dark-gold', label: 'Dark', bg: '#1c1917', text: '#fafaf9', accent: '#d4a853' },
];

// ============================================================================
// Utility Functions
// ============================================================================
function resolveRootCssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function clampColor(input: string): string {
  const v = input.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v;
  return '#000000';
}

function getAttrNumber(el: Element | null, name: string): number | null {
  if (!el) return null;
  const raw = el.getAttribute(name);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function serializeSvg(svg: SVGSVGElement): string {
  return new XMLSerializer().serializeToString(svg);
}

// Inline CSS custom properties for resvg compatibility (resvg doesn't support var())
function inlineCssVars(svgString: string, colors: { bg: string; text: string; accent: string }): string {
  return svgString
    .replace(/var\(--gf-bg\)/g, colors.bg)
    .replace(/var\(--gf-text\)/g, colors.text)
    .replace(/var\(--gf-accent\)/g, colors.accent);
}

// AI-Light Design Check (kostenlos, client-side)
function analyzeDesign(state: DesignState, eventType?: string): DesignFeedback {
  const feedback: DesignFeedback = { warnings: [], tips: [] };
  
  // Text length checks
  if (state.headline.length > 30) {
    feedback.warnings.push({ type: 'length', field: 'headline', message: 'Headline könnte zu lang sein' });
  }
  if (state.headline.includes('  ')) {
    feedback.warnings.push({ type: 'spacing', field: 'headline', message: 'Doppelte Leerzeichen' });
  }
  
  // Contrast check (simplified WCAG)
  const getLuminance = (hex: string) => {
    const rgb = parseInt(hex.slice(1), 16);
    const r = (rgb >> 16) / 255;
    const g = ((rgb >> 8) & 0xff) / 255;
    const b = (rgb & 0xff) / 255;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  
  try {
    const bgL = getLuminance(state.bgColor);
    const textL = getLuminance(state.accentColor);
    const contrast = (Math.max(bgL, textL) + 0.05) / (Math.min(bgL, textL) + 0.05);
    if (contrast < 3) {
      feedback.warnings.push({ type: 'contrast', message: 'QR-Kontrast könnte zu gering sein' });
    }
  } catch {}
  
  // Tips
  if (eventType === 'wedding' && !state.headline.includes('&') && !state.headline.includes('und')) {
    feedback.tips.push('Tipp: Namen verbinden (z.B. "Lisa & Max") wirkt persönlicher');
  }
  
  return feedback;
}

// ============================================================================
// Main Component
// ============================================================================
export default function QrStylerClient({ eventId: initialEventId }: { eventId: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const fromWizard = searchParams.get('from') === 'wizard';
  
  const [eventId, setEventId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [eventSlug, setEventSlug] = useState('');
  const [wifiName, setWifiName] = useState<string | null>(null);
  const [wifiPassword, setWifiPassword] = useState<string | null>(null);
  const [eventTitle, setEventTitle] = useState('');
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Client-only mounting to prevent hydration errors
  useEffect(() => {
    setMounted(true);
    // Check if mobile and set initial panel state
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      // On desktop, open template panel by default; on mobile, keep closed
      if (!mobile && activePanel === null) {
        setActivePanel('template');
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Design State
  const [design, setDesign] = useState<DesignState>({
    templateSlug: 'minimal-classic',
    format: 'A6',
    headline: 'Unsere Fotogalerie',
    subline: 'Teilt eure schönsten Momente',
    eventName: '',
    callToAction: 'QR-Code scannen & hochladen',
    bgColor: '#ffffff',
    textColor: '#111827',
    accentColor: '#295B4D',
    qrColor: '#1a1a1a',
    qrDotStyle: 'square',
    qrCornerStyle: 'square',
    logoUrl: null,
  });
  
  // UI State - Start with null on mobile so user sees the design first
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const [activeTextField, setActiveTextField] = useState<ActiveTextField>(null);
  const [templateFilter, setTemplateFilter] = useState('all');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  
  // History for Undo/Redo
  const [history, setHistory] = useState<DesignState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // Template SVG
  const [templateSvg, setTemplateSvg] = useState('');
  const [qrBox, setQrBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [viewBox, setViewBox] = useState<{ w: number; h: number } | null>(null);
  
  // Dynamic templates from API
  const [apiTemplates, setApiTemplates] = useState<TemplateDef[]>([]);
  
  // Export State
  const [exporting, setExporting] = useState<'png' | 'pdf' | string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [shareWizardOpen, setShareWizardOpen] = useState(false);
  
  // Save State
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | null>(null);
  const autosaveRef = useRef<number | null>(null);
  const didLoadRef = useRef(false);
  
  // QR Container Ref
  const qrContainerRef = useRef<HTMLDivElement>(null);
  
  
  // Set event ID from prop
  useEffect(() => {
    setEventId(initialEventId);
  }, [initialEventId]);
  
  // Load templates from API (with guard to prevent duplicate calls)
  const templatesLoadedRef = useRef(false);
  useEffect(() => {
    if (templatesLoadedRef.current) return;
    templatesLoadedRef.current = true;
    
    const loadTemplates = async () => {
      try {
        console.log('[QR-Styler] Loading templates from API...');
        const res = await api.get('/qr-templates');
        const templates = res.data.templates || [];
        console.log('[QR-Styler] Loaded', templates.length, 'templates from API');
        setApiTemplates(templates.map((t: any) => ({
          slug: t.slug,
          label: t.name,
          category: t.category.toLowerCase(),
          previewUrl: t.previewUrl,
          defaultBgColor: t.defaultBgColor,
          defaultTextColor: t.defaultTextColor,
          defaultAccentColor: t.defaultAccentColor,
        })));
      } catch (err) {
        console.error('[QR-Styler] Failed to load templates from API:', err);
        // Fallback to static templates
        setApiTemplates(TEMPLATES);
      }
    };
    loadTemplates();
  }, []);
  
  // Use API templates if available, fallback to static
  const templates = apiTemplates.length > 0 ? apiTemplates : TEMPLATES;
  
  // Load event data
  useEffect(() => {
    if (!eventId) return;
    
    const loadEvent = async () => {
      try {
        const { data } = await api.get(`/events/${eventId}`);
        const ev = data?.event;
        setEventSlug(ev?.slug || '');
        setEventTitle(ev?.title || '');
        setWifiName(ev?.wifiName || null);
        setWifiPassword(ev?.wifiPassword || null);
        
        // Load saved config
        try {
          const saved = await api.get(`/events/${eventId}/qr/config`);
          const cfg = saved?.data?.qrTemplateConfig;
          if (cfg && typeof cfg === 'object') {
            setDesign(prev => ({
              ...prev,
              templateSlug: cfg.templateSlug || prev.templateSlug,
              format: cfg.format || prev.format,
              headline: cfg.headline || prev.headline,
              subline: cfg.subline || prev.subline,
              eventName: cfg.eventName || ev?.title || '',
              callToAction: cfg.callToAction || prev.callToAction,
              bgColor: cfg.bgColor || prev.bgColor,
              textColor: cfg.textColor || prev.textColor,
              accentColor: cfg.accentColor || prev.accentColor,
              qrDotStyle: cfg.qrDotStyle || prev.qrDotStyle,
              qrCornerStyle: cfg.qrCornerStyle || prev.qrCornerStyle,
            }));
          } else {
            setDesign(prev => ({ ...prev, eventName: ev?.title || '' }));
          }
        } catch {
          setDesign(prev => ({ ...prev, eventName: ev?.title || '' }));
        }
        
        didLoadRef.current = true;
      } finally {
        setLoading(false);
      }
    };
    
    loadEvent();
  }, [eventId]);
  
  // Load template SVG from static files (primary source)
  useEffect(() => {
    if (!mounted) return;
    
    const abortController = new AbortController();
    
    const loadTemplate = async () => {
      // For story/square formats, use A6 template as base
      const templateFormat = design.format === 'story' || design.format === 'square' ? 'A6' : design.format;
      const url = `/qr-templates/${design.templateSlug}/${templateFormat}.svg`;
      
      console.log('[QR-Styler] Loading template:', url);
      
      try {
        const res = await fetch(url, { signal: abortController.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        if (abortController.signal.aborted) return;
        console.log('[QR-Styler] Loaded SVG:', text.length, 'chars');
        if (text && text.includes('<svg')) {
          setTemplateSvg(text);
        } else {
          console.warn('[QR-Styler] Invalid SVG content');
          setTemplateSvg('');
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.error('[QR-Styler] Failed to load SVG:', url, err);
        setTemplateSvg('');
      }
    };
    loadTemplate();
    
    return () => abortController.abort();
  }, [mounted, design.templateSlug, design.format]);
  
  // Public URL for QR code
  const publicUrl = useMemo(() => {
    if (!eventSlug) return '';
    return `${typeof window !== 'undefined' ? window.location.origin : ''}/e3/${eventSlug}`;
  }, [eventSlug]);
  
  // Compute final SVG with text and colors
  const computedSvg = useMemo(() => {
    if (!templateSvg) return '';
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(templateSvg, 'image/svg+xml');
    const svg = doc.documentElement as unknown as SVGSVGElement;
    
    // Check for parse errors
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      console.error('[QR-Styler] SVG parse error:', parseError.textContent);
      return '';
    }
    
    // Extract original viewBox
    const vb = svg.getAttribute('viewBox');
    let origW = 1050, origH = 1480;
    if (vb) {
      const parts = vb.split(/\s+/).map(Number);
      if (parts.length === 4 && parts.every(Number.isFinite)) {
        origW = parts[2];
        origH = parts[3];
      }
    }
    
    // Apply colors - replace :root with svg selector in style block
    const styleEl = svg.querySelector('style');
    if (styleEl && styleEl.textContent) {
      const newVars = `
        svg {
          --gf-bg: ${clampColor(design.bgColor)};
          --gf-text: ${clampColor(design.textColor)};
          --gf-accent: ${clampColor(design.accentColor)};
        }
      `;
      // Replace :root block or prepend new vars
      styleEl.textContent = styleEl.textContent.replace(/:root\s*\{[^}]*\}/, '') + newVars;
    }
    
    // Also set on SVG element for fallback
    svg.setAttribute('style', `--gf-bg:${clampColor(design.bgColor)}; --gf-text:${clampColor(design.textColor)}; --gf-accent:${clampColor(design.accentColor)};`);
    
    // Set text content
    const setText = (id: string, value: string) => {
      const el = doc.getElementById(id);
      if (el) el.textContent = value;
    };
    
    setText('gf:text:headline', design.headline);
    setText('gf:text:subline', design.subline);
    setText('gf:text:eventName', design.eventName);
    setText('gf:text:callToAction', design.callToAction);
    
    // Get QR placeholder position
    const qr = doc.getElementById('gf:qr');
    let qrX = 0, qrY = 0, qrW = 0, qrH = 0;
    if (qr) {
      qrX = getAttrNumber(qr, 'x') ?? 0;
      qrY = getAttrNumber(qr, 'y') ?? 0;
      qrW = getAttrNumber(qr, 'width') ?? 0;
      qrH = getAttrNumber(qr, 'height') ?? 0;
      // Hide the placeholder rect - the real QR will be overlaid
      qr.setAttribute('fill', 'white');
      qr.setAttribute('stroke', 'none');
      qr.setAttribute('stroke-width', '0');
    }
    
    // Adapt layout for story/square formats
    const needsTransform = design.format === 'story' || design.format === 'square';
    let targetW = origW;
    let targetH = origH;
    
    if (needsTransform) {
      const formatOption = FORMAT_OPTIONS.find(f => f.key === design.format);
      const targetAspect = formatOption?.aspect || 1;
      // Keep width, adjust height based on target aspect ratio
      targetH = Math.round(origW * targetAspect);
      targetW = origW;
      
      // Calculate scale and offset to fit original content into new viewBox
      const scale = Math.min(targetW / origW, targetH / origH);
      const dx = (targetW - origW * scale) / 2;
      const dy = (targetH - origH * scale) / 2;
      
      // Collect all child elements (except <style>)
      const children = Array.from(svg.childNodes);
      
      // Create wrapper group with transform
      const g = doc.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('transform', `translate(${dx.toFixed(1)}, ${dy.toFixed(1)}) scale(${scale.toFixed(4)})`);
      
      // Move all non-style children into the group
      for (const child of children) {
        if (child.nodeType === 1 && (child as Element).tagName !== 'style') {
          g.appendChild(child);
        }
      }
      svg.appendChild(g);
      
      // Add new full-size background rect BEHIND the group
      const bgRect = doc.createElementNS('http://www.w3.org/2000/svg', 'rect');
      bgRect.setAttribute('x', '0');
      bgRect.setAttribute('y', '0');
      bgRect.setAttribute('width', String(targetW));
      bgRect.setAttribute('height', String(targetH));
      bgRect.setAttribute('fill', `var(--gf-bg, ${clampColor(design.bgColor)})`);
      svg.insertBefore(bgRect, g);
      
      // Update viewBox and dimensions
      svg.setAttribute('viewBox', `0 0 ${targetW} ${targetH}`);
      svg.removeAttribute('width');
      svg.removeAttribute('height');
      
      // Adjust QR box coordinates for the transform
      qrX = dx + qrX * scale;
      qrY = dy + qrY * scale;
      qrW = qrW * scale;
      qrH = qrH * scale;
    }
    
    // Set final viewBox and QR box
    setViewBox({ w: targetW, h: targetH });
    if (qrW > 0 && qrH > 0) {
      setQrBox({ x: qrX, y: qrY, w: qrW, h: qrH });
    }
    
    return serializeSvg(svg);
  }, [templateSvg, design]);
  
  // Aspect ratio for preview
  const aspect = useMemo(() => {
    const formatOption = FORMAT_OPTIONS.find(f => f.key === design.format);
    return formatOption?.aspect || 1.41;
  }, [design.format]);
  
  // QR overlay position
  const qrOverlayStyle = useMemo(() => {
    if (!qrBox || !viewBox) return null;
    return {
      left: `${(qrBox.x / viewBox.w) * 100}%`,
      top: `${(qrBox.y / viewBox.h) * 100}%`,
      width: `${(qrBox.w / viewBox.w) * 100}%`,
      height: `${(qrBox.h / viewBox.h) * 100}%`,
    };
  }, [qrBox, viewBox]);
  
  // Design feedback
  const feedback = useMemo(() => analyzeDesign(design), [design]);
  
  // Update design with history
  const updateDesign = useCallback((updates: Partial<DesignState>) => {
    setDesign(prev => {
      const next = { ...prev, ...updates };
      // Add to history
      setHistory(h => [...h.slice(0, historyIndex + 1), next]);
      setHistoryIndex(i => i + 1);
      return next;
    });
  }, [historyIndex]);
  
  // Undo/Redo
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;
  
  const undo = useCallback(() => {
    if (canUndo) {
      setHistoryIndex(i => i - 1);
      setDesign(history[historyIndex - 1]);
    }
  }, [canUndo, history, historyIndex]);
  
  const redo = useCallback(() => {
    if (canRedo) {
      setHistoryIndex(i => i + 1);
      setDesign(history[historyIndex + 1]);
    }
  }, [canRedo, history, historyIndex]);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);
  
  // Autosave
  useEffect(() => {
    if (!didLoadRef.current || loading || !eventId) return;
    
    if (autosaveRef.current) clearTimeout(autosaveRef.current);
    
    autosaveRef.current = window.setTimeout(async () => {
      try {
        setSaveStatus('saving');
        await api.put(`/events/${eventId}/qr/config`, {
          templateSlug: design.templateSlug,
          format: design.format,
          headline: design.headline,
          subline: design.subline,
          eventName: design.eventName,
          callToAction: design.callToAction,
          bgColor: design.bgColor,
          textColor: design.textColor,
          accentColor: design.accentColor,
          qrDotStyle: design.qrDotStyle,
          qrCornerStyle: design.qrCornerStyle,
        });
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus(null), 2000);
      } catch (err: any) {
        const status = err?.response?.status;
        if (status === 404 || status === 403 || status === 500) {
          didLoadRef.current = false;
        }
        setSaveStatus('error');
      }
    }, 1500);
    
    return () => {
      if (autosaveRef.current) clearTimeout(autosaveRef.current);
    };
  }, [design, eventId, loading]);
  
  // Export functions
  const handleExport = async (type: 'png' | 'pdf') => {
    if (!computedSvg || !eventId || !publicUrl) return;
    
    try {
      setExportError(null);
      setExporting(type);
      
      // Generate styled QR code as SVG
      const qrSvgString = await generateQRSvgString(publicUrl, {
        size: 512,
        dotStyle: design.qrDotStyle,
        cornerStyle: design.qrCornerStyle,
        color: design.qrColor,
        backgroundColor: 'transparent',
        logoUrl: design.logoUrl,
      });
      
      // Embed QR into template SVG by replacing the QR placeholder
      // Inline CSS variables for resvg compatibility
      let exportSvg = inlineCssVars(computedSvg, {
        bg: design.bgColor,
        text: design.textColor,
        accent: design.accentColor,
      });
      
      // Find and replace the gf:qr rect with the actual QR code
      if (qrBox) {
        const qrGroup = `<g transform="translate(${qrBox.x}, ${qrBox.y})">
          <rect width="${qrBox.w}" height="${qrBox.h}" fill="white" rx="8"/>
          <g transform="translate(${qrBox.w * 0.05}, ${qrBox.h * 0.05}) scale(${(qrBox.w * 0.9) / 512})">
            ${qrSvgString.replace(/<\?xml[^>]*\?>/g, '').replace(/<svg[^>]*>/, '').replace(/<\/svg>/, '')}
          </g>
        </g>`;
        exportSvg = exportSvg.replace(/<rect[^>]*id="gf:qr"[^>]*\/?>/g, qrGroup);
      }
      
      const endpoint = type === 'png' ? 'export.png' : 'export.pdf';
      const token = typeof window !== 'undefined' ? (sessionStorage.getItem('token') || localStorage.getItem('token')) : null;
      const res = await fetch(`/api/events/${eventId}/qr/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ 
          format: design.format === 'story' || design.format === 'square' ? 'A6' : design.format, 
          svg: exportSvg 
        }),
      });
      
      if (!res.ok) throw new Error('Export fehlgeschlagen');
      
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qr-aufsteller-${eventSlug}.${type}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setExportError(err?.message || 'Export fehlgeschlagen');
    } finally {
      setExporting(null);
    }
  };

  // DIY Export for tent cards with fold lines
  const handleDiyExport = async (format: string, svg: string) => {
    if (!eventId) return;
    
    try {
      setExportError(null);
      setExporting(format);
      
      // Inline CSS variables for resvg compatibility
      const inlinedSvg = inlineCssVars(svg, {
        bg: design.bgColor,
        text: design.textColor,
        accent: design.accentColor,
      });
      const token = typeof window !== 'undefined' ? (sessionStorage.getItem('token') || localStorage.getItem('token')) : null;
      const res = await fetch(`/api/events/${eventId}/qr/export-diy.pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ format, svg: inlinedSvg }),
      });
      
      if (!res.ok) throw new Error('DIY Export fehlgeschlagen');
      
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qr-diy-${format}-${eventSlug}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setExportError(err?.message || 'DIY Export fehlgeschlagen');
    } finally {
      setExporting(null);
    }
  };
  
  // Apply color preset
  const applyColorPreset = (preset: typeof COLOR_PRESETS[0]) => {
    updateDesign({
      bgColor: preset.bg,
      textColor: preset.text,
      accentColor: preset.accent,
    });
  };
  
  // Select template and apply its default colors
  const selectTemplate = (slug: string) => {
    const template = templates.find(t => t.slug === slug);
    if (template) {
      const updates: Partial<DesignState> = { templateSlug: slug };
      // Apply default colors if template has them
      if ((template as any).defaultBgColor) updates.bgColor = (template as any).defaultBgColor;
      if ((template as any).defaultTextColor) updates.textColor = (template as any).defaultTextColor;
      if ((template as any).defaultAccentColor) updates.accentColor = (template as any).defaultAccentColor;
      updateDesign(updates);
    } else {
      updateDesign({ templateSlug: slug });
    }
  };
  
  // Reset to defaults
  const resetDefaults = () => {
    updateDesign({
      headline: 'Unsere Fotogalerie',
      subline: 'Teilt eure schönsten Momente',
      callToAction: 'QR-Code scannen & hochladen',
      bgColor: '#ffffff',
      textColor: '#111827',
      accentColor: '#295B4D',
      qrDotStyle: 'square',
      qrCornerStyle: 'square',
    });
  };
  
  // Filtered templates (use dynamic templates from API)
  const filteredTemplates = useMemo(() => {
    if (templateFilter === 'all') return templates;
    return templates.filter(t => t.category === templateFilter);
  }, [templateFilter, templates]);

  // Render loading skeleton during SSR and initial client mount to avoid hydration mismatch
  if (!mounted || loading) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">QR-Designer wird geladen...</span>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-background">
        {/* Mobile: Full-screen canvas + bottom tabs + sheets */}
        {/* Desktop: Side-by-side layout */}
        <div className="flex flex-col lg:flex-row min-h-screen">
          
          {/* ============================================================ */}
          {/* LEFT PANEL: Controls - Hidden on mobile, visible on desktop */}
          {/* ============================================================ */}
          <div className="hidden lg:flex lg:order-1 lg:w-80 xl:w-96 bg-card border-r border-border flex-col">
            
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                {fromWizard ? (
                  <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-background rounded-lg flex items-center gap-1 text-primary">
                    <ArrowLeft className="w-5 h-5" />
                    <span className="text-xs font-medium">Wizard</span>
                  </button>
                ) : (
                  <Link href={`/events/${eventId}/dashboard`} className="p-2 -ml-2 hover:bg-background rounded-lg">
                    <ChevronLeft className="w-5 h-5" />
                  </Link>
                )}
                <div>
                  <h1 className="font-semibold text-foreground">QR-Designer</h1>
                  <p className="text-xs text-muted-foreground truncate max-w-[150px]">{eventTitle}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                {/* Save Status */}
                {saveStatus === 'saving' && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                {saveStatus === 'saved' && <Check className="w-4 h-4 text-status-success" />}
                {saveStatus === 'error' && <AlertCircle className="w-4 h-4 text-status-error" />}
                
                {/* Undo/Redo */}
                <button onClick={undo} disabled={!canUndo} className="p-2 hover:bg-background rounded-lg disabled:opacity-30">
                  <Undo2 className="w-4 h-4" />
                </button>
                <button onClick={redo} disabled={!canRedo} className="p-2 hover:bg-background rounded-lg disabled:opacity-30">
                  <Redo2 className="w-4 h-4" />
                </button>
                <button onClick={resetDefaults} className="p-2 hover:bg-background rounded-lg">
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* Panel Tabs - Mobile: horizontal scroll, Desktop: vertical */}
            <div className="flex lg:flex-col border-b lg:border-b-0 border-border overflow-x-auto lg:overflow-visible">
              {[
                { key: 'template', icon: Image, label: 'Template' },
                { key: 'text', icon: Type, label: 'Texte' },
                { key: 'colors', icon: Palette, label: 'Farben' },
                { key: 'qr', icon: QrCode, label: 'QR-Style' },
                { key: 'export', icon: Download, label: 'Export' },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActivePanel(activePanel === tab.key ? null : tab.key as ActivePanel)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 lg:border-b-0 lg:border-l-2 transition-colors ${
                    activePanel === tab.key 
                      ? 'border-primary text-primary bg-primary/5' 
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-background'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span className="hidden sm:inline lg:inline">{tab.label}</span>
                </button>
              ))}
            </div>
            
            {/* Panel Content */}
            <div className="flex-1 overflow-y-auto p-4">
              <>
                
                {/* Template Panel */}
                {activePanel === 'template' && (
                  <div className="space-y-4">
                    {/* Format Selection */}
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">Format</label>
                      <div className="grid grid-cols-4 gap-2">
                        {FORMAT_OPTIONS.map(f => (
                          <button
                            key={f.key}
                            onClick={() => updateDesign({ format: f.key })}
                            className={`p-2 rounded-lg border text-center transition-all ${
                              design.format === f.key
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border hover:border-muted-foreground'
                            }`}
                          >
                            <div className="text-sm font-medium">{f.label}</div>
                            <div className="text-[10px] text-muted-foreground">{f.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {/* Category Filter */}
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">Kategorie</label>
                      <div className="flex flex-wrap gap-1">
                        {TEMPLATE_CATEGORIES.map(cat => (
                          <button
                            key={cat.key}
                            onClick={() => setTemplateFilter(cat.key)}
                            className={`px-3 py-1 text-xs rounded-full transition-all ${
                              templateFilter === cat.key
                                ? 'bg-primary text-white'
                                : 'bg-background text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            {cat.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {/* Template Grid */}
                    <div className="grid grid-cols-2 gap-2">
                      {filteredTemplates.map(t => (
                        <button
                          key={t.slug}
                          onClick={() => selectTemplate(t.slug)}
                          className={`relative aspect-[3/4] rounded-lg overflow-hidden border-2 transition-all ${
                            design.templateSlug === t.slug
                              ? 'border-primary ring-2 ring-primary/20'
                              : 'border-border hover:border-muted-foreground'
                          }`}
                        >
                          {/* Template Preview - use static SVG thumbnail */}
                          <img
                            src={`/qr-templates/${t.slug}/A6.svg`}
                            alt={t.label}
                            className="w-full h-full object-contain p-1"
                            style={{ backgroundColor: t.defaultBgColor || '#ffffff' }}
                            onError={(e) => {
                              // Fallback to colored placeholder
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              target.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                          <div 
                            className="hidden w-full h-full flex flex-col items-center justify-center p-2"
                            style={{ backgroundColor: t.defaultBgColor || '#f9fafb' }}
                          >
                            <QrCode className="w-6 h-6 mb-1" style={{ color: t.defaultAccentColor || '#9ca3af' }} />
                            <span className="text-[8px] font-medium text-center" style={{ color: t.defaultTextColor || '#4b5563' }}>
                              {t.label}
                            </span>
                          </div>
                          {design.templateSlug === t.slug && (
                            <div className="absolute top-1 right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                              <Check className="w-2.5 h-2.5 text-white" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Text Panel */}
                {activePanel === 'text' && (
                  <div className="space-y-4">
                    <p className="text-xs text-muted-foreground">Klicke auf den Text im Preview oder bearbeite hier:</p>
                    
                    {[
                      { key: 'headline', label: 'Überschrift', placeholder: 'z.B. Unsere Hochzeit' },
                      { key: 'subline', label: 'Untertitel', placeholder: 'z.B. Teilt eure Momente' },
                      { key: 'eventName', label: 'Event-Name', placeholder: eventTitle || 'Event-Name' },
                      { key: 'callToAction', label: 'Handlungsaufforderung', placeholder: 'z.B. Jetzt scannen!' },
                    ].map(field => (
                      <div key={field.key}>
                        <label className="text-sm font-medium text-foreground mb-1 block">{field.label}</label>
                        <input
                          type="text"
                          value={design[field.key as keyof DesignState] as string}
                          onChange={e => updateDesign({ [field.key]: e.target.value })}
                          onFocus={() => setActiveTextField(field.key as ActiveTextField)}
                          onBlur={() => setActiveTextField(null)}
                          placeholder={field.placeholder}
                          className={`w-full px-3 py-2 rounded-lg border bg-background text-foreground placeholder:text-muted-foreground transition-all ${
                            activeTextField === field.key
                              ? 'border-primary ring-2 ring-primary/20'
                              : 'border-border focus:border-primary'
                          }`}
                        />
                      </div>
                    ))}
                    
                    {/* Quick Presets */}
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">Schnellvorlagen</label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { label: 'Hochzeit', headline: 'Unsere Hochzeit', subline: 'Teilt eure schönsten Momente' },
                          { label: 'Geburtstag', headline: 'Happy Birthday!', subline: 'Alle Fotos der Party' },
                          { label: 'Firmen-Event', headline: 'Event Galerie', subline: 'Fotos & Impressionen' },
                        ].map(preset => (
                          <button
                            key={preset.label}
                            onClick={() => updateDesign({ headline: preset.headline, subline: preset.subline })}
                            className="px-3 py-1.5 text-xs bg-background hover:bg-primary/10 text-foreground rounded-lg border border-border hover:border-primary transition-all"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Colors Panel */}
                {activePanel === 'colors' && (
                  <div className="space-y-4">
                    {/* Color Presets */}
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">Farbpaletten</label>
                      <div className="grid grid-cols-3 gap-2">
                        {COLOR_PRESETS.map(preset => (
                          <button
                            key={preset.key}
                            onClick={() => applyColorPreset(preset)}
                            className="p-2 rounded-lg border border-border hover:border-primary transition-all"
                          >
                            <div className="flex gap-1 mb-1">
                              <div className="w-4 h-4 rounded" style={{ backgroundColor: preset.bg, border: '1px solid #e5e5e5' }} />
                              <div className="w-4 h-4 rounded" style={{ backgroundColor: preset.text }} />
                              <div className="w-4 h-4 rounded" style={{ backgroundColor: preset.accent }} />
                            </div>
                            <div className="text-[10px] text-muted-foreground">{preset.label}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {/* Manual Color Pickers */}
                    {[
                      { key: 'bgColor', label: 'Hintergrund' },
                      { key: 'textColor', label: 'Text' },
                      { key: 'accentColor', label: 'Akzent/QR' },
                    ].map(color => (
                      <div key={color.key}>
                        <label className="text-sm font-medium text-foreground mb-1 block">{color.label}</label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={design[color.key as keyof DesignState] as string}
                            onChange={e => updateDesign({ [color.key]: e.target.value })}
                            className="w-10 h-10 rounded-lg border border-border cursor-pointer"
                          />
                          <input
                            type="text"
                            value={design[color.key as keyof DesignState] as string}
                            onChange={e => updateDesign({ [color.key]: e.target.value })}
                            className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground font-mono text-sm"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* QR Style Panel */}
                {activePanel === 'qr' && (
                  <div className="space-y-4">
                    {/* QR Color */}
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">QR-Code Farbe</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={design.qrColor}
                          onChange={e => updateDesign({ qrColor: e.target.value })}
                          className="w-10 h-10 rounded-lg border border-border cursor-pointer"
                        />
                        <input
                          type="text"
                          value={design.qrColor}
                          onChange={e => updateDesign({ qrColor: e.target.value })}
                          className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground font-mono text-sm"
                        />
                      </div>
                      <div className="flex gap-2 mt-2">
                        {['#1a1a1a', '#000000', '#295B4D', '#2563eb', '#7c3aed'].map(c => (
                          <button
                            key={c}
                            onClick={() => updateDesign({ qrColor: c })}
                            className={`w-8 h-8 rounded-lg border-2 transition-all ${
                              design.qrColor === c ? 'border-primary scale-110' : 'border-transparent'
                            }`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                    
                    {/* Dot Style */}
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">Punkte-Stil</label>
                      <div className="flex flex-wrap gap-2">
                        {QR_DOT_STYLES.map(style => (
                          <button
                            key={style.key}
                            onClick={() => updateDesign({ qrDotStyle: style.key })}
                            className={`w-12 h-12 rounded-lg border text-xl transition-all ${
                              design.qrDotStyle === style.key
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border text-muted-foreground hover:border-muted-foreground'
                            }`}
                            title={style.label}
                          >
                            {style.icon}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {/* Corner Style */}
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">Ecken-Stil</label>
                      <div className="flex flex-wrap gap-2">
                        {QR_CORNER_STYLES.map(style => (
                          <button
                            key={style.key}
                            onClick={() => updateDesign({ qrCornerStyle: style.key })}
                            className={`w-12 h-12 rounded-lg border text-xl transition-all ${
                              design.qrCornerStyle === style.key
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border text-muted-foreground hover:border-muted-foreground'
                            }`}
                            title={style.label}
                          >
                            {style.icon}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {/* Logo Upload */}
                    {eventId && (
                      <LogoUpload
                        eventId={eventId}
                        logoUrl={design.logoUrl}
                        onLogoChange={(url) => updateDesign({ logoUrl: url })}
                      />
                    )}
                  </div>
                )}
                
                {/* Export Panel */}
                {activePanel === 'export' && (
                  <div className="space-y-4">
                    {/* Design Check */}
                    {(feedback.warnings.length > 0 || feedback.tips.length > 0) && (
                      <div className="p-3 rounded-lg bg-background border border-border space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                          <Sparkles className="w-4 h-4 text-primary" />
                          Design-Check
                        </div>
                        {feedback.warnings.map((w, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-status-warning">
                            <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            {w.message}
                          </div>
                        ))}
                        {feedback.tips.map((tip, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <Sparkles className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            {tip}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* QR Target URL */}
                    <div className="p-3 rounded-lg bg-background border border-border">
                      <div className="text-xs text-muted-foreground mb-1">QR-Code verlinkt auf:</div>
                      <div className="text-sm font-mono text-primary break-all">{publicUrl}</div>
                    </div>
                    
                    {/* Share & Export Button */}
                    <Button
                      onClick={() => setShareWizardOpen(true)}
                      className="w-full justify-center gap-2"
                      variant="primary"
                    >
                      <Share2 className="w-4 h-4" />
                      Teilen & Drucken
                    </Button>
                    
                    {exportError && (
                      <div className="p-3 rounded-lg bg-status-error/10 border border-status-error text-status-error text-sm">
                        {exportError}
                      </div>
                    )}
                  </div>
                )}
                
              </>
            </div>
          </div>
          
          {/* ============================================================ */}
          {/* RIGHT PANEL: Preview - Full screen on mobile */}
          {/* ============================================================ */}
          <div className="flex-1 lg:order-2 bg-gradient-to-br from-background via-card to-background flex flex-col min-h-screen lg:min-h-0">
            
            {/* Mobile Header */}
            <div className="lg:hidden flex items-center justify-between p-3 border-b border-border bg-card/80 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                {fromWizard ? (
                  <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-background rounded-lg flex items-center gap-1 text-primary">
                    <ArrowLeft className="w-4 h-4" />
                    <span className="text-xs font-medium">Wizard</span>
                  </button>
                ) : (
                  <Link href={`/events/${eventId}/dashboard`} className="p-2 -ml-2 hover:bg-background rounded-lg">
                    <ChevronLeft className="w-5 h-5" />
                  </Link>
                )}
                <div>
                  <h1 className="font-semibold text-foreground text-sm">QR-Designer</h1>
                  <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">{eventTitle}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {saveStatus === 'saving' && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                {saveStatus === 'saved' && <Check className="w-4 h-4 text-status-success" />}
                <button onClick={undo} disabled={!canUndo} className="p-2 hover:bg-background rounded-lg disabled:opacity-30">
                  <Undo2 className="w-4 h-4" />
                </button>
                <button onClick={redo} disabled={!canRedo} className="p-2 hover:bg-background rounded-lg disabled:opacity-30">
                  <Redo2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* Desktop Preview Header */}
            <div className="hidden lg:flex items-center justify-between p-4 lg:p-8 pb-0 lg:pb-0">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Live-Vorschau</span>
              </div>
              
              {/* Preview Mode Toggle */}
              <div className="flex items-center gap-1 bg-background rounded-lg p-1">
                <button
                  onClick={() => setPreviewMode('desktop')}
                  className={`p-2 rounded-md transition-all ${previewMode === 'desktop' ? 'bg-card shadow' : ''}`}
                >
                  <Monitor className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPreviewMode('mobile')}
                  className={`p-2 rounded-md transition-all ${previewMode === 'mobile' ? 'bg-card shadow' : ''}`}
                >
                  <Smartphone className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* Preview Container - Canvas must be fully visible */}
            {/* Add padding-bottom on mobile for bottom tabs */}
            <div className="flex-1 flex items-center lg:items-start justify-center py-4 pb-20 lg:pb-4 lg:pt-8 px-4 lg:px-8 overflow-hidden min-h-[300px] lg:min-h-[500px]">
              <div
                className="relative bg-card rounded-xl shadow-2xl transition-all"
                style={{ 
                  width: 'auto',
                  height: previewMode === 'mobile' ? '350px' : '500px',
                  maxHeight: '70vh',
                  aspectRatio: `1 / ${aspect}`,
                }}
              >
                {/* SVG Template - using isolated client-only component */}
                {mounted && computedSvg && (
                  <SvgRenderer
                    key={`svg-${design.templateSlug}-${design.format}`}
                    svg={computedSvg}
                    className="absolute inset-0 [&>svg]:w-full [&>svg]:h-full [&>svg]:object-contain"
                  />
                )}
                
                {/* QR Code Overlay with styled QR */}
                {mounted && qrOverlayStyle && publicUrl && (
                  <div
                    ref={qrContainerRef}
                    className="absolute bg-card rounded-md flex items-center justify-center"
                    style={{
                      ...qrOverlayStyle,
                      padding: '2%',
                    }}
                  >
                    <StyledQRCode
                      data={publicUrl}
                      size={200}
                      dotStyle={design.qrDotStyle}
                      cornerStyle={design.qrCornerStyle}
                      color={design.qrColor}
                      backgroundColor="#ffffff"
                      logoUrl={design.logoUrl}
                      className="w-full h-full max-w-full max-h-full [&>canvas]:w-full [&>canvas]:h-full [&>svg]:w-full [&>svg]:h-full"
                    />
                  </div>
                )}
                
                {/* Clickable Text Overlays for WYSIWYG - Tap to edit */}
                {mounted && (
                  <>
                    {/* Headline - Top area */}
                    <button
                      onClick={() => {
                        setActivePanel('text');
                        setActiveTextField('headline');
                      }}
                      className="absolute left-[10%] right-[10%] top-[15%] h-[8%] cursor-text hover:bg-primary/5 rounded transition-colors"
                      title="Überschrift bearbeiten"
                    />
                    {/* Subline - Below headline */}
                    <button
                      onClick={() => {
                        setActivePanel('text');
                        setActiveTextField('subline');
                      }}
                      className="absolute left-[10%] right-[10%] top-[23%] h-[5%] cursor-text hover:bg-primary/5 rounded transition-colors"
                      title="Untertitel bearbeiten"
                    />
                    {/* Event Name - Middle area */}
                    <button
                      onClick={() => {
                        setActivePanel('text');
                        setActiveTextField('eventName');
                      }}
                      className="absolute left-[15%] right-[15%] top-[29%] h-[6%] cursor-text hover:bg-primary/5 rounded transition-colors"
                      title="Event-Name bearbeiten"
                    />
                    {/* Call to Action - Below QR */}
                    <button
                      onClick={() => {
                        setActivePanel('text');
                        setActiveTextField('callToAction');
                      }}
                      className="absolute left-[10%] right-[10%] top-[62%] h-[5%] cursor-text hover:bg-primary/5 rounded transition-colors"
                      title="Handlungsaufforderung bearbeiten"
                    />
                    
                    {/* WiFi Hint - Show when WiFi is configured */}
                    {wifiName && (
                      <div className="absolute bottom-[20%] left-0 right-0 flex flex-col items-center justify-center gap-0.5 pointer-events-none">
                        <div className="flex items-center gap-1.5">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" style={{ color: design.accentColor }}>
                            <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/>
                          </svg>
                          <span className="text-[11px] font-medium" style={{ color: design.accentColor }}>
                            Kostenloses WLAN
                          </span>
                        </div>
                        <span className="text-[10px] opacity-80" style={{ color: design.textColor }}>
                          Netzwerk: {wifiName}
                        </span>
                      </div>
                    )}
                    
                    {/* Powered by gästefotos Branding */}
                    <div className="absolute bottom-[3%] left-0 right-0 flex items-center justify-center gap-1 pointer-events-none">
                      <span className="text-[8px] opacity-60" style={{ color: design.textColor }}>
                        powered by
                      </span>
                      <span className="text-[9px] font-medium opacity-80" style={{ color: design.accentColor }}>
                        ♥ gästefotos.com
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            {/* Format Info - Desktop only */}
            <div className="hidden lg:block mt-4 text-center text-xs text-muted-foreground">
              {FORMAT_OPTIONS.find(f => f.key === design.format)?.label} • {FORMAT_OPTIONS.find(f => f.key === design.format)?.desc}
            </div>
            
            {/* Mobile Quick Export Button - Floating above bottom tabs */}
            <div className="lg:hidden fixed bottom-20 left-4 right-4 z-10">
              <Button
                onClick={() => setShareWizardOpen(true)}
                className="w-full justify-center gap-2 shadow-lg"
                variant="primary"
              >
                <Share2 className="w-4 h-4" />
                Teilen & Drucken
              </Button>
            </div>
            
            {/* Mobile Bottom Tabs */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border safe-area-pb">
              <div className="flex justify-around py-2">
                {[
                  { key: 'template', icon: Image, label: 'Vorlage' },
                  { key: 'text', icon: Type, label: 'Texte' },
                  { key: 'colors', icon: Palette, label: 'Farben' },
                  { key: 'qr', icon: QrCode, label: 'QR-Style' },
                  { key: 'export', icon: Settings2, label: 'Mehr' },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActivePanel(activePanel === tab.key ? null : tab.key as ActivePanel)}
                    className={`flex flex-col items-center gap-1 px-3 py-1 rounded-lg transition-colors ${
                      activePanel === tab.key 
                        ? 'text-primary bg-primary/10' 
                        : 'text-muted-foreground'
                    }`}
                  >
                    <tab.icon className="w-5 h-5" />
                    <span className="text-[10px] font-medium">{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          
        </div>
        
        {/* Mobile Bottom Sheets for each panel */}
        <BottomSheet
          isOpen={activePanel === 'template' && isMobile}
          onClose={() => setActivePanel(null)}
          title="Vorlage wählen"
          snapPoints={[0.45, 0.7]}
        >
          <div className="p-4 space-y-4 pb-20">
            {/* Format Selection */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Format</label>
              <div className="grid grid-cols-4 gap-2">
                {FORMAT_OPTIONS.map(f => (
                  <button
                    key={f.key}
                    onClick={() => updateDesign({ format: f.key })}
                    className={`p-2 rounded-lg border text-center transition-all ${
                      design.format === f.key
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-muted-foreground'
                    }`}
                  >
                    <div className="text-sm font-medium">{f.label}</div>
                    <div className="text-[10px] text-muted-foreground">{f.desc}</div>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Category Filter */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Kategorie</label>
              <div className="flex flex-wrap gap-1">
                {TEMPLATE_CATEGORIES.map(cat => (
                  <button
                    key={cat.key}
                    onClick={() => setTemplateFilter(cat.key)}
                    className={`px-3 py-1 text-xs rounded-full transition-all ${
                      templateFilter === cat.key
                        ? 'bg-primary text-white'
                        : 'bg-background text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Template Grid - with SVG thumbnails */}
            <div className="grid grid-cols-3 gap-2">
              {filteredTemplates.map(t => (
                <button
                  key={t.slug}
                  onClick={() => { selectTemplate(t.slug); setActivePanel(null); }}
                  className={`relative aspect-[3/4] rounded-lg overflow-hidden border-2 transition-all ${
                    design.templateSlug === t.slug
                      ? 'border-primary ring-2 ring-primary/20'
                      : 'border-border'
                  }`}
                >
                  <img
                    src={`/qr-templates/${t.slug}/A6.svg`}
                    alt={t.label}
                    className="w-full h-full object-contain"
                    style={{ backgroundColor: t.defaultBgColor || '#ffffff' }}
                  />
                  {design.templateSlug === t.slug && (
                    <div className="absolute top-1 right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </BottomSheet>
        
        <BottomSheet
          isOpen={activePanel === 'text' && isMobile}
          onClose={() => setActivePanel(null)}
          title="Texte bearbeiten"
          snapPoints={[0.4, 0.6]}
        >
          <div className="p-4 space-y-4 pb-20">
            {[
              { key: 'headline', label: 'Überschrift', placeholder: 'z.B. Unsere Hochzeit' },
              { key: 'subline', label: 'Untertitel', placeholder: 'z.B. Teilt eure Momente' },
              { key: 'eventName', label: 'Event-Name', placeholder: eventTitle || 'Event-Name' },
              { key: 'callToAction', label: 'Handlungsaufforderung', placeholder: 'z.B. Jetzt scannen!' },
            ].map(field => (
              <div key={field.key}>
                <label className="text-sm font-medium text-foreground mb-1 block">{field.label}</label>
                <input
                  type="text"
                  value={design[field.key as keyof DesignState] as string}
                  onChange={e => updateDesign({ [field.key]: e.target.value })}
                  placeholder={field.placeholder}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            ))}
          </div>
        </BottomSheet>
        
        <BottomSheet
          isOpen={activePanel === 'colors' && isMobile}
          onClose={() => setActivePanel(null)}
          title="Farben anpassen"
          snapPoints={[0.45, 0.65]}
        >
          <div className="p-4 space-y-4 pb-20">
            {/* Color Presets */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Farbpaletten</label>
              <div className="grid grid-cols-3 gap-2">
                {COLOR_PRESETS.map(preset => (
                  <button
                    key={preset.key}
                    onClick={() => applyColorPreset(preset)}
                    className="p-2 rounded-lg border border-border hover:border-primary transition-all"
                  >
                    <div className="flex gap-1 mb-1">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: preset.bg, border: '1px solid #e5e5e5' }} />
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: preset.text }} />
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: preset.accent }} />
                    </div>
                    <div className="text-[10px] text-muted-foreground">{preset.label}</div>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Manual Color Pickers */}
            {[
              { key: 'bgColor', label: 'Hintergrund' },
              { key: 'textColor', label: 'Text' },
              { key: 'accentColor', label: 'Akzent/QR' },
            ].map(color => (
              <div key={color.key}>
                <label className="text-sm font-medium text-foreground mb-1 block">{color.label}</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={design[color.key as keyof DesignState] as string}
                    onChange={e => updateDesign({ [color.key]: e.target.value })}
                    className="w-10 h-10 rounded-lg border border-border cursor-pointer"
                  />
                  <input
                    type="text"
                    value={design[color.key as keyof DesignState] as string}
                    onChange={e => updateDesign({ [color.key]: e.target.value })}
                    className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground font-mono text-sm"
                  />
                </div>
              </div>
            ))}
          </div>
        </BottomSheet>
        
        <BottomSheet
          isOpen={activePanel === 'qr' && isMobile}
          onClose={() => setActivePanel(null)}
          title="QR-Code Stil"
          snapPoints={[0.4, 0.6]}
        >
          <div className="p-4 space-y-4 pb-20">
            {/* Dot Style */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Punkte-Stil</label>
              <div className="flex flex-wrap gap-2">
                {QR_DOT_STYLES.map(style => (
                  <button
                    key={style.key}
                    onClick={() => updateDesign({ qrDotStyle: style.key })}
                    className={`w-12 h-12 rounded-lg border text-xl transition-all ${
                      design.qrDotStyle === style.key
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground'
                    }`}
                    title={style.label}
                  >
                    {style.icon}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Corner Style */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Ecken-Stil</label>
              <div className="flex flex-wrap gap-2">
                {QR_CORNER_STYLES.map(style => (
                  <button
                    key={style.key}
                    onClick={() => updateDesign({ qrCornerStyle: style.key })}
                    className={`w-12 h-12 rounded-lg border text-xl transition-all ${
                      design.qrCornerStyle === style.key
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground'
                    }`}
                    title={style.label}
                  >
                    {style.icon}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Logo Upload - Mobile */}
            {eventId && (
              <LogoUpload
                eventId={eventId}
                logoUrl={design.logoUrl}
                onLogoChange={(url) => updateDesign({ logoUrl: url })}
              />
            )}
          </div>
        </BottomSheet>
        
        <BottomSheet
          isOpen={activePanel === 'export' && isMobile}
          onClose={() => setActivePanel(null)}
          title="Mehr Optionen"
          snapPoints={[0.4, 0.6]}
        >
          <div className="p-4 space-y-4 pb-20">
            {/* Design Check */}
            {(feedback.warnings.length > 0 || feedback.tips.length > 0) && (
              <div className="p-3 rounded-lg bg-background border border-border space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Design-Tipps
                </div>
                {feedback.warnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-status-warning">
                    <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    {w.message}
                  </div>
                ))}
                {feedback.tips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Sparkles className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    {tip}
                  </div>
                ))}
              </div>
            )}
            
            {/* QR Target URL */}
            <div className="p-3 rounded-lg bg-background border border-border">
              <div className="text-xs text-muted-foreground mb-1">QR-Code verlinkt auf:</div>
              <div className="text-sm font-mono text-primary break-all">{publicUrl}</div>
            </div>
            
            {/* Share & Export Button */}
            <Button
              onClick={() => {
                setActivePanel(null);
                setShareWizardOpen(true);
              }}
              className="w-full justify-center gap-2"
              variant="primary"
            >
              <Share2 className="w-4 h-4" />
              Teilen & Drucken
            </Button>
            
            {exportError && (
              <div className="p-3 rounded-lg bg-status-error/10 border border-status-error text-status-error text-sm">
                {exportError}
              </div>
            )}
          </div>
        </BottomSheet>
        
        {/* Share Wizard Modal */}
        {mounted && eventId && (
          <ShareWizardModal
            isOpen={shareWizardOpen}
            onClose={() => setShareWizardOpen(false)}
            onExport={handleExport}
            onDiyExport={handleDiyExport}
            eventSlug={eventSlug}
            eventId={eventId}
            publicUrl={publicUrl}
            computedSvg={computedSvg}
            exporting={exporting}
          />
        )}
      </div>
    </AppLayout>
  );
}
