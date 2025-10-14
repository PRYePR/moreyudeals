/**
 * End-to-End 测试脚本
 *
 * 测试完整流程：
 * 1. 环境变量验证
 * 2. 数据库连接
 * 3. API 抓取 → 标准化 → 去重 → 入库
 * 4. 翻译流程（如启用）
 * 5. 数据验证
 *
 * 运行方式：
 * npx tsx scripts/test-e2e.ts
 */

import 'dotenv/config';
import { DatabaseManager } from '../src/database';
import { SparhamsterFetcher } from '../src/fetchers/sparhamster-fetcher';
import { TranslationAdapter } from '../src/translation/translation-adapter';
import { TranslationServiceWrapper } from '../src/translation/translation-service-wrapper';
import { createTranslationManager } from '@moreyudeals/translation';
import { EnvValidator } from '../src/config/env-validator';

interface TestResult {
  step: string;
  status: 'success' | 'failure' | 'skipped';
  message: string;
  data?: any;
  duration?: number;
}

class E2ETestRunner {
  private results: TestResult[] = [];
  private db?: DatabaseManager;

  async run(): Promise<void> {
    console.log('🧪 ==============================================');
    console.log('🧪 End-to-End 测试开始');
    console.log('🧪 ==============================================\n');

    await this.testStep1_EnvValidation();
    await this.testStep2_DatabaseConnection();
    await this.testStep3_FetchFlow();
    await this.testStep4_TranslationFlow();
    await this.testStep5_DataVerification();
    await this.cleanup();

    this.printSummary();
  }

  private async testStep1_EnvValidation(): Promise<void> {
    console.log('\n📋 Step 1: 环境变量验证');
    console.log('─'.repeat(50));

    const startTime = Date.now();

    try {
      const config = EnvValidator.validate();

      this.results.push({
        step: '环境变量验证',
        status: 'success',
        message: '所有必需的环境变量已配置',
        data: {
          database: config.database.database,
          sparhamster: {
            minInterval: config.sparhamster.minIntervalSeconds,
            maxInterval: config.sparhamster.maxIntervalSeconds,
          },
          translation: {
            enabled: config.translation.enabled,
            providers: config.translation.providers,
          },
        },
        duration: Date.now() - startTime,
      });

      console.log('✅ 环境变量验证通过');
      console.log(`   数据库: ${config.database.host}:${config.database.port}/${config.database.database}`);
      console.log(`   翻译服务: ${config.translation.enabled ? '启用' : '禁用'} (${config.translation.providers.join(', ')})`);
      console.log(`   抓取间隔: ${config.sparhamster.minIntervalSeconds}-${config.sparhamster.maxIntervalSeconds}秒`);

    } catch (error: any) {
      this.results.push({
        step: '环境变量验证',
        status: 'failure',
        message: `环境变量验证失败: ${error.message}`,
        duration: Date.now() - startTime,
      });

      console.error('❌ 环境变量验证失败:', error.message);
      throw error;
    }
  }

  private async testStep2_DatabaseConnection(): Promise<void> {
    console.log('\n📋 Step 2: 数据库连接测试');
    console.log('─'.repeat(50));

    const startTime = Date.now();

    try {
      const config = EnvValidator.validate();
      this.db = new DatabaseManager(config.database);

      await this.db.connect();

      // 测试查询
      const result = await this.db.query('SELECT COUNT(*) as count FROM deals');
      const dealCount = parseInt(result[0].count);

      this.results.push({
        step: '数据库连接',
        status: 'success',
        message: '数据库连接成功',
        data: {
          dealCount,
        },
        duration: Date.now() - startTime,
      });

      console.log('✅ 数据库连接成功');
      console.log(`   当前 deals 表记录数: ${dealCount}`);

    } catch (error: any) {
      this.results.push({
        step: '数据库连接',
        status: 'failure',
        message: `数据库连接失败: ${error.message}`,
        duration: Date.now() - startTime,
      });

      console.error('❌ 数据库连接失败:', error);
      throw error;
    }
  }

  private async testStep3_FetchFlow(): Promise<void> {
    console.log('\n📋 Step 3: 抓取流程测试 (API → 标准化 → 去重 → 入库)');
    console.log('─'.repeat(50));

    const startTime = Date.now();

    try {
      if (!this.db) throw new Error('数据库未初始化');

      const fetcher = new SparhamsterFetcher(this.db);

      console.log('🔄 开始抓取 Sparhamster 数据...');
      const result = await fetcher.fetchLatest();

      this.results.push({
        step: '抓取流程',
        status: 'success',
        message: '抓取流程完成',
        data: {
          fetched: result.fetched,
          inserted: result.inserted,
          updated: result.updated,
          duplicates: result.duplicates,
          errors: result.errors.length,
        },
        duration: Date.now() - startTime,
      });

      console.log('✅ 抓取流程完成');
      console.log(`   获取记录: ${result.fetched}`);
      console.log(`   新增条目: ${result.inserted}`);
      console.log(`   更新条目: ${result.updated}`);
      console.log(`   重复条目: ${result.duplicates}`);
      console.log(`   错误数量: ${result.errors.length}`);

      if (result.errors.length > 0) {
        console.warn('⚠️  部分记录处理失败:');
        result.errors.slice(0, 3).forEach(err => console.warn(`     - ${err}`));
        if (result.errors.length > 3) {
          console.warn(`     ... 还有 ${result.errors.length - 3} 个错误`);
        }
      }

      // 验证数据质量
      await this.verifyDataQuality();

    } catch (error: any) {
      this.results.push({
        step: '抓取流程',
        status: 'failure',
        message: `抓取流程失败: ${error.message}`,
        duration: Date.now() - startTime,
      });

      console.error('❌ 抓取流程失败:', error);
      throw error;
    }
  }

