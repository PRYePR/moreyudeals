/**
 * 回填 Sparhamster 商家 Logo
 *
 * 目的：基于商家名称和 merchant-mapping 配置重新生成所有 sparhamster 记录的 logo
 */

import { Pool } from 'pg';
import { MERCHANT_MAPPINGS } from '../src/config/merchant-mapping';
import * as dotenv from 'dotenv';
import * as path from 'path';

// 加载环境变量
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// 创建数据库连接池
const poolConfig: any = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'moreyudeals_dev',
  user: process.env.DB_USER || 'prye',
};

// 只有当密码存在且不为空时才添加
if (process.env.DB_PASSWORD && process.env.DB_PASSWORD.trim() !== '') {
  poolConfig.password = process.env.DB_PASSWORD;
}

console.log(`📊 数据库配置: ${poolConfig.user}@${poolConfig.host}:${poolConfig.port}/${poolConfig.database}`);

const pool = new Pool(poolConfig);

/**
 * 基于商家名称生成 Logo
 */
function generateMerchantLogo(merchantName: string | null): string | null {
  if (!merchantName) {
    return null;
  }

  // 查找商家配置（不区分大小写）
  const normalizedName = merchantName.toLowerCase().trim();
  const mapping = MERCHANT_MAPPINGS.find(m =>
    m.aliases.some(alias => alias.toLowerCase() === normalizedName)
  );

  if (mapping && mapping.website) {
    try {
      const url = new URL(mapping.website);
      const domain = url.hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
    } catch (error) {
      console.warn(`⚠️ 无法解析商家网站: ${mapping.website}`, error);
      return null;
    }
  }

  return null;
}

async function main() {
  try {
    console.log('🚀 开始回填 Sparhamster 商家 Logo...\n');

    // 1. 获取所有 sparhamster 记录
    const result = await pool.query(`
      SELECT id, merchant, merchant_logo
      FROM deals
      WHERE source_site = 'sparhamster'
      ORDER BY created_at DESC
    `);

    const deals = result.rows;
    console.log(`📊 找到 ${deals.length} 条 sparhamster 记录\n`);

    let updated = 0;
    let skipped = 0;
    let noMerchant = 0;
    let noMapping = 0;

    // 2. 遍历每条记录
    for (const deal of deals) {
      const { id, merchant, merchant_logo: oldLogo } = deal;

      // 跳过没有商家的记录
      if (!merchant) {
        noMerchant++;
        continue;
      }

      // 生成新的 logo
      const newLogo = generateMerchantLogo(merchant);

      // 如果没有找到映射
      if (!newLogo) {
        noMapping++;
        console.log(`⚠️ 商家 "${merchant}" 未在 merchant-mapping 中配置`);
        continue;
      }

      // 如果 logo 已经正确，跳过
      if (oldLogo === newLogo) {
        skipped++;
        continue;
      }

      // 更新数据库
      await pool.query(
        `UPDATE deals SET merchant_logo = $1, updated_at = NOW() WHERE id = $2`,
        [newLogo, id]
      );

      updated++;
      console.log(`✅ 更新: ${merchant} -> ${newLogo.substring(0, 60)}...`);
    }

    console.log('\n📊 回填完成统计:');
    console.log(`  - 总记录数: ${deals.length}`);
    console.log(`  - 成功更新: ${updated}`);
    console.log(`  - 已是最新: ${skipped}`);
    console.log(`  - 无商家名: ${noMerchant}`);
    console.log(`  - 无映射配置: ${noMapping}`);

  } catch (error) {
    console.error('❌ 回填失败:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

main();
