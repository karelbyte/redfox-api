import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import { DocumentSeries, DocumentType } from '../models/document-series.entity';
import {
  CreateDocumentSeriesDto,
  UpdateDocumentSeriesDto,
} from '../dtos/document-series/document-series.dto';
import { TenantContext } from './tenant-context.service';
import { TranslationService } from './translation.service';

/** Correlativo reservado para un comprobante. */
export interface ReservedDocumentNumber {
  seriesId: string;
  documentType: DocumentType;
  series: string;
  number: number;
  /** Identificador legible del comprobante: F001-00000123. */
  formatted: string;
}

export interface EnsureSeriesInput {
  documentType: DocumentType;
  series: string;
  emitterId?: string | null;
  isDefault?: boolean;
}

/**
 * Numeración de comprobantes.
 *
 * SUNAT exige que el correlativo de cada serie sea consecutivo, sin huecos ni
 * repeticiones. De ahí las dos decisiones de diseño de este servicio:
 *
 * 1. La reserva es atómica: se toma un lock de escritura sobre la fila de la
 *    serie dentro de una transacción, de modo que dos ventas simultáneas no
 *    pueden obtener el mismo número.
 * 2. Un número reservado no se devuelve al pool. Si el envío a SUNAT falla, el
 *    reintento debe reutilizar el número que ya quedó guardado en la factura
 *    (`invoices.series` / `invoices.number`), no pedir uno nuevo.
 */
@Injectable()
export class DocumentSeriesService {
  private static readonly CORRELATIVE_LENGTH = 8;

  private readonly logger = new Logger(DocumentSeriesService.name);

  constructor(
    @InjectRepository(DocumentSeries)
    private readonly documentSeriesRepository: Repository<DocumentSeries>,
    private readonly tenantContext: TenantContext,
    private readonly translationService: TranslationService,
  ) {}

  /**
   * Reserva el siguiente correlativo de una serie.
   *
   * @param options.series fuerza una serie concreta; si se omite se usa la
   *   marcada como `is_default` y, en su defecto, la más antigua del tipo.
   * @param options.manager permite unirse a una transacción en curso (por
   *   ejemplo, la que crea la factura) para que la reserva se revierta junto
   *   con ella. Si el manager recibido no está en transacción, se abre una.
   */
  async reserveNext(
    documentType: DocumentType,
    options?: { series?: string; manager?: EntityManager },
  ): Promise<ReservedDocumentNumber> {
    const organizationId = await this.getOrganizationId();
    const manager = options?.manager;

    if (manager?.queryRunner?.isTransactionActive) {
      return this.reserve(
        manager,
        organizationId,
        documentType,
        options?.series,
      );
    }

    return this.documentSeriesRepository.manager.transaction((transaction) =>
      this.reserve(transaction, organizationId, documentType, options?.series),
    );
  }

  private async reserve(
    manager: EntityManager,
    organizationId: string,
    documentType: DocumentType,
    seriesCode?: string,
  ): Promise<ReservedDocumentNumber> {
    const repository = manager.getRepository(DocumentSeries);

    const query = repository
      .createQueryBuilder('document_series')
      .setLock('pessimistic_write')
      .where('document_series.organization_id = :organizationId', {
        organizationId,
      })
      .andWhere('document_series.document_type = :documentType', {
        documentType,
      })
      .andWhere('document_series.is_active = :isActive', { isActive: true });

    if (seriesCode) {
      query.andWhere('document_series.series = :seriesCode', { seriesCode });
    } else {
      query
        .orderBy('document_series.is_default', 'DESC')
        .addOrderBy('document_series.created_at', 'ASC');
    }

    const documentSeries = await query.getOne();

    if (!documentSeries) {
      const message = await this.translationService.translate(
        'document_series.not_configured',
        this.tenantContext.getUserId() ?? undefined,
        { type: seriesCode ?? documentType },
      );
      throw new NotFoundException(message);
    }

    const number = Number(documentSeries.current_number) + 1;

    await repository.increment({ id: documentSeries.id }, 'current_number', 1);

    const reserved: ReservedDocumentNumber = {
      seriesId: documentSeries.id,
      documentType: documentSeries.document_type,
      series: documentSeries.series,
      number,
      formatted: DocumentSeriesService.format(documentSeries.series, number),
    };

    this.logger.log(
      `[DocumentSeries] Correlativo reservado: ${reserved.formatted} (org ${organizationId})`,
    );

    return reserved;
  }

