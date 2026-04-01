import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from '../controllers/admin.controller';
import { AdminService } from '../services/admin.service';
import { SuperAdminGuard } from '../guards/super-admin.guard';
import { Organization } from '../models/organization.entity';
import { Subscription } from '../models/subscription.entity';
import { Plan } from '../models/plan.entity';
import { User } from '../models/user.entity';

import { AuthModule } from './auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Organization, Subscription, Plan, User]),
    AuthModule,
  ],
  controllers: [AdminController],
  providers: [AdminService, SuperAdminGuard],
})
 export class AdminModule {}
