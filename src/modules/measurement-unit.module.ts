import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MeasurementUnit } from '../models/measurement-unit.entity';
import { MeasurementUnitService } from '../services/measurement-unit.service';
import { MeasurementUnitController } from '../controllers/measurement-unit.controller';

@Module({
  imports: [TypeOrmModule.forFeature([MeasurementUnit])],
  controllers: [MeasurementUnitController],
  providers: [MeasurementUnitService],
  exports: [MeasurementUnitService],
})
export class MeasurementUnitModule {} 