  /**
   * Crea la serie si no existe. Idempotente: pensado para inicializar la
   * numeración a partir de la configuración del pack sin duplicar filas.
   */
  async ensureSeries(input: EnsureSeriesInput): Promise<DocumentSeries> {
    const organizationId = await this.getOrganizationId();
    const series = input.series.trim().toUpperCase();

    const existing = await this.documentSeriesRepository.findOne({
      where: { organization_id: organizationId, series },
    });

    if (existing) {
      if (existing.document_type !== input.documentType) {
        const message = await this.translationService.translate(
          'document_series.type_mismatch',
          this.tenantContext.getUserId() ?? undefined,
          { series, type: existing.document_type },
        );
        throw new BadRequestException(message);
      }

      return existing;
    }

    const created = this.documentSeriesRepository.create({
      organization_id: organizationId,
      document_type: input.documentType,
      series,
      current_number: 0,
      emitter_id: input.emitterId ?? null,
      is_active: true,
      is_default: input.isDefault ?? false,
    });

    this.logger.log(
      `[DocumentSeries] Serie creada: ${series} (${input.documentType}) para la organización ${organizationId}`,
    );

    return this.documentSeriesRepository.save(created);
  }

  async create(dto: CreateDocumentSeriesDto): Promise<DocumentSeries> {
    const series = await this.ensureSeries({
      documentType: dto.document_type,
      series: dto.series,
      emitterId: dto.emitter_id ?? null,
      isDefault: dto.is_default,
    });

    if (dto.is_default) {
      await this.unsetOtherDefaults(series);
    }

    return series;
  }

  async update(
    id: string,
    dto: UpdateDocumentSeriesDto,
  ): Promise<DocumentSeries> {
    const organizationId = await this.getOrganizationId();
    const series = await this.documentSeriesRepository.findOne({
      where: { id, organization_id: organizationId },
    });

    if (!series) {
      const message = await this.translationService.translate(
        'document_series.not_found',
        this.tenantContext.getUserId() ?? undefined,
        { id },
      );
      throw new NotFoundException(message);
    }

    Object.assign(series, dto);

    const saved = await this.documentSeriesRepository.save(series);

    if (dto.is_default) {
      await this.unsetOtherDefaults(saved);
    }

    return saved;
  }

  /** Solo una serie por tipo de comprobante puede ser la predeterminada. */
  private async unsetOtherDefaults(series: DocumentSeries): Promise<void> {
    await this.documentSeriesRepository
      .createQueryBuilder()
      .update(DocumentSeries)
      .set({ is_default: false })
      .where('organization_id = :organizationId', {
        organizationId: series.organization_id,
      })
      .andWhere('document_type = :documentType', {
        documentType: series.document_type,
      })
      .andWhere('id != :id', { id: series.id })
      .execute();
  }

  async findAll(documentType?: DocumentType): Promise<DocumentSeries[]> {
    const organizationId = await this.getOrganizationId();

    return this.documentSeriesRepository.find({
      where: {
        organization_id: organizationId,
        ...(documentType ? { document_type: documentType } : {}),
      },
      order: { document_type: 'ASC', series: 'ASC' },
    });
  }

  /** F001 + 123 -> F001-00000123 */
  static format(series: string, number: number): string {
    return `${series}-${String(number).padStart(
      DocumentSeriesService.CORRELATIVE_LENGTH,
      '0',
    )}`;
  }

  private async getOrganizationId(): Promise<string> {
    const organizationId = this.tenantContext.getOrganizationId();

    if (!organizationId) {
      const message = await this.translationService.translate(
        'auth.organization_required',
        this.tenantContext.getUserId() ?? undefined,
      );
      throw new BadRequestException(message);
    }

    return organizationId;
  }
}
