import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const host = process.env.HOST || 'localhost';
  const port = process.env.PORT || 3000;

  // Configurar el prefijo global 'api'
  app.setGlobalPrefix('api');

  // Configurar validación global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  await app.listen(port, host);
  console.log(`🚀 Redfox API está corriendo en http://${host}:${port}`);
}
bootstrap();
