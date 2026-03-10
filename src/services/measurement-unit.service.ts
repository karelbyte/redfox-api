import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { MeasurementUnit } from '../models/measurement-unit.entity';
import { Product } from '../models/product.entity';
import { CreateMeasurementUnitDto } from '../dtos/measurement-unit/create-measurement-unit.dto';
import { UpdateMeasurementUnitDto } from '../dtos/measurement-unit/update-measurement-unit.dto';
import { MeasurementUnitResponseDto } from '../dtos/measurement-unit/measurement-unit-response.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponse } from '../interfaces/pagination.interface';
import { MeasurementUnitMapper } from './mappers/measurement-unit.mapper';
import { TranslationService } from './translation.service';
import { CertificationPackFactoryService } from './certification-pack-factory.service';
import { MeasurementUnitSuggestion } from '../interfaces/certification-pack.interface';
import { TenantContext } from './tenant-context.service';

@Injectable()
export class MeasurementUnitService {
  constructor(
    @InjectRepository(MeasurementUnit)
    private measurementUnitRepository: Repository<MeasurementUnit>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly measurementUnitMapper: MeasurementUnitMapper,
    private translationService: TranslationService,
    private readonly certificationPackFactory: CertificationPackFactoryService,
    private readonly tenantContext: TenantContext,
  ) { }

  private get organizationId(): string {
    return this.tenantContext.getOrganizationId() as string;
  }

  async create(
    createMeasurementUnitDto: CreateMeasurementUnitDto,
    userId?: string,
  ): Promise<MeasurementUnitResponseDto> {
    try {
      const existingUnit = await this.measurementUnitRepository.findOne({
        where: {
          code: createMeasurementUnitDto.code,
          organization_id: this.organizationId,
        },
        withDeleted: false,
      });

      if (existingUnit) {
        const message = await this.translationService.translate(
          'measurement_unit.already_exists',
          userId,
          { code: createMeasurementUnitDto.code },
        );
        throw new BadRequestException(message);
      }

      const measurementUnit = this.measurementUnitRepository.create({
        ...createMeasurementUnitDto,
        organization_id: this.organizationId,
      });
      const savedMeasurementUnit =
        await this.measurementUnitRepository.save(measurementUnit);
      return this.measurementUnitMapper.mapToResponseDto(savedMeasurementUnit);
    } catch (error: any) {
      // Handle duplicate code error
      if (
        error?.code === 'ER_DUP_ENTRY' &&
        error?.message?.includes('measurement_units.UQ_')
      ) {
        const message = await this.translationService.translate(
          'measurement_unit.already_exists',
          userId,
          { code: createMeasurementUnitDto.code },
        );
        throw new BadRequestException(message);
      }
      throw error;
    }
  }

  async findAll(
    paginationDto?: PaginationDto,
    userId?: string,
  ): Promise<PaginatedResponse<MeasurementUnitResponseDto>> {
    const { page, limit, term } = paginationDto || {};

    // Construir las condiciones de búsqueda
    const baseConditions = {
      where: { organization_id: this.organizationId },
      withDeleted: false,
    };
    const whereConditions = term
      ? {
        ...baseConditions,
        where: [
          { code: Like(`%${term}%`), organization_id: this.organizationId },
          {
            description: Like(`%${term}%`),
            organization_id: this.organizationId,
          },
        ],
      }
      : baseConditions;

    // Si no se proporciona paginación, devolver toda la data
    if (!page && !limit) {
      const measurementUnits =
        await this.measurementUnitRepository.find(whereConditions);

      const data = measurementUnits.map((unit) =>
        this.measurementUnitMapper.mapToResponseDto(unit),
      );

      return {
        data,
        meta: {
          total: data.length,
          page: 1,
          limit: data.length,
          totalPages: 1,
        },
      };
    }

    // Si se proporciona paginación, aplicar la lógica de paginación
    const currentPage = page || 1;
    const currentLimit = limit || 8;
    const skip = (currentPage - 1) * currentLimit;

    const [measurementUnits, total] =
      await this.measurementUnitRepository.findAndCount({
        ...whereConditions,
        skip,
        take: currentLimit,
      });

    const data = measurementUnits.map((unit) =>
      this.measurementUnitMapper.mapToResponseDto(unit),
    );

    return {
      data,
      meta: {
        total,
        page: currentPage,
        limit: currentLimit,
        totalPages: Math.ceil(total / currentLimit),
      },
    };
  }

