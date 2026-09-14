/**
 * Formato de importes y fechas según el idioma del usuario y el país de la
 * organización. El idioma decide el nombre de los meses y el orden; el país,
 * los separadores y el símbolo de la moneda: "S/ 1,234.56" frente a
 * "PEN 1,234.56" es exactamente esa diferencia.
 */

const LANGUAGE_REGIONS: Record<string, string> = {
  en: 'US',
  zh: 'CN',
};

export function resolveIntlLocale(
  language?: string | null,
  country?: string | null,
): string {
  const lang = (language || 'es').split('-')[0].toLowerCase();
  const region = LANGUAGE_REGIONS[lang] ?? (country || 'MX').toUpperCase();

  return `${lang}-${region}`;
}

export function formatMoney(
  amount: number,
  currency: string,
  locale: string,
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(Number(amount) || 0);
}

export function formatLongDate(value: Date | string, locale: string): string {
  // 'YYYY-MM-DD' se interpreta como UTC y al formatear en una zona negativa
  // retrocede un día; se fuerza a hora local para que no ocurra.
  const date =
    typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T00:00:00`)
      : new Date(value);

  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
