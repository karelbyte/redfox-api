import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolePermissionController } from '../controllers/role-permission.controller';
import { RolePermissionService } from '../services/role-permission.service';
import { RolePermission } from '../models/role-permission.entity';
import { Role } from '../models/role.entity';
import { Permission } from '../models/permission.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RolePermission, Role, Permission])],
  controllers: [RolePermissionController],
  providers: [RolePermissionService],
  exports: [RolePermissionService],
})
export class RolePermissionModule {}
