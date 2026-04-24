import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupportController } from '../controllers/support.controller';
import { EmailModule } from './email.module';
import { User } from '../models/user.entity';
import { Organization } from '../models/organization.entity';
import { TenantContext } from '../services/tenant-context.service';
import { LanguageModule } from './language.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Organization]),
    EmailModule,
    LanguageModule,
  ],
  controllers: [SupportController],
  providers: [TenantContext],
})
export class SupportModule {}
