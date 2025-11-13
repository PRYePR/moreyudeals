/**
 * 从 raw_payload 恢复原始分类
 *
 * 如果 raw_payload 中保存了原始分类数据，可以用这个脚本恢复
 */

import { Pool } from 'pg';

async function restoreCategories() {
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
    console.log('🔍 检查 raw_payload 中是否有原始分类数据...\n');

    // 查询有 raw_payload 的记录
    const checkQuery = `
      SELECT
        id,
        categories,
        raw_payload->'categoriesRaw' as original_categories
      FROM deals
      WHERE raw_payload->'categoriesRaw' IS NOT NULL
      LIMIT 5
    `;

    const checkResult = await pool.query(checkQuery);

    if (checkResult.rows.length === 0) {
      console.log('❌ raw_payload 中没有找到原始分类数据');
      console.log('无法自动恢复，需要重新抓取数据');
      return;
    }

    console.log('✅ 找到原始分类数据示例:');
    checkResult.rows.forEach(row => {
      console.log(`\n记录 ${row.id}:`);
      console.log(`  当前分类: ${JSON.stringify(row.categories)}`);
      console.log(`  原始分类: ${JSON.stringify(row.original_categories)}`);
    });

    console.log('\n是否继续恢复所有数据? (这个脚本只是检查，不会执行恢复)');
    console.log('如果需要恢复，请修改脚本启用恢复逻辑');

    // 统计可恢复的记录数
    const countQuery = `
      SELECT COUNT(*) as count
      FROM deals
      WHERE raw_payload->'categoriesRaw' IS NOT NULL
    `;
    const countResult = await pool.query(countQuery);
    console.log(`\n📊 可恢复的记录数: ${countResult.rows[0].count}`);

  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

restoreCategories();
