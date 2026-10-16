export function formatPrice(minorUnits: number, currency = 'GBP', locale = 'en-GB'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(minorUnits / 100);
}

export function toMinorUnits(pounds: number): number {
  return Math.round(pounds * 100);
}
