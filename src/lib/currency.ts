// src/lib/currency.ts
/**
 * Multi-currency utilities.
 *
 * Exchange rates are admin-set per tenant (not live rates).
 * All internal prices are stored in USD. Conversion happens at display time.
 */

export interface ExchangeRateEntry {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
}

/**
 * Convert an amount from one currency to another.
 * Returns the original amount if no rate is found (safe fallback).
 */
export function convertCurrency(
  amount: number,
  from: string,
  to: string,
  rates: ExchangeRateEntry[],
): number {
  if (from === to) return amount;

  const direct = rates.find(
    (r) => r.fromCurrency === from && r.toCurrency === to,
  );
  if (direct) return amount * direct.rate;

  // Try inverse
  const inverse = rates.find(
    (r) => r.fromCurrency === to && r.toCurrency === from,
  );
  if (inverse && inverse.rate !== 0) return amount / inverse.rate;

  // No rate found — return original
  return amount;
}

/**
 * Format a price in a given currency and locale.
 */
export function formatPriceWithCurrency(
  amount: number,
  currency: string = "USD",
  locale: string = "en-US",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amount);
}

/** Common currency metadata */
export const SUPPORTED_CURRENCIES: Record<string, { symbol: string; name: string; locale: string }> = {
  USD: { symbol: "$", name: "US Dollar", locale: "en-US" },
  EUR: { symbol: "\u20AC", name: "Euro", locale: "de-DE" },
  GBP: { symbol: "\u00A3", name: "British Pound", locale: "en-GB" },
  CAD: { symbol: "CA$", name: "Canadian Dollar", locale: "en-CA" },
  AUD: { symbol: "A$", name: "Australian Dollar", locale: "en-AU" },
  MXN: { symbol: "MX$", name: "Mexican Peso", locale: "es-MX" },
};
