import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Shipment } from '../models/shipment.entity';
import { Organization } from '../models/organization.entity';
import { CompanySettings } from '../models/company-settings.entity';
import { Public } from '../decorators/public.decorator';

@Controller('public')
export class ShipmentPublicController {
  constructor(
    @InjectRepository(Shipment)
    private readonly shipmentRepo: Repository<Shipment>,
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    @InjectRepository(CompanySettings)
    private readonly settingsRepo: Repository<CompanySettings>,
  ) {}

  @Public()
  @Get('org/:slug')
  async getOrgBranding(@Param('slug') slug: string) {
    const org = await this.orgRepo.findOne({ where: { slug } });
    if (!org) throw new NotFoundException('Organización no encontrada');

    const settings = await this.settingsRepo.findOne({ where: { organization_id: org.id } });

    return {
      name: settings?.name || org.name,
      legal_name: settings?.legalName || null,
      logo_url: settings?.logoUrl || null,
      address: settings?.address || null,
      phone: settings?.phone || null,
      email: settings?.email || null,
      website: settings?.website || null,
    };
  }

  @Public()
  @Get('track/:trackingNumber')
  async track(
    @Param('trackingNumber') trackingNumber: string,
    @Query('tenant') tenantSlug: string,
  ) {
    if (!tenantSlug) throw new NotFoundException('Tenant requerido');

    const org = await this.orgRepo.findOne({ where: { slug: tenantSlug } });
    if (!org) throw new NotFoundException('Organización no encontrada');

    const settings = await this.settingsRepo.findOne({ where: { organization_id: org.id } });

    const shipment = await this.shipmentRepo.findOne({
      where: { tracking_number: trackingNumber, organization_id: org.id },
      relations: ['withdrawal', 'withdrawal.client'],
    });

    if (!shipment) throw new NotFoundException('Envío no encontrado');

    return {
      tracking_number: shipment.tracking_number,
      carrier: shipment.carrier,
      status: shipment.status,
      tracking_url: shipment.tracking_url,
      estimated_delivery_date: shipment.estimated_delivery_date,
      shipped_at: shipment.shipped_at,
      delivered_at: shipment.delivered_at,
      notes: shipment.notes,
      organization: {
        name: settings?.name || org.name,
        legal_name: settings?.legalName || null,
        logo_url: settings?.logoUrl || null,
        address: settings?.address || null,
        phone: settings?.phone || null,
        email: settings?.email || null,
        website: settings?.website || null,
      },
      created_at: shipment.created_at,
      updated_at: shipment.updated_at,
    };
  }
}
