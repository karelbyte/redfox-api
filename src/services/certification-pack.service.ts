import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CertificationPack } from '../models/certification-pack.entity';
import { CertificationPackEmitter } from '../models/certification-pack-emitter.entity';
import { CertificationPackType } from '../constants/certification-packs.constant';
import {
  CreateCertificationPackDto,
  UpdateCertificationPackDto,
  CertificationPackEmitterDto,
} from '../dtos/certification-pack/create-certification-pack.dto';
import { TenantContext } from './tenant-context.service';
import { TranslationService } from './translation.service';
import { UserContextService } from './user-context.service';

@Injectable()
export class CertificationPackService {
  constructor(
    @InjectRepository(CertificationPack)
    private readonly certificationPackRepository: Repository<CertificationPack>,
    @InjectRepository(CertificationPackEmitter)
    private readonly certificationPackEmitterRepository: Repository<CertificationPackEmitter>,
    private readonly tenantContext: TenantContext,
    private readonly translationService: TranslationService,
    private readonly userContextService: UserContextService,
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

    const savedPack = await this.certificationPackRepository.save(pack);

    // Crear emitters si se proporcionan
    if (createDto.emitters && createDto.emitters.length > 0) {
      const emitters = createDto.emitters.map((emitterDto) =>
        this.certificationPackEmitterRepository.create({
          ...emitterDto,
          pack_id: savedPack.id,
        }),
      );
      await this.certificationPackEmitterRepository.save(emitters);
    } else {
      // Crear emisor por defecto automáticamente
      const userId = this.tenantContext.getUserId();
      const userLanguage = await this.userContextService.getUserLanguageCode(userId || '');

      const principalNames = {
        es: 'Principal',
        en: 'Principal',
        zh: '主要',
      };

      const principalName = principalNames[userLanguage as keyof typeof principalNames] || principalNames.es;

      let emitterIdentifier = '';
      if (savedPack.type === CertificationPackType.FACTURA_GREEN) {
        emitterIdentifier = savedPack.config?.business_uuid || '';
      } else if (savedPack.type === CertificationPackType.FACTURAAPI) {
        emitterIdentifier = savedPack.config?.api_key || '';
      }

      if (emitterIdentifier) {
        const defaultEmitter = this.certificationPackEmitterRepository.create({
          emitter: emitterIdentifier,
          name: principalName,
          fav: true,
          status: 'active',
          pack_id: savedPack.id,
        });
        await this.certificationPackEmitterRepository.save(defaultEmitter);
      }
    }

    return savedPack;
  }

  async findAll(): Promise<CertificationPack[]> {
    return await this.certificationPackRepository.find({
      where: { organization_id: await this.getOrganizationId() },
      order: { created_at: 'DESC' },
      relations: ['emitters'],
    });
  }

  async findOne(id: string): Promise<CertificationPack> {
    const pack = await this.certificationPackRepository.findOne({
      where: { id, organization_id: await this.getOrganizationId() },
      relations: ['emitters'],
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

  async findAvailableEmitters(): Promise<CertificationPackEmitter[]> {
    const organizationId = await this.getOrganizationId();
    const activePack = await this.certificationPackRepository.findOne({
      where: {
        is_active: true,
        organization_id: organizationId,
      },
      relations: ['emitters'],
    });

    if (!activePack) {
      return [];
    }

    // Filter emitters: from active pack + favorite active emitters
    const availableEmitters = activePack.emitters.filter(
      (emitter) => emitter.status === 'active' && (emitter.fav || emitter.pack_id === activePack.id)
    );

    return availableEmitters;
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

    const savedPack = await this.certificationPackRepository.save(pack);

    // Actualizar emitters si se proporcionan
    if (updateDto.emitters !== undefined) {
      // Eliminar emitters existentes
      await this.certificationPackEmitterRepository.delete({ pack_id: id });

      // Crear nuevos emitters
      if (updateDto.emitters.length > 0) {
        const emitters = updateDto.emitters.map((emitterDto) =>
          this.certificationPackEmitterRepository.create({
            ...emitterDto,
            pack_id: savedPack.id,
          }),
        );
        await this.certificationPackEmitterRepository.save(emitters);
      }
    }

    return savedPack;
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

  async addEmitter(packId: string, emitterDto: CertificationPackEmitterDto): Promise<CertificationPackEmitter> {
    const pack = await this.findOne(packId);
    const emitter = this.certificationPackEmitterRepository.create({
      ...emitterDto,
      pack_id: packId,
    });
    return await this.certificationPackEmitterRepository.save(emitter);
  }

  async updateEmitter(packId: string, emitterId: string, emitterDto: CertificationPackEmitterDto): Promise<CertificationPackEmitter> {
    const pack = await this.findOne(packId);
    const emitter = await this.certificationPackEmitterRepository.findOne({
      where: { id: emitterId, pack_id: packId },
    });

    if (!emitter) {
      const message = await this.translationService.translate(
        'pack.emitter_not_found',
        this.tenantContext.getUserId() || undefined,
        { id: emitterId },
      );
      throw new NotFoundException(message);
    }

    Object.assign(emitter, emitterDto);
    return await this.certificationPackEmitterRepository.save(emitter);
  }

  async removeEmitter(packId: string, emitterId: string): Promise<void> {
    const pack = await this.findOne(packId);
    const emitter = await this.certificationPackEmitterRepository.findOne({
      where: { id: emitterId, pack_id: packId },
    });

    if (!emitter) {
      const message = await this.translationService.translate(
        'pack.emitter_not_found',
        this.tenantContext.getUserId() || undefined,
        { id: emitterId },
      );
      throw new NotFoundException(message);
    }

    await this.certificationPackEmitterRepository.softRemove(emitter);
  }
}
