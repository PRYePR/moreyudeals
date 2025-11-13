/**
 * 生产端数据库诊断脚本
 *
 * 检查生产端数据库中的最新数据
 *
 * 使用方法（在生产服务器上运行）:
 * DATABASE_URL="your_production_db_url" npx ts-node scripts/check-production-db.ts
 */

import { Pool } from 'pg';

async function checkProductionDB() {
  // 从环境变量读取数据库配置
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('❌ 错误: 未设置 DATABASE_URL 环境变量');
    console.log('\n使用方法:');
    console.log('DATABASE_URL="postgresql://user:pass@host:5432/dbname" npx ts-node scripts/check-production-db.ts');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl: connectionString.includes('sslmode=require') ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔌 连接生产数据库...\n');

    // 1. 检查总体统计
    const statsQuery = `
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE source_site = 'preisjaeger') as preisjaeger_count,
        COUNT(*) FILTER (WHERE source_site = 'sparhamster') as sparhamster_count,
        MAX(created_at) as latest_created,
        MAX(updated_at) as latest_updated
      FROM deals
    `;
    const stats = await pool.query(statsQuery);
    const row = stats.rows[0];

    console.log('📊 数据库统计:');
    console.log(`   总记录数: ${row.total}`);
    console.log(`   Preisjaeger: ${row.preisjaeger_count}`);
    console.log(`   Sparhamster: ${row.sparhamster_count}`);
    console.log(`   最新创建时间: ${row.latest_created}`);
    console.log(`   最新更新时间: ${row.latest_updated}\n`);

    // 2. 检查最近的Preisjaeger记录
    const recentQuery = `
      SELECT
        id,
        title_de,
        title,
        source_site,
        created_at,
        translation_status,
        is_translated
      FROM deals
      WHERE source_site = 'preisjaeger'
      ORDER BY created_at DESC
      LIMIT 10
    `;
    const recent = await pool.query(recentQuery);

    console.log('📋 最近10条Preisjaeger记录:');
    console.log('─'.repeat(100));
    recent.rows.forEach((deal, i) => {
      console.log(`${i + 1}. [${deal.created_at.toISOString()}] ${deal.title_de || '(无德语标题)'}`);
      console.log(`   中文标题: ${deal.title || '(待翻译)'}`);
      console.log(`   翻译状态: ${deal.translation_status} | 已翻译: ${deal.is_translated}`);
      console.log('');
    });

    // 3. 检查待翻译的记录
    const pendingQuery = `
      SELECT COUNT(*) as pending_count
      FROM deals
      WHERE translation_status = 'pending'
    `;
    const pending = await pool.query(pendingQuery);
    console.log(`⏳ 待翻译记录: ${pending.rows[0].pending_count}\n`);

    // 4. 检查今天新增的记录
    const todayQuery = `
      SELECT
        COUNT(*) as today_count,
        MIN(created_at) as first_today,
        MAX(created_at) as last_today
      FROM deals
      WHERE created_at >= CURRENT_DATE
    `;
    const today = await pool.query(todayQuery);
    const todayRow = today.rows[0];

    console.log('📅 今天的数据:');
    console.log(`   新增记录: ${todayRow.today_count}`);
    console.log(`   首条时间: ${todayRow.first_today || '无'}`);
    console.log(`   末条时间: ${todayRow.last_today || '无'}\n`);

    console.log('✅ 检查完成!');

  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

checkProductionDB();
