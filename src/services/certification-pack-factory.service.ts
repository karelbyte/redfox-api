import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CertificationPack } from '../models/certification-pack.entity';
import { CertificationPackType } from '../constants/certification-packs.constant';
import { ICertificationPackService } from '../interfaces/certification-pack.interface';
import { FacturaAPIService } from './facturapi.service';

@Injectable()
export class CertificationPackFactoryService {
  private packServices: Map<string, ICertificationPackService> = new Map();

  constructor(
    @InjectRepository(CertificationPack)
    private readonly certificationPackRepository: Repository<CertificationPack>,
    private readonly facturaAPIService: FacturaAPIService,
  ) {
    this.initializePackServices();
  }

  private initializePackServices(): void {
    this.packServices.set(
      CertificationPackType.FACTURAAPI,
      this.facturaAPIService,
    );
  }

  async getActivePack(): Promise<CertificationPack> {
    const defaultPack = await this.certificationPackRepository.findOne({
      where: { is_default: true, is_active: true },
    });

    if (defaultPack) {
      return defaultPack;
    }

    const activePack = await this.certificationPackRepository.findOne({
      where: { is_active: true },
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
        where: { type: packType, is_active: true },
      });
    } else {
      pack = await this.getActivePack();
    }

    if (!pack) {
      throw new NotFoundException(
        `Certification pack ${packType || 'active'} not found`,
      );
    }

    const service = this.packServices.get(pack.type);

    if (!service) {
      throw new NotFoundException(
        `Service for pack type ${pack.type} not implemented`,
      );
    }

    if (service instanceof FacturaAPIService) {
      const apiKey = pack.config?.api_key;
      if (apiKey) {
        (service as any).updateApiKey(apiKey);
      }
    }

    return service;
  }

  registerPackService(
    packType: CertificationPackType,
    service: ICertificationPackService,
  ): void {
    this.packServices.set(packType, service);
  }
}
