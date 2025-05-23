import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reception } from '../models/reception.entity';
import { ReceptionDetail } from '../models/reception-detail.entity';
import { Provider } from '../models/provider.entity';
import { Product } from '../models/product.entity';
import { ReceptionService } from '../services/reception.service';
import { ReceptionController } from '../controllers/reception.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Reception, ReceptionDetail, Provider, Product]),
  ],
  controllers: [ReceptionController],
  providers: [ReceptionService],
  exports: [ReceptionService],
})
export class ReceptionModule {} 