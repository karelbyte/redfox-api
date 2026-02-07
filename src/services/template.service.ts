import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Template } from '../models/template.entity';

@Injectable()
export class TemplateService {
  constructor(
    @InjectRepository(Template)
    private templateRepository: Repository<Template>,
  ) {}

  async create(
    userId: string,
    name: string,
    entityType: string,
    data: Record<string, any>,
    description?: string,
    isDefault?: boolean,
  ): Promise<Template> {
    const template = this.templateRepository.create({
      userId,
      name,
      entityType,
      data,
      description,
      isDefault: isDefault || false,
    });
    return this.templateRepository.save(template);
  }

  async findByUser(userId: string, entityType?: string): Promise<Template[]> {
    const query = this.templateRepository
      .createQueryBuilder('template')
      .where('template.userId = :userId', { userId });

    if (entityType) {
      query.andWhere('template.entityType = :entityType', { entityType });
    }

    return query.orderBy('template.created_at', 'DESC').getMany();
  }

  async findById(id: string): Promise<Template | null> {
    return this.templateRepository.findOne({ where: { id } });
  }

  async findDefault(userId: string, entityType: string): Promise<Template | null> {
    return this.templateRepository.findOne({
      where: { userId, entityType, isDefault: true },
    });
  }

  async update(
    id: string,
    name?: string,
    data?: Record<string, any>,
    description?: string,
  ): Promise<Template | null> {
    await this.templateRepository.update(id, { name, data, description });
    return this.templateRepository.findOne({ where: { id } });
  }

  async setAsDefault(userId: string, id: string, entityType: string): Promise<void> {
    await this.templateRepository.update(
      { userId, entityType, isDefault: true },
      { isDefault: false },
    );
    await this.templateRepository.update(id, { isDefault: true });
  }

  async remove(id: string): Promise<void> {
    await this.templateRepository.delete(id);
  }

  async duplicate(
    userId: string,
    templateId: string,
    newName: string,
  ): Promise<Template> {
    const template = await this.findById(templateId);
    if (!template) {
      throw new Error('Template not found');
    }
    return this.create(
      userId,
      newName,
      template.entityType,
      template.data,
      template.description,
    );
  }
}
