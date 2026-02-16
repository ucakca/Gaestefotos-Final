'use client';

import React, { createContext, useContext, useCallback } from 'react';
import type { Locale } from '../../i18n/locales';

type Messages = Record<string, any>;

interface I18nContextValue {
  locale: Locale;
  messages: Messages;
}

const I18nContext = createContext<I18nContextValue>({ locale: 'de', messages: {} });

export function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Messages;
  children: React.ReactNode;
}) {
  return (
    <I18nContext.Provider value={{ locale, messages }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useLocale(): Locale {
  return useContext(I18nContext).locale;
}

export function useTranslations(namespace?: string) {
  const { messages } = useContext(I18nContext);

  return useCallback(
    (key: string, values?: Record<string, string | number>) => {
      const scope = namespace ? messages[namespace] : messages;
      let text = scope?.[key] ?? key;
      if (values && typeof text === 'string') {
        for (const [k, v] of Object.entries(values)) {
          text = text.replace(`{${k}}`, String(v));
        }
      }
      return typeof text === 'string' ? text : key;
    },
    [messages, namespace],
  );
}
