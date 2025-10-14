/**
 * Deduplication Service 单元测试
 */

import { DeduplicationService } from '../services/deduplication-service';
import { DatabaseManager } from '../database';
import { Deal } from '../types/deal.types';

// Mock DatabaseManager
jest.mock('../database');

describe('DeduplicationService', () => {
  let service: DeduplicationService;
  let mockDb: jest.Mocked<DatabaseManager>;

  // 测试用 Deal 数据
  const createTestDeal = (overrides: Partial<Deal> = {}): Deal => ({
    id: 'test-id-1',
    sourceSite: 'sparhamster',
    guid: 'https://example.com/deal-123',
    link: 'https://merchant.com/product',
    currency: 'EUR',
    language: 'de',
    translationStatus: 'pending',
    isTranslated: false,
    affiliateEnabled: false,
    duplicateCount: 0,
    firstSeenAt: new Date('2025-10-13'),
    lastSeenAt: new Date('2025-10-13'),
    createdAt: new Date('2025-10-13'),
    updatedAt: new Date('2025-10-13'),
    ...overrides,
  });

  beforeEach(() => {
    // 创建 Mock Database
    mockDb = {
      getDealBySourceGuid: jest.fn(),
      getDealByContentHash: jest.fn(),
      incrementDuplicateCount: jest.fn(),
      updateDeal: jest.fn(),
    } as any;

    service = new DeduplicationService(mockDb);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkDuplicate', () => {
    it('相同 guid 应检测为重复', async () => {
      const existingDeal = createTestDeal({ id: 'existing-1' });
      const newDeal = createTestDeal({ guid: 'same-guid' });

      mockDb.getDealBySourceGuid.mockResolvedValue(existingDeal);

      const result = await service.checkDuplicate(newDeal);

      expect(result.isDuplicate).toBe(true);
      expect(result.existingDeal).toBe(existingDeal);
      expect(result.duplicateType).toBe('guid');
      expect(mockDb.getDealBySourceGuid).toHaveBeenCalledWith(
        newDeal.sourceSite,
        newDeal.guid
      );
    });

    it('相同 content_hash 应检测为重复', async () => {
      const existingDeal = createTestDeal({
        id: 'existing-2',
        contentHash: 'abc123',
      });
      const newDeal = createTestDeal({
        guid: 'different-guid',
        contentHash: 'abc123',
      });

      mockDb.getDealBySourceGuid.mockResolvedValue(null);
      mockDb.getDealByContentHash.mockResolvedValue(existingDeal);

      const result = await service.checkDuplicate(newDeal);

      expect(result.isDuplicate).toBe(true);
      expect(result.existingDeal).toBe(existingDeal);
      expect(result.duplicateType).toBe('content_hash');
      expect(mockDb.getDealByContentHash).toHaveBeenCalledWith('abc123', 7);
    });

    it('不同内容不应检测为重复', async () => {
      const newDeal = createTestDeal({
        guid: 'unique-guid',
        contentHash: 'xyz789',
      });

      mockDb.getDealBySourceGuid.mockResolvedValue(null);
      mockDb.getDealByContentHash.mockResolvedValue(null);

      const result = await service.checkDuplicate(newDeal);

      expect(result.isDuplicate).toBe(false);
      expect(result.existingDeal).toBeUndefined();
      expect(result.duplicateType).toBeUndefined();
    });

    it('没有 content_hash 时只检查 guid', async () => {
      const newDeal = createTestDeal({
        guid: 'unique-guid',
        contentHash: undefined,
      });

      mockDb.getDealBySourceGuid.mockResolvedValue(null);

      const result = await service.checkDuplicate(newDeal);

      expect(result.isDuplicate).toBe(false);
      expect(mockDb.getDealBySourceGuid).toHaveBeenCalled();
      expect(mockDb.getDealByContentHash).not.toHaveBeenCalled();
    });

    it('guid 优先于 content_hash', async () => {
      const existingByGuid = createTestDeal({ id: 'guid-match' });
      const existingByHash = createTestDeal({ id: 'hash-match' });
      const newDeal = createTestDeal({
        guid: 'same-guid',
        contentHash: 'abc123',
      });

      mockDb.getDealBySourceGuid.mockResolvedValue(existingByGuid);
      mockDb.getDealByContentHash.mockResolvedValue(existingByHash);

      const result = await service.checkDuplicate(newDeal);

      expect(result.isDuplicate).toBe(true);
      expect(result.existingDeal).toBe(existingByGuid);
      expect(result.duplicateType).toBe('guid');
      // content_hash 检查不应被调用
      expect(mockDb.getDealByContentHash).not.toHaveBeenCalled();
    });
  });

  describe('handleDuplicate', () => {
    it('应增加 duplicate_count 并更新 last_seen_at', async () => {
      const dealId = 'duplicate-deal-id';
      mockDb.incrementDuplicateCount.mockResolvedValue(undefined);
      mockDb.updateDeal.mockResolvedValue(undefined);

      await service.handleDuplicate(dealId);

      expect(mockDb.incrementDuplicateCount).toHaveBeenCalledWith(dealId);
      expect(mockDb.updateDeal).toHaveBeenCalledWith(
        dealId,
        expect.objectContaining({
          lastSeenAt: expect.any(Date),
        })
      );
    });

    it('更新时间应接近当前时间', async () => {
      const dealId = 'test-id';
      const beforeCall = new Date();

      await service.handleDuplicate(dealId);

      const updateCall = mockDb.updateDeal.mock.calls[0];
      const updatedTime = updateCall[1].lastSeenAt as Date;
      const afterCall = new Date();

      expect(updatedTime.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime());
      expect(updatedTime.getTime()).toBeLessThanOrEqual(afterCall.getTime());
    });
  });

  describe('process', () => {
    it('检测到重复时应自动处理', async () => {
      const existingDeal = createTestDeal({ id: 'existing-deal' });
      const newDeal = createTestDeal({ guid: 'same-guid' });

      mockDb.getDealBySourceGuid.mockResolvedValue(existingDeal);
      mockDb.incrementDuplicateCount.mockResolvedValue(undefined);
      mockDb.updateDeal.mockResolvedValue(undefined);

      const result = await service.process(newDeal);

      expect(result.isDuplicate).toBe(true);
      expect(result.existingDeal).toBe(existingDeal);
      expect(mockDb.incrementDuplicateCount).toHaveBeenCalledWith(existingDeal.id);
      expect(mockDb.updateDeal).toHaveBeenCalled();
    });

    it('未检测到重复时不应调用处理逻辑', async () => {
      const newDeal = createTestDeal({ guid: 'unique-guid' });

      mockDb.getDealBySourceGuid.mockResolvedValue(null);
      mockDb.getDealByContentHash.mockResolvedValue(null);

      const result = await service.process(newDeal);

      expect(result.isDuplicate).toBe(false);
      expect(mockDb.incrementDuplicateCount).not.toHaveBeenCalled();
      expect(mockDb.updateDeal).not.toHaveBeenCalled();
    });

    it('返回结果应与 checkDuplicate 一致', async () => {
      const existingDeal = createTestDeal({
        id: 'hash-match',
        contentHash: 'abc123',
      });
      const newDeal = createTestDeal({
        guid: 'different-guid',
        contentHash: 'abc123',
      });

      mockDb.getDealBySourceGuid.mockResolvedValue(null);
      mockDb.getDealByContentHash.mockResolvedValue(existingDeal);

      const checkResult = await service.checkDuplicate(newDeal);
      const processResult = await service.process(newDeal);

      expect(processResult.isDuplicate).toBe(checkResult.isDuplicate);
      expect(processResult.duplicateType).toBe(checkResult.duplicateType);
    });
  });

  describe('边界情况', () => {
    it('数据库查询失败应抛出异常', async () => {
      const newDeal = createTestDeal();
      mockDb.getDealBySourceGuid.mockRejectedValue(new Error('Database error'));

      await expect(service.checkDuplicate(newDeal)).rejects.toThrow('Database error');
    });

    it('incrementDuplicateCount 失败应抛出异常', async () => {
      mockDb.incrementDuplicateCount.mockRejectedValue(new Error('Update failed'));

      await expect(service.handleDuplicate('test-id')).rejects.toThrow('Update failed');
    });

    it('空字符串 content_hash 应跳过 hash 检查', async () => {
      const newDeal = createTestDeal({
        guid: 'unique-guid',
        contentHash: '',
      });

      mockDb.getDealBySourceGuid.mockResolvedValue(null);

      const result = await service.checkDuplicate(newDeal);

      expect(result.isDuplicate).toBe(false);
      expect(mockDb.getDealByContentHash).not.toHaveBeenCalled();
    });
  });

  describe('性能测试', () => {
    it('单次检查应在 100ms 内完成', async () => {
      const newDeal = createTestDeal();
      mockDb.getDealBySourceGuid.mockResolvedValue(null);
      mockDb.getDealByContentHash.mockResolvedValue(null);

      const start = Date.now();
      await service.checkDuplicate(newDeal);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100);
    });

    it('批量检查 100 个应在 5 秒内完成', async () => {
      mockDb.getDealBySourceGuid.mockResolvedValue(null);
      mockDb.getDealByContentHash.mockResolvedValue(null);

      const deals = Array.from({ length: 100 }, (_, i) =>
        createTestDeal({ guid: `guid-${i}`, contentHash: `hash-${i}` })
      );

      const start = Date.now();
      await Promise.all(deals.map(deal => service.checkDuplicate(deal)));
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(5000);
    });
  });
});
