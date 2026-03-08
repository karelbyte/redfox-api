import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailService } from '../services/email.service';
import { EmailConfig } from '../models/email-config.entity';
import { OrganizationModule } from './organization.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([EmailConfig]),
    OrganizationModule,
  ],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule { }
