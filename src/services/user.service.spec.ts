import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserService } from './user.service';
import { User } from '../models/user.entity';
import { Role } from '../models/role.entity';
import { createMockRepository, createTestUser } from '../../test/test-utils';
import * as bcrypt from 'bcrypt';

// Mock bcrypt
jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('UserService', () => {
  let service: UserService;
  let userRepository: jest.Mocked<Repository<User>>;
  let roleRepository: jest.Mocked<Repository<Role>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(Role),
          useValue: createMockRepository(),
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userRepository = module.get(getRepositoryToken(User));
    roleRepository = module.get(getRepositoryToken(Role));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new user successfully', async () => {
      // Arrange
      const userData = createTestUser();
      const hashedPassword = 'hashedPassword123';
      const savedUser = { id: 1, ...userData, password: hashedPassword };

      mockedBcrypt.hash.mockResolvedValue(hashedPassword as never);
      userRepository.create.mockReturnValue(savedUser as User);
      userRepository.save.mockResolvedValue(savedUser as User);

      // Act
      const result = await service.create(userData as any);

      // Assert
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(userData.password, 10);
      expect(userRepository.create).toHaveBeenCalledWith({
        ...userData,
        password: hashedPassword,
      });
      expect(userRepository.save).toHaveBeenCalledWith(savedUser);
      expect(result).toEqual(savedUser);
    });

    it('should throw error if email already exists', async () => {
      // Arrange
      const userData = createTestUser();
      userRepository.findOneBy.mockResolvedValue({ id: 1 } as User);

      // Act & Assert
      await expect(service.create(userData as any)).rejects.toThrow('Email already exists');
    });
  });

  describe('findByEmail', () => {
    it('should return user when found', async () => {
      // Arrange
      const email = 'test@example.com';
      const user = { id: 1, email, ...createTestUser() };
      userRepository.findOne.mockResolvedValue(user as User);

      // Act
      const result = await service.findByEmail(email);

      // Assert
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email },
        relations: ['roles'],
      });
      expect(result).toEqual(user);
    });

    it('should return null when user not found', async () => {
      // Arrange
      const email = 'nonexistent@example.com';
      userRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.findByEmail(email);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('validatePassword', () => {
    it('should return true for valid password', async () => {
      // Arrange
      const password = 'testPassword';
      const hashedPassword = 'hashedPassword123';
      mockedBcrypt.compare.mockResolvedValue(true as never);

      // Act
      const result = await service.validatePassword(password, hashedPassword);

      // Assert
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
      expect(result).toBe(true);
    });

    it('should return false for invalid password', async () => {
      // Arrange
      const password = 'wrongPassword';
      const hashedPassword = 'hashedPassword123';
      mockedBcrypt.compare.mockResolvedValue(false as never);

      // Act
      const result = await service.validatePassword(password, hashedPassword);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      // Arrange
      const users = [
        { id: 1, ...createTestUser() },
        { id: 2, ...createTestUser({ email: 'user2@example.com' }) },
      ];
      const total = 2;
      
      userRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([users, total]),
      } as any);

      // Act
      const result = await service.findAll(1, 10);

      // Assert
      expect(result).toEqual({
        data: users,
        total,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });
  });

  describe('update', () => {
    it('should update user successfully', async () => {
      // Arrange
      const userId = 1;
      const updateData = { firstName: 'Updated Name' };
      const existingUser = { id: userId, ...createTestUser() };
      const updatedUser = { ...existingUser, ...updateData };

      userRepository.findOneBy.mockResolvedValue(existingUser as User);
      userRepository.save.mockResolvedValue(updatedUser as User);

      // Act
      const result = await service.update(userId, updateData);

      // Assert
      expect(userRepository.findOneBy).toHaveBeenCalledWith({ id: userId });
      expect(userRepository.save).toHaveBeenCalledWith(updatedUser);
      expect(result).toEqual(updatedUser);
    });

    it('should throw error if user not found', async () => {
      // Arrange
      const userId = 999;
      const updateData = { firstName: 'Updated Name' };
      userRepository.findOneBy.mockResolvedValue(null);

      // Act & Assert
      await expect(service.update(userId, updateData)).rejects.toThrow('User not found');
    });
  });

  describe('delete', () => {
    it('should soft delete user successfully', async () => {
      // Arrange
      const userId = 1;
      const existingUser = { id: userId, ...createTestUser() };
      const deletedUser = { ...existingUser, isActive: false };

      userRepository.findOneBy.mockResolvedValue(existingUser as User);
      userRepository.save.mockResolvedValue(deletedUser as User);

      // Act
      const result = await service.delete(userId);

      // Assert
      expect(userRepository.findOneBy).toHaveBeenCalledWith({ id: userId });
      expect(userRepository.save).toHaveBeenCalledWith(deletedUser);
      expect(result).toEqual(deletedUser);
    });
  });
});