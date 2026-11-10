import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  MessageEvent,
  Param,
  Post,
  Put,
  Req,
  Sse,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable, map } from 'rxjs';
import { AuthGuard } from '../guards/auth.guard';
import { AdminGuard } from '../guards/admin.guard';
import { TenantInterceptor } from '../interceptors/tenant.interceptor';
import { TenantContext } from '../services/tenant-context.service';
import {
  CreateUpcdeRoomDto,
  UpdateUpcdeRoomDto,
} from '../dtos/upcde/upcde-room.dto';
import {
  UpcdeEditor,
  UpcdeService,
} from '../services/upcde.service';

interface AuthenticatedRequest extends Request {
  user?: {
    id?: string;
    sub?: string;
    email?: string;
    name?: string;
    roles?: string[];
  };
}

@Controller('upcde')
@UseGuards(AuthGuard, AdminGuard)
@UseInterceptors(TenantInterceptor)
export class UpcdeController {
  constructor(
    private readonly upcdeService: UpcdeService,
    private readonly tenantContext: TenantContext,
  ) {}

  @Post('rooms')
  create(@Body() dto: CreateUpcdeRoomDto, @Req() request: AuthenticatedRequest) {
    return this.upcdeService.create(
      this.organizationId(),
      {
        title: dto.title,
        language: dto.language,
        content: dto.content,
      },
      this.editor(request, dto.clientId, dto.editorName),
    );
  }

  @Get('rooms/:code')
  get(@Param('code') code: string) {
    return this.upcdeService.get(this.organizationId(), code);
  }

  @Put('rooms/:code')
  update(
    @Param('code') code: string,
    @Body() dto: UpdateUpcdeRoomDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.upcdeService.update(
      this.organizationId(),
      code,
      {
        content: dto.content,
        language: dto.language,
        title: dto.title,
      },
      this.editor(request, dto.clientId, dto.editorName),
    );
  }

  @Delete('rooms/:code')
  remove(@Param('code') code: string) {
    return this.upcdeService.delete(this.organizationId(), code);
  }

  @Sse('rooms/:code/events')
  events(@Param('code') code: string): Observable<MessageEvent> {
    return this.upcdeService
      .stream(this.organizationId(), code)
      .pipe(map((event) => ({ data: event })));
  }

  private organizationId(): string {
    const organizationId = this.tenantContext.getOrganizationId();
    if (!organizationId) {
      throw new BadRequestException(
        'No se pudo determinar la organización activa',
      );
    }
    return organizationId;
  }

  private editor(
    request: AuthenticatedRequest,
    clientId?: string,
    editorName?: string,
  ): UpcdeEditor {
    const user = request.user;
    return {
      id: user?.id || user?.sub || 'desconocido',
      name:
        editorName?.trim() ||
        user?.name ||
        user?.email ||
        'Administrador',
      clientId,
    };
  }
}
