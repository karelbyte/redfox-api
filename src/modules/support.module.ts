import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupportController } from '../controllers/support.controller';
import { EmailModule } from './email.module';
import { User } from '../models/user.entity';
import { Organization } from '../models/organization.entity';
import { TenantContext } from '../services/tenant-context.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Organization]), EmailModule],
  controllers: [SupportController],
  providers: [TenantContext],
})
export class SupportModule {}
