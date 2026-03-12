import { Module } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { JwtModule } from '@nestjs/jwt';
import { AppConfig } from '../config';
import { AuthController } from '../controllers/auth.controller';
import { UserModule } from './user.module';
import { EmailConfigModule } from './email-config.module';
import { RoleModule } from './role.module';
import { QueueModule } from './queue.module';
import { OrganizationModule } from './organization.module';
import { SubscriptionModule } from './subscription.module';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: AppConfig().appKey,
      signOptions: { expiresIn: '30d' },
    }),
    UserModule,
    EmailConfigModule,
    RoleModule,
    QueueModule.forRootAsync(),
    OrganizationModule,
    SubscriptionModule,
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
