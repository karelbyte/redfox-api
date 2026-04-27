import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WarehouseOpening } from '../models/warehouse-opening.entity';
import { WarehouseOpeningService } from '../services/warehouse-opening.service';
import { WarehouseOpeningController } from '../controllers/warehouse-opening.controller';
import { ProductModule } from './product.module';
import { WarehouseModule } from './warehouse.module';
import { LanguageModule } from './language.module';
import { OrganizationModule } from './organization.module';
import { UserAttributionModule } from './user-attribution.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([WarehouseOpening]),
    ProductModule,
    WarehouseModule,
    LanguageModule,
    OrganizationModule,
    UserAttributionModule,
  ],
  controllers: [WarehouseOpeningController],
  providers: [WarehouseOpeningService],
  exports: [WarehouseOpeningService],
})
export class WarehouseOpeningModule {}
