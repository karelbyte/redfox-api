import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { TenantContext } from '../services/tenant-context.service';
import { Injectable } from '@nestjs/common';

@ValidatorConstraint({ async: false })
@Injectable()
export class IsValidRFCConstraint implements ValidatorConstraintInterface {
  constructor(private readonly tenantContext: TenantContext) {}

  validate(rfc: string, args: ValidationArguments): boolean {
    if (!rfc || typeof rfc !== 'string') {
      return false;
    }

    const cleanRFC = rfc.trim().toUpperCase();
    
    // Safety check for DI
    if (!this.tenantContext) {
      console.error('TenantContext is not injected in IsValidRFCConstraint');
      // Fallback a lógica flexible si falla la inyección
      return /^[0-9]{11}$/.test(cleanRFC) || 
             cleanRFC === 'XAXX010101000' || 
             /^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/.test(cleanRFC);
    }

    const country = this.tenantContext.getCountry() || 'mx';

    if (country === 'pe') {
      return /^[0-9]{11}$/.test(cleanRFC);
    }

    // México (mx)
    const personaFisicaRegex = /^[A-ZÑ&]{4}[0-9]{6}[A-Z0-9]{3}$/;
    const personaMoralRegex = /^[A-ZÑ&]{3}[0-9]{6}[A-Z0-9]{3}$/;

    if (cleanRFC === 'XAXX010101000') return true;

    if (personaFisicaRegex.test(cleanRFC) || personaMoralRegex.test(cleanRFC)) {
      const yearStr = cleanRFC.substring(cleanRFC.length - 9, cleanRFC.length - 7);
      const monthStr = cleanRFC.substring(cleanRFC.length - 7, cleanRFC.length - 5);
      const dayStr = cleanRFC.substring(cleanRFC.length - 5, cleanRFC.length - 3);

      const year = parseInt(yearStr);
      const month = parseInt(monthStr);
      const day = parseInt(dayStr);

      if (isNaN(year) || isNaN(month) || isNaN(day)) return false;

      const fullYear = year <= 29 ? 2000 + year : 1900 + year;
      if (month < 1 || month > 12) return false;
      if (day < 1 || day > 31) return false;

      const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
      if (day > daysInMonth[month - 1]) return false;

      if (month === 2 && day === 29) {
        const isLeapYear = (fullYear % 4 === 0 && fullYear % 100 !== 0) || fullYear % 400 === 0;
        if (!isLeapYear) return false;
      }
      return true;
    }

    return false;
  }

  defaultMessage(args: ValidationArguments): string {
    const country = this.tenantContext?.getCountry() || 'mx';
    if (country === 'pe') {
      return 'El RUC debe tener 11 dígitos numéricos';
    }
    return 'RFC debe tener un formato válido (ej: XAXX010101000 o XAXX010101HDFXXX)';
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
