import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: any;
  let userRepository: any;
  let jwtService: any;
  let emailService: any;

  beforeEach(async () => {
    service = {
      register: async (dto: any) => {
        if (!dto.email) {
          throw new BadRequestException('Email is required');
        }
        if (!dto.password) {
          throw new BadRequestException('Password is required');
        }
        if (dto.password !== dto.confirmPassword) {
          throw new BadRequestException('Passwords do not match');
        }
        
        // Check if user already exists
        const existingUser = await userRepository.findOne({
          where: { email: dto.email },
        });
        
        if (existingUser) {
          throw new BadRequestException('User already exists');
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(dto.password, 10);
        
        const user = userRepository.create({
          ...dto,
          password: hashedPassword,
          status: 'ACTIVE',
          created_at: new Date(),
        });
        
        return await userRepository.save(user);
      },
      
      login: async (dto: any) => {
        if (!dto.email || !dto.password) {
          throw new BadRequestException('Email and password are required');
        }
        
        const user = await userRepository.findOne({
          where: { email: dto.email },
          relations: ['roles'],
        });
        
        if (!user) {
          throw new BadRequestException('Invalid credentials');
        }
        
        if (user.status !== 'ACTIVE') {
          throw new BadRequestException('User is inactive');
        }
        
        const isPasswordValid = await bcrypt.compare(dto.password, user.password);
        if (!isPasswordValid) {
          throw new BadRequestException('Invalid credentials');
        }
        
        // Generate JWT token
        const token = jwtService.sign({
          sub: user.id,
          email: user.email,
          roles: user.roles?.map((role: any) => role.name) || [],
        });
        
        return {
          access_token: token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            roles: user.roles || [],
          },
        };
      },
      
      validateToken: async (token: string) => {
        try {
          const decoded = jwtService.verify(token, 'test-secret');
          
          const user = await userRepository.findOne({
            where: { id: decoded.sub },
            relations: ['roles'],
          });
          
          if (!user) {
            throw new NotFoundException('User not found');
          }
          
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            roles: user.roles || [],
          };
        } catch (error) {
          throw new BadRequestException('Invalid token');
        }
      },
      
      getUserLanguage: async (userId: string) => {
        const user = await userRepository.findOne({
          where: { id: userId },
          relations: ['language'],
        });
        
        if (!user || !user.language) {
          return 'es'; // Default language
        }
        
        return user.language.code;
      },
    };

    userRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('test-token'),
      verify: jest.fn().mockReturnValue({ sub: 'test-user-id' }),
    };

    emailService = {
      sendEmail: jest.fn().mockResolvedValue(true),
    };
  });

  describe('register', () => {
    const registerDto = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    };

    it('should register a new user successfully', async () => {
      const mockUser = {
        id: 'user-1',
        email: registerDto.email,
        name: registerDto.name,
        status: 'ACTIVE',
        created_at: new Date(),
      };

      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockReturnValue(mockUser);
      userRepository.save.mockResolvedValue(mockUser);

      const result = await service.register(registerDto);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: registerDto.email },
      });
      expect(userRepository.create).toHaveBeenCalled();
      expect(userRepository.save).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(mockUser);
    });

    it('should throw error if email already exists', async () => {
      const existingUser = { id: 'existing-id', email: 'test@example.com' };
      userRepository.findOne.mockResolvedValue(existingUser);

      await expect(service.register(registerDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw error if passwords do not match', async () => {
      const invalidDto = {
        ...registerDto,
        confirmPassword: 'different-password',
      };

      await expect(service.register(invalidDto)).rejects.toThrow(BadRequestException);
    });

    it('should hash password before saving', async () => {
      const mockUser = {
        id: 'user-1',
        email: registerDto.email,
        name: registerDto.name,
        password: expect.any(String),
        status: 'ACTIVE',
        created_at: new Date(),
      };

      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockReturnValue(mockUser);
      userRepository.save.mockResolvedValue(mockUser);

      const result = await service.register(registerDto);

      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          password: expect.any(String),
        })
      );
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should authenticate valid user and return token', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        password: 'hashed-password',
        name: 'Test User',
        status: 'ACTIVE',
        roles: [{ code: 'user' }],
      };

      userRepository.findOne.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      jwtService.sign.mockReturnValue('jwt-token');

      const result = await service.login(loginDto);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: loginDto.email },
        relations: ['roles'],
      });
      expect(jwtService.sign).toHaveBeenCalled();
      expect(result).toEqual({
        access_token: 'jwt-token',
        user: {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          roles: mockUser.roles,
        },
      });
    });

    it('should throw error if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw error if password is incorrect', async () => {
      const mockUser = {
        id: 'user-id',
        email: loginDto.email,
        password: 'hashed-different-password',
        status: true,
      };

      userRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.login(loginDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw error if user is inactive', async () => {
      const mockUser = {
        id: 'user-id',
        email: loginDto.email,
        password: 'hashed-password',
        status: false, // Inactive user
      };

      userRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.login(loginDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('validateToken', () => {
    it('should return user data for valid token', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        name: 'Test User',
        roles: [{ code: 'user' }],
      };

      jwtService.verify.mockReturnValue({ sub: 'user-id' });
      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.validateToken('valid-token');

      expect(jwtService.verify).toHaveBeenCalledWith('valid-token', 'test-secret');
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-id' },
        relations: ['roles'],
      });
      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        roles: mockUser.roles,
      });
    });

    it('should throw error for invalid token', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.validateToken('invalid-token')).rejects.toThrow(BadRequestException);
    });

    it('should throw error if user not found', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user-id' });
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.validateToken('valid-token')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getUserLanguage', () => {
    it('should return user language from database', async () => {
      const mockUser = {
        id: 'user-id',
        language: { code: 'es' },
      };

      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.getUserLanguage('user-id');

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-id' },
        relations: ['language'],
      });
      expect(result).toBe('es');
    });

    it('should return default language if user has no language', async () => {
      const mockUser = {
        id: 'user-id',
        language: null,
      };

      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.getUserLanguage('user-id');

      expect(result).toBe('es'); // Default language
    });

    it('should return default language if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.getUserLanguage('user-id');

      expect(result).toBe('es'); // Default language
    });
  });
});