  private async verifyDataQuality(): Promise<void> {
    if (!this.db) return;

    console.log('\n   🔍 数据质量检查:');

    // 检查商家信息提取率
    const merchantQuery = await this.db.query(`
      SELECT
        COUNT(*) as total,
        COUNT(merchant) as with_merchant,
        COUNT(merchant_link) as with_link
      FROM deals
      WHERE source_site = 'sparhamster'
        AND created_at > NOW() - INTERVAL '1 hour'
    `);

    const merchantStats = merchantQuery[0];
    const merchantRate = merchantStats.total > 0
      ? Math.round((parseInt(merchantStats.with_merchant) / parseInt(merchantStats.total)) * 100)
      : 0;

    console.log(`     商家信息提取率: ${merchantRate}% (${merchantStats.with_merchant}/${merchantStats.total})`);

    // 检查价格信息
    const priceQuery = await this.db.query(`
      SELECT COUNT(*) as with_price
      FROM deals
      WHERE source_site = 'sparhamster'
        AND price IS NOT NULL
        AND created_at > NOW() - INTERVAL '1 hour'
    `);

    const priceCount = parseInt(priceQuery[0].with_price);
    const priceRate = merchantStats.total > 0
      ? Math.round((priceCount / parseInt(merchantStats.total)) * 100)
      : 0;

    console.log(`     价格信息提取率: ${priceRate}% (${priceCount}/${merchantStats.total})`);

    // 检查 content_hash
    const hashQuery = await this.db.query(`
      SELECT COUNT(*) as with_hash
      FROM deals
      WHERE source_site = 'sparhamster'
        AND content_hash IS NOT NULL
        AND created_at > NOW() - INTERVAL '1 hour'
    `);

    const hashCount = parseInt(hashQuery[0].with_hash);
    const hashRate = merchantStats.total > 0
      ? Math.round((hashCount / parseInt(merchantStats.total)) * 100)
      : 0;

    console.log(`     Content Hash 生成率: ${hashRate}% (${hashCount}/${merchantStats.total})`);
  }

  private async testStep4_TranslationFlow(): Promise<void> {
    console.log('\n📋 Step 4: 翻译流程测试');
    console.log('─'.repeat(50));

    const startTime = Date.now();

    try {
      const config = EnvValidator.validate();

      if (!config.translation.enabled) {
        this.results.push({
          step: '翻译流程',
          status: 'skipped',
          message: '翻译服务未启用（TRANSLATION_ENABLED=false）',
          duration: Date.now() - startTime,
        });

        console.log('⏭️  翻译流程已跳过（翻译服务未启用）');
        return;
      }

      if (!this.db) throw new Error('数据库未初始化');

      // 创建翻译服务
      const translationManager = createTranslationManager({
        enabled: config.translation.enabled,
        targetLanguages: config.translation.targetLanguages,
        providers: config.translation.providers,
        deepl: config.translation.deepl,
        redis: {
          url: config.redis.url,
        },
      });

      const translationService = new TranslationServiceWrapper(translationManager);

      const translationAdapter = new TranslationAdapter(
        this.db,
        translationService,
        {
          batchSize: config.translation.batchSize,
          targetLanguage: 'zh',
          sourceLanguage: 'de',
        }
      );

      console.log('🔄 开始处理翻译任务...');
      const result = await translationAdapter.processTranslations();

      this.results.push({
        step: '翻译流程',
        status: result.failed === 0 ? 'success' : 'failure',
        message: '翻译流程完成',
        data: {
          processed: result.processed,
          succeeded: result.succeeded,
          failed: result.failed,
        },
        duration: Date.now() - startTime,
      });

      console.log('✅ 翻译流程完成');
      console.log(`   处理数量: ${result.processed}`);
      console.log(`   成功翻译: ${result.succeeded}`);
      console.log(`   失败数量: ${result.failed}`);

      if (result.processed === 0) {
        console.log('   ℹ️  没有待翻译的内容');
      }

    } catch (error: any) {
      this.results.push({
        step: '翻译流程',
        status: 'failure',
        message: `翻译流程失败: ${error.message}`,
        duration: Date.now() - startTime,
      });

      console.error('❌ 翻译流程失败:', error);
      // 不抛出错误，继续执行后续步骤
    }
  }

