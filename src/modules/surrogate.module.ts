import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Surrogate } from '../models/surrogate.entity';
import { SurrogateService } from '../services/surrogate.service';
import { SurrogateController } from '../controllers/surrogate.controller';
import { OrganizationModule } from './organization.module';
import { TenantContext } from '../services/tenant-context.service';

@Module({
  imports: [TypeOrmModule.forFeature([Surrogate]), OrganizationModule],
  controllers: [SurrogateController],
  providers: [SurrogateService, TenantContext],
  exports: [SurrogateService],
})
export class SurrogateModule {}
