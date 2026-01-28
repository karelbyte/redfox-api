import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  ParseUUIDPipe,
  Query,
  UseGuards,
  Put,
} from '@nestjs/common';
import { ClientService } from '../services/client.service';
import { CreateClientDto } from '../dtos/client/create-client.dto';
import { UpdateClientDto } from '../dtos/client/update-client.dto';
import { ClientResponseDto } from '../dtos/client/client-response.dto';
import { ClientWithPackStatusResponseDto } from '../dtos/client/client-with-pack-status-response.dto';
import { ImportClientsFromPackResponseDto } from '../dtos/client/import-clients-from-pack-response.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponse } from '../interfaces/pagination.interface';
import { AuthGuard } from '../guards/auth.guard';
import { UserId } from '../decorators/user-id.decorator';

@Controller('clients')
@UseGuards(AuthGuard)
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  @Post()
  create(
    @Body() createClientDto: CreateClientDto,
  ): Promise<ClientWithPackStatusResponseDto> {
    return this.clientService.create(createClientDto);
  }

  @Get()
  async findAll(
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginatedResponse<ClientResponseDto>> {
    //await new Promise((resolve) => setTimeout(resolve, 5000));
    return this.clientService.findAll(paginationDto);
  }

  /**
   * Importación inversa: trae todos los clientes desde el pack activo hacia nuestra DB.
   * (Si el pack no está configurado o no soporta listar customers, responde 400)
   */
  @Post('import-from-pack')
  importFromPack(
    @UserId() userId: string,
  ): Promise<ImportClientsFromPackResponseDto> {
    return this.clientService.importFromPack(userId);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() userId: string,
  ): Promise<ClientResponseDto> {
    return this.clientService.findOne(id, userId);
  }

  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateClientDto: UpdateClientDto,
    @UserId() userId: string,
  ): Promise<ClientWithPackStatusResponseDto> {
    return this.clientService.update(id, updateClientDto, userId);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() userId: string,
  ): Promise<void> {
    return this.clientService.remove(id, userId);
  }
}
