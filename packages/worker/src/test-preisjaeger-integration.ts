/**
 * Preisjaeger 集成测试脚本
 * 
 * 完整集成测试：抓取 -> 标准化 -> 去重 -> 入库
 */

import 'dotenv/config';
import { DatabaseManager } from './database';
import { PreisjaegerFetcher } from './fetchers/preisjaeger-fetcher';

async function main() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║   Preisjaeger 集成测试                 ║');
  console.log('╚════════════════════════════════════════╝\n');

  const database = new DatabaseManager({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'moreyudeals_dev',
    user: process.env.DB_USER || 'prye',
    password: process.env.DB_PASSWORD || '',
  });

  try {
    console.log('🔌 连接数据库...');
    await database.connect();
    console.log('✅ 数据库连接成功\n');

    console.log('📊 检查当前数据库状态:');
    const beforeCount = await database.query(
      "SELECT COUNT(*) as count FROM deals WHERE source_site = 'preisjaeger'"
    );
    console.log(`  - Preisjaeger 记录数: ${beforeCount[0].count}`);

    const totalCount = await database.query('SELECT COUNT(*) as count FROM deals');
    console.log(`  - 总记录数: ${totalCount[0].count}\n`);

    console.log('🚀 初始化 Preisjaeger Fetcher...');
    const fetcher = new PreisjaegerFetcher(database);
    console.log('✅ Fetcher 初始化完成\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔄 开始抓取 Preisjaeger 数据');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const startTime = Date.now();
    const result = await fetcher.fetchLatest();
    const duration = Date.now() - startTime;

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 抓取结果统计');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`✅ 抓取完成`);
    console.log(`  - 获取记录: ${result.fetched}`);
    console.log(`  - 新增记录: ${result.inserted}`);
    console.log(`  - 更新记录: ${result.updated}`);
    console.log(`  - 重复记录: ${result.duplicates}`);
    console.log(`  - 错误数量: ${result.errors.length}`);
    console.log(`  - 总耗时: ${(duration / 1000).toFixed(1)}秒\n`);

    if (result.errors.length > 0) {
      console.log('⚠️ 错误详情:');
      result.errors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
      console.log('');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 验证数据库数据');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const afterCount = await database.query(
      "SELECT COUNT(*) as count FROM deals WHERE source_site = 'preisjaeger'"
    );
    console.log(`  - Preisjaeger 记录数: ${afterCount[0].count}`);
    console.log(`  - 新增: ${Number(afterCount[0].count) - Number(beforeCount[0].count)}\n`);

    const samples = await database.query(`
      SELECT 
        source_post_id,
        title_de,
        merchant,
        canonical_merchant_id,
        price,
        discount,
        image_url,
        published_at
      FROM deals 
      WHERE source_site = 'preisjaeger' 
      ORDER BY published_at DESC 
      LIMIT 3
    `);

    if (samples.length > 0) {
      console.log('📄 抽样检查（最新3条记录）:\n');
      samples.forEach((deal, i) => {
        console.log(`  [${i + 1}] ID: ${deal.source_post_id}`);
        console.log(`      标题: ${deal.title_de?.substring(0, 50)}...`);
        console.log(`      商家: ${deal.merchant} (${deal.canonical_merchant_id || 'N/A'})`);
        console.log(`      价格: €${deal.price}`);
        console.log(`      折扣: ${deal.discount || 0}%`);
        console.log(`      图片: ${deal.image_url ? '✓' : '✗'}`);
        console.log(`      发布: ${deal.published_at}\n`);
      });
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ 集成测试完成');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('\n❌ 集成测试失败:', error);
    process.exit(1);
  } finally {
    await database.close();
  }
}

if (require.main === module) {
  main();
}
