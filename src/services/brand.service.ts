import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Brand } from '../models/brand.entity';
import { CreateBrandDto } from '../dtos/brand/create-brand.dto';
import { UpdateBrandDto } from '../dtos/brand/update-brand.dto';
import { BrandResponseDto } from '../dtos/brand/brand-response.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponse } from '../interfaces/pagination.interface';

@Injectable()
export class BrandService {
  constructor(
    @InjectRepository(Brand)
    private brandRepository: Repository<Brand>,
  ) {}

  private mapToResponseDto(brand: Brand): BrandResponseDto {
    const { id, code, description, img, isActive, created_at } = brand;
    return {
      id,
      code,
      description,
      img,
      isActive,
      created_at,
    };
  }

  async create(createBrandDto: CreateBrandDto): Promise<BrandResponseDto> {
    const brand = this.brandRepository.create(createBrandDto);
    const savedBrand = await this.brandRepository.save(brand);
    return this.mapToResponseDto(savedBrand);
  }

  async findAll(
    paginationDto: PaginationDto,
  ): Promise<PaginatedResponse<BrandResponseDto>> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const [brands, total] = await this.brandRepository.findAndCount({
      withDeleted: false,
      skip,
      take: limit,
    });

    const data = brands.map((brand) => this.mapToResponseDto(brand));

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<BrandResponseDto> {
    const brand = await this.brandRepository.findOne({
      where: { id },
      withDeleted: false,
    });
    if (!brand) {
      throw new NotFoundException(`Brand with ID ${id} not found`);
    }
    return this.mapToResponseDto(brand);
  }

  async update(
    id: string,
    updateBrandDto: UpdateBrandDto,
  ): Promise<BrandResponseDto> {
    const brand = await this.brandRepository.findOne({
      where: { id },
      withDeleted: false,
    });
    if (!brand) {
      throw new NotFoundException(`Brand with ID ${id} not found`);
    }
    const updatedBrand = await this.brandRepository.save({
      ...brand,
      ...updateBrandDto,
    });
    return this.mapToResponseDto(updatedBrand);
  }

  async remove(id: string): Promise<void> {
    const brand = await this.brandRepository.findOne({
      where: { id },
      withDeleted: false,
    });
    if (!brand) {
      throw new NotFoundException(`Brand with ID ${id} not found`);
    }
    await this.brandRepository.softRemove(brand);
  }
}
