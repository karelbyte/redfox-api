import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from '../services/auth.service';
import { JwtModule } from '@nestjs/jwt';
import { AppConfig } from '../config';
import { AuthController } from '../controllers/auth.controller';
import { AuthGuard } from '../guards/auth.guard';
import { UserModule } from './user.module';
import { EmailConfigModule } from './email-config.module';
import { RoleModule } from './role.module';
import { QueueModule } from './queue.module';
import { OrganizationModule } from './organization.module';
import { SubscriptionModule } from './subscription.module';
import { Currency } from '../models/currency.entity';
import { PermissionModule } from './permission.module';
import { RolePermissionModule } from './role-permission.module';
import { TaxModule } from './tax.module';
import { MeasurementUnitModule } from './measurement-unit.module';
import { LanguageModule } from './language.module';
import { Language } from '../models/language.entity';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: AppConfig().appKey,
      signOptions: { expiresIn: '30d' },
    }),
    TypeOrmModule.forFeature([Currency, Language]),
    UserModule,
    EmailConfigModule,
    RoleModule,
    QueueModule.forRootAsync(),
    OrganizationModule,
    SubscriptionModule,
    PermissionModule,
    RolePermissionModule,
    TaxModule,
    MeasurementUnitModule,
    LanguageModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard],
  exports: [AuthService],
})
export class AuthModule {}
