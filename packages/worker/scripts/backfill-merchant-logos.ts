/**
 * 回填脚本: 为现有的Preisjaeger数据添加商家Logo
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

async function main() {
  console.log('🔄 开始回填Preisjaeger商品的Logo...\n');

  try {
    // 获取所有Preisjaeger商品（强制更新所有Logo，包括旧的错误Logo）
    const result = await pool.query(`
      SELECT id, merchant, canonical_merchant_name, merchant_logo
      FROM deals
      WHERE source_site = 'preisjaeger'
    `);

    console.log(`📊 找到 ${result.rows.length} 个需要更新Logo的商品\n`);

    let updated = 0;
    let skipped = 0;
    let unchanged = 0;

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
        unchanged++;
        continue;
      }

      if (newMerchantLogo) {
        await pool.query(
          'UPDATE deals SET merchant_logo = $1 WHERE id = $2',
          [newMerchantLogo, row.id]
        );
        updated++;
        const oldLogo = row.merchant_logo ? ` (旧: ${row.merchant_logo.substring(0, 60)}...)` : '';
        console.log(`✅ 更新: ${row.canonical_merchant_name || row.merchant}${oldLogo}`);
      } else {
        skipped++;
        console.log(`⏭️  跳过: ${row.canonical_merchant_name || row.merchant} (未配置website)`);
      }
    }

    console.log(`\n📊 更新完成:`);
    console.log(`   ✅ 成功更新: ${updated} 个`);
    console.log(`   ⏭️  跳过: ${skipped} 个 (未配置website)`);
    console.log(`   ➡️  未改变: ${unchanged} 个 (Logo已是最新)`);

    // 显示更新后的统计
    const stats = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE merchant_logo IS NOT NULL) as with_logo,
        COUNT(*) FILTER (WHERE merchant_logo IS NULL) as without_logo,
        COUNT(*) as total
      FROM deals
      WHERE source_site = 'preisjaeger'
    `);

    console.log(`\n📊 Preisjaeger商品Logo统计:`);
    console.log(`   有Logo: ${stats.rows[0].with_logo}`);
    console.log(`   无Logo: ${stats.rows[0].without_logo}`);
    console.log(`   总数: ${stats.rows[0].total}`);

  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
