/**
 * 检查迁移结果：对比迁移前后的分类
 */

import { Pool } from 'pg';

async function checkMigration() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('❌ 错误: 未设置 DATABASE_URL 环境变量');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl: connectionString.includes('sslmode=require') ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('📊 检查迁移结果...\n');

    // 查询当前分类分布
    const currentQuery = `
      SELECT
        category,
        COUNT(*) as count
      FROM deals,
           jsonb_array_elements_text(categories) as category
      GROUP BY category
      ORDER BY count DESC
    `;

    const current = await pool.query(currentQuery);

    console.log('当前分类分布:');
    console.log('─'.repeat(60));
    current.rows.forEach(row => {
      console.log(`${row.category.padEnd(30)} ${row.count}`);
    });

    // 检查有多少数据有原始分类信息
    const rawQuery = `
      SELECT
        raw_payload->'categoriesRaw' as original,
        categories as current,
        COUNT(*) as count
      FROM deals
      WHERE raw_payload->'categoriesRaw' IS NOT NULL
      GROUP BY raw_payload->'categoriesRaw', categories
      ORDER BY count DESC
      LIMIT 20
    `;

    const raw = await pool.query(rawQuery);

    console.log('\n\n对比原始分类 vs 当前分类:');
    console.log('─'.repeat(60));
    raw.rows.forEach(row => {
      console.log(`${JSON.stringify(row.original).padEnd(40)} → ${JSON.stringify(row.current).padEnd(30)} (${row.count}条)`);
    });

  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

checkMigration();
