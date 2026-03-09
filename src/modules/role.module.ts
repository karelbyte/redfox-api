import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleController } from '../controllers/role.controller';
import { RoleService } from '../services/role.service';
import { Role } from '../models/role.entity';
import { LanguageModule } from './language.module';
import { OrganizationModule } from './organization.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Role]),
    LanguageModule,
    OrganizationModule,
  ],
  controllers: [RoleController],
  providers: [RoleService],
  exports: [RoleService],
})
export class RoleModule {}
