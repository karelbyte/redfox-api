import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CountryController } from '../controllers/country.controller';
import { Organization } from '../models/organization.entity';
import { OrganizationModule } from './organization.module';

@Module({
  imports: [TypeOrmModule.forFeature([Organization]), OrganizationModule],
  controllers: [CountryController],
})
export class CountryModule {}
