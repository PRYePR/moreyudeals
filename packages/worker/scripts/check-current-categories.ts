/**
 * 检查当前数据库中的分类分布
 */

import { Pool } from 'pg';

async function checkCategories() {
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
    console.log('📊 检查当前数据库中的分类分布...\n');

    // 查询所有不同的分类值
    const query = `
      SELECT
        category,
        COUNT(*) as count
      FROM deals,
           jsonb_array_elements_text(categories) as category
      WHERE categories IS NOT NULL
      GROUP BY category
      ORDER BY count DESC
    `;

    const result = await pool.query(query);

    console.log('当前分类分布:');
    console.log('─'.repeat(60));
    result.rows.forEach(row => {
      console.log(`${row.category.padEnd(30)} ${row.count}`);
    });

    console.log('\n总分类数:', result.rows.length);

    // 检查有多少错误的分类
    const correctCategories = [
      'electronics', 'appliances', 'fashion', 'beauty', 'food',
      'sports', 'family-kids', 'home', 'auto', 'entertainment', 'other'
    ];

    const wrongCategories = result.rows.filter(
      row => !correctCategories.includes(row.category)
    );

    if (wrongCategories.length > 0) {
      console.log('\n❌ 发现错误的分类ID (需要迁移):');
      wrongCategories.forEach(row => {
        console.log(`   ${row.category.padEnd(30)} ${row.count} 条记录`);
      });
    } else {
      console.log('\n✅ 所有分类ID都正确!');
    }

  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

checkCategories();
