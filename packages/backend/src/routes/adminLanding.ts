import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';
import { auditLog, AuditType } from '../services/auditLogger';

const router = Router();

const LANDING_KEY = 'landing_page_config';

const badgeSchema = z.object({ icon: z.string(), label: z.string() });
const featureSchema = z.object({ icon: z.string(), title: z.string(), description: z.string() });
const productSchema = z.object({ icon: z.string(), title: z.string(), description: z.string(), badge: z.string().optional(), color: z.string().optional() });
const testimonialSchema = z.object({ quote: z.string(), author: z.string(), role: z.string(), stars: z.number().min(1).max(5).default(5) });
const statSchema = z.object({ value: z.number(), suffix: z.string().default(''), label: z.string() });
const faqSchema = z.object({ question: z.string(), answer: z.string() });
const pricingCardSchema = z.object({ name: z.string(), price: z.string(), features: z.array(z.string()), popular: z.boolean().default(false) });

const landingSchema = z.object({
  heroTitle: z.string().min(1).default('Event-Fotos, die begeistern'),
  heroSubtitle: z.string().default(''),
  ctaButtonText: z.string().default('Jetzt kostenlos starten'),
  ctaButtonLink: z.string().default('/register'),
  loginButtonText: z.string().default('Login'),
  demoButtonText: z.string().default('Live-Demo ansehen'),
  showDemoButton: z.boolean().default(true),
  announcementText: z.string().default(''),
  features: z.array(featureSchema).default([]),
  badges: z.array(badgeSchema).default([]),
  products: z.array(productSchema).default([]),
  showProducts: z.boolean().default(true),
  testimonials: z.array(testimonialSchema).default([]),
  showTestimonials: z.boolean().default(true),
  stats: z.array(statSchema).default([]),
  showStats: z.boolean().default(true),
  faqs: z.array(faqSchema).default([]),
  showFaq: z.boolean().default(true),
  pricingCards: z.array(pricingCardSchema).default([]),
  showPricing: z.boolean().default(true),
  pricingTitle: z.string().default('Transparent & fair'),
  pricingSubtitle: z.string().default(''),
  ctaSectionTitle: z.string().default('Bereit loszulegen?'),
  ctaSectionSubtitle: z.string().default(''),
  ctaSectionButtonText: z.string().default('Kostenlos registrieren'),
  showCtaDemoButton: z.boolean().default(true),
});

const DEFAULTS: Record<string, any> = {
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

// GET landing config (Admin)
router.get('/', authMiddleware, requireRole('ADMIN'), async (_req: AuthRequest, res: Response) => {
  const row = await prisma.appSetting.findUnique({ where: { key: LANDING_KEY } });
  const config = row ? { ...DEFAULTS, ...(row.value as any) } : DEFAULTS;
  res.json({ config });
});

// PUT landing config (Admin)
router.put('/', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  const parsed = landingSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Ungültige Konfiguration', details: parsed.error.errors });
  }

  const config = await prisma.appSetting.upsert({
    where: { key: LANDING_KEY },
    create: { key: LANDING_KEY, value: parsed.data as any },
    update: { value: parsed.data as any },
  });

  auditLog({ type: AuditType.ADMIN_SETTINGS_CHANGED, message: 'Landing Page Konfiguration geändert', data: parsed.data, req });

  res.json({ config: config.value });
});

export default router;
