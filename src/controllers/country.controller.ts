import {
  Controller,
  Get,
  NotFoundException,
  Param,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  COUNTRIES,
  CountryProfile,
  getCountryProfile,
  isSupportedCountry,
} from '../constants/countries.constant';
import { Organization } from '../models/organization.entity';
import { TenantContext } from '../services/tenant-context.service';
import { AuthGuard } from '../guards/auth.guard';
import { TenantInterceptor } from '../interceptors/tenant.interceptor';

/**
 * Perfiles fiscales por país. El listado es público porque el formulario de
 * registro necesita ofrecer los países antes de que exista una sesión.
 */
@Controller('countries')
export class CountryController {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    private readonly tenantContext: TenantContext,
  ) {}

  @Get()
  findAll(): CountryProfile[] {
    return Object.values(COUNTRIES);
  }

  /** Perfil del país de la organización en sesión. */
  @Get('profile')
  @UseGuards(AuthGuard)
  @UseInterceptors(TenantInterceptor)
  async findOrganizationProfile(): Promise<CountryProfile> {
    const organizationId = this.tenantContext.getOrganizationId();
    const organization = organizationId
      ? await this.organizationRepository.findOne({
          where: { id: organizationId },
        })
      : null;

    return getCountryProfile(organization?.country);
  }

  @Get(':code')
  findOne(@Param('code') code: string): CountryProfile {
    if (!isSupportedCountry(code)) {
      throw new NotFoundException(`Country ${code} is not supported`);
    }

    return getCountryProfile(code);
  }
}
