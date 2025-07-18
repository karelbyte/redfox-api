import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionController } from '../controllers/permission.controller';
import { PermissionService } from '../services/permission.service';
import { Permission } from '../models/permission.entity';
import { LanguageModule } from './language.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Permission]),
    LanguageModule,
  ],
  controllers: [PermissionController],
  providers: [PermissionService],
  exports: [PermissionService],
})
export class PermissionModule {}
