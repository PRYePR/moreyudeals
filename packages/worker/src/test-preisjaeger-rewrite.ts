/**
 * Preisjaeger 重写功能测试
 *
 * 测试内容：
 * 1. 验证 .env.local 配置优先级
 * 2. 测试列表页抓取
 * 3. 测试链接解析（解密跳转链接）
 * 4. 测试详情页抓取和更新
 * 5. 验证数据库写入
 */

import dotenv from 'dotenv';
import path from 'path';

// 加载环境变量
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

import { DatabaseManager } from './database';
import { PreisjaegerFetcher } from './fetchers/preisjaeger-fetcher';

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Preisjaeger 重写功能测试                                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // ========================================
  // Step 1: 验证配置加载
  // ========================================
  console.log('📋 Step 1: 验证配置加载\n');
  console.log('环境变量检查：');
  console.log(`  SPARHAMSTER_ENABLED: ${process.env.SPARHAMSTER_ENABLED}`);
  console.log(`  PREISJAEGER_ENABLED: ${process.env.PREISJAEGER_ENABLED}`);
  console.log(`  PREISJAEGER_MAX_DETAIL_PAGES: ${process.env.PREISJAEGER_MAX_DETAIL_PAGES}`);
  console.log(`  PREISJAEGER_DETAIL_MIN_DELAY: ${process.env.PREISJAEGER_DETAIL_MIN_DELAY}`);
  console.log(`  PREISJAEGER_DETAIL_MAX_DELAY: ${process.env.PREISJAEGER_DETAIL_MAX_DELAY}`);
  console.log(`  TRANSLATION_ENABLED: ${process.env.TRANSLATION_ENABLED}`);
  console.log(`  AMAZON_AFFILIATE_TAG: ${process.env.AMAZON_AFFILIATE_TAG}`);

  // 验证 .env.local 配置
  const maxDetailPages = Number(process.env.PREISJAEGER_MAX_DETAIL_PAGES);
  const sparhamsterEnabled = process.env.SPARHAMSTER_ENABLED !== 'false';

  console.log('\n配置验证：');
  if (maxDetailPages === 3) {
    console.log('  ✅ .env.local 生效: PREISJAEGER_MAX_DETAIL_PAGES = 3');
  } else {
    console.log(`  ❌ .env.local 未生效: PREISJAEGER_MAX_DETAIL_PAGES = ${maxDetailPages} (期望 3)`);
  }

  if (!sparhamsterEnabled) {
    console.log('  ✅ .env.local 生效: SPARHAMSTER_ENABLED = false');
  } else {
    console.log('  ❌ .env.local 未生效: SPARHAMSTER_ENABLED = true (期望 false)');
  }

  // ========================================
  // Step 2: 初始化数据库
  // ========================================
  console.log('\n\n📦 Step 2: 初始化数据库\n');

  const dbConfig = {
    host: process.env.DB_HOST!,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME!,
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD || '',
  };

  console.log(`连接数据库: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);

  const database = new DatabaseManager(dbConfig);
  await database.connect();
  console.log('✅ 数据库连接成功');

  // ========================================
  // Step 3: 测试 Preisjaeger 抓取
  // ========================================
  console.log('\n\n🚀 Step 3: 测试 Preisjaeger 抓取\n');

  const fetcher = new PreisjaegerFetcher(database);

  try {
    const result = await fetcher.fetchLatest();

    console.log('\n\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  抓取结果统计                                              ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    console.log(`  📥 抓取数量: ${result.fetched}`);
    console.log(`  ✅ 新增数量: ${result.inserted}`);
    console.log(`  🔄 更新数量: ${result.updated}`);
    console.log(`  🔁 重复数量: ${result.duplicates}`);
    console.log(`  ❌ 错误数量: ${result.errors.length}`);

    if (result.errors.length > 0) {
      console.log('\n错误详情：');
      result.errors.forEach((err, i) => {
        console.log(`  ${i + 1}. ${err}`);
      });
    }

    // ========================================
    // Step 4: 验证数据库数据
    // ========================================
    console.log('\n\n📊 Step 4: 验证数据库数据\n');

    const countQuery = `
      SELECT COUNT(*) as total
      FROM deals
      WHERE source_site = 'preisjaeger'
    `;
    const countResult = await database.query(countQuery) as { total: string }[];
    console.log(`  Preisjaeger 商品总数: ${countResult[0].total}`);

    // 随机抽样 3 条
    const sampleQuery = `
      SELECT
        id,
        title_de,
        merchant,
        merchant_link,
        affiliate_link,
        affiliate_enabled,
        price,
        published_at,
        expires_at,
        translation_status,
        created_at
      FROM deals
      WHERE source_site = 'preisjaeger'
      ORDER BY created_at DESC
      LIMIT 3
    `;
    const samples = await database.query(sampleQuery) as any[];

    console.log('\n最新 3 条商品样本：\n');
    samples.forEach((sample, i) => {
      console.log(`  [${i + 1}] ${sample.title_de}`);
      console.log(`      商家: ${sample.merchant}`);
      console.log(`      价格: €${sample.price || 'N/A'}`);
      console.log(`      商家链接: ${sample.merchant_link?.substring(0, 60)}...`);
      console.log(`      联盟链接: ${sample.affiliate_link ? '✅ ' + sample.affiliate_link.substring(0, 60) + '...' : '❌ 无'}`);
      console.log(`      联盟状态: ${sample.affiliate_enabled ? '✅ 已启用' : '❌ 未启用'}`);
      console.log(`      发布时间: ${sample.published_at || 'N/A'}`);
      console.log(`      过期时间: ${sample.expires_at || 'N/A'}`);
      console.log(`      翻译状态: ${sample.translation_status}`);
      console.log('');
    });

    // ========================================
    // Step 5: 检查联盟链接
    // ========================================
    console.log('\n📊 Step 5: 检查联盟链接统计\n');

    const affiliateStatsQuery = `
      SELECT
        affiliate_enabled,
        affiliate_network,
        COUNT(*) as count
      FROM deals
      WHERE source_site = 'preisjaeger'
        AND created_at > NOW() - INTERVAL '1 hour'
      GROUP BY affiliate_enabled, affiliate_network
      ORDER BY count DESC
    `;
    const affiliateStats = await database.query(affiliateStatsQuery) as any[];

    console.log('联盟链接统计（最近1小时）：');
    affiliateStats.forEach(stat => {
      const status = stat.affiliate_enabled ? '✅ 已启用' : '❌ 未启用';
      const network = stat.affiliate_network || 'N/A';
      console.log(`  ${status} | 网络: ${network} | 数量: ${stat.count}`);
    });

    console.log('\n\n✅ 测试完成！');

  } catch (error) {
    console.error('\n\n❌ 测试失败:', error);
    throw error;
  } finally {
    await database.close();
    console.log('\n🔌 数据库连接已关闭');
  }
}

// 运行测试
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
