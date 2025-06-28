export class CloseReceptionResponseDto {
  receptionId: string;
  receptionCode: string;
  transferredProducts: number;
  totalQuantity: number;
  message: string;
  closedAt: Date;
}
