import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as compression from 'compression';

async function bootstrap() {
  try {
    console.log('Starting Nitro API...');
    console.log('Environment variables:');
    console.log(`PORT: ${process.env.PORT || '3000'}`);
    console.log(`HOST: ${process.env.HOST || '0.0.0.0'}`);
    console.log(`NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
    console.log(
      `   APP_DB_PROVIDER: ${process.env.APP_DB_PROVIDER || 'mysql'}`,
    );
    console.log('PostgreSQL variables:');
    console.log(`PG_DB_HOST: ${process.env.PG_DB_HOST || 'not defined'}`);
    console.log(`PG_DB_PORT: ${process.env.PG_DB_PORT || 'not defined'}`);
    console.log(`PG_DB_USER: ${process.env.PG_DB_USER || 'not defined'}`);
    console.log(`PG_DB_NAME: ${process.env.PG_DB_NAME || 'not defined'}`);
    console.log('MySQL variables:');
    console.log(
      `   MYSQL_DB_HOST: ${process.env.MYSQL_DB_HOST || 'not defined'}`,
    );
    console.log(
      `   MYSQL_DB_PORT: ${process.env.MYSQL_DB_PORT || 'not defined'}`,
    );
    console.log(
      `   MYSQL_DB_USER: ${process.env.MYSQL_DB_USER || 'not defined'}`,
    );
    console.log(
      `   MYSQL_DB_NAME: ${process.env.MYSQL_DB_NAME || 'not defined'}`,
    );

    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
      rawBody: true,
    });
    // const host = process.env.HOST || '0.0.0.0'; // Change to 0.0.0.0 for Railway
    const port = process.env.PORT || 3000;

    app.enableCors({
      origin: process.env.CORS_ORIGIN || '*',
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      credentials: true,
    });

    // gzip/brotli compression — reduces payload by up to 70%
    app.use(
      compression({
        threshold: 1024, // only compress responses > 1KB
        level: 6, // balance between speed and compression
      }),
    );

    // Set global prefix 'api'
    app.setGlobalPrefix('api');

    // Configure global validation
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    // Static files are now served via proxy in UploadsController
    // to support both local storage and S3/Railway Bucket

    await app.listen(port);
    console.log(`Nitro API is running on :${port}`);
    console.log(`Health check available at :${port}/api/health`);
  } catch (error) {
    console.error('❌ Error starting the application:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}
bootstrap();
