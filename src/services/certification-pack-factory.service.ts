import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CertificationPack } from '../models/certification-pack.entity';
import { CertificationPackType } from '../constants/certification-packs.constant';
import { ICertificationPackService } from '../interfaces/certification-pack.interface';
import { FacturaAPIService } from './facturapi.service';
import { FacturaGreenService } from './factura-green.service';
import { TenantContext } from './tenant-context.service';

@Injectable()
export class CertificationPackFactoryService {
  private readonly logger = new Logger(CertificationPackFactoryService.name);
  private packServices: Map<string, ICertificationPackService> = new Map();

  constructor(
    @InjectRepository(CertificationPack)
    private readonly certificationPackRepository: Repository<CertificationPack>,
    private readonly facturaAPIService: FacturaAPIService,
    private readonly facturaGreenService: FacturaGreenService,
    private readonly tenantContext: TenantContext,
  ) {
    this.initializePackServices();
  }

  private initializePackServices(): void {
    this.packServices.set(
      CertificationPackType.FACTURAAPI,
      this.facturaAPIService,
    );

    this.packServices.set(
      CertificationPackType.FACTURA_GREEN,
      this.facturaGreenService,
    );
  }

  private get organizationId(): string {
    return this.tenantContext.getOrganizationId() || '';
  }

  async getActivePack(): Promise<CertificationPack> {
    const defaultPack = await this.certificationPackRepository.findOne({
      where: {
        is_default: true,
        is_active: true,
        organization_id: this.organizationId,
      },
    });

    if (defaultPack) {
      return defaultPack;
    }

    const activePack = await this.certificationPackRepository.findOne({
      where: { is_active: true, organization_id: this.organizationId },
      order: { created_at: 'ASC' },
    });

    if (!activePack) {
      throw new NotFoundException('No active certification pack found');
    }

    return activePack;
  }

  async getPackService(
    packType?: CertificationPackType,
  ): Promise<ICertificationPackService> {
    let pack: CertificationPack | null = null;

    if (packType) {
      pack = await this.certificationPackRepository.findOne({
        where: {
          type: packType,
          is_active: true,
          organization_id: this.organizationId,
        },
      });
    } else {
      pack = await this.getActivePack();
    }

    if (!pack) {
      this.logger.warn(`Certification pack ${packType || 'active'} not found for organization ${this.organizationId}`);
      throw new NotFoundException(
        `Certification pack ${packType || 'active'} not found`,
      );
    }

    this.logger.log(
      `Selected certification pack: ${pack.type} (id=${pack.id}) for organization ${this.organizationId}`,
    );

    const service = this.packServices.get(pack.type);

    if (!service) {
      this.logger.error(`Service for pack type ${pack.type} not implemented`);
      throw new NotFoundException(
        `Service for pack type ${pack.type} not implemented`,
      );
    }

     this.tenantContext.setPacConfig(pack.config || {});

    return service;
  }

  registerPackService(
    packType: CertificationPackType,
    service: ICertificationPackService,
  ): void {
    this.packServices.set(packType, service);
  }
}
