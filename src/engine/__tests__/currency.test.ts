import { convertCurrency, formatPriceWithCurrency, type ExchangeRateEntry } from "../../lib/currency";

const rates: ExchangeRateEntry[] = [
  { fromCurrency: "USD", toCurrency: "EUR", rate: 0.92 },
  { fromCurrency: "USD", toCurrency: "CAD", rate: 1.36 },
];

describe("convertCurrency", () => {
  it("returns same amount for same currency", () => {
    expect(convertCurrency(100, "USD", "USD", rates)).toBe(100);
  });

  it("converts using direct rate", () => {
    expect(convertCurrency(100, "USD", "EUR", rates)).toBeCloseTo(92);
  });

  it("converts using inverse rate", () => {
    expect(convertCurrency(92, "EUR", "USD", rates)).toBeCloseTo(100);
  });

  it("returns original amount when no rate exists", () => {
    expect(convertCurrency(100, "USD", "JPY", rates)).toBe(100);
  });
});

describe("formatPriceWithCurrency", () => {
  it("formats USD", () => {
    expect(formatPriceWithCurrency(1500, "USD")).toBe("$1,500.00");
  });

  it("formats EUR", () => {
    const formatted = formatPriceWithCurrency(1500, "EUR", "de-DE");
    expect(formatted).toContain("1.500");
  });
});
