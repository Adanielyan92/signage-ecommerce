"use client";

import { useTranslation } from "@/i18n";

const LOCALE_LABELS: Record<string, string> = {
  en: "English",
  es: "Espanol",
};

export function LanguageSwitcher() {
  const { locale, setLocale, availableLocales } = useTranslation();

  if (availableLocales.length <= 1) return null;

  return (
    <select
      value={locale}
      onChange={(e) => setLocale(e.target.value)}
      className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm text-neutral-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      aria-label="Select language"
    >
      {availableLocales.map((loc) => (
        <option key={loc} value={loc}>
          {LOCALE_LABELS[loc] ?? loc.toUpperCase()}
        </option>
      ))}
    </select>
  );
}
