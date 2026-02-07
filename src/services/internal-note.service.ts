import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InternalNote } from '../models/internal-note.entity';

@Injectable()
export class InternalNoteService {
  constructor(
    @InjectRepository(InternalNote)
    private noteRepository: Repository<InternalNote>,
  ) {}

  async create(
    userId: string,
    entityType: string,
    entityId: string,
    content: string,
    color?: string,
  ): Promise<InternalNote> {
    const note = this.noteRepository.create({
      userId,
      entityType,
      entityId,
      content,
      color,
    });
    return this.noteRepository.save(note);
  }

  async findByEntity(
    entityType: string,
    entityId: string,
  ): Promise<InternalNote[]> {
    return this.noteRepository
      .createQueryBuilder('note')
      .leftJoinAndSelect('note.user', 'user')
      .where('note.entityType = :entityType', { entityType })
      .andWhere('note.entityId = :entityId', { entityId })
      .orderBy('note.created_at', 'DESC')
      .getMany();
  }

  async update(
    id: string,
    content: string,
    color?: string,
  ): Promise<InternalNote | null> {
    await this.noteRepository.update(id, { content, color });
    return this.noteRepository.findOne({ where: { id } });
  }

  async remove(id: string): Promise<void> {
    await this.noteRepository.delete(id);
  }

  async removeByEntity(entityType: string, entityId: string): Promise<void> {
    await this.noteRepository.delete({ entityType, entityId });
  }
}
