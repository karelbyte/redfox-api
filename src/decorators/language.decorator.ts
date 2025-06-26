import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const Language = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();

    // Obtener idioma de diferentes fuentes en orden de prioridad
    const language =
      request.headers['accept-language'] || // Header Accept-Language
      request.headers['x-language'] || // Header personalizado X-Language
      request.query.language || // Query parameter
      request.body?.language || // Body parameter
      'en'; // Fallback a inglés

    // Limpiar el código de idioma (tomar solo la primera parte si viene como 'es-ES,es;q=0.9')
    const cleanLanguage = language
      .split(',')[0]
      .split(';')[0]
      .split('-')[0]
      .toLowerCase();

    return cleanLanguage;
  },
);
