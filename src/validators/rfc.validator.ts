import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ async: false })
export class IsValidRFCConstraint implements ValidatorConstraintInterface {
  validate(rfc: string): boolean {
    if (!rfc || typeof rfc !== 'string') {
      return false;
    }

    // Limpiar el RFC (quitar espacios y convertir a mayúsculas)
    const cleanRFC = rfc.trim().toUpperCase();

    // Validar RFC de persona física (13 caracteres)
    const personaFisicaRegex = /^[A-ZÑ&]{4}[0-9]{6}[A-Z0-9]{3}$/;
    
    // Validar RFC de persona moral (12 caracteres)
    const personaMoralRegex = /^[A-ZÑ&]{3}[0-9]{6}[A-Z0-9]{3}$/;

    // Validar RFC genérico (XAXX010101000)
    const genericRFC = 'XAXX010101000';

    if (cleanRFC === genericRFC) {
      return true;
    }

    // Verificar si coincide con alguno de los patrones
    if (!personaFisicaRegex.test(cleanRFC) && !personaMoralRegex.test(cleanRFC)) {
      return false;
    }

    // Validar fecha dentro del RFC
    const year = parseInt(cleanRFC.substring(cleanRFC.length - 9, cleanRFC.length - 7));
    const month = parseInt(cleanRFC.substring(cleanRFC.length - 7, cleanRFC.length - 5));
    const day = parseInt(cleanRFC.substring(cleanRFC.length - 5, cleanRFC.length - 3));

    // Ajustar año (00-29 = 2000-2029, 30-99 = 1930-1999)
    const fullYear = year <= 29 ? 2000 + year : 1900 + year;

    // Validar que la fecha sea válida
    if (month < 1 || month > 12) {
      return false;
    }

    if (day < 1 || day > 31) {
      return false;
    }

    // Validar días por mes
    const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (day > daysInMonth[month - 1]) {
      return false;
    }

    // Validar febrero en años no bisiestos
    if (month === 2 && day === 29) {
      const isLeapYear = (fullYear % 4 === 0 && fullYear % 100 !== 0) || (fullYear % 400 === 0);
      if (!isLeapYear) {
        return false;
      }
    }

    return true;
  }

  defaultMessage(): string {
    return 'RFC debe tener un formato válido (ej: XAXX010101000 para persona moral o XAXX010101HDFXXX para persona física)';
  }
}

export function IsValidRFC(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidRFCConstraint,
    });
  };
}