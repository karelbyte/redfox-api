/**
 * Utilidades para manejo de RFC
 */

/**
 * Limpia y normaliza un RFC
 * @param rfc RFC a limpiar
 * @returns RFC limpio en mayúsculas sin espacios
 */
export function cleanRFC(rfc: string): string {
  if (!rfc || typeof rfc !== 'string') {
    return '';
  }
  return rfc.trim().toUpperCase().replace(/\s+/g, '');
}

/**
 * Valida si un RFC tiene el formato correcto
 * @param rfc RFC a validar
 * @returns true si el RFC es válido
 */
export function isValidRFC(rfc: string): boolean {
  if (!rfc || typeof rfc !== 'string') {
    return false;
  }

  const cleanedRFC = cleanRFC(rfc);

  // RFC genérico válido
  if (cleanedRFC === 'XAXX010101000') {
    return true;
  }

  // Patrones para persona física (13 caracteres) y moral (12 caracteres)
  const personaFisicaRegex = /^[A-ZÑ&]{4}[0-9]{6}[A-Z0-9]{3}$/;
  const personaMoralRegex = /^[A-ZÑ&]{3}[0-9]{6}[A-Z0-9]{3}$/;

  if (
    !personaFisicaRegex.test(cleanedRFC) &&
    !personaMoralRegex.test(cleanedRFC)
  ) {
    return false;
  }

  // Validar fecha dentro del RFC
  const year = parseInt(
    cleanedRFC.substring(cleanedRFC.length - 9, cleanedRFC.length - 7),
  );
  const month = parseInt(
    cleanedRFC.substring(cleanedRFC.length - 7, cleanedRFC.length - 5),
  );
  const day = parseInt(
    cleanedRFC.substring(cleanedRFC.length - 5, cleanedRFC.length - 3),
  );

  // Ajustar año
  const fullYear = year <= 29 ? 2000 + year : 1900 + year;

  // Validar fecha
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }

  const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (day > daysInMonth[month - 1]) {
    return false;
  }

  // Validar febrero en años no bisiestos
  if (month === 2 && day === 29) {
    const isLeapYear =
      (fullYear % 4 === 0 && fullYear % 100 !== 0) || fullYear % 400 === 0;
    if (!isLeapYear) {
      return false;
    }
  }

  return true;
}

/**
 * Formatea un RFC para mostrar (con guiones para mejor legibilidad)
 * @param rfc RFC a formatear
 * @returns RFC formateado
 */
export function formatRFC(rfc: string): string {
  const cleanedRFC = cleanRFC(rfc);

  if (!cleanedRFC) {
    return '';
  }

  // Para persona física (13 caracteres): ABCD123456XYZ -> ABCD-123456-XYZ
  if (cleanedRFC.length === 13) {
    return `${cleanedRFC.substring(0, 4)}-${cleanedRFC.substring(4, 10)}-${cleanedRFC.substring(10)}`;
  }

  // Para persona moral (12 caracteres): ABC123456XYZ -> ABC-123456-XYZ
  if (cleanedRFC.length === 12) {
    return `${cleanedRFC.substring(0, 3)}-${cleanedRFC.substring(3, 9)}-${cleanedRFC.substring(9)}`;
  }

  return cleanedRFC;
}
