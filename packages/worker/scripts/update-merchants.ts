/**
 * 商家规范化数据库更新脚本 (Node.js版本)
 *
 * 使用方法:
 * cd packages/worker
 * npx ts-node scripts/update-merchants.ts
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

// 从环境变量或.env文件读取数据库配置
// 这样可以复用worker的数据库连接配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'moreyudeals',
  user: process.env.DB_USER || 'moreyudeals',
  password: process.env.DB_PASSWORD || '',
};

// 如果有DATABASE_URL环境变量,优先使用它
const connectionString = process.env.DATABASE_URL;

console.log('📊 商家规范化数据库更新脚本');
console.log('================================\n');

async function main() {
  // 创建数据库连接
  const pool = new Pool(
    connectionString
      ? { connectionString, ssl: { rejectUnauthorized: false } }
      : dbConfig
  );

  try {
    console.log('🔌 连接数据库...');
    console.log(`   Host: ${dbConfig.host}`);
    console.log(`   Database: ${dbConfig.database}`);
    console.log(`   User: ${dbConfig.user}\n`);

    // 测试连接
    await pool.query('SELECT 1');
    console.log('✅ 数据库连接成功!\n');

    // 读取SQL脚本
    const sqlPath = path.join(__dirname, 'update-canonical-merchants.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    console.log('📝 执行SQL脚本...\n');
    console.log('⏳ 更新中,请稍候...\n');

    // 执行SQL脚本
    const result = await pool.query(sql);

    console.log('✅ SQL脚本执行成功!\n');

    // 获取统计信息
    console.log('📊 获取更新统计...\n');

    // 总体统计
    const statsQuery = `
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE canonical_merchant_name IS NOT NULL) as with_canonical,
        COUNT(*) FILTER (WHERE canonical_merchant_name IS NULL) as without_canonical
      FROM deals
    `;
    const stats = await pool.query(statsQuery);
    const { total, with_canonical, without_canonical } = stats.rows[0];

    console.log('=== 更新统计 ===');
    console.log(`总记录数: ${total}`);
    console.log(`已规范化: ${with_canonical}`);
    console.log(`未规范化: ${without_canonical}\n`);

    // 商家分布统计
    const merchantQuery = `
      SELECT
        canonical_merchant_name as merchant,
        COUNT(*) as count,
        MAX(created_at)::date as last_date
      FROM deals
      WHERE canonical_merchant_name IS NOT NULL
      GROUP BY canonical_merchant_name
      ORDER BY count DESC
      LIMIT 30
    `;
    const merchants = await pool.query(merchantQuery);

    console.log('=== 商家分布 (Top 30) ===');
    console.log('商家名称'.padEnd(30) + '数量'.padEnd(10) + '最新日期');
    console.log('-'.repeat(60));
    merchants.rows.forEach(row => {
      console.log(
        row.merchant.padEnd(30) +
        row.count.toString().padEnd(10) +
        row.last_date
      );
    });

    console.log('\n✨ 更新完成!');

  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
