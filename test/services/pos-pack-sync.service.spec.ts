import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PosPackSyncService } from '../../src/services/pos-pack-sync.service';
import { Withdrawal, WithdrawalType } from '../../src/models/withdrawal.entity';
import { WithdrawalDetail } from '../../src/models/withdrawal-detail.entity';
import { CertificationPackFactoryService } from '../../src/services/certification-pack-factory.service';

describe('PosPackSyncService', () => {
  let service: PosPackSyncService;
  let withdrawalRepository: jest.Mocked<Repository<Withdrawal>>;
  let withdrawalDetailRepository: jest.Mocked<Repository<WithdrawalDetail>>;
  let certificationPackFactory: jest.Mocked<CertificationPackFactoryService>;
  let packService: jest.Mocked<any>;

  const mockWithdrawal = {
    id: 'withdrawal-1',
    code: 'W001',
    type: WithdrawalType.POS,
    pack_receipt_id: null,
    details: [],
  } as any;

  beforeEach(async () => {
    jest.clearAllMocks();

    withdrawalRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    } as any;

    withdrawalDetailRepository = {
      find: jest.fn(),
    } as any;

    packService = {
      createReceipt: jest.fn(),
      cancelReceipt: jest.fn(),
    } as any;

    certificationPackFactory = {
      getPackService: jest.fn().mockResolvedValue(packService),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PosPackSyncService,
        {
          provide: getRepositoryToken(Withdrawal),
          useValue: withdrawalRepository,
        },
        {
          provide: getRepositoryToken(WithdrawalDetail),
          useValue: withdrawalDetailRepository,
        },
        {
          provide: CertificationPackFactoryService,
          useValue: certificationPackFactory,
        },
      ],
    }).compile();

    service = module.get<PosPackSyncService>(PosPackSyncService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createReceiptForWithdrawal', () => {
    it('should return error when withdrawal not found', async () => {
      withdrawalRepository.findOne.mockResolvedValue(null);

      const result = await service.createReceiptForWithdrawal('withdrawal-1');

      expect(result.packSyncSuccess).toBe(false);
      expect(result.packErrorMessage).toBe('Withdrawal not found');
    });

    it('should return success when withdrawal already has receipt', async () => {
      const withdrawalWithReceipt = { ...mockWithdrawal, pack_receipt_id: 'existing' };
      withdrawalRepository.findOne.mockResolvedValue(withdrawalWithReceipt);

      const result = await service.createReceiptForWithdrawal('withdrawal-1');

      expect(result.packSyncSuccess).toBe(true);
      expect(packService.createReceipt).not.toHaveBeenCalled();
    });
  });

  describe('cancelReceiptForWithdrawal', () => {
    it('should cancel receipt when exists', async () => {
      const withdrawalWithReceipt = { ...mockWithdrawal, pack_receipt_id: 'receipt-123' };
      withdrawalRepository.findOne.mockResolvedValue(withdrawalWithReceipt);

      await service.cancelReceiptForWithdrawal('withdrawal-1');

      expect(packService.cancelReceipt).toHaveBeenCalledWith('receipt-123');
    });

    it('should not cancel when no receipt exists', async () => {
      withdrawalRepository.findOne.mockResolvedValue(mockWithdrawal);

      await service.cancelReceiptForWithdrawal('withdrawal-1');

      expect(packService.cancelReceipt).not.toHaveBeenCalled();
    });
  });
});
