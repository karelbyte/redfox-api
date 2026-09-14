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
import {
  PackCapabilities,
  resolvePackCapabilities,
} from '../interfaces/certification-pack.interface';
import { CertificationPackFactoryService } from './certification-pack-factory.service';
import { DocumentType } from '../models/document-series.entity';
import { Organization } from '../models/organization.entity';
import {
  CountryProfile,
  getCountryProfile,
} from '../constants/countries.constant';
import { DocumentSeriesService } from './document-series.service';
import { TenantContext } from './tenant-context.service';
import { TranslationService } from './translation.service';
import { UserContextService } from './user-context.service';

/** Acuerdo comercial: los referidos de Factura Green solo usan ese pack. */
const FACTURA_GREEN_REFERRER_CODE = 'FACTURAGREEN';

export type CertificationPackWithCapabilities = CertificationPack & {
  capabilities: PackCapabilities;
};

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
    private readonly documentSeriesService: DocumentSeriesService,
    private readonly certificationPackFactory: CertificationPackFactoryService,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
  ) {}

  private async getOrganization(): Promise<Organization | null> {
    return this.organizationRepository.findOne({
      where: { id: await this.getOrganizationId() },
    });
  }

  /**
   * Packs que puede usar la organización.
   *
   * Se cruzan dos reglas: el país decide qué facturación electrónica tiene
   * sentido, y un código de referido puede restringir la oferta a un único
   * proveedor por acuerdo comercial.
   */
  async findAvailableTypes(): Promise<{
    country: CountryProfile;
    types: CertificationPackType[];
  }> {
    const organization = await this.getOrganization();
    const country = getCountryProfile(organization?.country);
    const referrerCode = (organization?.referrer_code || '')
      .trim()
      .toUpperCase();

    const restricted =
      referrerCode === FACTURA_GREEN_REFERRER_CODE
        ? country.packs.filter(
            (type) => type === CertificationPackType.FACTURA_GREEN,
          )
        : country.packs;

    // Un acuerdo comercial no puede dejar a la organización sin ninguna
    // opción: si el pack del referido no opera en su país, se ignora.
    return {
      country,
      types: restricted.length > 0 ? restricted : country.packs,
    };
  }

  /**
   * Añade al pack las capacidades de su implementación, para que el cliente
   * de la API sepa qué operaciones ofrece (series, recibos, catálogos) sin
   * tener que reconocer el tipo de pack ni replicar sus reglas.
   */
  private withCapabilities(
    pack: CertificationPack,
  ): CertificationPackWithCapabilities {
    return {
      ...pack,
      capabilities: this.certificationPackFactory.getCapabilities(pack.type),
    };
  }

  /**
   * Da de alta las series declaradas en la configuración del pack:
   *
   *   config.series = { factura: 'F001', boleta: 'B001' }
   *
   * Es idempotente, así que se puede invocar en cada alta o actualización.
   * Se ejecuta antes de guardar el pack: si una serie choca con otra ya
   * registrada para otro tipo de comprobante, no se guarda nada.
   */
  private async ensureDocumentSeries(
    type: CertificationPackType | undefined,
    config?: Record<string, any> | null,
  ): Promise<void> {
    if (type !== CertificationPackType.FACTURA_SUNAT || !config?.series) {
      return;
    }

    const series = config.series as Record<string, string | undefined>;
    const byDocumentType: Array<[string, DocumentType]> = [
      ['factura', DocumentType.FACTURA],
      ['boleta', DocumentType.BOLETA],
      ['nota_credito', DocumentType.NOTA_CREDITO],
      ['nota_debito', DocumentType.NOTA_DEBITO],
    ];

    for (const [key, documentType] of byDocumentType) {
      const code = series[key];

      if (!code) {
        continue;
      }

      await this.documentSeriesService.ensureSeries({
        documentType,
        series: code,
        emitterId: (config.ruc as string) ?? null,
        isDefault: true,
      });
    }
  }

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
    const { country, types } = await this.findAvailableTypes();

    if (!types.includes(createDto.type)) {
      const message = await this.translationService.translate(
        'pack.type_not_available_in_country',
        this.tenantContext.getUserId() || undefined,
        { type: createDto.type, country: country.name },
      );
      throw new BadRequestException(message);
    }

    await this.ensureDocumentSeries(createDto.type, createDto.config);

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
      } else if (savedPack.type === CertificationPackType.FACTURA_SUNAT) {
        emitterIdentifier = (savedPack.config?.ruc as string) || '';
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

  async findAll(): Promise<CertificationPackWithCapabilities[]> {
    const packs = await this.certificationPackRepository.find({
      where: { organization_id: await this.getOrganizationId() },
      order: { created_at: 'DESC' },
      relations: ['emitters'],
    });

    return packs.map((pack) => this.withCapabilities(pack));
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

  async findActive(): Promise<CertificationPackWithCapabilities | null> {
    const organizationId = await this.getOrganizationId();
    const defaultPack = await this.certificationPackRepository.findOne({
      where: {
        is_default: true,
        is_active: true,
        organization_id: organizationId,
      },
    });

    if (defaultPack) {
      return this.withCapabilities(defaultPack);
    }

    const activePack = await this.certificationPackRepository.findOne({
      where: { is_active: true, organization_id: organizationId },
      order: { created_at: 'ASC' },
    });

    return activePack ? this.withCapabilities(activePack) : null;
  }

  /**
   * Capacidades del pack activo. Sin pack configurado devuelve las que aplica
   * un pack que no declara nada, que es el comportamiento histórico.
   */
  async findActiveCapabilities(): Promise<{
    type: CertificationPackType | null;
    capabilities: PackCapabilities;
  }> {
    const active = await this.findActive();

    return {
      type: active?.type ?? null,
      capabilities: active?.capabilities ?? resolvePackCapabilities(null),
    };
  }

  /** Igual que findOne, con las capacidades del pack incluidas. */
  async findOneWithCapabilities(
    id: string,
  ): Promise<CertificationPackWithCapabilities> {
    return this.withCapabilities(await this.findOne(id));
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

    await this.ensureDocumentSeries(pack.type, updateDto.config ?? pack.config);

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
