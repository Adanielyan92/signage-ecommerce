"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import en from "./translations/en.json";

type TranslationData = typeof en;
type NestedKeyOf<T, Prefix extends string = ""> = T extends object
  ? {
      [K in keyof T & string]: T[K] extends object
        ? NestedKeyOf<T[K], `${Prefix}${Prefix extends "" ? "" : "."}${K}`>
        : `${Prefix}${Prefix extends "" ? "" : "."}${K}`;
    }[keyof T & string]
  : never;

export type TranslationKey = NestedKeyOf<TranslationData>;

interface I18nContextValue {
  locale: string;
  setLocale: (locale: string) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  availableLocales: string[];
}

const translationCache = new Map<string, TranslationData>();
translationCache.set("en", en);

async function loadTranslation(locale: string): Promise<TranslationData> {
  if (translationCache.has(locale)) {
    return translationCache.get(locale)!;
  }
  try {
    const mod = await import(`./translations/${locale}.json`);
    const data = mod.default as TranslationData;
    translationCache.set(locale, data);
    return data;
  } catch {
    console.warn(`Translation file for "${locale}" not found, falling back to "en".`);
    return en;
  }
}

const I18nContext = createContext<I18nContextValue | null>(null);

function getNestedValue(obj: unknown, path: string): string | undefined {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : undefined;
}

export function I18nProvider({
  children,
  defaultLocale = "en",
  availableLocales = ["en", "es"],
}: {
  children: ReactNode;
  defaultLocale?: string;
  availableLocales?: string[];
}) {
  const [locale, setLocaleState] = useState(defaultLocale);
  const [translations, setTranslations] = useState<TranslationData>(
    translationCache.get(defaultLocale) ?? en,
  );

  const setLocale = useCallback(
    async (newLocale: string) => {
      const data = await loadTranslation(newLocale);
      setTranslations(data);
      setLocaleState(newLocale);
    },
    [],
  );

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>): string => {
      let value = getNestedValue(translations, key) ?? getNestedValue(en, key) ?? key;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          value = value.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
        }
      }
      return value;
    },
    [translations],
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, availableLocales }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18nContext() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18nContext must be used within I18nProvider");
  return ctx;
}
