import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../src/models/user.entity';
import { Role } from '../src/models/role.entity';
import { createTestUser, clearDatabase } from './test-utils';
import * as bcrypt from 'bcrypt';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let roleRepository: Repository<Role>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    userRepository = moduleFixture.get<Repository<User>>(
      getRepositoryToken(User),
    );
    roleRepository = moduleFixture.get<Repository<Role>>(
      getRepositoryToken(Role),
    );

    await app.init();
  });

  beforeEach(async () => {
    await clearDatabase([userRepository, roleRepository]);

    // Crear rol por defecto
    const adminRole = roleRepository.create({
      name: 'admin',
      description: 'Administrator role',
    });
    await roleRepository.save(adminRole);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/auth/login (POST)', () => {
    it('should login successfully with valid credentials', async () => {
      // Arrange
      const password = 'testPassword123';
      const hashedPassword = await bcrypt.hash(password, 10);
      const userData = createTestUser({ password: hashedPassword });

      const user = userRepository.create(userData);
      await userRepository.save(user);

      const loginDto = {
        email: userData.email,
        password: password,
      };

      // Act & Assert
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should return 401 for invalid credentials', async () => {
      // Arrange
      const loginDto = {
        email: 'nonexistent@example.com',
        password: 'wrongPassword',
      };

      // Act & Assert
      await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(401);
    });

    it('should return 400 for invalid email format', async () => {
      // Arrange
      const loginDto = {
        email: 'invalid-email',
        password: 'password123',
      };

      // Act & Assert
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(400);

      expect(response.body.message).toContain('email must be an email');
    });

    it('should return 400 for missing password', async () => {
      // Arrange
      const loginDto = {
        email: 'test@example.com',
      };

      // Act & Assert
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(400);

      expect(response.body.message).toContain('password should not be empty');
    });

    it('should return 401 for inactive user', async () => {
      // Arrange
      const password = 'testPassword123';
      const hashedPassword = await bcrypt.hash(password, 10);
      const userData = createTestUser({
        password: hashedPassword,
        isActive: false,
      });

      const user = userRepository.create(userData);
      await userRepository.save(user);

      const loginDto = {
        email: userData.email,
        password: password,
      };

      // Act & Assert
      await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(401);
    });
  });

  describe('/auth/register (POST)', () => {
    it('should register a new user successfully', async () => {
      // Arrange
      const registerDto = {
        email: 'newuser@example.com',
        password: 'newPassword123',
        firstName: 'New',
        lastName: 'User',
      };

      // Act & Assert
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(registerDto.email);
      expect(response.body.user).not.toHaveProperty('password');

      // Verificar que el usuario fue creado en la base de datos
      const createdUser = await userRepository.findOneBy({
        email: registerDto.email,
      });
      expect(createdUser).toBeDefined();
      expect(createdUser.firstName).toBe(registerDto.firstName);
    });

    it('should return 400 for duplicate email', async () => {
      // Arrange
      const userData = createTestUser();
      const user = userRepository.create(userData);
      await userRepository.save(user);

      const registerDto = {
        email: userData.email,
        password: 'newPassword123',
        firstName: 'New',
        lastName: 'User',
      };

      // Act & Assert
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(400);

      expect(response.body.message).toContain('Email already exists');
    });

    it('should return 400 for weak password', async () => {
      // Arrange
      const registerDto = {
        email: 'newuser@example.com',
        password: '123', // Contraseña muy débil
        firstName: 'New',
        lastName: 'User',
      };

      // Act & Assert
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(400);

      expect(response.body.message).toContain(
        'password must be longer than or equal to 6 characters',
      );
    });
  });

  describe('/auth/profile (GET)', () => {
    it('should return user profile for authenticated user', async () => {
      // Arrange
      const password = 'testPassword123';
      const hashedPassword = await bcrypt.hash(password, 10);
      const userData = createTestUser({ password: hashedPassword });

      const user = userRepository.create(userData);
      await userRepository.save(user);

      // Login para obtener token
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: userData.email,
          password: password,
        });

      const token = loginResponse.body.access_token;

      // Act & Assert
      const response = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.email).toBe(userData.email);
      expect(response.body.firstName).toBe(userData.firstName);
      expect(response.body).not.toHaveProperty('password');
    });

    it('should return 401 for unauthenticated request', async () => {
      // Act & Assert
      await request(app.getHttpServer()).get('/auth/profile').expect(401);
    });

    it('should return 401 for invalid token', async () => {
      // Act & Assert
      await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });
});
