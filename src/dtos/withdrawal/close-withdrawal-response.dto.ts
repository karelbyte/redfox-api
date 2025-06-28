export class CloseWithdrawalResponseDto {
  withdrawalId: string;
  withdrawalCode: string;
  withdrawnProducts: number;
  totalQuantity: number;
  message: string;
  closedAt: Date;
}
