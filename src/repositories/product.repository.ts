import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Product } from '../models/product.entity';
import { IProductRepository } from '../interfaces/product-repository.interface';

@Injectable()
export class ProductRepository implements IProductRepository<Product> {
  private readonly aliasName = 'product';

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  public async findById(id: string): Promise<Product | null> {
    return this.baseQuery()
      .where(`${this.aliasName}.id = :id`, { id })
      .getOne();
  }

  public async findBySku(sku: string): Promise<Product | null> {
    if (!sku) {
      return null;
    }

    return this.baseQuery()
      .where(`${this.aliasName}.sku = :sku`, { sku })
      .getOne();
  }

  private baseQuery() {
    return this.productRepository.manager
      .createQueryBuilder(Product, this.aliasName)
      .leftJoinAndSelect(`${this.aliasName}.taxes`, 'tax')
      .leftJoinAndSelect(`${this.aliasName}.measurement_unit`, 'mu');
  }
}
