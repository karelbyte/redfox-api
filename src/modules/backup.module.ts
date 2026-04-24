import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BackupService } from '../services/backup.service';
import { BackupController } from '../controllers/backup.controller';
import { BackupConfig } from '../models/backup-config.entity';
import { BackupLog } from '../models/backup-log.entity';
import { LanguageModule } from './language.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BackupConfig, BackupLog]),
    LanguageModule,
  ],
  controllers: [BackupController],
  providers: [BackupService],
  exports: [BackupService],
})
export class BackupModule {}
