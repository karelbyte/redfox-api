import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const Language = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();

    // Obtener idioma de diferentes fuentes en orden de prioridad
    const language =
      request.headers['x-locale'] || // Header enviado por el front (locale de la URL)
      request.headers['accept-language'] || // Header estándar del navegador
      request.headers['x-language'] || // Header personalizado legacy
      request.query.language || // Query parameter
      request.body?.language || // Body parameter
      'es'; // Fallback a español

    // Limpiar el código de idioma (tomar solo la primera parte si viene como 'es-ES,es;q=0.9')
    const cleanLanguage = language
      .split(',')[0]
      .split(';')[0]
      .split('-')[0]
      .toLowerCase();

    return cleanLanguage;
  },
);
