import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  try {
    console.log('🚀 Iniciando RedFox API...');
    console.log('📋 Variables de entorno:');
    console.log(`   PORT: ${process.env.PORT || '3000'}`);
    console.log(`   HOST: ${process.env.HOST || '0.0.0.0'}`);
    console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
    console.log(
      `   APP_DB_PROVIDER: ${process.env.APP_DB_PROVIDER || 'mysql'}`,
    );
    console.log('📋 Variables de PostgreSQL:');
    console.log(`   PG_DB_HOST: ${process.env.PG_DB_HOST || 'no definido'}`);
    console.log(`   PG_DB_PORT: ${process.env.PG_DB_PORT || 'no definido'}`);
    console.log(`   PG_DB_USER: ${process.env.PG_DB_USER || 'no definido'}`);
    console.log(`   PG_DB_NAME: ${process.env.PG_DB_NAME || 'no definido'}`);
    console.log('📋 Variables de MySQL:');
    console.log(
      `   MYSQL_DB_HOST: ${process.env.MYSQL_DB_HOST || 'no definido'}`,
    );
    console.log(
      `   MYSQL_DB_PORT: ${process.env.MYSQL_DB_PORT || 'no definido'}`,
    );
    console.log(
      `   MYSQL_DB_USER: ${process.env.MYSQL_DB_USER || 'no definido'}`,
    );
    console.log(
      `   MYSQL_DB_NAME: ${process.env.MYSQL_DB_NAME || 'no definido'}`,
    );

    const app = await NestFactory.create<NestExpressApplication>(AppModule);
    // const host = process.env.HOST || '0.0.0.0'; // Cambiar a 0.0.0.0 para Railway
    const port = process.env.PORT || 3000;

    // Habilitar CORS
    app.enableCors({
      origin: process.env.CORS_ORIGIN || '*',
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      credentials: true,
    });

    // Configurar el prefijo global 'api'
    app.setGlobalPrefix('api');

    // Configurar validación global
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    // Configurar archivos estáticos
    app.useStaticAssets(join(__dirname, '..', 'uploads'), {
      prefix: '/uploads',
    });

    await app.listen(port);
    console.log(`✅ Redfox API está corriendo en :${port}`);
    console.log(`🔍 Health check disponible en :${port}/api/health`);
  } catch (error) {
    console.error('❌ Error al iniciar la aplicación:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}
bootstrap();
