import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Surrogate } from '../models/surrogate.entity';
import { SurrogateResponseDto } from '../dtos/surrogate/surrogate-response.dto';
import { UpdateSurrogateDto } from '../dtos/surrogate/update-surrogate.dto';
import { NextCodeResponseDto } from '../dtos/surrogate/next-code-response.dto';

@Injectable()
export class SurrogateService {
  constructor(
    @InjectRepository(Surrogate)
    private surrogateRepository: Repository<Surrogate>,
  ) {}

  async findAll(): Promise<SurrogateResponseDto[]> {
    const surrogates = await this.surrogateRepository.find({
      where: { is_active: true },
      order: { code: 'ASC' },
    });

    return surrogates.map(surrogate => ({
      ...surrogate,
      next_code: surrogate.generateNext(),
    }));
  }

  async findByCode(code: string): Promise<Surrogate> {
    const surrogate = await this.surrogateRepository.findOne({
      where: { code, is_active: true },
    });

    if (!surrogate) {
      throw new NotFoundException(`Surrogate with code '${code}' not found`);
    }

    return surrogate;
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

  async update(code: string, updateData: UpdateSurrogateDto): Promise<SurrogateResponseDto> {
    const surrogate = await this.findByCode(code);
    
    // Validar que el nuevo next_number sea mayor al actual si se está actualizando
    if (updateData.next_number && updateData.next_number < surrogate.next_number) {
      throw new BadRequestException(
        `Next number cannot be less than current value (${surrogate.next_number})`
      );
    }
    
    Object.assign(surrogate, updateData);
    
    const updated = await this.surrogateRepository.save(surrogate);
    
    return {
      ...updated,
      next_code: updated.generateNext(),
    };
  }

  async reset(code: string, startNumber: number = 1): Promise<SurrogateResponseDto> {
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
    // Este método podría verificar en las tablas correspondientes
    // Por ahora retorna false, pero se puede extender según necesidades
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
    
    throw new BadRequestException('Could not find available code after maximum attempts');
  }
}