import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Referrer } from '../models/referrer.entity';
import { ReferralCommission } from '../models/referral-commission.entity';
import { ReferralService } from '../services/referral.service';
import { ReferralController } from '../controllers/referral.controller';
import { MyReferralController } from '../controllers/my-referral.controller';
import { User } from '../models/user.entity';
import { TenantContext } from '../services/tenant-context.service';

@Module({
  imports: [TypeOrmModule.forFeature([Referrer, ReferralCommission, User])],
  controllers: [ReferralController, MyReferralController],
  providers: [ReferralService, TenantContext],
  exports: [ReferralService],
})
export class ReferralModule {}
