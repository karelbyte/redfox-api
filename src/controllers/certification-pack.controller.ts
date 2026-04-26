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
  CertificationPackEmitterDto,
} from '../dtos/certification-pack/create-certification-pack.dto';
import { AuthGuard } from '../guards/auth.guard';
import { TenantInterceptor } from '../interceptors/tenant.interceptor';

@Controller('certification-packs')
@UseGuards(AuthGuard)
@UseInterceptors(TenantInterceptor)
export class CertificationPackController {
  constructor(
    private readonly certificationPackService: CertificationPackService,
  ) {}

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

  @Get('available-emitters')
  findAvailableEmitters() {
    return this.certificationPackService.findAvailableEmitters();
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

  @Post(':id/emitters')
  @HttpCode(HttpStatus.CREATED)
  addEmitter(@Param('id') id: string, @Body() emitterDto: CertificationPackEmitterDto) {
    return this.certificationPackService.addEmitter(id, emitterDto);
  }

  @Patch(':id/emitters/:emitterId')
  updateEmitter(
    @Param('id') id: string,
    @Param('emitterId') emitterId: string,
    @Body() emitterDto: CertificationPackEmitterDto,
  ) {
    return this.certificationPackService.updateEmitter(id, emitterId, emitterDto);
  }

  @Delete(':id/emitters/:emitterId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeEmitter(@Param('id') id: string, @Param('emitterId') emitterId: string) {
    return this.certificationPackService.removeEmitter(id, emitterId);
  }
}