  async findOne(
    id: string,
    userId?: string,
  ): Promise<MeasurementUnitResponseDto> {
    const measurementUnit = await this.measurementUnitRepository.findOne({
      where: { id, organization_id: this.organizationId },
      withDeleted: false,
    });
    if (!measurementUnit) {
      const message = await this.translationService.translate(
        'measurement_unit.not_found',
        userId,
        { id },
      );
      throw new NotFoundException(message);
    }
    return this.measurementUnitMapper.mapToResponseDto(measurementUnit);
  }

  async update(
    id: string,
    updateMeasurementUnitDto: UpdateMeasurementUnitDto,
    userId?: string,
  ): Promise<MeasurementUnitResponseDto> {
    try {
      const measurementUnit = await this.measurementUnitRepository.findOne({
        where: { id, organization_id: this.organizationId },
        withDeleted: false,
      });
      if (!measurementUnit) {
        const message = await this.translationService.translate(
          'measurement_unit.not_found',
          userId,
          { id },
        );
        throw new NotFoundException(message);
      }

      if (
        updateMeasurementUnitDto.code &&
        updateMeasurementUnitDto.code !== measurementUnit.code
      ) {
        const existingUnit = await this.measurementUnitRepository.findOne({
          where: {
            code: updateMeasurementUnitDto.code,
            organization_id: this.organizationId,
          },
          withDeleted: false,
        });

        if (existingUnit) {
          const message = await this.translationService.translate(
            'measurement_unit.already_exists',
            userId,
            { code: updateMeasurementUnitDto.code },
          );
          throw new BadRequestException(message);
        }
      }

      const updatedMeasurementUnit = await this.measurementUnitRepository.save({
        ...measurementUnit,
        ...updateMeasurementUnitDto,
      });
      return this.measurementUnitMapper.mapToResponseDto(
        updatedMeasurementUnit,
      );
    } catch (error: any) {
      // Handle duplicate code error in update
      if (
        error?.code === 'ER_DUP_ENTRY' &&
        error?.message?.includes('measurement_units.UQ_')
      ) {
        const message = await this.translationService.translate(
          'measurement_unit.already_exists',
          userId,
          { code: updateMeasurementUnitDto.code },
        );
        throw new BadRequestException(message);
      }
      throw error;
    }
  }

  async remove(id: string, userId?: string): Promise<void> {
    const measurementUnit = await this.measurementUnitRepository.findOne({
      where: { id, organization_id: this.organizationId },
      withDeleted: false,
    });
    if (!measurementUnit) {
      const message = await this.translationService.translate(
        'measurement_unit.not_found',
        userId,
        { id },
      );
      throw new NotFoundException(message);
    }

    // Verificar si la unidad de medida está siendo usada en productos
    const productsUsingUnit = await this.productRepository.count({
      where: {
        measurement_unit: { id },
        organization_id: this.organizationId,
      },
      withDeleted: false,
    });

    if (productsUsingUnit > 0) {
      const message = await this.translationService.translate(
        'measurement_unit.cannot_delete_in_use',
        userId,
        {
          description: measurementUnit.description,
          count: productsUsingUnit,
        },
      );
      throw new BadRequestException(message);
    }

    await this.measurementUnitRepository.softRemove(measurementUnit);
  }

  async getMeasurementUnitUsage(
    id: string,
    userId?: string,
  ): Promise<{
    measurementUnit: MeasurementUnitResponseDto;
    productsCount: number;
    products: any[];
  }> {
    const measurementUnit = await this.measurementUnitRepository.findOne({
      where: { id, organization_id: this.organizationId },
      withDeleted: false,
    });
    if (!measurementUnit) {
      const message = await this.translationService.translate(
        'measurement_unit.not_found',
        userId,
        { id },
      );
      throw new NotFoundException(message);
    }

    const products = await this.productRepository.find({
      where: {
        measurement_unit: { id },
        organization_id: this.organizationId,
      },
      select: ['id', 'name', 'sku'],
      withDeleted: false,
    });

    return {
      measurementUnit:
        this.measurementUnitMapper.mapToResponseDto(measurementUnit),
      productsCount: products.length,
      products: products.map((p) => ({ id: p.id, name: p.name, sku: p.sku })),
    };
  }

