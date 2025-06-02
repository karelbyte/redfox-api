import { IsBoolean, IsNotEmpty } from 'class-validator';

export class UpdateWarehouseStatusDto {
  @IsNotEmpty()
  @IsBoolean()
  isOpen: boolean;
}
