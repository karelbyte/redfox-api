import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Surrogate } from '../models/surrogate.entity';
import { SurrogateService } from '../services/surrogate.service';
import { SurrogateController } from '../controllers/surrogate.controller';
import { OrganizationModule } from './organization.module';

@Module({
  imports: [TypeOrmModule.forFeature([Surrogate]), OrganizationModule],
  controllers: [SurrogateController],
  providers: [SurrogateService],
  exports: [SurrogateService], // Exportar para usar en otros módulos
})
export class SurrogateModule { }