  async searchFromPack(term: string): Promise<MeasurementUnitSuggestion[]> {
    console.log('='.repeat(80));
    console.log('[MeasurementUnit Service] searchFromPack CALLED');
    console.log('[MeasurementUnit Service] Search term:', term);
    console.log('[MeasurementUnit Service] Term length:', term?.length);
    console.log('[MeasurementUnit Service] Term type:', typeof term);
    
    try {
      // Intentar usar API pública de factura123.mx (no requiere autenticación)
      const url = `https://factura123.mx/api/v2/public/cat/units?search=${encodeURIComponent(term)}&order=asc&offset=0&limit=20`;
      console.log('[MeasurementUnit Service] Request URL:', url);
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0',
        },
      });

      console.log('[MeasurementUnit Service] factura123.mx response status:', response.status);
      console.log('[MeasurementUnit Service] factura123.mx response statusText:', response.statusText);

      if (!response.ok) {
        console.log('[MeasurementUnit Service] factura123.mx request failed, using static fallback');
        const staticResults = this.getStaticMeasurementUnits(term);
        console.log('[MeasurementUnit Service] Static fallback results count:', staticResults.length);
        console.log('[MeasurementUnit Service] Static fallback results:', JSON.stringify(staticResults, null, 2));
        console.log('='.repeat(80));
        return staticResults;
      }

      const data = await response.json();
      console.log('[MeasurementUnit Service] factura123.mx RAW response data:', JSON.stringify(data, null, 2));
      
      // Adaptar la respuesta de factura123.mx al formato esperado
      // La API regresa { rows: [...], total: number }
      const items = data.rows || data.data || data || [];
      const results = items.map((item: any) => ({
        key: item.clavesat || item.clave || item.code || item.key,
        description: item.descripcion || item.description || item.name,
      }));
      
      // Ordenar por longitud de descripción (más cortas primero)
      results.sort((a, b) => {
        const lengthA = a.description?.length || 0;
        const lengthB = b.description?.length || 0;
        return lengthA - lengthB;
      });
      
      console.log('[MeasurementUnit Service] Processed results count:', results.length);
      console.log('[MeasurementUnit Service] Sorted results (by description length):', JSON.stringify(results, null, 2));
      console.log('='.repeat(80));
      return results;
    } catch (error) {
      console.error('[MeasurementUnit Service] ERROR in searchFromPack:', error);
      console.error('[MeasurementUnit Service] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      const staticResults = this.getStaticMeasurementUnits(term);
      console.log('[MeasurementUnit Service] Returning static fallback after error, count:', staticResults.length);
      console.log('='.repeat(80));
      return staticResults;
    }
  }

  private getStaticMeasurementUnits(term: string): MeasurementUnitSuggestion[] {
    const units = [
      { key: 'H87', description: 'Pieza' },
      { key: 'EA', description: 'Elemento' },
      { key: 'E48', description: 'Unidad de Servicio' },
      { key: 'ACT', description: 'Actividad' },
      { key: 'KGM', description: 'Kilogramo' },
      { key: 'E51', description: 'Trabajo' },
      { key: 'A9', description: 'Tarifa' },
      { key: 'MTR', description: 'Metro' },
      { key: 'AB', description: 'Paquete a granel' },
      { key: 'BB', description: 'Caja base' },
      { key: 'KT', description: 'Kit' },
      { key: 'SET', description: 'Conjunto' },
      { key: 'LTR', description: 'Litro' },
      { key: 'XBX', description: 'Caja' },
      { key: 'MON', description: 'Mes' },
      { key: 'HUR', description: 'Hora' },
      { key: 'MTK', description: 'Metro cuadrado' },
      { key: '11', description: 'Equipos' },
      { key: 'MGM', description: 'Miligramo' },
      { key: 'XPK', description: 'Paquete' },
      { key: 'XKI', description: 'Kit (Conjunto de piezas)' },
      { key: 'AS', description: 'Variedad' },
      { key: 'GRM', description: 'Gramo' },
      { key: 'PR', description: 'Par' },
      { key: 'DPC', description: 'Docenas de piezas' },
      { key: 'xun', description: 'Unidad' },
      { key: 'DAY', description: 'Día' },
      { key: 'XLT', description: 'Lote' },
      { key: '10', description: 'Grupos' },
      { key: 'MLT', description: 'Mililitro' },
      { key: 'E54', description: 'Viaje' },
      { key: 'MTQ', description: 'Metro cúbico' },
    ];

    if (!term) return units;

    const lowerTerm = term.toLowerCase();
    return units.filter(
      u =>
        u.key.toLowerCase().includes(lowerTerm) ||
        u.description.toLowerCase().includes(lowerTerm),
    );
  }
}
