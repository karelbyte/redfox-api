import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bookmark } from '../models/bookmark.entity';

@Injectable()
export class BookmarkService {
  constructor(
    @InjectRepository(Bookmark)
    private bookmarkRepository: Repository<Bookmark>,
  ) {}

  async create(
    userId: string,
    entityType: string,
    entityId: string,
    entityName?: string,
    description?: string,
  ): Promise<Bookmark> {
    const bookmark = this.bookmarkRepository.create({
      userId,
      entityType,
      entityId,
      entityName,
      description,
    });
    return this.bookmarkRepository.save(bookmark);
  }

  async findByUser(userId: string, entityType?: string): Promise<Bookmark[]> {
    const query = this.bookmarkRepository
      .createQueryBuilder('bookmark')
      .where('bookmark.userId = :userId', { userId });

    if (entityType) {
      query.andWhere('bookmark.entityType = :entityType', { entityType });
    }

    return query.orderBy('bookmark.created_at', 'DESC').getMany();
  }

  async isBookmarked(
    userId: string,
    entityType: string,
    entityId: string,
  ): Promise<boolean> {
    const count = await this.bookmarkRepository.count({
      where: { userId, entityType, entityId },
    });
    return count > 0;
  }

  async remove(
    userId: string,
    entityType: string,
    entityId: string,
  ): Promise<void> {
    await this.bookmarkRepository.delete({
      userId,
      entityType,
      entityId,
    });
  }

  async removeById(id: string): Promise<void> {
    await this.bookmarkRepository.delete(id);
  }
}
