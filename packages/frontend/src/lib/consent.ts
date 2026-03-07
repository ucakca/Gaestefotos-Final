/**
 * Cookie Consent Management
 * 
 * Manages DSGVO-compliant cookie consent with 5 categories:
 * - necessary: Always active (session, auth, CSRF)
 * - functional: Language, theme, guest name persistence
 * - analytics: Sentry error tracking, device ID, upload metrics
 * - ai: KI features that send data to external providers
 * - marketing: Future use (ads, tracking pixels)
 * 
 * Stores consent as JSON in a cookie (gf_consent) and syncs
 * with WordPress via mfnConsent domain cookie.
 */

export interface ConsentChoices {
  necessary: true; // always true, not toggleable
  functional: boolean;
  analytics: boolean;
  ai: boolean;
  marketing: boolean;
}

export interface ConsentState {
  version: number;
  timestamp: string;
  choices: ConsentChoices;
}

const CONSENT_COOKIE = 'gf_consent';
const MFN_CONSENT_COOKIE = 'mfnConsent';
const CONSENT_VERSION = 1;
const MAX_AGE = 365 * 24 * 60 * 60; // 365 days

// Default: only necessary
export const DEFAULT_CHOICES: ConsentChoices = {
  necessary: true,
  functional: false,
  analytics: false,
  ai: false,
  marketing: false,
};

// Accept all
export const ALL_CHOICES: ConsentChoices = {
  necessary: true,
  functional: true,
  analytics: true,
  ai: true,
  marketing: true,
};

/**
 * Read consent state from cookie
 */
export function readConsent(): ConsentState | null {
  if (typeof document === 'undefined') return null;

  try {
    const cookies = document.cookie.split(';');
    const entry = cookies.find((c) => c.trim().startsWith(`${CONSENT_COOKIE}=`));
    if (!entry) return null;

    const value = entry.trim().slice(CONSENT_COOKIE.length + 1);
    const decoded = decodeURIComponent(value);
    const parsed = JSON.parse(decoded);

    if (!parsed || typeof parsed !== 'object' || !parsed.choices) return null;

    return {
      version: parsed.version || 1,
      timestamp: parsed.timestamp || new Date().toISOString(),
      choices: {
        necessary: true, // always true
        functional: !!parsed.choices.functional,
        analytics: !!parsed.choices.analytics,
        ai: !!parsed.choices.ai,
        marketing: !!parsed.choices.marketing,
      },
    };
  } catch {
    return null;
  }
}

/**
 * Check if user has made a consent decision (any decision)
 */
export function hasConsentDecision(): boolean {
  return readConsent() !== null;
}

/**
 * Check if a specific consent category is granted
 */
export function hasConsent(category: keyof ConsentChoices): boolean {
  const state = readConsent();
  if (!state) return category === 'necessary'; // necessary is always allowed
  return !!state.choices[category];
}

/**
 * Save consent choices to cookie
 */
export function saveConsent(choices: ConsentChoices): void {
  if (typeof document === 'undefined') return;

  const state: ConsentState = {
    version: CONSENT_VERSION,
    timestamp: new Date().toISOString(),
    choices: { ...choices, necessary: true },
  };

  try {
    const value = encodeURIComponent(JSON.stringify(state));
    document.cookie = `${CONSENT_COOKIE}=${value}; path=/; max-age=${MAX_AGE}; SameSite=Lax`;

    // Sync with WordPress mfnConsent cookie (domain-wide)
    document.cookie = `${MFN_CONSENT_COOKIE}=1; path=/; max-age=${MAX_AGE}; SameSite=Lax`;

    // Update Google Consent Mode v2 if gtag is available
    updateGoogleConsentMode(choices);
  } catch {
    // Silent fail
  }
}

/**
 * Update Google Consent Mode v2
 */
function updateGoogleConsentMode(choices: ConsentChoices): void {
  try {
    const w = window as any;
    if (typeof w.gtag !== 'function') return;

    w.gtag('consent', 'update', {
      analytics_storage: choices.analytics ? 'granted' : 'denied',
      ad_storage: choices.marketing ? 'granted' : 'denied',
      ad_user_data: choices.marketing ? 'granted' : 'denied',
      ad_personalization: choices.marketing ? 'granted' : 'denied',
    });
  } catch {
    // Silent fail
  }
}

/**
 * Category metadata for the banner UI
 */
export interface ConsentCategory {
  key: keyof ConsentChoices;
  required: boolean;
  titleDe: string;
  titleEn: string;
  descDe: string;
  descEn: string;
}

export const CONSENT_CATEGORIES: ConsentCategory[] = [
  {
    key: 'necessary',
    required: true,
    titleDe: 'Notwendig',
    titleEn: 'Necessary',
    descDe: 'Für den Betrieb der App erforderlich: Login, Sicherheit (CSRF), Spracheinstellung, Event-Zugang. Können nicht deaktiviert werden.',
    descEn: 'Required for the app to function: login, security (CSRF), language, event access. Cannot be disabled.',
  },
  {
    key: 'functional',
    required: false,
    titleDe: 'Funktional',
    titleEn: 'Functional',
    descDe: 'Speichert Einstellungen wie Dark/Light Mode, deinen Gastnamen und Setup-Fortschritt für eine bessere Nutzungserfahrung.',
    descEn: 'Stores settings like dark/light mode, your guest name, and setup progress for a better experience.',
  },
  {
    key: 'analytics',
    required: false,
    titleDe: 'Analyse & Fehlertracking',
    titleEn: 'Analytics & Error Tracking',
    descDe: 'Hilft uns Fehler zu erkennen und die App zu verbessern. Verwendet Sentry (EU-Server, Frankfurt) für Fehlerberichte und anonymisierte Nutzungsdaten.',
    descEn: 'Helps us detect errors and improve the app. Uses Sentry (EU servers, Frankfurt) for error reports and anonymized usage data.',
  },
  {
    key: 'ai',
    required: false,
    titleDe: 'KI-Funktionen',
    titleEn: 'AI Features',
    descDe: 'Ermöglicht KI-Foto-Effekte, Style Transfer und Foto-Spiele. Bilder werden auf EU-Servern verarbeitet. Text-basierte KI-Spiele nutzen Server in den USA (es werden keine Bilder übertragen).',
    descEn: 'Enables AI photo effects, style transfer, and photo games. Images are processed on EU servers. Text-based AI games use US servers (no images are transmitted).',
  },
  {
    key: 'marketing',
    required: false,
    titleDe: 'Marketing',
    titleEn: 'Marketing',
    descDe: 'Wird aktuell nicht verwendet. Reserviert für zukünftige Werbe- und Marketing-Funktionen.',
    descEn: 'Not currently used. Reserved for future advertising and marketing features.',
  },
];
