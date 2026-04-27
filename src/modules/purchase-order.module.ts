import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PurchaseOrder } from '../models/purchase-order.entity';
import { PurchaseOrderDetail } from '../models/purchase-order-detail.entity';
import { Provider } from '../models/provider.entity';
import { Product } from '../models/product.entity';
import { Warehouse } from '../models/warehouse.entity';
import { MeasurementUnit } from '../models/measurement-unit.entity';
import { PurchaseOrderService } from '../services/purchase-order.service';
import { PurchaseOrderController } from '../controllers/purchase-order.controller';
import { ProductModule } from './product.module';
import { WarehouseMapper } from '../services/mappers/warehouse.mapper';
import { CurrencyMapper } from '../services/mappers/currency.mapper';
import { ProductMapper } from '../services/mappers/product.mapper';
import { BrandMapper } from '../services/mappers/brand.mapper';
import { CategoryMapper } from '../services/mappers/category.mapper';
import { TaxMapper } from '../services/mappers/tax.mapper';
import { MeasurementUnitMapper } from '../services/mappers/measurement-unit.mapper';
import { LanguageModule } from './language.module';
import { OrganizationModule } from './organization.module';
import { NotificationModule } from './notification.module';
import { ReceptionModule } from './reception.module';
import { EmailConfigModule } from './email-config.module';
import { SurrogateModule } from './surrogate.module';
import { UserAttributionModule } from './user-attribution.module';


@Module({
  imports: [
    TypeOrmModule.forFeature([
      PurchaseOrder,
      PurchaseOrderDetail,
      Provider,
      Product,
      Warehouse,
      MeasurementUnit,
    ]),
    ProductModule,
    LanguageModule,
    OrganizationModule,
    NotificationModule,
    forwardRef(() => ReceptionModule),
    EmailConfigModule,
    SurrogateModule,
    UserAttributionModule,
  ],
  controllers: [PurchaseOrderController],
  providers: [
    PurchaseOrderService,
    WarehouseMapper,
    CurrencyMapper,
    ProductMapper,
    BrandMapper,
    CategoryMapper,
    TaxMapper,
    MeasurementUnitMapper,
  ],
  exports: [PurchaseOrderService],
})
export class PurchaseOrderModule {}
