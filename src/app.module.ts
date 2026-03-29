import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
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
import { WarehouseOpeningModule } from './modules/warehouse-opening.module';
import { CurrencyModule } from './modules/currency.module';
import { PermissionModule } from './modules/permission.module';
import { RolePermissionModule } from './modules/role-permission.module';
import { LanguageModule } from './modules/language.module';
import { WarehouseAdjustmentModule } from './modules/warehouse-adjustment.module';
import { ReturnModule } from './modules/return.module';
import { CashRegisterModule } from './modules/cash-register.module';
import { CashTransactionModule } from './modules/cash-transaction.module';
import { PurchaseOrderModule } from './modules/purchase-order.module';
import { InvoiceModule } from './modules/invoice.module';
import { CompanySettingsModule } from './modules/company-settings.module';
import { BackupModule } from './modules/backup.module';
import { SurrogateModule } from './modules/surrogate.module';
import { AnalyticsModule } from './modules/analytics.module';
import { QuotationModule } from './modules/quotation.module';
import { NotificationModule } from './modules/notification.module';
import { ExpenseModule } from './modules/expense.module';
import { AccountReceivableModule } from './modules/account-receivable.module';
import { AccountPayableModule } from './modules/account-payable.module';
import { CashFlowModule } from './modules/cash-flow.module';
import { GlobalSearchModule } from './modules/global-search.module';
import { EmailConfigModule } from './modules/email-config.module';
import { BookmarkModule } from './modules/bookmark.module';
import { InternalNoteModule } from './modules/internal-note.module';
import { TagModule } from './modules/tag.module';
import { TemplateModule } from './modules/template.module';
import { OrganizationModule } from './modules/organization.module';
import { AuditLogModule } from './modules/audit-log.module';
import { SubscriptionModule } from './modules/subscription.module';
import { UploadsModule } from './modules/uploads.module';
import { AdminModule } from './modules/admin.module';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { AuditSubscriber } from './subscribers/audit.subscriber';
import { TenantInterceptor } from './interceptors/tenant.interceptor';
import { ErrorEmailFilter } from './filters/error-email.filter';
import { TenantContext } from './services/tenant-context.service';
import { AppConfig } from './config';
import { HomeController } from './controllers/home.controller';
import { TenantMiddleware } from './middlewares/tenant.middleware';
import { NestModule, MiddlewareConsumer } from '@nestjs/common';

import { UnverifiedAccountCleanupService } from './services/unverified-account-cleanup.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [AppConfig],
    }),
    ScheduleModule.forRoot(),
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
    WarehouseModule,
    WarehouseOpeningModule,
    CurrencyModule,
    PermissionModule,
    RolePermissionModule,
    LanguageModule,
    WarehouseAdjustmentModule,
    ReturnModule,
    CashRegisterModule,
    CashTransactionModule,
    PurchaseOrderModule,
    InvoiceModule,
    CompanySettingsModule,
    BackupModule,
    SurrogateModule,
    AnalyticsModule,
    QuotationModule,
    NotificationModule,
    ExpenseModule,
    AccountReceivableModule,
    AccountPayableModule,
    CashFlowModule,
    GlobalSearchModule,
    EmailConfigModule,
    BookmarkModule,
    InternalNoteModule,
    TagModule,
    TemplateModule,
    AuditLogModule,
    OrganizationModule,
    SubscriptionModule,
    UploadsModule,
    AdminModule,
  ],
  controllers: [HomeController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: ErrorEmailFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    AuditSubscriber,
    TenantContext,
    UnverifiedAccountCleanupService,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*path');
  }
}
