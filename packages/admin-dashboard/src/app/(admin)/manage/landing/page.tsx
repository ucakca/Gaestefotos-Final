'use client';

import { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Loader2, Eye, GripVertical, RotateCcw, Star, ChevronDown, ChevronUp } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';

interface Badge { icon: string; label: string }
interface Feature { icon: string; title: string; description: string }
interface Product { icon: string; title: string; description: string; badge?: string; color?: string }
interface Testimonial { quote: string; author: string; role: string; stars: number }
interface Stat { value: number; suffix: string; label: string }
interface Faq { question: string; answer: string }
interface PricingCard { name: string; price: string; features: string[]; popular: boolean }

interface LandingConfig {
  heroTitle: string;
  heroSubtitle: string;
  ctaButtonText: string;
  ctaButtonLink: string;
  loginButtonText: string;
  demoButtonText: string;
  showDemoButton: boolean;
  announcementText: string;
  features: Feature[];
  badges: Badge[];
  products: Product[];
  showProducts: boolean;
  testimonials: Testimonial[];
  showTestimonials: boolean;
  stats: Stat[];
  showStats: boolean;
  faqs: Faq[];
  showFaq: boolean;
  pricingCards: PricingCard[];
  showPricing: boolean;
  pricingTitle: string;
  pricingSubtitle: string;
  ctaSectionTitle: string;
  ctaSectionSubtitle: string;
  ctaSectionButtonText: string;
  showCtaDemoButton: boolean;
}

const ICON_OPTIONS = ['Camera', 'Sparkles', 'Grid3X3', 'ImageIcon', 'Printer', 'Globe', 'Upload', 'Shield', 'Search', 'Monitor', 'Heart', 'Zap', 'Star', 'Lock', 'Leaf'];
const COLOR_OPTIONS = ['blue', 'violet', 'emerald', 'amber', 'rose', 'cyan', 'red', 'green', 'indigo', 'pink'];

