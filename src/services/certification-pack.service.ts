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
import { TenantContext } from './tenant-context.service';
import { TranslationService } from './translation.service';

@Injectable()
export class CertificationPackService {
  constructor(
    @InjectRepository(CertificationPack)
    private readonly certificationPackRepository: Repository<CertificationPack>,
    private readonly tenantContext: TenantContext,
    private readonly translationService: TranslationService,
  ) {}

  private async getOrganizationId(): Promise<string> {
    const orgId = this.tenantContext.getOrganizationId();
    if (!orgId) {
      const message = await this.translationService.translate(
        'auth.organization_required',
        this.tenantContext.getUserId() || undefined,
      );
      throw new BadRequestException(message);
    }
    return orgId;
  }

  async create(
    createDto: CreateCertificationPackDto,
  ): Promise<CertificationPack> {
    if (createDto.is_default) {
      await this.unsetDefaultPacks();
    }

    const pack = this.certificationPackRepository.create({
      ...createDto,
      config: createDto.config || {},
      organization_id: await this.getOrganizationId(),
    });

    return await this.certificationPackRepository.save(pack);
  }

  async findAll(): Promise<CertificationPack[]> {
    return await this.certificationPackRepository.find({
      where: { organization_id: await this.getOrganizationId() },
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: string): Promise<CertificationPack> {
    const pack = await this.certificationPackRepository.findOne({
      where: { id, organization_id: await this.getOrganizationId() },
    });

    if (!pack) {
      const message = await this.translationService.translate(
        'pack.id_not_found',
        this.tenantContext.getUserId() || undefined,
        { id },
      );
      throw new NotFoundException(message);
    }

    return pack;
  }

  async findActive(): Promise<CertificationPack | null> {
    const organizationId = await this.getOrganizationId();
    const defaultPack = await this.certificationPackRepository.findOne({
      where: {
        is_default: true,
        is_active: true,
        organization_id: organizationId,
      },
    });

    if (defaultPack) {
      return defaultPack;
    }

    return await this.certificationPackRepository.findOne({
      where: { is_active: true, organization_id: organizationId },
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
      const message = await this.translationService.translate(
        'pack.cannot_set_inactive',
      );
      throw new BadRequestException(message);
    }

    await this.unsetDefaultPacks();

    pack.is_default = true;
    return await this.certificationPackRepository.save(pack);
  }

  private async unsetDefaultPacks(): Promise<void> {
    await this.certificationPackRepository.update(
      { is_default: true, organization_id: await this.getOrganizationId() },
      { is_default: false },
    );
  }
}
