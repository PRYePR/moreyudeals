/**
 * 分析损失情况，看是否还有其他恢复途径
 */

import { Pool } from 'pg';

async function analyzeDamage() {
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
    console.log('🔍 分析数据损失情况...\n');

    // 1. 统计各来源的数据
    const sourceQuery = `
      SELECT
        source_site,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE raw_payload->'categoriesRaw' IS NOT NULL) as has_backup,
        COUNT(*) FILTER (WHERE categories::text LIKE '%other%') as has_other
      FROM deals
      GROUP BY source_site
    `;

    const sources = await pool.query(sourceQuery);

    console.log('📊 按来源统计:');
    console.log('─'.repeat(80));
    console.log('来源'.padEnd(20) + '总数'.padEnd(10) + '有备份'.padEnd(10) + '被改成other');
    console.log('─'.repeat(80));
    sources.rows.forEach(row => {
      console.log(
        row.source_site.padEnd(20) +
        row.total.toString().padEnd(10) +
        row.has_backup.toString().padEnd(10) +
        row.has_other.toString()
      );
    });

    // 2. 检查是否有其他字段保存了原始信息
    const fieldsQuery = `
      SELECT
        id,
        source_site,
        title_de,
        categories,
        raw_payload->'source'->>'categories' as api_categories,
        raw_payload->'categoriesRaw' as backup_categories
      FROM deals
      LIMIT 5
    `;

    const fields = await pool.query(fieldsQuery);

    console.log('\n\n🔍 检查是否有其他字段保存了原始分类:');
    console.log('─'.repeat(80));
    fields.rows.forEach((row, i) => {
      console.log(`\n记录 ${i + 1} [${row.source_site}]: ${row.title_de?.substring(0, 40)}...`);
      console.log(`  当前分类: ${JSON.stringify(row.categories)}`);
      console.log(`  API分类: ${row.api_categories || '无'}`);
      console.log(`  备份分类: ${JSON.stringify(row.backup_categories) || '无'}`);
    });

    // 3. 检查是否可以从source_site重新抓取
    const canRefetchQuery = `
      SELECT
        source_site,
        MIN(created_at) as first_date,
        MAX(created_at) as last_date,
        COUNT(*) as total
      FROM deals
      GROUP BY source_site
    `;

    const refetch = await pool.query(canRefetchQuery);

    console.log('\n\n📅 数据时间范围（是否可以重新抓取）:');
    console.log('─'.repeat(80));
    refetch.rows.forEach(row => {
      console.log(`${row.source_site}:`);
      console.log(`  最早: ${row.first_date}`);
      console.log(`  最新: ${row.last_date}`);
      console.log(`  总数: ${row.total}`);
      console.log('');
    });

    // 4. 统计被错误修改的记录
    const damagedQuery = `
      SELECT COUNT(*) as damaged
      FROM deals
      WHERE categories::text LIKE '%other%'
        AND raw_payload->'categoriesRaw' IS NULL
    `;

    const damaged = await pool.query(damagedQuery);

    console.log('\n\n💔 损失评估:');
    console.log('─'.repeat(80));
    console.log(`无法恢复的记录数: ${damaged.rows[0].damaged}`);
    console.log(`这些记录的原始分类信息已永久丢失`);

  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

analyzeDamage();
