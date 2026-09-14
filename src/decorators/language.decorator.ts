import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const Language = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();

    const language =
      request.headers['x-locale'] ||
      request.headers['accept-language'] ||
      request.headers['x-language'] ||
      request.query.language ||
      request.body?.language ||
      'es';

    const cleanLanguage = language
      .split(',')[0]
      .split(';')[0]
      .split('-')[0]
      .toLowerCase();

    return cleanLanguage;
  },
);
