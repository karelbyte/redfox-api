import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MeasurementUnit } from '../models/measurement-unit.entity';
import { Product } from '../models/product.entity';
import { MeasurementUnitService } from '../services/measurement-unit.service';
import { MeasurementUnitController } from '../controllers/measurement-unit.controller';
import { MeasurementUnitMapper } from '../services/mappers/measurement-unit.mapper';
import { LanguageModule } from './language.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MeasurementUnit, Product]),
    LanguageModule,
  ],
  controllers: [MeasurementUnitController],
  providers: [MeasurementUnitService, MeasurementUnitMapper],
  exports: [MeasurementUnitService, MeasurementUnitMapper],
})
export class MeasurementUnitModule {}
