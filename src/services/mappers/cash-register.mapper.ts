import { CashRegister } from '../../models/cash-register.entity';
import { CashRegisterResponseDto } from '../../dtos/cash-register/cash-register-response.dto';

export class CashRegisterMapper {
  static mapToResponseDto(cashRegister: CashRegister): CashRegisterResponseDto {
    return {
      id: cashRegister.id,
      code: cashRegister.code,
      name: cashRegister.name,
      description: cashRegister.description,
      initial_amount: Number(cashRegister.initialAmount),
      current_amount: Number(cashRegister.currentAmount),
      status: cashRegister.status,
      opened_at: cashRegister.openedAt,
      closed_at: cashRegister.closedAt,
      opened_by: cashRegister.openedBy,
      closed_by: cashRegister.closedBy,
      created_at: cashRegister.created_at,
      updated_at: cashRegister.updated_at,
    };
  }

  static mapToResponseDtoList(cashRegisters: CashRegister[]): CashRegisterResponseDto[] {
    return cashRegisters.map((cashRegister) => this.mapToResponseDto(cashRegister));
  }
} 