import { Module } from '@nestjs/common';
import { UpcdeController } from '../controllers/upcde.controller';
import { UpcdeService } from '../services/upcde.service';
import { OrganizationModule } from './organization.module';

@Module({
  imports: [OrganizationModule],
  controllers: [UpcdeController],
  providers: [UpcdeService],
  exports: [UpcdeService],
})
export class UpcdeModule {}
