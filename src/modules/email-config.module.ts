import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailConfig } from '../models/email-config.entity';
import { EmailService } from '../services/email.service';
import { EmailConfigController } from '../controllers/email-config.controller';

@Module({
  imports: [TypeOrmModule.forFeature([EmailConfig])],
  controllers: [EmailConfigController],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailConfigModule {}
