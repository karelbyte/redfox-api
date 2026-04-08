import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Surrogate } from '../models/surrogate.entity';
import { SurrogateResponseDto } from '../dtos/surrogate/surrogate-response.dto';
import { UpdateSurrogateDto } from '../dtos/surrogate/update-surrogate.dto';
import { NextCodeResponseDto } from '../dtos/surrogate/next-code-response.dto';
import { TenantContext } from './tenant-context.service';

@Injectable()
export class SurrogateService {
  constructor(
    @InjectRepository(Surrogate)
    private surrogateRepository: Repository<Surrogate>,
    private readonly tenantContext: TenantContext,
  ) {}

  private get organizationId(): string {
    const orgId = this.tenantContext.getOrganizationId();
    if (!orgId) {
      throw new BadRequestException(
        'Organization context is required for Surrogates',
      );
    }
    return orgId;
  }

  async findAll(): Promise<SurrogateResponseDto[]> {
    const surrogates = await this.surrogateRepository.find({
      where: {
        is_active: true,
        organization_id: this.organizationId,
      },
      order: { code: 'ASC' },
    });

    return surrogates.map((surrogate) => ({
      ...surrogate,
      next_code: surrogate.generateNext(),
    }));
  }

  async findByCode(code: string): Promise<Surrogate> {
    let surrogate = await this.surrogateRepository.findOne({
      where: {
        code,
        is_active: true,
        organization_id: this.organizationId,
      },
    });

    if (!surrogate) {
      // Lazy Initialization: Si no existe, crearlo con valores por defecto
      surrogate = await this.lazyInitializeSurrogate(code);
    }

    return surrogate;
  }

  // Define defaults for common surrogate codes
  private async lazyInitializeSurrogate(code: string): Promise<Surrogate> {
    const defaults: Record<string, Partial<Surrogate>> = {
      client: {
        prefix: 'CLI',
        padding: 4,
        include_year: false,
        description: 'Códigos para clientes',
      },
      product: {
        prefix: 'PROD',
        padding: 4,
        include_year: false,
        description: 'Códigos para productos',
      },
      invoice: {
        prefix: 'INV',
        padding: 6,
        include_year: false,
        description: 'Códigos para facturas',
      },
      purchase_order: {
        prefix: 'PO',
        padding: 4,
        include_year: true,
        description: 'Códigos para órdenes de compra',
      },
      sale: {
        prefix: 'VTA',
        padding: 6,
        include_year: false,
        description: 'Códigos para ventas',
      },
      provider: {
        prefix: 'PROV',
        padding: 4,
        include_year: false,
        description: 'Códigos para proveedores',
      },
      warehouse: {
        prefix: 'ALM',
        padding: 3,
        include_year: false,
        description: 'Códigos para almacenes',
      },
      brand: {
        prefix: 'MRC',
        padding: 3,
        include_year: false,
        description: 'Códigos para marcas',
      },
      category: {
        prefix: 'CAT',
        padding: 3,
        include_year: false,
        description: 'Códigos para categorías',
      },
      reception: {
        prefix: 'REC',
        padding: 4,
        include_year: true,
        description: 'Códigos para recepciones',
      },
      withdrawal: {
        prefix: 'RET',
        padding: 4,
        include_year: false,
        description: 'Códigos para retiros',
      },
      return: {
        prefix: 'DEV',
        padding: 4,
        include_year: false,
        description: 'Códigos para devoluciones',
      },
      quotation: {
        prefix: 'COT',
        padding: 6,
        include_year: true,
        description: 'Códigos para cotizaciones',
      },
      remission: {
        prefix: 'REM',
        padding: 6,
        include_year: true,
        description: 'Códigos para remisiones',
      },
      inventory_adjustment: {
        prefix: 'AJU',
        padding: 4,
        include_year: true,
        description: 'Códigos para ajustes de inventario',
      },
    };

    const config = defaults[code];

    if (!config) {
      throw new NotFoundException(
        `Valid default configuration not found for surrogate code '${code}'`,
      );
    }

    const newSurrogate = this.surrogateRepository.create({
      code,
      organization_id: this.organizationId,
      ...config,
      next_number: 1,
      is_active: true,
      suffix: '',
      year_separator: '-',
    });

    try {
      return await this.surrogateRepository.save(newSurrogate);
    } catch (error) {
      // Handle PostgreSQL unique constraint violation (race condition)
      if (error.code === '23505') {
        const existing = await this.surrogateRepository.findOne({
          where: {
            code,
            organization_id: this.organizationId,
          },
        });
        if (existing) {
          return existing;
        }
      }
      throw error;
    }
  }

