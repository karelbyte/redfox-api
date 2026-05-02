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

    const cleanRFC = rfc.trim().toUpperCase();

    const personaFisicaRegex = /^[A-ZÑ&]{4}[0-9]{6}[A-Z0-9]{3}$/;

    const personaMoralRegex = /^[A-ZÑ&]{3}[0-9]{6}[A-Z0-9]{3}$/;

    const genericRFC = 'XAXX010101000';

    if (cleanRFC === genericRFC) {
      return true;
    }

    if (
      !personaFisicaRegex.test(cleanRFC) &&
      !personaMoralRegex.test(cleanRFC)
    ) {
      return false;
    }

    const year = parseInt(
      cleanRFC.substring(cleanRFC.length - 9, cleanRFC.length - 7),
    );
    const month = parseInt(
      cleanRFC.substring(cleanRFC.length - 7, cleanRFC.length - 5),
    );
    const day = parseInt(
      cleanRFC.substring(cleanRFC.length - 5, cleanRFC.length - 3),
    );

    const fullYear = year <= 29 ? 2000 + year : 1900 + year;

    if (month < 1 || month > 12) {
      return false;
    }

    if (day < 1 || day > 31) {
      return false;
    }

    const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (day > daysInMonth[month - 1]) {
      return false;
    }

    if (month === 2 && day === 29) {
      const isLeapYear =
        (fullYear % 4 === 0 && fullYear % 100 !== 0) || fullYear % 400 === 0;
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
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidRFCConstraint,
    });
  };
}
