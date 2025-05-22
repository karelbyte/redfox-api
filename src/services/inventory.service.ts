import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inventory } from '../models/inventory.entity';
import { CreateInventoryDto } from '../dtos/inventory/create-inventory.dto';
import { UpdateInventoryDto } from '../dtos/inventory/update-inventory.dto';
import { InventoryResponseDto } from '../dtos/inventory/inventory-response.dto';
import { ProductService } from './product.service';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponse } from '../interfaces/pagination.interface';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Inventory)
    private inventoryRepository: Repository<Inventory>,
    private productService: ProductService,
  ) {}

  private async mapToResponseDto(
    inventory: Inventory,
  ): Promise<InventoryResponseDto> {
    const { id, product, stock, created_at } = inventory;

    return {
      id,
      product: await this.productService.findOne(product.id),
      stock,
      created_at,
    };
  }

  async create(
    createInventoryDto: CreateInventoryDto,
  ): Promise<InventoryResponseDto> {
    const inventory = this.inventoryRepository.create(createInventoryDto);
    const savedInventory = await this.inventoryRepository.save(inventory);
    return this.mapToResponseDto(savedInventory);
  }

  async findAll(
    paginationDto: PaginationDto,
  ): Promise<PaginatedResponse<InventoryResponseDto>> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const [inventory, total] = await this.inventoryRepository.findAndCount({
      relations: ['product'],
      withDeleted: false,
      skip,
      take: limit,
    });

    const data = await Promise.all(
      inventory.map((item) => this.mapToResponseDto(item)),
    );

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

  async findOne(id: string): Promise<InventoryResponseDto> {
    const inventory = await this.inventoryRepository.findOne({
      where: { id },
      relations: ['product'],
      withDeleted: false,
    });
    if (!inventory) {
      throw new NotFoundException(`Inventory with ID ${id} not found`);
    }
    return this.mapToResponseDto(inventory);
  }

  async update(
    id: string,
    updateInventoryDto: UpdateInventoryDto,
  ): Promise<InventoryResponseDto> {
    const inventory = await this.inventoryRepository.findOne({
      where: { id },
      relations: ['product'],
      withDeleted: false,
    });
    if (!inventory) {
      throw new NotFoundException(`Inventory with ID ${id} not found`);
    }
    const updatedInventory = await this.inventoryRepository.save({
      ...inventory,
      ...updateInventoryDto,
    });
    return this.mapToResponseDto(updatedInventory);
  }

  async remove(id: string): Promise<void> {
    const inventory = await this.inventoryRepository.findOne({
      where: { id },
      withDeleted: false,
    });
    if (!inventory) {
      throw new NotFoundException(`Inventory with ID ${id} not found`);
    }
    await this.inventoryRepository.softRemove(inventory);
  }
}