export default function LandingEditorPage() {
  const [config, setConfig] = useState<LandingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/landing');
      setConfig(res.data.config);
    } catch {
      toast.error('Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const res = await api.put('/admin/landing', config);
      setConfig(res.data.config);
      toast.success('Landing Page gespeichert');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof LandingConfig, value: any) => {
    if (!config) return;
    setConfig({ ...config, [field]: value });
  };

  const addFeature = () => {
    if (!config) return;
    setConfig({ ...config, features: [...config.features, { icon: '✨', title: '', description: '' }] });
  };

  const removeFeature = (idx: number) => {
    if (!config) return;
    setConfig({ ...config, features: config.features.filter((_, i) => i !== idx) });
  };

  const updateFeature = (idx: number, field: keyof Feature, value: string) => {
    if (!config) return;
    const features = [...config.features];
    features[idx] = { ...features[idx], [field]: value };
    setConfig({ ...config, features });
  };

  const addBadge = () => {
    if (!config) return;
    setConfig({ ...config, badges: [...config.badges, { icon: '✅', label: '' }] });
  };

  const removeBadge = (idx: number) => {
    if (!config) return;
    setConfig({ ...config, badges: config.badges.filter((_, i) => i !== idx) });
  };

  const updateBadge = (idx: number, field: keyof Badge, value: string) => {
    if (!config) return;
    const badges = [...config.badges];
    badges[idx] = { ...badges[idx], [field]: value };
    setConfig({ ...config, badges });
  };

  // Products
  const addProduct = () => {
    if (!config) return;
    setConfig({ ...config, products: [...(config.products || []), { icon: 'Camera', title: '', description: '', color: 'blue' }] });
  };
  const removeProduct = (idx: number) => {
    if (!config) return;
    setConfig({ ...config, products: config.products.filter((_, i) => i !== idx) });
  };
  const updateProduct = (idx: number, field: string, value: any) => {
    if (!config) return;
    const products = [...config.products];
    products[idx] = { ...products[idx], [field]: value };
    setConfig({ ...config, products });
  };

  // Testimonials
  const addTestimonial = () => {
    if (!config) return;
    setConfig({ ...config, testimonials: [...(config.testimonials || []), { quote: '', author: '', role: '', stars: 5 }] });
  };
  const removeTestimonial = (idx: number) => {
    if (!config) return;
    setConfig({ ...config, testimonials: config.testimonials.filter((_, i) => i !== idx) });
  };
  const updateTestimonial = (idx: number, field: string, value: any) => {
    if (!config) return;
    const testimonials = [...config.testimonials];
    testimonials[idx] = { ...testimonials[idx], [field]: value };
    setConfig({ ...config, testimonials });
  };

  // Stats
  const addStat = () => {
    if (!config) return;
    setConfig({ ...config, stats: [...(config.stats || []), { value: 0, suffix: '', label: '' }] });
  };
  const removeStat = (idx: number) => {
    if (!config) return;
    setConfig({ ...config, stats: config.stats.filter((_, i) => i !== idx) });
  };
  const updateStat = (idx: number, field: string, value: any) => {
    if (!config) return;
    const stats = [...config.stats];
    stats[idx] = { ...stats[idx], [field]: field === 'value' ? Number(value) || 0 : value };
    setConfig({ ...config, stats });
  };

  // FAQs
  const addFaq = () => {
    if (!config) return;
    setConfig({ ...config, faqs: [...(config.faqs || []), { question: '', answer: '' }] });
  };
  const removeFaq = (idx: number) => {
    if (!config) return;
    setConfig({ ...config, faqs: config.faqs.filter((_, i) => i !== idx) });
  };
  const updateFaq = (idx: number, field: string, value: string) => {
    if (!config) return;
    const faqs = [...config.faqs];
    faqs[idx] = { ...faqs[idx], [field]: value };
    setConfig({ ...config, faqs });
  };

  // Pricing Cards
  const addPricingCard = () => {
    if (!config) return;
    setConfig({ ...config, pricingCards: [...(config.pricingCards || []), { name: '', price: '0', features: [], popular: false }] });
  };
  const removePricingCard = (idx: number) => {
    if (!config) return;
    setConfig({ ...config, pricingCards: config.pricingCards.filter((_, i) => i !== idx) });
  };
  const updatePricingCard = (idx: number, field: string, value: any) => {
    if (!config) return;
    const pricingCards = [...config.pricingCards];
    pricingCards[idx] = { ...pricingCards[idx], [field]: value };
    setConfig({ ...config, pricingCards });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-app-accent" />
      </div>
    );
  }

  if (!config) return null;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-app-fg">Landing Page</h1>
          <p className="text-sm text-app-muted mt-1">Bearbeite die Startseite von app.gästefotos.com</p>
        </div>
        <div className="flex gap-2">
          <a href="https://app.xn--gstefotos-v2a.com/" target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="outline">
              <Eye className="w-4 h-4 mr-1" /> Vorschau
            </Button>
          </a>
          <Button size="sm" variant="outline" onClick={loadConfig}>
            <RotateCcw className="w-4 h-4 mr-1" /> Zurücksetzen
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
            Speichern
          </Button>
        </div>
      </div>

      {/* Hero Section */}
      <Section title="Hero-Bereich">
        <Field label="Titel" value={config.heroTitle} onChange={(v) => updateField('heroTitle', v)} />
        <Field label="Untertitel" value={config.heroSubtitle} onChange={(v) => updateField('heroSubtitle', v)} multiline />
        <Field label="Announcement-Text (leer = ausblenden)" value={config.announcementText || ''} onChange={(v) => updateField('announcementText', v)} />
        <div className="grid grid-cols-2 gap-4">
          <Field label="CTA-Button Text" value={config.ctaButtonText} onChange={(v) => updateField('ctaButtonText', v)} />
          <Field label="CTA-Button Link" value={config.ctaButtonLink} onChange={(v) => updateField('ctaButtonLink', v)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Login-Button Text" value={config.loginButtonText} onChange={(v) => updateField('loginButtonText', v)} />
          <Field label="Demo-Button Text" value={config.demoButtonText} onChange={(v) => updateField('demoButtonText', v)} />
        </div>
        <Toggle label="Demo-Button anzeigen" checked={config.showDemoButton} onChange={(v) => updateField('showDemoButton', v)} />
      </Section>

      {/* Stats */}
      <Section title="Statistiken" action={<Button size="sm" variant="outline" onClick={addStat}><Plus className="w-4 h-4 mr-1" /> Stat</Button>}>
        <Toggle label="Statistik-Sektion anzeigen" checked={config.showStats ?? true} onChange={(v) => updateField('showStats', v)} />
        {(config.stats || []).map((s, i) => (
          <div key={i} className="flex gap-3 items-center p-3 rounded-xl bg-app-bg border border-app-border">
            <div className="flex-1 grid grid-cols-3 gap-2">
              <input type="number" value={s.value} onChange={(e) => updateStat(i, 'value', e.target.value)} className={inputCls} placeholder="10000" />
              <input value={s.suffix} onChange={(e) => updateStat(i, 'suffix', e.target.value)} className={inputCls} placeholder="+" />
              <input value={s.label} onChange={(e) => updateStat(i, 'label', e.target.value)} className={inputCls} placeholder="Events" />
            </div>
            <button onClick={() => removeStat(i)} className={deleteBtnCls}><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </Section>

      {/* Features */}
      <Section title="Features (eigene)" action={<Button size="sm" variant="outline" onClick={addFeature}><Plus className="w-4 h-4 mr-1" /> Feature</Button>}>
        <p className="text-xs text-app-muted">Eigene Feature-Cards werden oberhalb der eingebauten Features angezeigt.</p>
        {config.features.map((f, i) => (
          <div key={i} className="flex gap-3 items-start p-3 rounded-xl bg-app-bg border border-app-border">
            <div className="flex-1 space-y-2">
              <div className="grid grid-cols-[60px_1fr] gap-2">
                <input value={f.icon} onChange={(e) => updateFeature(i, 'icon', e.target.value)} className="px-2 py-1.5 text-center text-lg rounded-lg border border-app-border bg-app-card text-app-fg" placeholder="icon" />
                <input value={f.title} onChange={(e) => updateFeature(i, 'title', e.target.value)} className={inputCls} placeholder="Feature-Titel" />
              </div>
              <textarea value={f.description} onChange={(e) => updateFeature(i, 'description', e.target.value)} rows={2} className={`${inputCls} resize-none`} placeholder="Beschreibung" />
            </div>
            <button onClick={() => removeFeature(i)} className={deleteBtnCls}><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </Section>

      {/* Products */}
      <Section title="Produkte" action={<Button size="sm" variant="outline" onClick={addProduct}><Plus className="w-4 h-4 mr-1" /> Produkt</Button>}>
        <Toggle label="Produkte-Sektion anzeigen" checked={config.showProducts ?? true} onChange={(v) => updateField('showProducts', v)} />
        {(config.products || []).map((p, i) => (
          <div key={i} className="flex gap-3 items-start p-3 rounded-xl bg-app-bg border border-app-border">
            <div className="flex-1 space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <select value={p.icon} onChange={(e) => updateProduct(i, 'icon', e.target.value)} className={inputCls}>
                  {ICON_OPTIONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
                </select>
                <select value={p.color || 'blue'} onChange={(e) => updateProduct(i, 'color', e.target.value)} className={inputCls}>
                  {COLOR_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input value={p.badge || ''} onChange={(e) => updateProduct(i, 'badge', e.target.value)} className={inputCls} placeholder="Badge (NEU)" />
              </div>
              <input value={p.title} onChange={(e) => updateProduct(i, 'title', e.target.value)} className={inputCls} placeholder="Produkt-Titel" />
              <textarea value={p.description} onChange={(e) => updateProduct(i, 'description', e.target.value)} rows={2} className={`${inputCls} resize-none`} placeholder="Beschreibung" />
            </div>
            <button onClick={() => removeProduct(i)} className={deleteBtnCls}><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </Section>

      {/* Testimonials */}
      <Section title="Kundenstimmen" action={<Button size="sm" variant="outline" onClick={addTestimonial}><Plus className="w-4 h-4 mr-1" /> Testimonial</Button>}>
        <Toggle label="Kundenstimmen anzeigen" checked={config.showTestimonials ?? true} onChange={(v) => updateField('showTestimonials', v)} />
        {(config.testimonials || []).map((t, i) => (
          <div key={i} className="flex gap-3 items-start p-3 rounded-xl bg-app-bg border border-app-border">
            <div className="flex-1 space-y-2">
              <textarea value={t.quote} onChange={(e) => updateTestimonial(i, 'quote', e.target.value)} rows={2} className={`${inputCls} resize-none`} placeholder="Zitat" />
              <div className="grid grid-cols-3 gap-2">
                <input value={t.author} onChange={(e) => updateTestimonial(i, 'author', e.target.value)} className={inputCls} placeholder="Name" />
                <input value={t.role} onChange={(e) => updateTestimonial(i, 'role', e.target.value)} className={inputCls} placeholder="Rolle" />
                <select value={t.stars} onChange={(e) => updateTestimonial(i, 'stars', Number(e.target.value))} className={inputCls}>
                  {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} Sterne</option>)}
                </select>
              </div>
            </div>
            <button onClick={() => removeTestimonial(i)} className={deleteBtnCls}><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </Section>

      {/* Pricing */}
      <Section title="Preise" action={<Button size="sm" variant="outline" onClick={addPricingCard}><Plus className="w-4 h-4 mr-1" /> Paket</Button>}>
        <Toggle label="Preis-Sektion anzeigen" checked={config.showPricing ?? true} onChange={(v) => updateField('showPricing', v)} />
        <Field label="Titel" value={config.pricingTitle || ''} onChange={(v) => updateField('pricingTitle', v)} />
        <Field label="Untertitel" value={config.pricingSubtitle || ''} onChange={(v) => updateField('pricingSubtitle', v)} />
        {(config.pricingCards || []).map((p, i) => (
          <div key={i} className="flex gap-3 items-start p-3 rounded-xl bg-app-bg border border-app-border">
            <div className="flex-1 space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <input value={p.name} onChange={(e) => updatePricingCard(i, 'name', e.target.value)} className={inputCls} placeholder="Paket-Name" />
                <input value={p.price} onChange={(e) => updatePricingCard(i, 'price', e.target.value)} className={inputCls} placeholder="Preis" />
                <label className="flex items-center gap-2 text-sm text-app-fg">
                  <input type="checkbox" checked={p.popular} onChange={(e) => updatePricingCard(i, 'popular', e.target.checked)} className="rounded" />
                  Beliebt
                </label>
              </div>
              <textarea
                value={(p.features || []).join('\n')}
                onChange={(e) => updatePricingCard(i, 'features', e.target.value.split('\n'))}
                rows={3}
                className={`${inputCls} resize-none`}
                placeholder="Features (eine pro Zeile)"
              />
            </div>
            <button onClick={() => removePricingCard(i)} className={deleteBtnCls}><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </Section>

      {/* Badges */}
      <Section title="Trust-Badges" action={<Button size="sm" variant="outline" onClick={addBadge}><Plus className="w-4 h-4 mr-1" /> Badge</Button>}>
        {config.badges.map((b, i) => (
          <div key={i} className="flex gap-3 items-center p-3 rounded-xl bg-app-bg border border-app-border">
            <input value={b.icon} onChange={(e) => updateBadge(i, 'icon', e.target.value)} className="w-14 px-2 py-1.5 text-center text-lg rounded-lg border border-app-border bg-app-card text-app-fg" placeholder="icon" />
            <input value={b.label} onChange={(e) => updateBadge(i, 'label', e.target.value)} className={`flex-1 ${inputCls}`} placeholder="Badge-Label" />
            <button onClick={() => removeBadge(i)} className={deleteBtnCls}><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </Section>

      {/* FAQ */}
      <Section title="FAQ" action={<Button size="sm" variant="outline" onClick={addFaq}><Plus className="w-4 h-4 mr-1" /> Frage</Button>}>
        <Toggle label="FAQ-Sektion anzeigen" checked={config.showFaq ?? true} onChange={(v) => updateField('showFaq', v)} />
        {(config.faqs || []).map((f, i) => (
          <div key={i} className="flex gap-3 items-start p-3 rounded-xl bg-app-bg border border-app-border">
            <div className="flex-1 space-y-2">
              <input value={f.question} onChange={(e) => updateFaq(i, 'question', e.target.value)} className={inputCls} placeholder="Frage" />
              <textarea value={f.answer} onChange={(e) => updateFaq(i, 'answer', e.target.value)} rows={2} className={`${inputCls} resize-none`} placeholder="Antwort" />
            </div>
            <button onClick={() => removeFaq(i)} className={deleteBtnCls}><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </Section>

      {/* CTA Section */}
      <Section title="CTA-Bereich (unten)">
        <Field label="Titel" value={config.ctaSectionTitle} onChange={(v) => updateField('ctaSectionTitle', v)} />
        <Field label="Untertitel" value={config.ctaSectionSubtitle} onChange={(v) => updateField('ctaSectionSubtitle', v)} />
        <Field label="Button Text" value={config.ctaSectionButtonText} onChange={(v) => updateField('ctaSectionButtonText', v)} />
        <Toggle label="Demo-Button im CTA anzeigen" checked={config.showCtaDemoButton} onChange={(v) => updateField('showCtaDemoButton', v)} />
      </Section>

      {/* Bottom Save */}
      <div className="flex justify-end pb-8">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
          Landing Page speichern
        </Button>
      </div>
    </div>
  );
}

const inputCls = "w-full px-3 py-1.5 rounded-lg border border-app-border bg-app-card text-app-fg text-sm";
const deleteBtnCls = "p-1.5 rounded-lg hover:bg-destructive/10 text-app-muted hover:text-destructive transition-colors shrink-0 mt-1";

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-app-border bg-app-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-app-fg">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function Field({ label, value, onChange, multiline }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean }) {
  const cls = "w-full px-3 py-2 rounded-xl border border-app-border bg-app-bg text-app-fg text-sm focus:outline-none focus:ring-2 focus:ring-app-accent";
  return (
    <div>
      <label className="block text-xs font-medium text-app-muted mb-1">{label}</label>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} className={`${cls} resize-none`} />
      ) : (
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className={cls} />
      )}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-app-accent' : 'bg-app-border'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
      <span className="text-sm text-app-fg">{label}</span>
    </label>
  );
}
