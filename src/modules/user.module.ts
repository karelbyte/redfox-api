import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from '../controllers/user.controller';
import { UserService } from '../services/user.service';
import { User } from '../models/user.entity';
import { RoleModule } from './role.module';
import { TranslationService } from '../services/translation.service';
import { UserContextService } from '../services/user-context.service';
import { Language } from '../models/language.entity';
import { OrganizationModule } from './organization.module';
import { EmailModule } from './email.module';
import { NotificationModule } from './notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Language]),
    RoleModule,
    OrganizationModule,
    EmailModule,
    NotificationModule,
  ],
  controllers: [UserController],
  providers: [UserService, TranslationService, UserContextService],
  exports: [UserService],
})
export class UserModule {}
