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

/**
 * Fecha en formato YYYY-MM-DD tal como la vive el país indicado.
 *
 * `toISOString()` no sirve aquí: convierte a UTC, y una venta hecha a las
 * 19:45 en Lima (UTC−5) sale fechada al día siguiente. SUNAT rechaza un
 * comprobante con fecha futura, así que el desfase no es cosmético.
 *
 * Tampoco sirve la hora local del proceso: en producción el servidor corre
 * en UTC y reproduciría el mismo error. La zona tiene que venir del país de
 * la organización que emite.
 */
export function formatDateInTimeZone(
  date: Date | string,
  timeZone: string,
): string {
  // Una fecha que ya viene sin hora no tiene nada que convertir: moverla de
  // zona solo podría correrla un día.
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
    return date.trim();
  }

  const value = date instanceof Date ? date : new Date(date);

  // 'en-CA' produce YYYY-MM-DD, que es justo el formato que se necesita.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value);
}
