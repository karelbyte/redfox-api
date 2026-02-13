import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailService } from '../services/email.service';
import { EmailConfig } from '../models/email-config.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EmailConfig])],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
