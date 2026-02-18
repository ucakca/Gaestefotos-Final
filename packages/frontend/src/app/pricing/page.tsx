'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Check, X, Camera, Video, Users, Sparkles, Shield, Zap,
  Star, Crown, ChevronRight, ArrowRight,
} from 'lucide-react';

interface PricingTier {
  name: string;
  price: string;
  priceNote: string;
  description: string;
  icon: any;
  color: string;
  popular?: boolean;
  features: { text: string; included: boolean }[];
  cta: string;
}

const tiers: PricingTier[] = [
  {
    name: 'Free',
    price: '0€',
    priceNote: 'Für immer kostenlos',
    description: 'Perfekt zum Ausprobieren',
    icon: Camera,
    color: 'from-gray-500 to-gray-600',
    features: [
      { text: 'Bis zu 50 Fotos', included: true },
      { text: '7 Tage Galerie', included: true },
      { text: '1 Album', included: true },
      { text: '1 Foto-Challenge', included: true },
      { text: 'Face Search', included: true },
      { text: 'Video-Upload', included: false },
      { text: 'Gästebuch', included: false },
      { text: 'ZIP-Download', included: false },
      { text: 'Werbefrei', included: false },
    ],
    cta: 'Kostenlos starten',
  },
  {
    name: 'Basic',
    price: '49€',
    priceNote: 'pro Event',
    description: 'Für kleine Feiern',
    icon: Star,
    color: 'from-blue-500 to-blue-600',
    features: [
      { text: 'Unbegrenzte Fotos', included: true },
      { text: '30 Tage Galerie', included: true },
      { text: '3 Alben', included: true },
      { text: '3 Foto-Challenges', included: true },
      { text: 'Face Search', included: true },
      { text: 'Passwortschutz', included: true },
      { text: 'Gästebuch', included: true },
      { text: 'ZIP-Download', included: true },
      { text: 'Werbefrei', included: false },
    ],
    cta: 'Basic wählen',
  },
  {
    name: 'Smart',
    price: '99€',
    priceNote: 'pro Event',
    description: 'Für Hochzeiten & größere Events',
    icon: Zap,
    color: 'from-purple-500 to-purple-600',
    popular: true,
    features: [
      { text: 'Unbegrenzte Fotos & Videos', included: true },
      { text: '90 Tage Galerie', included: true },
      { text: '6 Alben', included: true },
      { text: '6 Foto-Challenges', included: true },
      { text: 'Face Search', included: true },
      { text: 'Live Wall & Diashow', included: true },
      { text: 'Einladungen versenden', included: true },
      { text: '3 Co-Hosts', included: true },
      { text: 'Werbefrei', included: false },
    ],
    cta: 'Smart wählen',
  },
  {
    name: 'Premium',
    price: '199€',
    priceNote: 'pro Event',
    description: 'Das Komplett-Paket',
    icon: Crown,
    color: 'from-amber-500 to-orange-600',
    features: [
      { text: 'Unbegrenzte Fotos & Videos', included: true },
      { text: '180 Tage Galerie', included: true },
      { text: 'Unbegrenzte Alben', included: true },
      { text: 'Unbegrenzte Challenges', included: true },
      { text: 'Face Search', included: true },
      { text: 'Live Wall & Diashow', included: true },
      { text: '10 Co-Hosts', included: true },
      { text: 'Prioritäts-Support', included: true },
      { text: 'Werbefrei', included: true },
    ],
    cta: 'Premium wählen',
  },
];

const addons = [
  { name: 'Mosaic Wall Digital', price: '199€', desc: 'Digitale Fotomosaik-Wand für Events' },
  { name: 'Mosaic Wall + Print', price: '599€', desc: 'Inkl. Drucker, Tablet, Banner & Wand' },
  { name: 'Photo Booth', price: '449€', desc: 'Klassische Fotobox mit Requisiten' },
  { name: 'Mirror Booth', price: '549€', desc: 'Interaktiver Spiegel-Booth' },
  { name: 'KI Booth', price: '599€', desc: 'KI-gestützte Kunst-Effekte' },
  { name: 'Highlight Reel', price: '49€', desc: 'Automatisches Event-Video' },
];

