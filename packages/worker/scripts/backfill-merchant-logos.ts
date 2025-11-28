/**
 * 回填脚本: 统一所有商家Logo为Google Favicon
 *
 * 功能:
 * - 处理 Sparhamster 和 Preisjaeger 两个数据源
 * - 强制将所有商家 Logo 替换成 Google Favicon (sz=128)
 * - 基于 merchant-mapping.ts 配置生成 Logo
 *
 * 使用方法:
 * cd packages/worker
 * DB_NAME=moreyudeals_dev DB_USER=prye npx ts-node scripts/backfill-merchant-logos.ts
 */

import { Pool } from 'pg';
import { normalizeMerchant } from '../src/utils/merchant-normalizer';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'moreyudeals_dev',
  user: process.env.DB_USER || 'prye',
  password: process.env.DB_PASSWORD || '',
});

interface UpdateStats {
  updated: number;
  skipped: number;
  unchanged: number;
  skippedMerchants: Set<string>;
}

async function processSourceSite(sourceSite: string): Promise<UpdateStats> {
  console.log(`\n🔄 处理 ${sourceSite} 商品...\n`);

  const result = await pool.query(`
    SELECT id, merchant, canonical_merchant_name, merchant_logo, source_site
    FROM deals
    WHERE source_site = $1
  `, [sourceSite]);

  console.log(`📊 找到 ${result.rows.length} 个商品\n`);

  const stats: UpdateStats = {
    updated: 0,
    skipped: 0,
    unchanged: 0,
    skippedMerchants: new Set<string>(),
  };

  for (const row of result.rows) {
    const normalizedMerchant = normalizeMerchant(row.merchant);
    let newMerchantLogo: string | undefined;

    // 优先使用merchant-mapping中配置的logo
    if (normalizedMerchant.mapping?.logo) {
      newMerchantLogo = normalizedMerchant.mapping.logo;
    }
    // 如果有website,使用Google Favicon服务
    else if (normalizedMerchant.mapping?.website) {
      try {
        const domain = new URL(normalizedMerchant.mapping.website).hostname;
        newMerchantLogo = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
      } catch (error) {
        newMerchantLogo = undefined;
      }
    }

    // 如果新Logo和旧Logo一样，跳过更新
    if (newMerchantLogo && newMerchantLogo === row.merchant_logo) {
      stats.unchanged++;
      continue;
    }

    if (newMerchantLogo) {
      await pool.query(
        'UPDATE deals SET merchant_logo = $1 WHERE id = $2',
        [newMerchantLogo, row.id]
      );
      stats.updated++;
      const oldLogo = row.merchant_logo ? ` (旧: ${row.merchant_logo.substring(0, 50)}...)` : '';
      console.log(`✅ ${row.canonical_merchant_name || row.merchant}${oldLogo}`);
    } else {
      stats.skipped++;
      stats.skippedMerchants.add(row.canonical_merchant_name || row.merchant);
    }
  }

  return stats;
}

async function main() {
  console.log('🔄 开始统一所有商家Logo为Google Favicon (sz=128)...\n');
  console.log('=' .repeat(60));

  try {
    // 处理 Sparhamster
    const sparhamsterStats = await processSourceSite('sparhamster');

    // 处理 Preisjaeger
    const preisjaegerStats = await processSourceSite('preisjaeger');

    // 汇总统计
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 总体更新统计:\n');

    console.log('Sparhamster:');
    console.log(`   ✅ 成功更新: ${sparhamsterStats.updated} 个`);
    console.log(`   ⏭️  跳过: ${sparhamsterStats.skipped} 个 (未配置website)`);
    console.log(`   ➡️  未改变: ${sparhamsterStats.unchanged} 个 (Logo已是最新)`);

    console.log('\nPreisjaeger:');
    console.log(`   ✅ 成功更新: ${preisjaegerStats.updated} 个`);
    console.log(`   ⏭️  跳过: ${preisjaegerStats.skipped} 个 (未配置website)`);
    console.log(`   ➡️  未改变: ${preisjaegerStats.unchanged} 个 (Logo已是最新)`);

    const totalUpdated = sparhamsterStats.updated + preisjaegerStats.updated;
    const totalSkipped = sparhamsterStats.skipped + preisjaegerStats.skipped;
    const totalUnchanged = sparhamsterStats.unchanged + preisjaegerStats.unchanged;

    console.log('\n总计:');
    console.log(`   ✅ 成功更新: ${totalUpdated} 个`);
    console.log(`   ⏭️  跳过: ${totalSkipped} 个`);
    console.log(`   ➡️  未改变: ${totalUnchanged} 个`);

    // 显示需要补充配置的商家
    const allSkippedMerchants = new Set([
      ...sparhamsterStats.skippedMerchants,
      ...preisjaegerStats.skippedMerchants,
    ]);

    if (allSkippedMerchants.size > 0) {
      console.log('\n⚠️  需要在 merchant-mapping.ts 中补充以下商家配置:');
      Array.from(allSkippedMerchants).sort().forEach(merchant => {
        console.log(`   - ${merchant}`);
      });
    }

    // 显示最终统计
    const finalStats = await pool.query(`
      SELECT
        source_site,
        COUNT(*) FILTER (WHERE merchant_logo IS NOT NULL AND merchant_logo != '') as with_logo,
        COUNT(*) FILTER (WHERE merchant_logo IS NULL OR merchant_logo = '') as without_logo,
        COUNT(*) as total
      FROM deals
      WHERE source_site IN ('sparhamster', 'preisjaeger')
      GROUP BY source_site
      ORDER BY source_site
    `);

    console.log('\n📊 最终Logo覆盖统计:\n');
    finalStats.rows.forEach(row => {
      const coverage = ((row.with_logo / row.total) * 100).toFixed(1);
      console.log(`${row.source_site}:`);
      console.log(`   有Logo: ${row.with_logo} (${coverage}%)`);
      console.log(`   无Logo: ${row.without_logo}`);
      console.log(`   总数: ${row.total}\n`);
    });

  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
