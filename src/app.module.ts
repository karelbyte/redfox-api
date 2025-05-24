import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from './modules/user.module';
import { RoleModule } from './modules/role.module';
import { ClientModule } from './modules/client.module';
import { ProviderModule } from './modules/provider.module';
import { MeasurementUnitModule } from './modules/measurement-unit.module';
import { BrandModule } from './modules/brand.module';
import { ProductModule } from './modules/product.module';
import { InventoryModule } from './modules/inventory.module';
import { getDatabaseConfig } from './config/database.config';
import { ReceptionModule } from './modules/reception.module';
import { WarehouseModule } from './modules/warehouse.module';
import { WithdrawalModule } from './modules/withdrawal.module';
import { ProductHistoryModule } from './modules/product-history.module';
import { CategoryModule } from './modules/category.module';
import { AuthModule } from './modules/auth.module';
import { TaxModule } from './modules/tax.module';
import { AppConfig } from './config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [AppConfig],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) =>
        getDatabaseConfig(configService),
      inject: [ConfigService],
    }),
    AuthModule,
    UserModule,
    RoleModule,
    ClientModule,
    ProviderModule,
    MeasurementUnitModule,
    BrandModule,
    ProductModule,
    InventoryModule,
    ReceptionModule,
    WarehouseModule,
    WithdrawalModule,
    ProductHistoryModule,
    CategoryModule,
    TaxModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
