import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CertificationPack } from '../models/certification-pack.entity';
import { CertificationPackType } from '../constants/certification-packs.constant';
import {
  CreateCertificationPackDto,
  UpdateCertificationPackDto,
} from '../dtos/certification-pack/create-certification-pack.dto';

@Injectable()
export class CertificationPackService {
  constructor(
    @InjectRepository(CertificationPack)
    private readonly certificationPackRepository: Repository<CertificationPack>,
  ) {}

  async create(
    createDto: CreateCertificationPackDto,
  ): Promise<CertificationPack> {
    if (createDto.is_default) {
      await this.unsetDefaultPacks();
    }

    const pack = this.certificationPackRepository.create({
      ...createDto,
      config: createDto.config || {},
    });

    return await this.certificationPackRepository.save(pack);
  }

  async findAll(): Promise<CertificationPack[]> {
    return await this.certificationPackRepository.find({
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: string): Promise<CertificationPack> {
    const pack = await this.certificationPackRepository.findOne({
      where: { id },
    });

    if (!pack) {
      throw new NotFoundException(`Certification pack with ID ${id} not found`);
    }

    return pack;
  }

  async findActive(): Promise<CertificationPack | null> {
    const defaultPack = await this.certificationPackRepository.findOne({
      where: { is_default: true, is_active: true },
    });

    if (defaultPack) {
      return defaultPack;
    }

    return await this.certificationPackRepository.findOne({
      where: { is_active: true },
      order: { created_at: 'ASC' },
    });
  }

  async update(
    id: string,
    updateDto: UpdateCertificationPackDto,
  ): Promise<CertificationPack> {
    const pack = await this.findOne(id);

    if (updateDto.is_default && !pack.is_default) {
      await this.unsetDefaultPacks();
    }

    Object.assign(pack, updateDto);

    return await this.certificationPackRepository.save(pack);
  }

  async remove(id: string): Promise<void> {
    const pack = await this.findOne(id);
    await this.certificationPackRepository.softRemove(pack);
  }

  async setDefault(id: string): Promise<CertificationPack> {
    const pack = await this.findOne(id);

    if (!pack.is_active) {
      throw new BadRequestException(
        'Cannot set inactive pack as default',
      );
    }

    await this.unsetDefaultPacks();

    pack.is_default = true;
    return await this.certificationPackRepository.save(pack);
  }

  private async unsetDefaultPacks(): Promise<void> {
    await this.certificationPackRepository.update(
      { is_default: true },
      { is_default: false },
    );
  }
}
