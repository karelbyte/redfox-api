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
} from '@nestjs/common';
import { CertificationPackService } from '../services/certification-pack.service';
import {
  CreateCertificationPackDto,
  UpdateCertificationPackDto,
} from '../dtos/certification-pack/create-certification-pack.dto';

@Controller('certification-packs')
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