  private async testStep5_DataVerification(): Promise<void> {
    console.log('\n📋 Step 5: 数据完整性验证');
    console.log('─'.repeat(50));

    const startTime = Date.now();

    try {
      if (!this.db) throw new Error('数据库未初始化');

      // 统计信息
      const statsQuery = await this.db.query(`
        SELECT
          source_site,
          COUNT(*) as total,
          COUNT(CASE WHEN is_translated THEN 1 END) as translated,
          MIN(created_at) as earliest,
          MAX(created_at) as latest
        FROM deals
        GROUP BY source_site
      `);

      const stats = statsQuery.reduce((acc: any, row: any) => {
        acc[row.source_site] = {
          total: parseInt(row.total),
          translated: parseInt(row.translated),
          earliest: row.earliest,
          latest: row.latest,
        };
        return acc;
      }, {});

      // 检查重复记录
      const duplicateQuery = await this.db.query(`
        SELECT guid, COUNT(*) as count
        FROM deals
        GROUP BY guid
        HAVING COUNT(*) > 1
      `);

      this.results.push({
        step: '数据完整性验证',
        status: 'success',
        message: '数据完整性检查通过',
        data: {
          stats,
          duplicates: duplicateQuery.length,
        },
        duration: Date.now() - startTime,
      });

      console.log('✅ 数据完整性验证通过');
      console.log('\n   📊 数据统计:');

      Object.entries(stats).forEach(([source, data]: [string, any]) => {
        console.log(`     ${source}:`);
        console.log(`       总记录数: ${data.total}`);
        console.log(`       已翻译: ${data.translated} (${Math.round((data.translated / data.total) * 100)}%)`);
        console.log(`       最早记录: ${new Date(data.earliest).toLocaleString()}`);
        console.log(`       最新记录: ${new Date(data.latest).toLocaleString()}`);
      });

      if (duplicateQuery.length > 0) {
        console.warn(`\n   ⚠️  发现 ${duplicateQuery.length} 个重复 GUID（这不应该发生）`);
        duplicateQuery.slice(0, 3).forEach((dup: any) => {
          console.warn(`     - ${dup.guid} (${dup.count} 次)`);
        });
      } else {
        console.log('\n   ✅ 无重复记录');
      }

    } catch (error: any) {
      this.results.push({
        step: '数据完整性验证',
        status: 'failure',
        message: `数据验证失败: ${error.message}`,
        duration: Date.now() - startTime,
      });

      console.error('❌ 数据验证失败:', error);
    }
  }

  private async cleanup(): Promise<void> {
    console.log('\n📋 清理资源');
    console.log('─'.repeat(50));

    try {
      if (this.db) {
        await this.db.close();
        console.log('✅ 数据库连接已关闭');
      }
    } catch (error) {
      console.error('❌ 清理资源失败:', error);
    }
  }

  private printSummary(): void {
    console.log('\n');
    console.log('🧪 ==============================================');
    console.log('🧪 End-to-End 测试总结');
    console.log('🧪 ==============================================\n');

    const successCount = this.results.filter(r => r.status === 'success').length;
    const failureCount = this.results.filter(r => r.status === 'failure').length;
    const skippedCount = this.results.filter(r => r.status === 'skipped').length;
    const totalDuration = this.results.reduce((sum, r) => sum + (r.duration || 0), 0);

    console.log('📊 测试结果:');
    console.log(`   ✅ 成功: ${successCount}`);
    console.log(`   ❌ 失败: ${failureCount}`);
    console.log(`   ⏭️  跳过: ${skippedCount}`);
    console.log(`   ⏱️  总耗时: ${totalDuration}ms (${(totalDuration / 1000).toFixed(2)}s)`);

    console.log('\n📋 详细结果:');
    this.results.forEach((result, index) => {
      const statusIcon = {
        'success': '✅',
        'failure': '❌',
        'skipped': '⏭️ ',
      }[result.status];

      console.log(`\n   ${index + 1}. ${statusIcon} ${result.step}`);
      console.log(`      状态: ${result.message}`);
      if (result.duration) {
        console.log(`      耗时: ${result.duration}ms`);
      }
      if (result.data) {
        console.log(`      数据: ${JSON.stringify(result.data, null, 6).replace(/\n/g, '\n      ')}`);
      }
    });

    console.log('\n');
    console.log('==============================================');

    if (failureCount === 0) {
      console.log('🎉 所有测试通过！系统运行正常。');
    } else {
      console.log(`⚠️  有 ${failureCount} 个测试失败，请检查上述错误信息。`);
      process.exit(1);
    }
  }
}

// 运行测试
const runner = new E2ETestRunner();
runner.run().catch((error) => {
  console.error('\n❌ E2E 测试运行失败:', error);
  process.exit(1);
});