export default function PricingPage() {
  const router = useRouter();
  const [annual, setAnnual] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/90 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-3">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ChevronRight className="w-5 h-5 rotate-180" />
            <span className="text-sm font-medium">Zurück</span>
          </button>
          <a href="/register" className="px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors">
            Kostenlos starten
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="text-center py-16 px-4">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl sm:text-4xl font-bold text-foreground mb-4"
        >
          Einfache, faire Preise
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-muted-foreground text-lg max-w-xl mx-auto"
        >
          Keine versteckten Kosten. Keine Mindestlaufzeit. Jederzeit kündbar.
        </motion.p>
      </section>

      {/* Pricing Cards */}
      <section className="max-w-7xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {tiers.map((tier, i) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i }}
              className={`relative rounded-2xl border bg-card p-6 flex flex-col ${
                tier.popular ? 'border-purple-400 shadow-lg shadow-purple-500/10 ring-1 ring-purple-400' : 'border-border'
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-purple-500 text-white text-xs font-bold">
                  Beliebt
                </div>
              )}
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tier.color} flex items-center justify-center mb-4`}>
                <tier.icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-bold text-foreground">{tier.name}</h3>
              <p className="text-sm text-muted-foreground mb-4">{tier.description}</p>
              <div className="mb-6">
                <span className="text-3xl font-bold text-foreground">{tier.price}</span>
                <span className="text-sm text-muted-foreground ml-1">{tier.priceNote}</span>
              </div>
              <ul className="space-y-2.5 mb-6 flex-1">
                {tier.features.map((f, j) => (
                  <li key={j} className="flex items-center gap-2 text-sm">
                    {f.included ? (
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                    )}
                    <span className={f.included ? 'text-foreground' : 'text-muted-foreground/60'}>{f.text}</span>
                  </li>
                ))}
              </ul>
              <a
                href="/register"
                className={`w-full py-2.5 rounded-xl text-center text-sm font-semibold transition-colors ${
                  tier.popular
                    ? 'bg-purple-500 text-white hover:bg-purple-600'
                    : 'bg-muted text-foreground hover:bg-muted/80'
                }`}
              >
                {tier.cta}
              </a>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Add-ons */}
      <section className="max-w-5xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-bold text-foreground text-center mb-2">Hardware Add-ons</h2>
        <p className="text-muted-foreground text-center mb-8">Erweitere dein Event mit professioneller Hardware</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {addons.map((addon, i) => (
            <motion.div
              key={addon.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
              className="flex items-center gap-4 p-4 rounded-2xl border border-border bg-card hover:border-blue-300 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-foreground">{addon.name}</div>
                <div className="text-xs text-muted-foreground">{addon.desc}</div>
              </div>
              <div className="text-lg font-bold text-foreground whitespace-nowrap">{addon.price}</div>
            </motion.div>
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground mt-4">
          Alle Preise zzgl. MwSt. · Hardware-Add-ons inkl. Smart-Paket
        </p>
      </section>

      {/* CTA */}
      <section className="text-center py-16 px-4 bg-gradient-to-b from-transparent to-muted/30">
        <h2 className="text-2xl font-bold text-foreground mb-3">Bereit für dein Event?</h2>
        <p className="text-muted-foreground mb-6">Starte kostenlos und upgrade jederzeit.</p>
        <a
          href="/register"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-500 text-white font-semibold hover:bg-blue-600 transition-colors"
        >
          Jetzt loslegen <ArrowRight className="w-4 h-4" />
        </a>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4 text-center text-sm text-muted-foreground">
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <a href="/impressum" className="hover:text-foreground">Impressum</a>
          <a href="/datenschutz" className="hover:text-foreground">Datenschutz</a>
          <a href="/agb" className="hover:text-foreground">AGB</a>
          <a href="/cookies" className="hover:text-foreground">Cookies</a>
          <a href="/faq" className="hover:text-foreground">FAQ</a>
        </div>
      </footer>
    </div>
  );
}
