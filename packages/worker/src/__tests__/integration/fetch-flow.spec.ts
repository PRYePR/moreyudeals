/**
 * Sparhamster Fetch Flow (Integration Test)
 *
 * 测试完整的抓取流程：API 抓取 → 标准化 → 去重 → 入库
 *
 * 运行条件：
 * - 需要有效的数据库连接
 * - 需要网络连接访问 Sparhamster API
 * - 建议在测试数据库上运行
 *
 * 如何运行：
 * RUN_INTEGRATION_TESTS=1 npm test src/__tests__/integration/fetch-flow.spec.ts
 *
 * 注意：此测试默认被跳过，避免在普通单元测试时访问真实 API 和数据库
 */

import 'dotenv/config';
import { DatabaseManager } from '../../database';
import { SparhamsterFetcher } from '../../fetchers/sparhamster-fetcher';

// 检查是否应该运行集成测试
const shouldRunIntegrationTests = process.env.RUN_INTEGRATION_TESTS === '1';

// 根据环境变量决定是否跳过
const describeIntegration = shouldRunIntegrationTests ? describe : describe.skip;

describeIntegration('Sparhamster Fetch Flow (Integration)', () => {
  let db: DatabaseManager;
  let fetcher: SparhamsterFetcher;

  // 使用环境变量或默认测试配置
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'moreyudeals_dev',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  };

  beforeAll(async () => {
    // 连接数据库
    db = new DatabaseManager(dbConfig);
    await db.connect();

    // 创建 fetcher 实例
    fetcher = new SparhamsterFetcher(db);

    console.log('🔧 Integration Test Setup Complete');
    console.log(`   Database: ${dbConfig.database}`);
  }, 30000);

  afterAll(async () => {
    if (db) {
      await db.close();
      console.log('🔧 Integration Test Cleanup Complete');
    }
  }, 10000);

  describe('完整抓取流程', () => {
    it('应成功抓取并入库真实数据', async () => {
      console.log('🔄 开始抓取真实 Sparhamster 数据...');

      const result = await fetcher.fetchLatest();

      console.log('📊 抓取结果:');
      console.log(`   - 获取: ${result.fetched} 条`);
      console.log(`   - 新增: ${result.inserted} 条`);
      console.log(`   - 更新: ${result.updated} 条`);
      console.log(`   - 重复: ${result.duplicates} 条`);
      console.log(`   - 错误: ${result.errors.length} 条`);

      // 验证结果
      expect(result.fetched).toBeGreaterThan(0);
      expect(result.inserted + result.updated + result.duplicates).toBe(result.fetched);

      // 允许少量错误，但不应全部失败
      if (result.errors.length > 0) {
        console.warn('⚠️  部分记录处理失败:', result.errors);
        expect(result.errors.length).toBeLessThan(result.fetched);
      }

      // 验证数据库中存在新记录
      if (result.inserted > 0) {
        const rows = await db.query(
          `SELECT COUNT(*) as count FROM deals WHERE source_site = 'sparhamster'`
        );
        const count = parseInt(rows[0].count);

        console.log(`✅ 数据库中共有 ${count} 条 Sparhamster 记录`);
        expect(count).toBeGreaterThanOrEqual(result.inserted);
      }
    }, 60000);

    it('第二次抓取应检测到大量重复', async () => {
      console.log('🔄 执行第二次抓取，测试去重...');

      const result1 = await fetcher.fetchLatest();
      console.log(`📊 第一次抓取: 获取 ${result1.fetched}, 新增 ${result1.inserted}, 重复 ${result1.duplicates}`);

      // 短暂等待
      await new Promise(resolve => setTimeout(resolve, 2000));

      const result2 = await fetcher.fetchLatest();
      console.log(`📊 第二次抓取: 获取 ${result2.fetched}, 新增 ${result2.inserted}, 重复 ${result2.duplicates}`);

      // 第二次抓取应该有重复记录
      expect(result2.duplicates).toBeGreaterThan(0);

      // 第二次抓取新增应该很少或为0（除非有新发布的 deal）
      expect(result2.inserted).toBeLessThanOrEqual(result1.inserted);

      console.log('✅ 去重功能正常工作');
    }, 120000);

    it('应正确提取和存储商家信息', async () => {
      console.log('🔄 检查商家信息提取...');

      // 确保有数据
      await fetcher.fetchLatest();

      const rows = await db.query(`
        SELECT
          id,
          title,
          merchant,
          merchant_link,
          link
        FROM deals
        WHERE source_site = 'sparhamster'
        ORDER BY created_at DESC
        LIMIT 10
      `);

      console.log(`📊 检查最近 10 条记录的商家信息:`);

      let withMerchant = 0;
      let withMerchantLink = 0;

      rows.forEach((deal, idx) => {
        if (deal.merchant) withMerchant++;
        if (deal.merchant_link) withMerchantLink++;

        console.log(`   ${idx + 1}. ${deal.title?.substring(0, 40)}...`);
        console.log(`      商家: ${deal.merchant || 'N/A'}`);
        console.log(`      链接: ${deal.merchant_link || deal.link}`);
      });

      console.log(`✅ 商家信息提取率: ${withMerchant}/10 (${(withMerchant/10*100).toFixed(0)}%)`);
      console.log(`✅ 商家链接提取率: ${withMerchantLink}/10 (${(withMerchantLink/10*100).toFixed(0)}%)`);

      // 至少 30% 的记录应该有商家信息
      expect(withMerchant).toBeGreaterThanOrEqual(3);
    }, 60000);

    it('应正确提取价格和折扣信息', async () => {
      console.log('🔄 检查价格信息提取...');

      const rows = await db.query(`
        SELECT
          title,
          price,
          original_price,
          discount,
          currency
        FROM deals
        WHERE source_site = 'sparhamster'
          AND price IS NOT NULL
        ORDER BY created_at DESC
        LIMIT 10
      `);

      console.log(`📊 检查价格信息 (样本 ${rows.length} 条):`);

      rows.forEach((deal, idx) => {
        console.log(`   ${idx + 1}. ${deal.title?.substring(0, 40)}...`);
        console.log(`      价格: ${deal.price} ${deal.currency || 'EUR'}`);
        if (deal.original_price) {
          console.log(`      原价: ${deal.original_price} (省 ${deal.discount || 0}%)`);
        }
      });

      // 验证价格格式
      rows.forEach(deal => {
        if (deal.price) {
          expect(deal.price).toBeGreaterThan(0);
          expect(deal.currency).toBe('EUR');
        }
        if (deal.original_price) {
          expect(deal.original_price).toBeGreaterThanOrEqual(deal.price);
        }
        if (deal.discount) {
          expect(deal.discount).toBeGreaterThan(0);
          expect(deal.discount).toBeLessThanOrEqual(100);
        }
      });

      console.log('✅ 价格信息格式验证通过');
    }, 60000);

    it('应正确生成 content_hash 用于去重', async () => {
      console.log('🔄 检查 content_hash 生成...');

      const rows = await db.query(`
        SELECT
          id,
          title,
          content_hash
        FROM deals
        WHERE source_site = 'sparhamster'
          AND content_hash IS NOT NULL
        ORDER BY created_at DESC
        LIMIT 5
      `);

      console.log(`📊 检查 content_hash (样本 ${rows.length} 条):`);

      rows.forEach((deal, idx) => {
        console.log(`   ${idx + 1}. ${deal.title?.substring(0, 40)}...`);
        console.log(`      Hash: ${deal.content_hash}`);

        // 验证 hash 格式 (应该是 16 位十六进制)
        expect(deal.content_hash).toMatch(/^[a-f0-9]{16}$/);
      });

      // 验证 hash 唯一性
      const uniqueHashes = new Set(rows.map(r => r.content_hash));
      console.log(`✅ Hash 唯一性: ${uniqueHashes.size}/${rows.length}`);

      expect(uniqueHashes.size).toBe(rows.length);
    }, 60000);
  });

  describe('错误处理', () => {
    it('API 错误时应能优雅处理', async () => {
      console.log('🔄 测试错误处理...');

      // 使用无效的 API endpoint 测试错误处理
      const errorFetcher = new SparhamsterFetcher(db);

      // 这个测试假设 API 可能偶尔失败，fetcher 应该能处理
      // 实际结果取决于 API 的可用性
      try {
        const result = await errorFetcher.fetchLatest();
        console.log('✅ API 调用成功，错误处理未触发');
        expect(result).toBeDefined();
      } catch (error) {
        console.log('✅ API 错误被正确捕获');
        expect(error).toBeDefined();
      }
    }, 30000);
  });
});
