import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from '../controllers/admin.controller';
import { AdminService } from '../services/admin.service';
import { Organization } from '../models/organization.entity';
import { Subscription } from '../models/subscription.entity';
import { User } from '../models/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Organization, Subscription, User])],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
