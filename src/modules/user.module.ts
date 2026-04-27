import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from '../controllers/user.controller';
import { UserService } from '../services/user.service';
import { User } from '../models/user.entity';
import { RoleModule } from './role.module';
import { OrganizationModule } from './organization.module';
import { EmailModule } from './email.module';
import { NotificationModule } from './notification.module';
import { LanguageModule } from './language.module';
import { UserAttributionModule } from './user-attribution.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    RoleModule,
    OrganizationModule,
    EmailModule,
    NotificationModule,
    LanguageModule,
    UserAttributionModule,
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
