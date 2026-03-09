import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';
import { BackupConfig } from '../models/backup-config.entity';
import { BackupLog } from '../models/backup-log.entity';

const execPromise = promisify(exec);

@Injectable()
export class BackupService implements OnModuleInit {
  private readonly logger = new Logger(BackupService.name);
  private readonly storagePath = path.join(process.cwd(), 'storage', 'backups');

  constructor(
    @InjectRepository(BackupConfig)
    private readonly configRepository: Repository<BackupConfig>,
    @InjectRepository(BackupLog)
    private readonly logRepository: Repository<BackupLog>,
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {
    if (!fs.existsSync(this.storagePath)) {
      fs.mkdirSync(this.storagePath, { recursive: true });
    }
  }

  async onModuleInit() {
    await this.initializeSchedule();
  }

  async initializeSchedule() {
    const config = await this.getConfig();
    if (config.isAutoEnabled) {
      this.scheduleBackup(config);
    }
  }

  async getConfig(): Promise<BackupConfig> {
    let config = await this.configRepository.findOne({ where: {} });
    if (!config) {
      config = this.configRepository.create();
      await this.configRepository.save(config);
    }
    return config;
  }

  async updateConfig(updateData: Partial<BackupConfig>): Promise<BackupConfig> {
    const config = await this.getConfig();
    Object.assign(config, updateData);
    const savedConfig = await this.configRepository.save(config);

    // Refresh schedule
    this.stopScheduledBackup();
    if (savedConfig.isAutoEnabled) {
      this.scheduleBackup(savedConfig);
    }

    return savedConfig;
  }

  private scheduleBackup(config: BackupConfig) {
    const [hours, minutes] = config.scheduledTime.split(':');
    let cronExpression = '';

    switch (config.frequency) {
      case 'daily':
        cronExpression = `${minutes} ${hours} * * *`;
        break;
      case 'weekly':
        cronExpression = `${minutes} ${hours} * * 0`; // Sunday
        break;
      case 'monthly':
        cronExpression = `${minutes} ${hours} 1 * *`;
        break;
      default:
        cronExpression = `${minutes} ${hours} * * *`;
    }

    const job = new CronJob(cronExpression, () => {
      this.runBackup('automatic');
    });

    this.schedulerRegistry.addCronJob('database_backup', job);
    job.start();
    this.logger.log(
      `Backup scheduled with frequency: ${config.frequency} at ${config.scheduledTime}`,
    );
  }

  private stopScheduledBackup() {
    try {
      this.schedulerRegistry.deleteCronJob('database_backup');
    } catch (e) {
      // Job might not exist
    }
  }

  async runBackup(triggerType: string = 'manual'): Promise<BackupLog> {
    const log = this.logRepository.create({ triggerType });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}.sql`;
    const filePath = path.join(this.storagePath, filename);

    const dbType = this.configService.get<string>('APP_DB_PROVIDER', 'mysql');
    const isPostgres = dbType === 'postgres' || dbType === 'pg';
    const prefix = isPostgres ? 'PG_DB_' : 'MYSQL_DB_';

    const host = this.configService.get<string>(`${prefix}HOST`);
    const port = this.configService.get<string>(`${prefix}PORT`);
    const user = this.configService.get<string>(`${prefix}USER`);
    const password = this.configService.get<string>(`${prefix}PASSWORD`);
    const database = this.configService.get<string>(`${prefix}NAME`);

    const dumpTool = isPostgres
      ? this.configService.get<string>('BACKUP_PG_DUMP_PATH', 'pg_dump')
      : this.configService.get<string>('BACKUP_MYSQLDUMP_PATH', 'mysqldump');

    let command = '';
    if (isPostgres) {
      command = `PGPASSWORD="${password}" ${dumpTool} -h ${host} -p ${port} -U ${user} ${database} > ${filePath}`;
    } else {
      command = `${dumpTool} -h ${host} -P ${port} -u ${user} -p"${password}" ${database} > ${filePath}`;
    }

    try {
      // Check if the dump tool is available
      try {
        const checkCmd = isPostgres
          ? `${dumpTool} --version`
          : `${dumpTool} --version`;
        await execPromise(checkCmd);
      } catch (e) {
        const installCmd = isPostgres
          ? 'brew install libpq'
          : 'brew install mysql-client';
        throw new Error(
          `The backup tool '${dumpTool}' was not found. ` +
            `Please ensure it is installed and in your PATH, or configure it via environment variables. ` +
            `On macOS, you might need to run: ${installCmd}`,
        );
      }

      await execPromise(command);
      const stats = fs.statSync(filePath);
      log.filename = filename;
      log.fileSize = `${(stats.size / (1024 * 1024)).toFixed(2)} MB`;
      log.status = true;
      this.logger.log(`Backup created successfully: ${filename}`);

      // Cleanup old backups
      await this.cleanupOldBackups();
    } catch (error) {
      log.status = false;
      log.errorMessage = error.message;
      log.filename = filename;
      this.logger.error(`Backup failed: ${error.message}`);
    }

    return await this.logRepository.save(log);
  }

  private async cleanupOldBackups() {
    const config = await this.getConfig();
    const logs = await this.logRepository.find({
      where: { status: true },
      order: { createdAt: 'DESC' },
      skip: config.retentionCount,
    });

    for (const log of logs) {
      const filePath = path.join(this.storagePath, log.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  }

  async getLogs(): Promise<BackupLog[]> {
    return await this.logRepository.find({
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }
}
