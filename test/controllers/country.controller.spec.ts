import { Reflector } from '@nestjs/core';

import { CountryController } from '../../src/controllers/country.controller';
import { IS_PUBLIC_KEY } from '../../src/decorators/public.decorator';

describe('CountryController', () => {
  const controller = new CountryController({} as any, {} as any);

  it('publica los países soportados', () => {
    const codes = controller.findAll().map((country) => country.code);

    expect(codes).toEqual(expect.arrayContaining(['MX', 'PE']));
  });

  it('marca listado y detalle como públicos para el TenantInterceptor', () => {
    const reflector = new Reflector();

    expect(
      reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        CountryController.prototype.findAll,
        CountryController,
      ]),
    ).toBe(true);

    expect(
      reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        CountryController.prototype.findOne,
        CountryController,
      ]),
    ).toBe(true);
  });
});