  async getNextCode(code: string): Promise<NextCodeResponseDto> {
    const surrogate = await this.findByCode(code);

    return {
      code: surrogate.code,
      next_code: surrogate.generateNext(),
      current_number: surrogate.next_number,
    };
  }

  async useNextCode(code: string): Promise<NextCodeResponseDto> {
    const surrogate = await this.findByCode(code);

    // Generar el código actual antes de incrementar
    const currentCode = surrogate.generateNext();

    // Incrementar el contador
    surrogate.increment();

    // Guardar en la base de datos
    await this.surrogateRepository.save(surrogate);

    return {
      code: surrogate.code,
      next_code: currentCode,
      current_number: surrogate.next_number - 1, // El número que se usó
    };
  }

  async update(
    code: string,
    updateData: UpdateSurrogateDto,
  ): Promise<SurrogateResponseDto> {
    const surrogate = await this.findByCode(code);

    // Validar que el nuevo next_number sea mayor al actual si se está actualizando
    if (
      updateData.next_number &&
      updateData.next_number < surrogate.next_number
    ) {
      throw new BadRequestException(
        `Next number cannot be less than current value (${surrogate.next_number})`,
      );
    }

    Object.assign(surrogate, updateData);

    const updated = await this.surrogateRepository.save(surrogate);

    return {
      ...updated,
      next_code: updated.generateNext(),
    };
  }

  async reset(
    code: string,
    startNumber: number = 1,
  ): Promise<SurrogateResponseDto> {
    if (startNumber < 1) {
      throw new BadRequestException('Start number must be greater than 0');
    }

    const surrogate = await this.findByCode(code);
    surrogate.next_number = startNumber;

    const updated = await this.surrogateRepository.save(surrogate);

    return {
      ...updated,
      next_code: updated.generateNext(),
    };
  }

  // Método para verificar si un código ya existe en uso
  async isCodeInUse(code: string, generatedCode: string): Promise<boolean> {
    // Aquí idealmente verificaríamos en la tabla destino (ej. facturas, clientes)
    // filtrando por organization_id y el código generado
    return false;
  }

  // Método para obtener el siguiente código disponible (saltando códigos en uso)
  async getNextAvailableCode(code: string): Promise<NextCodeResponseDto> {
    const surrogate = await this.findByCode(code);
    let attempts = 0;
    const maxAttempts = 1000; // Prevenir bucles infinitos

    while (attempts < maxAttempts) {
      const nextCode = surrogate.generateNext();
      const inUse = await this.isCodeInUse(code, nextCode);

      if (!inUse) {
        return {
          code: surrogate.code,
          next_code: nextCode,
          current_number: surrogate.next_number,
        };
      }

      surrogate.increment();
      attempts++;
    }

    throw new BadRequestException(
      'Could not find available code after maximum attempts',
    );
  }

  async useCodeIfMatches(code: string, value: string): Promise<void> {
    // Usar UPDATE atómico para evitar race conditions con múltiples requests simultáneos
    // Solo incrementa si el código generado coincide con el valor esperado
    const surrogate = await this.findByCode(code);
    if (surrogate.generateNext() !== value) return;

    // UPDATE atómico: solo actualiza si next_number no cambió entre el findOne y el UPDATE
    const result = await this.surrogateRepository
      .createQueryBuilder()
      .update(Surrogate)
      .set({ next_number: () => 'next_number + 1' })
      .where('id = :id AND next_number = :currentNumber', {
        id: surrogate.id,
        currentNumber: surrogate.next_number,
      })
      .execute();

    // Si no actualizó ninguna fila, otro request ya incrementó — no es un error
    if (result.affected === 0) {
      // Otro proceso ya incrementó el contador, está bien
    }
  }
}
