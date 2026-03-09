import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

// Configuración global para tests E2E
beforeAll(async () => {
  // Configurar variables de entorno para testing
  process.env.NODE_ENV = 'test';
  process.env.DB_HOST = 'localhost';
  process.env.DB_PORT = '3306';
  process.env.DB_USERNAME = 'test';
  process.env.DB_PASSWORD = 'test';
  process.env.DB_DATABASE = 'nitro_test';
  process.env.JWT_SECRET = 'test-secret-key';
});

// Limpiar después de cada test
afterEach(async () => {
  jest.clearAllMocks();
});

// Configuración de timeout para tests largos
jest.setTimeout(30000);
