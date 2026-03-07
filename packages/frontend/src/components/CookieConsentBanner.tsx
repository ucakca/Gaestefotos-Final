'use client';

import { useState, useEffect, useCallback } from 'react';
import { Shield, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { useLocale } from '@/components/I18nProvider';
import {
  readConsent,
  saveConsent,
  hasConsentDecision,
  DEFAULT_CHOICES,
  ALL_CHOICES,
  CONSENT_CATEGORIES,
  type ConsentChoices,
} from '@/lib/consent';

export default function CookieConsentBanner() {
  const locale = useLocale();
  const isDE = locale === 'de';

  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [choices, setChoices] = useState<ConsentChoices>({ ...DEFAULT_CHOICES });

  useEffect(() => {
    // Only show if no consent decision has been made yet
    if (!hasConsentDecision()) {
      // Small delay to avoid layout shift on initial render
      const timer = setTimeout(() => setVisible(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = useCallback(() => {
    saveConsent(ALL_CHOICES);
    setVisible(false);
  }, []);

  const handleAcceptSelected = useCallback(() => {
    saveConsent(choices);
    setVisible(false);
  }, [choices]);

  const handleDenyAll = useCallback(() => {
    saveConsent(DEFAULT_CHOICES);
    setVisible(false);
  }, []);

  const toggleCategory = useCallback((key: keyof ConsentChoices) => {
    if (key === 'necessary') return; // can't toggle necessary
    setChoices((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[2147483647] p-3 sm:p-4 pointer-events-none">
      <div className="pointer-events-auto mx-auto max-w-2xl rounded-2xl bg-card border border-border shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold text-foreground">
                {isDE ? 'Datenschutz-Einstellungen' : 'Privacy Settings'}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                {isDE
                  ? 'Wir verwenden Cookies und ähnliche Technologien. Du kannst wählen, welche Kategorien du erlaubst.'
                  : 'We use cookies and similar technologies. You can choose which categories to allow.'}
              </p>
              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-primary dark:text-primary">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />
                {isDE
                  ? 'Alle Fotos & Videos werden in der EU verarbeitet'
                  : 'All photos & videos are processed in the EU'}
              </div>
            </div>
          </div>
        </div>

        {/* Details toggle */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full px-5 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
        >
          {showDetails
            ? (isDE ? 'Details ausblenden' : 'Hide details')
            : (isDE ? 'Details anzeigen' : 'Show details')}
          {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {/* Category details */}
        {showDetails && (
          <div className="px-5 pb-3 space-y-3 max-h-[40vh] overflow-y-auto">
            {CONSENT_CATEGORIES.map((cat) => (
              <div
                key={cat.key}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {isDE ? cat.titleDe : cat.titleEn}
                    </span>
                    {cat.required && (
                      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {isDE ? 'Immer aktiv' : 'Always active'}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                    {isDE ? cat.descDe : cat.descEn}
                  </p>
                </div>
                <label className="flex-shrink-0 relative inline-flex items-center cursor-pointer mt-0.5">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={cat.required || choices[cat.key]}
                    disabled={cat.required}
                    onChange={() => toggleCategory(cat.key)}
                  />
                  <div className={`
                    w-9 h-5 rounded-full transition-colors
                    ${cat.required
                      ? 'bg-primary cursor-not-allowed opacity-60'
                      : 'bg-muted-foreground/30 peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary/50 cursor-pointer'
                    }
                    after:content-[''] after:absolute after:top-0.5 after:left-0.5
                    after:bg-white after:rounded-full after:h-4 after:w-4
                    after:transition-transform peer-checked:after:translate-x-4
                  `} />
                </label>
              </div>
            ))}

            {/* Link to cookie policy */}
            <a
              href="/cookies"
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {isDE ? 'Cookie-Richtlinie' : 'Cookie Policy'}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {/* Action buttons */}
        <div className="px-5 pb-5 pt-2 flex flex-col sm:flex-row gap-2">
          <button
            onClick={handleDenyAll}
            className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors min-h-[44px]"
          >
            {isDE ? 'Nur Notwendige' : 'Necessary Only'}
          </button>
          {showDetails && (
            <button
              onClick={handleAcceptSelected}
              className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg border border-border text-foreground hover:bg-muted/50 transition-colors min-h-[44px]"
            >
              {isDE ? 'Auswahl speichern' : 'Save Selection'}
            </button>
          )}
          <button
            onClick={handleAcceptAll}
            className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-lg bg-primary hover:bg-primary/90 text-white transition-colors min-h-[44px]"
          >
            {isDE ? 'Alle akzeptieren' : 'Accept All'}
          </button>
        </div>
      </div>
    </div>
  );
}
