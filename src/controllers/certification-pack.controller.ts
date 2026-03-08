import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import { CertificationPackService } from '../services/certification-pack.service';
import {
  CreateCertificationPackDto,
  UpdateCertificationPackDto,
} from '../dtos/certification-pack/create-certification-pack.dto';
import { AuthGuard } from '../guards/auth.guard';
import { TenantInterceptor } from '../interceptors/tenant.interceptor';

@Controller('certification-packs')
@UseGuards(AuthGuard)
@UseInterceptors(TenantInterceptor)
export class CertificationPackController {
  constructor(
    private readonly certificationPackService: CertificationPackService,
  ) { }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createDto: CreateCertificationPackDto) {
    return this.certificationPackService.create(createDto);
  }

  @Get()
  findAll() {
    return this.certificationPackService.findAll();
  }

  @Get('active')
  findActive() {
    return this.certificationPackService.findActive();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.certificationPackService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateCertificationPackDto,
  ) {
    return this.certificationPackService.update(id, updateDto);
  }

  @Patch(':id/set-default')
  setDefault(@Param('id') id: string) {
    return this.certificationPackService.setDefault(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.certificationPackService.remove(id);
  }
}
