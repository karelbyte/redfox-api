import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { UserAttribution, AttributionType } from '../models/user-attribution.entity';
import { User } from '../models/user.entity';
import { CreateUserAttributionDto } from '../dtos/user-attribution/create-user-attribution.dto';
import { AssignAttributionsDto } from '../dtos/user-attribution/assign-attributions.dto';
import { UpdateUserAttributionDto } from '../dtos/user-attribution/update-user-attribution.dto';
import { UserAttributionResponseDto } from '../dtos/user-attribution/user-attribution-response.dto';

@Injectable()
export class UserAttributionService {
  constructor(
    @InjectRepository(UserAttribution)
    private userAttributionRepository: Repository<UserAttribution>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private dataSource: DataSource,
  ) {}

  async create(
    createUserAttributionDto: CreateUserAttributionDto,
    userId?: string,
  ): Promise<UserAttributionResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id: createUserAttributionDto.userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const existingAttribution = await this.userAttributionRepository.findOne({
      where: {
        userId: createUserAttributionDto.userId,
        attributionType: createUserAttributionDto.attributionType,
        resourceId: createUserAttributionDto.resourceId,
      },
    });

    if (existingAttribution) {
      throw new BadRequestException('Attribution already exists');
    }

    const attribution = this.userAttributionRepository.create({
      ...createUserAttributionDto,
    });

    const savedAttribution =
      await this.userAttributionRepository.save(attribution);
    return this.mapToResponseDto(savedAttribution);
  }

  async assignAttributions(
    assignAttributionsDto: AssignAttributionsDto,
    userId?: string,
  ): Promise<UserAttributionResponseDto[]> {
    const user = await this.userRepository.findOne({
      where: { id: assignAttributionsDto.userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Remove existing attributions of this type for the user
      await queryRunner.manager.delete(UserAttribution, {
        userId: assignAttributionsDto.userId,
        attributionType: assignAttributionsDto.attributionType,
      });

      // Create new attributions
      const attributions = assignAttributionsDto.resourceIds.map(
        (resourceId) =>
          this.userAttributionRepository.create({
            userId: assignAttributionsDto.userId,
            attributionType: assignAttributionsDto.attributionType,
            resourceId,
            resourceType: assignAttributionsDto.resourceType,
            permissions: assignAttributionsDto.permissions,
          }),
      );

      const savedAttributions = await queryRunner.manager.save(
        UserAttribution,
        attributions,
      );

      await queryRunner.commitTransaction();

      // Return with relations loaded
      const result = await this.userAttributionRepository.find({
        where: { id: In(savedAttributions.map((a) => a.id)) },
        relations: ['user'],
      });

      return result.map((a) => this.mapToResponseDto(a));
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(userId?: string): Promise<UserAttributionResponseDto[]> {
    const attributions = await this.userAttributionRepository.find({
      relations: ['user'],
    });
    return attributions.map((a) => this.mapToResponseDto(a));
  }

  async findByUser(
    userId: string,
    attributionType?: string,
    userIdParam?: string,
  ): Promise<UserAttributionResponseDto[]> {
    const where: any = { userId };
    if (attributionType) {
      where.attributionType = attributionType;
    }

    const attributions = await this.userAttributionRepository.find({
      where,
      relations: ['user'],
    });
    return attributions.map((a) => this.mapToResponseDto(a));
  }

  async findOne(
    id: string,
    userId?: string,
  ): Promise<UserAttributionResponseDto> {
    const attribution = await this.userAttributionRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!attribution) {
      throw new NotFoundException('Attribution not found');
    }

    return this.mapToResponseDto(attribution);
  }

  async update(
    id: string,
    updateUserAttributionDto: UpdateUserAttributionDto,
    userId?: string,
  ): Promise<UserAttributionResponseDto> {
    const attribution = await this.userAttributionRepository.findOne({
      where: { id },
    });

    if (!attribution) {
      throw new NotFoundException('Attribution not found');
    }

    Object.assign(attribution, updateUserAttributionDto);
    const updatedAttribution =
      await this.userAttributionRepository.save(attribution);
    return this.mapToResponseDto(updatedAttribution);
  }

  async remove(id: string, userId?: string): Promise<void> {
    const attribution = await this.userAttributionRepository.findOne({
      where: { id },
    });

    if (!attribution) {
      throw new NotFoundException('Attribution not found');
    }

    await this.userAttributionRepository.remove(attribution);
  }

  async isUserAdmin(userId: string): Promise<boolean> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['admin'],
    });
    return user?.admin === true;
  }

  async getAuthorizedWarehouseIds(userId: string): Promise<string[] | null> {
    const isAdmin = await this.isUserAdmin(userId);
    if (isAdmin) {
      return null;
    }
    const attributions = await this.userAttributionRepository.find({
      where: {
        userId,
        attributionType: AttributionType.WAREHOUSE,
      },
      select: ['resourceId'],
    });
    return attributions.map((a) => a.resourceId);
  }

  async getAuthorizedCashRegisterIds(userId: string): Promise<string[] | null> {
    const isAdmin = await this.isUserAdmin(userId);
    if (isAdmin) {
      return null;
    }
    const attributions = await this.userAttributionRepository.find({
      where: {
        userId,
        attributionType: AttributionType.CASH_REGISTER,
      },
      select: ['resourceId'],
    });
    return attributions.map((a) => a.resourceId);
  }

  private mapToResponseDto(
    attribution: UserAttribution,
  ): UserAttributionResponseDto {
    return {
      id: attribution.id,
      userId: attribution.userId,
      attributionType: attribution.attributionType,
      resourceId: attribution.resourceId,
      resourceType: attribution.resourceType,
      permissions: attribution.permissions,
      createdAt: attribution.createdAt,
      updatedAt: attribution.updatedAt,
    };
  }
}
