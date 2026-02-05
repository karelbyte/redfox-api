# 🧪 Testing Guide - Backend (NestJS)

Esta guía explica cómo ejecutar y escribir tests para el backend de Nitro.

## 📋 Tipos de Tests

### 1. Tests Unitarios
- **Ubicación**: `src/**/*.spec.ts`
- **Propósito**: Probar funciones y métodos individuales
- **Comando**: `npm run test:unit`

### 2. Tests de Integración
- **Ubicación**: `test/**/*.e2e-spec.ts`
- **Propósito**: Probar endpoints completos y flujos de datos
- **Comando**: `npm run test:e2e`

### 3. Tests de Base de Datos
- **Base de datos**: SQLite en memoria para tests
- **Configuración**: Automática en cada test
- **Limpieza**: Automática después de cada test

## 🚀 Comandos de Testing

```bash
# Ejecutar todos los tests unitarios
npm run test

# Ejecutar tests en modo watch
npm run test:watch

# Ejecutar tests con coverage
npm run test:cov

# Ejecutar tests E2E
npm run test:e2e

# Ejecutar todos los tests (CI)
npm run test:ci

# Ejecutar solo tests unitarios
npm run test:unit

# Ejecutar tests de integración
npm run test:integration
```

## 📁 Estructura de Tests

```
redfox-api/
├── src/
│   ├── services/
│   │   ├── user.service.ts
│   │   └── user.service.spec.ts      # Tests unitarios
│   └── controllers/
│       ├── user.controller.ts
│       └── user.controller.spec.ts   # Tests unitarios
├── test/
│   ├── setup.ts                      # Configuración global
│   ├── test-utils.ts                 # Utilidades de testing
│   ├── auth.e2e-spec.ts             # Tests E2E de autenticación
│   └── products.e2e-spec.ts         # Tests E2E de productos
└── jest.config.js                   # Configuración de Jest
```

## 🛠️ Configuración

### Variables de Entorno para Testing
```env
NODE_ENV=test
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=test
DB_PASSWORD=test
DB_DATABASE=nitro_test
JWT_SECRET=test-secret-key
```

### Base de Datos de Testing
Los tests usan SQLite en memoria por defecto para mayor velocidad:

```typescript
export const getTestTypeOrmConfig = () => ({
  type: 'sqlite' as const,
  database: ':memory:',
  entities: [__dirname + '/../src/models/*.entity{.ts,.js}'],
  synchronize: true,
  logging: false,
});
```

## ✍️ Escribir Tests

### Test Unitario de Servicio

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { createMockRepository, createTestUser } from '../../test/test-utils';

describe('UserService', () => {
  let service: UserService;
  let userRepository: jest.Mocked<Repository<User>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: createMockRepository(),
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userRepository = module.get(getRepositoryToken(User));
  });

  it('should create a user', async () => {
    // Arrange
    const userData = createTestUser();
    userRepository.save.mockResolvedValue(userData as User);

    // Act
    const result = await service.create(userData);

    // Assert
    expect(result).toEqual(userData);
    expect(userRepository.save).toHaveBeenCalledWith(userData);
  });
});
```

### Test E2E de Controller

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AuthController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/auth/login (POST)', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123',
      })
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('access_token');
      });
  });
});
```

## 🎯 Mejores Prácticas

### 1. Nomenclatura
- Archivos de test: `*.spec.ts` (unitarios) o `*.e2e-spec.ts` (E2E)
- Describe blocks: Nombre de la clase/función que se está probando
- Test cases: Descripción clara de lo que se está probando

### 2. Estructura AAA
```typescript
it('should do something', async () => {
  // Arrange - Preparar datos y mocks
  const userData = createTestUser();
  mockRepository.save.mockResolvedValue(userData);

  // Act - Ejecutar la función
  const result = await service.create(userData);

  // Assert - Verificar resultados
  expect(result).toEqual(userData);
});
```

### 3. Mocking
- Usar `createMockRepository()` para repositorios de TypeORM
- Mockear servicios externos
- Usar datos de prueba consistentes con `createTestUser()`, etc.

### 4. Limpieza
- Limpiar mocks después de cada test: `jest.clearAllMocks()`
- Limpiar base de datos en tests E2E
- Usar `beforeEach` y `afterEach` apropiadamente

## 📊 Coverage

### Configuración de Coverage
```json
{
  "collectCoverageFrom": [
    "src/**/*.(t|j)s",
    "!src/**/*.spec.ts",
    "!src/**/*.interface.ts",
    "!src/**/*.dto.ts",
    "!src/**/*.entity.ts",
    "!src/main.ts",
    "!src/db/migrations/**",
    "!src/db/seeds/**"
  ],
  "coverageThreshold": {
    "global": {
      "branches": 80,
      "functions": 80,
      "lines": 80,
      "statements": 80
    }
  }
}
```

### Reportes de Coverage
- **HTML**: `coverage/lcov-report/index.html`
- **LCOV**: `coverage/lcov.info`
- **JSON**: `coverage/coverage-final.json`

## 🔧 Debugging Tests

### VS Code Configuration
```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Jest Tests",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

### Comandos de Debug
```bash
# Debug tests específicos
npm run test:debug -- --testNamePattern="should create user"

# Debug con breakpoints
node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand
```

## 🚨 Troubleshooting

### Problemas Comunes

1. **Tests lentos**
   - Usar SQLite en memoria en lugar de MySQL
   - Mockear servicios externos
   - Usar `--runInBand` para tests E2E

2. **Errores de base de datos**
   - Verificar configuración de test en `setup.ts`
   - Limpiar base de datos entre tests
   - Usar transacciones para rollback automático

3. **Mocks no funcionan**
   - Verificar que los mocks se crean antes del import
   - Usar `jest.clearAllMocks()` en `afterEach`
   - Verificar que se está usando el mock correcto

### Logs de Debug
```typescript
// Habilitar logs en tests
process.env.LOG_LEVEL = 'debug';

// Ver queries de TypeORM
const config = getTestTypeOrmConfig();
config.logging = true;
```

## 📈 Métricas de Calidad

### Objetivos de Coverage
- **Líneas**: 80%+
- **Funciones**: 80%+
- **Branches**: 75%+
- **Statements**: 80%+

### Tipos de Tests por Módulo
- **Servicios**: 100% coverage en lógica de negocio
- **Controllers**: Tests E2E para todos los endpoints
- **Guards**: Tests unitarios para lógica de autorización
- **Pipes**: Tests unitarios para validación

## 🔄 CI/CD Integration

Los tests se ejecutan automáticamente en:
- **Push** a `main` o `develop`
- **Pull Requests**
- **Releases**

Ver `.github/workflows/test.yml` para configuración completa.