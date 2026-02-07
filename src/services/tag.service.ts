import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tag } from '../models/tag.entity';

@Injectable()
export class TagService {
  constructor(
    @InjectRepository(Tag)
    private tagRepository: Repository<Tag>,
  ) {}

  async create(
    userId: string,
    name: string,
    entityType: string,
    color?: string,
  ): Promise<Tag> {
    const tag = this.tagRepository.create({
      userId,
      name,
      entityType,
      color,
    });
    return this.tagRepository.save(tag);
  }

  async findByUser(userId: string, entityType?: string): Promise<Tag[]> {
    const query = this.tagRepository
      .createQueryBuilder('tag')
      .where('tag.userId = :userId', { userId });

    if (entityType) {
      query.andWhere('tag.entityType = :entityType', { entityType });
    }

    return query.orderBy('tag.name', 'ASC').getMany();
  }

  async findById(id: string): Promise<Tag | null> {
    return this.tagRepository.findOne({ where: { id } });
  }

  async update(id: string, name?: string, color?: string): Promise<Tag | null> {
    await this.tagRepository.update(id, { name, color });
    return this.tagRepository.findOne({ where: { id } });
  }

  async remove(id: string): Promise<void> {
    await this.tagRepository.delete(id);
  }

  async search(
    userId: string,
    entityType: string,
    term: string,
  ): Promise<Tag[]> {
    return this.tagRepository
      .createQueryBuilder('tag')
      .where('tag.userId = :userId', { userId })
      .andWhere('tag.entityType = :entityType', { entityType })
      .andWhere('tag.name ILIKE :term', { term: `%${term}%` })
      .orderBy('tag.name', 'ASC')
      .getMany();
  }
}
