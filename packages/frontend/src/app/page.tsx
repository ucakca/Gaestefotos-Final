'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import {
  Camera,
  Upload,
  QrCode,
  Shield,
  Zap,
  Users,
  Image as ImageIcon,
  Sparkles,
  Search,
  Grid3X3,
  Printer,
  Monitor,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Star,
  CheckCircle2,
  Heart,
  Globe,
  Lock,
  Leaf,
  Play,
} from 'lucide-react';

/* ─── Animated Counter ─── */
function AnimatedStat({ value, suffix = '', label }: { value: number; suffix?: string; label: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          let start = 0;
          const duration = 1800;
          const step = (ts: number) => {
            if (!start) start = ts;
            const progress = Math.min((ts - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * value));
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value]);

  return (
    <div ref={ref} className="text-center">
      <div className="text-4xl md:text-5xl font-bold text-foreground">
        {count.toLocaleString('de-DE')}{suffix}
      </div>
      <div className="text-sm text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

/* ─── FAQ Item ─── */
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-4 text-left text-foreground font-medium text-sm md:text-base hover:text-primary transition-colors"
      >
        {q}
        <ChevronDown className={`w-4 h-4 flex-shrink-0 ml-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="pb-4 text-sm text-muted-foreground leading-relaxed">
          {a}
        </div>
      )}
    </div>
  );
}

/* ─── Demo Button ─── */
function DemoButton({ label, size = 'lg', variant = 'outline' }: { label: string; size?: 'lg' | 'xl'; variant?: 'outline' | 'secondary' }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  const handleDemo = async () => {
    setCreating(true);
    try {
      const res = await fetch('/api/demo/create', { method: 'POST' });
      const data = await res.json();
      if (data?.slug) {
        router.push(`/e3/${data.slug}`);
      }
    } catch {
      // ignore
    } finally {
      setCreating(false);
    }
  };

  return (
    <Button size={size} variant={variant} loading={creating} onClick={handleDemo}>
      <Play className="w-4 h-4" />
      {label}
    </Button>
  );
}

/* ─── Product Card ─── */
function ProductCard({ icon: Icon, title, description, badge, color }: {
  icon: React.FC<any>;
  title: string;
  description: string;
  badge?: string;
  color: string;
}) {
  return (
    <div className="group relative bg-card rounded-2xl border border-border p-6 hover:shadow-xl hover:border-primary/30 transition-all duration-300">
      {badge && (
        <span className="absolute -top-2.5 right-4 text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-primary text-primary-foreground">
          {badge}
        </span>
      )}
      <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

/* ─── How It Works Step ─── */
function HowStep({ num, title, desc }: { num: number; title: string; desc: string }) {
  return (
    <div className="flex gap-4 items-start">
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 text-primary font-bold text-lg flex items-center justify-center">
        {num}
      </div>
      <div>
        <h4 className="font-semibold text-foreground mb-1">{title}</h4>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}

/* ─── Icon & Color Maps for dynamic products ─── */
const ICON_MAP: Record<string, React.FC<any>> = {
  Camera, Sparkles, Grid3X3, ImageIcon, Printer, Globe, Upload, Shield, Search, Monitor, Heart, Zap, Star, Lock, Leaf,
};

const COLOR_MAP: Record<string, string> = {
  blue: 'bg-gradient-to-br from-blue-500 to-blue-600',
  violet: 'bg-gradient-to-br from-violet-500 to-purple-600',
  emerald: 'bg-gradient-to-br from-emerald-500 to-teal-600',
  amber: 'bg-gradient-to-br from-amber-500 to-orange-600',
  rose: 'bg-gradient-to-br from-rose-500 to-pink-600',
  cyan: 'bg-gradient-to-br from-cyan-500 to-sky-600',
  red: 'bg-gradient-to-br from-red-500 to-red-600',
  green: 'bg-gradient-to-br from-green-500 to-green-600',
  indigo: 'bg-gradient-to-br from-indigo-500 to-indigo-600',
  pink: 'bg-gradient-to-br from-pink-500 to-pink-600',
};

/* ─── Admin-configurable Landing Config ─── */
interface LandingConfig {
  heroTitle: string;
  heroSubtitle: string;
  ctaButtonText: string;
  ctaButtonLink: string;
  loginButtonText: string;
  demoButtonText: string;
  showDemoButton: boolean;
  announcementText: string;
  features: { icon: string; title: string; description: string }[];
  badges: { icon: string; label: string }[];
  products: { icon: string; title: string; description: string; badge?: string; color?: string }[];
  showProducts: boolean;
  testimonials: { quote: string; author: string; role: string; stars: number }[];
  showTestimonials: boolean;
  stats: { value: number; suffix: string; label: string }[];
  showStats: boolean;
  faqs: { question: string; answer: string }[];
  showFaq: boolean;
  pricingCards: { name: string; price: string; features: string[]; popular: boolean }[];
  showPricing: boolean;
  pricingTitle: string;
  pricingSubtitle: string;
  ctaSectionTitle: string;
  ctaSectionSubtitle: string;
  ctaSectionButtonText: string;
  showCtaDemoButton: boolean;
}

const DEFAULTS: LandingConfig = {
  heroTitle: 'Event-Fotos, die begeistern',
  heroSubtitle: 'Die All-in-One Plattform für Hochzeiten, Firmenevents & Feiern. Gäste laden Fotos hoch, du moderierst — alles in Echtzeit, schön und sicher.',
  ctaButtonText: 'Jetzt kostenlos starten',
  ctaButtonLink: '/register',
  loginButtonText: 'Login',
  demoButtonText: 'Live-Demo ansehen',
  showDemoButton: true,
  announcementText: 'NEU: KI Foto-Booth & Mosaic Wall jetzt verfügbar',
  features: [],
  badges: [
    { icon: '🇦🇹', label: 'Made in Austria' },
    { icon: '🇪🇺', label: 'EU-Hosting' },
    { icon: '🔒', label: 'DSGVO-konform' },
    { icon: '🌱', label: 'Green Hosting' },
  ],
  products: [
    { icon: 'Camera', title: 'Photo Booth', description: 'Professionelle Fotobox mit Touchscreen, DSLR-Kamera und sofortigem Druck.', color: 'blue' },
    { icon: 'Sparkles', title: 'KI Booth', description: 'KI-generierte Foto-Stile in Echtzeit. Comic, Gemälde oder Retro-Look.', badge: 'NEU', color: 'violet' },
    { icon: 'Grid3X3', title: 'Mosaic Wall', description: 'Hunderte Fotos formen ein großes Kunstwerk — digital oder gedruckt.', badge: 'BELIEBT', color: 'emerald' },
    { icon: 'ImageIcon', title: 'Mirror Booth', description: 'Ganzkörper-Spiegel mit interaktivem Touchscreen und Sofort-Druck.', color: 'amber' },
    { icon: 'Printer', title: 'Print Service', description: 'Sofort-Druck vor Ort. Fotos als Erinnerung zum Mitnehmen.', color: 'rose' },
    { icon: 'Globe', title: 'Online-Galerie', description: 'Schöne Galerie für jeden Event. Teilen, liken & downloaden.', color: 'cyan' },
  ],
  showProducts: true,
  testimonials: [
    { quote: 'Die beste Lösung für unsere Hochzeit! Die Gäste waren begeistert vom QR-Code Upload und der Live-Wall.', author: 'Sarah & Michael', role: 'Hochzeit, Wien', stars: 5 },
    { quote: 'Wir nutzen gästefotos für alle unsere Firmenevents. Die Mosaic Wall ist jedes Mal das Highlight.', author: 'Thomas K.', role: 'Event-Manager, BMW', stars: 5 },
    { quote: 'Einfach, schön und zuverlässig. Face Search ist genial — jeder Gast findet sofort seine Fotos.', author: 'Lisa M.', role: 'Geburtstagsfeier, Graz', stars: 5 },
  ],
  showTestimonials: true,
  stats: [
    { value: 10000, suffix: '+', label: 'Events erstellt' },
    { value: 2500000, suffix: '+', label: 'Fotos geteilt' },
    { value: 99, suffix: '%', label: 'Zufriedenheit' },
    { value: 50, suffix: 'ms', label: 'Upload-Speed' },
  ],
  showStats: true,
  faqs: [
    { question: 'Brauchen Gäste eine App?', answer: 'Nein! Gäste scannen einfach den QR-Code und landen direkt auf deiner Event-Seite.' },
    { question: 'Wie viele Fotos können hochgeladen werden?', answer: 'Im Free-Plan bis zu 50 Fotos. Ab dem Basic-Plan gibt es kein Limit.' },
    { question: 'Ist mein Event privat?', answer: 'Ja. Dein Event ist nur über den QR-Code oder direkten Link erreichbar. Optional mit Passwort.' },
    { question: 'Kann ich Fotos moderieren?', answer: 'Absolut. Du kannst jedes Foto vor der Veröffentlichung prüfen, löschen oder kategorisieren.' },
    { question: 'Wie funktioniert Face Search?', answer: 'Gäste machen ein Selfie, und unsere KI findet alle Fotos auf denen sie zu sehen sind. Kostenlos.' },
    { question: 'Wo werden meine Daten gespeichert?', answer: 'EU-Rechenzentrum in Österreich. Vollständig DSGVO-konform mit SSL-Verschlüsselung.' },
  ],
  showFaq: true,
  pricingCards: [
    { name: 'Free', price: '0', features: ['50 Fotos', 'QR-Upload', 'Face Search', '7 Tage Galerie'], popular: false },
    { name: 'Smart', price: '99', features: ['Unbegrenzt Fotos', 'Live-Wall', 'Gästebuch', '90 Tage Galerie', 'Video-Upload', '3 Co-Hosts'], popular: true },
    { name: 'Premium', price: '199', features: ['Alles aus Smart', 'Werbefrei', '180 Tage Galerie', '10 Co-Hosts', 'Prioritäts-Support'], popular: false },
  ],
  showPricing: true,
  pricingTitle: 'Transparent & fair',
  pricingSubtitle: 'Starte kostenlos mit bis zu 50 Fotos. Upgrades ab 49€ pro Event.',
  ctaSectionTitle: 'Bereit für dein nächstes Event?',
  ctaSectionSubtitle: 'Erstelle dein erstes Event in unter 2 Minuten. Kostenlos, ohne Kreditkarte.',
  ctaSectionButtonText: 'Kostenlos registrieren',
  showCtaDemoButton: true,
};

/* ═══════════════════════════════════════════════ */
/*                 LANDING PAGE                    */
/* ═══════════════════════════════════════════════ */

export default function Home() {
  const [cfg, setCfg] = useState<LandingConfig>(DEFAULTS);

  useEffect(() => {
    fetch('/api/landing/config')
      .then((r) => r.json())
      .then((d) => { if (d?.config) setCfg({ ...DEFAULTS, ...d.config }); })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">

      {/* ─── Navigation Bar ─── */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-foreground">
            <Camera className="w-5 h-5 text-primary" />
            <span className="text-lg">g&auml;stefotos</span>
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#products" className="hover:text-foreground transition-colors">Produkte</a>
            <a href="#how" className="hover:text-foreground transition-colors">So funktioniert&apos;s</a>
            <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm">{cfg.loginButtonText}</Button>
            </Link>
            <Link href="/register">
              <Button variant="primary" size="sm">Kostenlos starten</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero Section ─── */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-28">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4 text-center relative">
          {cfg.announcementText && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              {cfg.announcementText}
            </div>
          )}

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground leading-tight mb-6">
            <span className="bg-gradient-to-r from-primary via-emerald-500 to-teal-500 bg-clip-text text-transparent">
              {cfg.heroTitle}
            </span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            {cfg.heroSubtitle}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-12">
            <Link href={cfg.ctaButtonLink}>
              <Button size="xl" variant="primary">
                {cfg.ctaButtonText}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            {cfg.showDemoButton && <DemoButton label={cfg.demoButtonText} size="xl" variant="outline" />}
          </div>

          {/* Trust indicators inline */}
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Kostenlos starten</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Keine Kreditkarte n&ouml;tig</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> DSGVO-konform</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Made in Austria</span>
          </div>
        </div>
      </section>

      {/* ─── Stats Section (admin-configurable) ─── */}
      {cfg.showStats && cfg.stats.length > 0 && (
        <section className="py-12 border-y border-border/50 bg-muted/30">
          <div className="max-w-4xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8">
            {cfg.stats.map((s, i) => (
              <AnimatedStat key={i} value={s.value} suffix={s.suffix} label={s.label} />
            ))}
          </div>
        </section>
      )}

      {/* ─── Core Features (static defaults + admin-configurable extras) ─── */}
      <section id="features" className="py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Alles was dein Event braucht</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Von der Einladung bis zum Download &mdash; eine Plattform f&uuml;r alles.</p>
          </div>

          {/* Admin-configured features (from /manage/landing) */}
          {cfg.features.length > 0 && (
            <div className={`grid gap-6 mb-8 ${cfg.features.length === 1 ? '' : cfg.features.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
              {cfg.features.map((f, i) => (
                <FeatureCard key={i} icon={<span className="text-lg">{f.icon}</span>} title={f.title} description={f.description} />
              ))}
            </div>
          )}

          {/* Built-in feature highlights */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Upload className="w-5 h-5" />}
              title="QR-Code Upload"
              description="G&auml;ste scannen den QR-Code und laden Fotos direkt hoch. Kein App-Download n&ouml;tig."
            />
            <FeatureCard
              icon={<Shield className="w-5 h-5" />}
              title="Foto-Moderation"
              description="Du entscheidest, welche Fotos ver&ouml;ffentlicht werden. Volle Kontrolle &uuml;ber deinen Content."
            />
            <FeatureCard
              icon={<Search className="w-5 h-5" />}
              title="Face Search"
              description="G&auml;ste finden ihre Fotos per Selfie. KI-gest&uuml;tzte Gesichtserkennung &mdash; kostenlos f&uuml;r alle."
            />
            <FeatureCard
              icon={<Monitor className="w-5 h-5" />}
              title="Live-Wall"
              description="Zeige neue Fotos in Echtzeit auf einem Bildschirm. Perfekt f&uuml;r Hochzeiten &amp; Firmenfeiern."
            />
            <FeatureCard
              icon={<Heart className="w-5 h-5" />}
              title="G&auml;stebuch"
              description="Fotos + Nachrichten in einem digitalen G&auml;stebuch. Erinnerungen, die bleiben."
            />
            <FeatureCard
              icon={<Zap className="w-5 h-5" />}
              title="Foto-Spa&szlig;"
              description="Challenges, KI Foto-Stile &amp; interaktive Spiele. Mehr Engagement, mehr Fotos."
            />
          </div>
        </div>
      </section>

      {/* ─── Products Showcase (admin-configurable) ─── */}
      {cfg.showProducts && cfg.products.length > 0 && (
        <section id="products" className="py-20 md:py-28 bg-muted/20">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Unsere Produkte</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">Hardware &amp; Software f&uuml;r unvergessliche Events.</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cfg.products.map((p, i) => (
                <ProductCard
                  key={i}
                  icon={ICON_MAP[p.icon] || Camera}
                  title={p.title}
                  description={p.description}
                  badge={p.badge}
                  color={COLOR_MAP[p.color || 'blue'] || COLOR_MAP.blue}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── How It Works ─── */}
      <section id="how" className="py-20 md:py-28">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">So einfach geht&apos;s</h2>
            <p className="text-muted-foreground">In 3 Schritten zum perfekten Event.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-10">
            <HowStep num={1} title="Event erstellen" desc="Name, Datum, Design w&auml;hlen. Dein Event ist in unter 2 Minuten online." />
            <HowStep num={2} title="QR-Code teilen" desc="Drucke den QR-Code aus oder teile den Link. G&auml;ste brauchen keine App." />
            <HowStep num={3} title="Fotos genie&szlig;en" desc="G&auml;ste laden hoch, du moderierst. Live-Wall, G&auml;stebuch &amp; Downloads inklusive." />
          </div>

          <div className="text-center mt-12">
            <DemoButton label="Jetzt ausprobieren" size="lg" variant="outline" />
          </div>
        </div>
      </section>

      {/* ─── Social Proof (admin-configurable) ─── */}
      {cfg.showTestimonials && cfg.testimonials.length > 0 && (
        <section className="py-20 md:py-28 bg-muted/20">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Was unsere Kunden sagen</h2>
            </div>
            <div className={`grid gap-6 ${cfg.testimonials.length === 1 ? '' : cfg.testimonials.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
              {cfg.testimonials.map((t, i) => (
                <TestimonialCard key={i} quote={t.quote} author={t.author} role={t.role} stars={t.stars} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Pricing Teaser (admin-configurable) ─── */}
      {cfg.showPricing && cfg.pricingCards.length > 0 && (
        <section className="py-20 md:py-28">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">{cfg.pricingTitle}</h2>
            {cfg.pricingSubtitle && (
              <p className="text-muted-foreground max-w-xl mx-auto mb-10">{cfg.pricingSubtitle}</p>
            )}
            <div className={`grid gap-6 ${cfg.pricingCards.length === 1 ? '' : cfg.pricingCards.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
              {cfg.pricingCards.map((p, i) => (
                <PricingCard key={i} name={p.name} price={p.price} features={p.features} popular={p.popular} />
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-6">
              Hardware Add-ons (Photo Booth, Mosaic Wall, etc.) separat buchbar. <Link href="/partner" className="text-primary hover:underline">Partner-Preise &rarr;</Link>
            </p>
          </div>
        </section>
      )}

      {/* ─── Trust Badges (admin-configurable) ─── */}
      <section className="py-12 border-y border-border/50 bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 flex flex-wrap justify-center gap-8">
          {cfg.badges.map((b, i) => (
            <TrustBadge key={i} icon={<span className="text-lg">{b.icon}</span>} label={b.label} />
          ))}
        </div>
      </section>

      {/* ─── FAQ (admin-configurable) ─── */}
      {cfg.showFaq && cfg.faqs.length > 0 && (
        <section id="faq" className="py-20 md:py-28">
          <div className="max-w-3xl mx-auto px-4">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">H&auml;ufige Fragen</h2>
            </div>
            <div className="bg-card rounded-2xl border border-border p-6 md:p-8">
              {cfg.faqs.map((f, i) => (
                <FaqItem key={i} q={f.question} a={f.answer} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Final CTA (admin-configurable) ─── */}
      <section className="py-20 md:py-28 relative">
        <div className="absolute inset-0 bg-gradient-to-t from-primary/5 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-3xl mx-auto px-4 text-center relative">
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
            {cfg.ctaSectionTitle}
          </h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
            {cfg.ctaSectionSubtitle}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href={cfg.ctaButtonLink}>
              <Button size="xl" variant="primary">
                {cfg.ctaSectionButtonText}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            {cfg.showCtaDemoButton && <DemoButton label={cfg.demoButtonText} size="xl" variant="secondary" />}
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-border py-10 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 font-bold text-foreground mb-3">
                <Camera className="w-4 h-4 text-primary" />
                g&auml;stefotos
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Die professionelle Plattform f&uuml;r Event-Fotografie. Made with love in Austria.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground text-sm mb-3">Produkt</h4>
              <div className="space-y-2 text-xs text-muted-foreground">
                <Link href="/register" className="block hover:text-foreground transition-colors">Kostenlos starten</Link>
                <a href="#products" className="block hover:text-foreground transition-colors">Produkte</a>
                <Link href="/partner" className="block hover:text-foreground transition-colors">F&uuml;r Partner</Link>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-foreground text-sm mb-3">Support</h4>
              <div className="space-y-2 text-xs text-muted-foreground">
                <a href="#faq" className="block hover:text-foreground transition-colors">FAQ</a>
                <Link href="/datenschutz" className="block hover:text-foreground transition-colors">Datenschutz</Link>
                <Link href="/agb" className="block hover:text-foreground transition-colors">AGB</Link>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-foreground text-sm mb-3">Rechtliches</h4>
              <div className="space-y-2 text-xs text-muted-foreground">
                <Link href="/impressum" className="block hover:text-foreground transition-colors">Impressum</Link>
                <Link href="/datenschutz" className="block hover:text-foreground transition-colors">Datenschutzerkl&auml;rung</Link>
                <Link href="/cookies" className="block hover:text-foreground transition-colors">Cookie-Richtlinie</Link>
                <button
                  type="button"
                  onClick={() => {
                    document.cookie = 'gf_consent=; path=/; max-age=0';
                    window.location.reload();
                  }}
                  className="block hover:text-foreground transition-colors text-left"
                >
                  Cookie-Einstellungen
                </button>
              </div>
            </div>
          </div>
          <div className="border-t border-border pt-6 text-center text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} g&auml;stefotos.com &mdash; Alle Rechte vorbehalten.
          </div>
        </div>
      </footer>

    </div>
  );
}

/* ─── Sub-Components ─── */

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="group bg-card rounded-2xl border border-border p-5 hover:shadow-lg hover:border-primary/20 transition-all duration-300">
      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3 group-hover:bg-primary group-hover:text-white transition-colors">
        {icon}
      </div>
      <h3 className="font-semibold text-foreground mb-1.5">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

function TestimonialCard({ quote, author, role, stars }: { quote: string; author: string; role: string; stars: number }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-6">
      <div className="flex gap-0.5 mb-3">
        {Array.from({ length: stars }).map((_, i) => (
          <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
        ))}
      </div>
      <p className="text-sm text-foreground leading-relaxed mb-4">&ldquo;{quote}&rdquo;</p>
      <div>
        <div className="text-sm font-semibold text-foreground">{author}</div>
        <div className="text-xs text-muted-foreground">{role}</div>
      </div>
    </div>
  );
}

function TrustBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <div className="text-primary">{icon}</div>
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

function PricingCard({ name, price, features, popular }: { name: string; price: string; features: string[]; popular?: boolean }) {
  return (
    <div className={`rounded-2xl border p-6 text-left ${popular ? 'border-primary shadow-lg ring-1 ring-primary/20 bg-card' : 'border-border bg-card'}`}>
      {popular && (
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary text-primary-foreground mb-3 inline-block">BELIEBT</span>
      )}
      <h3 className="text-lg font-bold text-foreground">{name}</h3>
      <div className="mt-2 mb-4">
        <span className="text-3xl font-bold text-foreground">{price}&euro;</span>
        <span className="text-sm text-muted-foreground"> / Event</span>
      </div>
      <ul className="space-y-2 mb-6">
        {features.map((f, i) => (
          <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
            <span dangerouslySetInnerHTML={{ __html: f }} />
          </li>
        ))}
      </ul>
      <Link href="/register" className="block">
        <Button variant={popular ? 'primary' : 'outline'} size="md" className="w-full">
          {price === '0' ? 'Kostenlos starten' : 'Paket w&auml;hlen'}
        </Button>
      </Link>
    </div>
  );
}
