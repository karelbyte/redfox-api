import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { User } from '../src/models/user.entity';
import { Role } from '../src/models/role.entity';
import { Product } from '../src/models/product.entity';
import { Client } from '../src/models/client.entity';
import { Invoice } from '../src/models/invoice.entity';
import { Organization } from '../src/models/organization.entity';

/**
 * Configuración base para módulos de testing
 */
export const getTestTypeOrmConfig = () => ({
  type: 'sqlite' as const,
  database: ':memory:',
  entities: [__dirname + '/../src/models/*.entity{.ts,.js}'],
  synchronize: true,
  logging: false,
});

/**
 * Crear módulo de testing con configuración básica
 */
export const createTestingModule = async (
  providers: any[] = [],
  imports: any[] = [],
) => {
  const module: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: '.env.test',
      }),
      TypeOrmModule.forRoot(getTestTypeOrmConfig()),
      JwtModule.register({
        secret: 'test-secret',
        signOptions: { expiresIn: '1h' },
      }),
      ...imports,
    ],
    providers,
  }).compile();

  return module;
};

/**
 * Datos de prueba para usuarios
 */
export const createTestUser = (
  overrides: Partial<User> = {},
): Partial<User> => ({
  email: 'test@example.com',
  password: 'hashedPassword123',
  firstName: 'Test',
  lastName: 'User',
  isActive: true,
  ...overrides,
});

/**
 * Datos de prueba para productos
 */
export const createTestProduct = (
  overrides: Partial<Product> = {},
): Partial<Product> => ({
  name: 'Test Product',
  description: 'Test product description',
  price: 100.0,
  cost: 50.0,
  stock: 10,
  minStock: 5,
  barcode: '1234567890',
  isActive: true,
  ...overrides,
});

/**
 * Datos de prueba para clientes
 */
export const createTestClient = (
  overrides: Partial<Client> = {},
): Partial<Client> => ({
  name: 'Test Client',
  email: 'client@example.com',
  phone: '1234567890',
  address: 'Test Address 123',
  isActive: true,
  ...overrides,
});

/**
 * Datos de prueba para facturas
 */
export const createTestInvoice = (
  overrides: Partial<Invoice> = {},
): Partial<Invoice> => ({
  invoiceNumber: 'INV-001',
  subtotal: 100.0,
  tax: 16.0,
  total: 116.0,
  status: 'pending',
  issueDate: new Date(),
  ...overrides,
});

/**
 * Mock para repositorios de TypeORM
 */
export const createMockRepository = <T = any>() => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findOneBy: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  remove: jest.fn(),
  count: jest.fn(),
  createQueryBuilder: jest.fn(() => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getOne: jest.fn(),
    getManyAndCount: jest.fn(),
  })),
});

/**
 * Limpiar base de datos de testing
 */
export const clearDatabase = async (repositories: Repository<any>[]) => {
  for (const repository of repositories) {
    try {
      await repository.clear();
    } catch (error) {
      // Si hay restricciones de clave foránea, eliminar registros uno por uno
      try {
        await repository.query(`DELETE FROM ${repository.metadata.tableName}`);
      } catch (queryError) {
        // Último recurso: desactivar restricciones y eliminar
        await repository.query(`
          SET session_replication_role = replica;
          DELETE FROM ${repository.metadata.tableName};
          SET session_replication_role = DEFAULT;
        `);
      }
    }
  }
};

/**
 * Generar token JWT para testing
 */
export const generateTestToken = (
  payload: any = { sub: 1, email: 'test@example.com' },
) => {
  const jwt = require('jsonwebtoken');
  return jwt.sign(payload, 'test-secret', { expiresIn: '1h' });
};

/**
 * Datos de prueba para organizaciones
 */
export const createTestOrganization = async (
  repository: Repository<Organization>,
): Promise<Organization> => {
  const organization = repository.create({
    name: 'Test Organization',
    slug: 'test-org',
    isActive: true,
  });
  return await repository.save(organization);
};
