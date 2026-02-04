import { Controller, Get, Post, Put, Body, Param, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { BackupService } from '../services/backup.service';
import { AuthGuard } from '../guards/auth.guard';
import * as path from 'path';
import * as fs from 'fs';

@Controller('backups')
@UseGuards(AuthGuard)
export class BackupController {
    constructor(private readonly backupService: BackupService) { }

    @Get('config')
    async getConfig() {
        return await this.backupService.getConfig();
    }

    @Put('config')
    async updateConfig(@Body() updateData: any) {
        return await this.backupService.updateConfig(updateData);
    }

    @Post('run')
    async runBackup() {
        return await this.backupService.runBackup('manual');
    }

    @Get('logs')
    async getLogs() {
        return await this.backupService.getLogs();
    }

    @Get('download/:filename')
    async downloadBackup(@Param('filename') filename: string, @Res() res: Response) {
        const storagePath = path.join(process.cwd(), 'storage', 'backups');
        const filePath = path.join(storagePath, filename);

        if (fs.existsSync(filePath)) {
            res.download(filePath);
        } else {
            res.status(404).send('File not found');
        }
    }
}
