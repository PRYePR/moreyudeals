/**
 * DatabaseManager Deal 操作集成测试
 * 测试新的 deals 表 CRUD 操作
 *
 * 运行条件：
 * - 需要有效的数据库连接
 *
 * 如何运行：
 * RUN_INTEGRATION_TESTS=1 npm test src/__tests__/database.spec.ts
 *
 * 注意：此测试默认被跳过，避免在普通单元测试时访问真实数据库
 */

import { DatabaseManager } from '../database';
import { Deal, CreateDealInput } from '../types/deal.types';

// 检查是否应该运行集成测试
const shouldRunIntegrationTests = process.env.RUN_INTEGRATION_TESTS === '1';

// 根据环境变量决定是否跳过
const describeIntegration = shouldRunIntegrationTests ? describe : describe.skip;

describeIntegration('DatabaseManager - Deal Operations', () => {
  let db: DatabaseManager;
  const testDealGuids: string[] = [];

  beforeAll(async () => {
    // 从环境变量读取数据库配置
    db = new DatabaseManager({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'moreyudeals_test',
      username: process.env.DB_USER || 'moreyu_admin',
      password: process.env.DB_PASSWORD,
    });

    await db.connect();
  });

  afterAll(async () => {
    // 清理测试数据
    for (const guid of testDealGuids) {
      try {
        const deal = await db.getDealBySourceGuid('test-source', guid);
        if (deal) {
          await db['pool'].query('DELETE FROM deals WHERE id = $1', [deal.id]);
        }
      } catch (error) {
        console.warn(`清理测试数据失败: ${guid}`, error);
      }
    }

    await db.close();
  });

  describe('createDeal', () => {
    it('应成功创建 Deal 并返回 ID', async () => {
      const guid = `https://test.com/deal-${Date.now()}`;
      testDealGuids.push(guid);

      const dealInput: CreateDealInput = {
        sourceSite: 'test-source',
        sourcePostId: 'test-123',
        guid,
        link: 'https://merchant.com/product',

        title: 'Test Deal Title',
        originalTitle: 'Test Deal Title',
        description: 'Test description',
        originalDescription: 'Test description',

        currency: 'EUR',
        price: 19.99,
        originalPrice: 29.99,
        discount: 33,

        categories: ['Electronics', 'Deals'],

        affiliateEnabled: false,
        language: 'de',
        translationStatus: 'pending',
        isTranslated: false,

        duplicateCount: 0,
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
      };

      const dealId = await db.createDeal(dealInput);

      expect(dealId).toBeDefined();
      expect(dealId.length).toBeGreaterThan(0);

      // 验证可以查询到
      const created = await db.getDealById(dealId);
      expect(created).toBeDefined();
      expect(created!.guid).toBe(guid);
      expect(created!.title).toBe('Test Deal Title');
      expect(created!.price).toBe(19.99);
    });

    it('应正确处理 JSON 字段', async () => {
      const guid = `https://test.com/deal-json-${Date.now()}`;
      testDealGuids.push(guid);

      const dealInput: CreateDealInput = {
        sourceSite: 'test-source',
        guid,
        link: 'https://test.com',

        contentBlocks: [
          { type: 'heading', content: 'Test Heading' },
          { type: 'text', content: 'Test paragraph' },
        ],
        categories: ['Category1', 'Category2'],
        tags: ['tag1', 'tag2'],
        images: ['https://example.com/img1.jpg', 'https://example.com/img2.jpg'],

        currency: 'EUR',
        affiliateEnabled: false,
        language: 'de',
        translationStatus: 'pending',
        isTranslated: false,
        duplicateCount: 0,
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
      };

      const dealId = await db.createDeal(dealInput);
      const created = await db.getDealById(dealId);

      expect(created!.contentBlocks).toHaveLength(2);
      expect(created!.contentBlocks![0].type).toBe('heading');
      expect(created!.categories).toEqual(['Category1', 'Category2']);
      expect(created!.tags).toEqual(['tag1', 'tag2']);
      expect(created!.images).toHaveLength(2);
    });

    it('应拒绝重复 guid 插入 (相同 source_site + guid)', async () => {
      const guid = `https://test.com/deal-duplicate-${Date.now()}`;
      testDealGuids.push(guid);

      const dealInput: CreateDealInput = {
        sourceSite: 'test-source',
        guid,
        link: 'https://test.com',
        currency: 'EUR',
        affiliateEnabled: false,
        language: 'de',
        translationStatus: 'pending',
        isTranslated: false,
        duplicateCount: 0,
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
      };

      // 第一次插入应成功
      await db.createDeal(dealInput);

      // 第二次插入应失败
      await expect(db.createDeal(dealInput)).rejects.toThrow();
    });
  });

  describe('getDealBySourceGuid', () => {
    it('应成功查询已存在的 Deal', async () => {
      const guid = `https://test.com/deal-query-${Date.now()}`;
      testDealGuids.push(guid);

      const dealInput: CreateDealInput = {
        sourceSite: 'test-source',
        sourcePostId: 'query-test-1',
        guid,
        link: 'https://test.com',
        title: 'Query Test Deal',
        currency: 'EUR',
        affiliateEnabled: false,
        language: 'de',
        translationStatus: 'pending',
        isTranslated: false,
        duplicateCount: 0,
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
      };

      await db.createDeal(dealInput);

      const found = await db.getDealBySourceGuid('test-source', guid);

      expect(found).toBeDefined();
      expect(found!.guid).toBe(guid);
      expect(found!.sourcePostId).toBe('query-test-1');
      expect(found!.title).toBe('Query Test Deal');
    });

    it('不存在的 guid 应返回 null', async () => {
      const found = await db.getDealBySourceGuid('test-source', 'nonexistent-guid');
      expect(found).toBeNull();
    });
  });

  describe('getDealByContentHash', () => {
    it('应在 7 天窗口内找到相同 hash', async () => {
      const guid = `https://test.com/deal-hash-${Date.now()}`;
      testDealGuids.push(guid);

      const hash = `test-hash-${Date.now()}`;

      const dealInput: CreateDealInput = {
        sourceSite: 'test-source',
        guid,
        link: 'https://test.com',
        contentHash: hash,
        currency: 'EUR',
        affiliateEnabled: false,
        language: 'de',
        translationStatus: 'pending',
        isTranslated: false,
        duplicateCount: 0,
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
      };

      await db.createDeal(dealInput);

      const found = await db.getDealByContentHash(hash, 7);
      expect(found).toBeDefined();
      expect(found!.contentHash).toBe(hash);
    });

    it('超过窗口期的 hash 应返回 null', async () => {
      const guid = `https://test.com/deal-old-hash-${Date.now()}`;
      testDealGuids.push(guid);

      const hash = `old-hash-${Date.now()}`;

      const dealInput: CreateDealInput = {
        sourceSite: 'test-source',
        guid,
        link: 'https://test.com',
        contentHash: hash,
        currency: 'EUR',
        affiliateEnabled: false,
        language: 'de',
        translationStatus: 'pending',
        isTranslated: false,
        duplicateCount: 0,
        firstSeenAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 天前
        lastSeenAt: new Date(),
      };

      const dealId = await db.createDeal(dealInput);

      // 手动修改 first_seen_at 为 8 天前
      await db['pool'].query(
        `UPDATE deals SET first_seen_at = NOW() - INTERVAL '8 days' WHERE id = $1`,
        [dealId]
      );

      const found = await db.getDealByContentHash(hash, 7);
      expect(found).toBeNull();
    });
  });

  describe('updateDeal', () => {
    it('应成功更新 Deal 字段', async () => {
      const guid = `https://test.com/deal-update-${Date.now()}`;
      testDealGuids.push(guid);

      const dealInput: CreateDealInput = {
        sourceSite: 'test-source',
        guid,
        link: 'https://test.com',
        title: 'Original Title',
        price: 10.00,
        currency: 'EUR',
        affiliateEnabled: false,
        language: 'de',
        translationStatus: 'pending',
        isTranslated: false,
        duplicateCount: 0,
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
      };

      const dealId = await db.createDeal(dealInput);

      // 更新字段
      await db.updateDeal(dealId, {
        title: 'Updated Title',
        price: 15.99,
        translationStatus: 'completed',
        isTranslated: true,
      });

      const updated = await db.getDealById(dealId);
      expect(updated!.title).toBe('Updated Title');
      expect(updated!.price).toBe(15.99);
      expect(updated!.translationStatus).toBe('completed');
      expect(updated!.isTranslated).toBe(true);
    });

    it('应正确更新 JSON 字段', async () => {
      const guid = `https://test.com/deal-update-json-${Date.now()}`;
      testDealGuids.push(guid);

      const dealInput: CreateDealInput = {
        sourceSite: 'test-source',
        guid,
        link: 'https://test.com',
        categories: ['Old Category'],
        currency: 'EUR',
        affiliateEnabled: false,
        language: 'de',
        translationStatus: 'pending',
        isTranslated: false,
        duplicateCount: 0,
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
      };

      const dealId = await db.createDeal(dealInput);

      await db.updateDeal(dealId, {
        categories: ['New Category1', 'New Category2'],
        tags: ['tag1', 'tag2'],
      });

      const updated = await db.getDealById(dealId);
      expect(updated!.categories).toEqual(['New Category1', 'New Category2']);
      expect(updated!.tags).toEqual(['tag1', 'tag2']);
    });
  });

  describe('incrementDuplicateCount', () => {
    it('应正确增加重复计数', async () => {
      const guid = `https://test.com/deal-dup-count-${Date.now()}`;
      testDealGuids.push(guid);

      const dealInput: CreateDealInput = {
        sourceSite: 'test-source',
        guid,
        link: 'https://test.com',
        currency: 'EUR',
        affiliateEnabled: false,
        language: 'de',
        translationStatus: 'pending',
        isTranslated: false,
        duplicateCount: 0,
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
      };

      const dealId = await db.createDeal(dealInput);

      // 初始应为 0
      let deal = await db.getDealById(dealId);
      expect(deal!.duplicateCount).toBe(0);

      // 增加 3 次
      await db.incrementDuplicateCount(dealId);
      await db.incrementDuplicateCount(dealId);
      await db.incrementDuplicateCount(dealId);

      deal = await db.getDealById(dealId);
      expect(deal!.duplicateCount).toBe(3);
    });
  });

  describe('getUntranslatedDeals', () => {
    it('应返回待翻译的 Deals', async () => {
      const guid1 = `https://test.com/deal-untranslated-1-${Date.now()}`;
      const guid2 = `https://test.com/deal-untranslated-2-${Date.now()}`;
      testDealGuids.push(guid1, guid2);

      const dealInput1: CreateDealInput = {
        sourceSite: 'test-source',
        guid: guid1,
        link: 'https://test.com',
        translationStatus: 'pending',
        currency: 'EUR',
        affiliateEnabled: false,
        language: 'de',
        isTranslated: false,
        duplicateCount: 0,
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
        publishedAt: new Date(),
      };

      const dealInput2: CreateDealInput = {
        ...dealInput1,
        guid: guid2,
        translationStatus: 'completed',
        isTranslated: true,
      };

      await db.createDeal(dealInput1);
      await db.createDeal(dealInput2);

      const untranslated = await db.getUntranslatedDeals(100);

      // 至少应包含我们创建的待翻译 Deal
      const found = untranslated.find(d => d.guid === guid1);
      expect(found).toBeDefined();
      expect(found!.translationStatus).toBe('pending');

      // 不应包含已翻译的
      const shouldNotExist = untranslated.find(d => d.guid === guid2);
      expect(shouldNotExist).toBeUndefined();
    });
  });

  describe('updateDealTranslation', () => {
    it('应更新翻译信息', async () => {
      const guid = `https://test.com/deal-translation-${Date.now()}`;
      testDealGuids.push(guid);

      const dealInput: CreateDealInput = {
        sourceSite: 'test-source',
        guid,
        link: 'https://test.com',
        originalTitle: 'Deutscher Titel',
        originalDescription: 'Deutsche Beschreibung',
        translationStatus: 'pending',
        currency: 'EUR',
        affiliateEnabled: false,
        language: 'de',
        isTranslated: false,
        duplicateCount: 0,
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
      };

      const dealId = await db.createDeal(dealInput);

      await db.updateDealTranslation(
        dealId,
        {
          title: 'Chinese Title',
          description: 'Chinese Description',
        },
        {
          provider: 'deepl',
          language: 'zh',
          detectedLanguage: 'de',
        }
      );

      const updated = await db.getDealById(dealId);
      expect(updated!.title).toBe('Chinese Title');
      expect(updated!.description).toBe('Chinese Description');
      expect(updated!.translationStatus).toBe('completed');
      expect(updated!.isTranslated).toBe(true);
      expect(updated!.translationProvider).toBe('deepl');
      expect(updated!.translationLanguage).toBe('zh');
    });
  });
});
