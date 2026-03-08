import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from '../models/organization.entity';
import { OrganizationService } from '../services/organization.service';
import { TenantContext } from '../services/tenant-context.service';

@Module({
    imports: [TypeOrmModule.forFeature([Organization])],
    providers: [
        OrganizationService,
        TenantContext,
    ],
    exports: [OrganizationService, TenantContext],
})
export class OrganizationModule { }
