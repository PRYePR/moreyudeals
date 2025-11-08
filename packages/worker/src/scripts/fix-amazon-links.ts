/**
 * 修复旧的 Amazon 数据
 * 为所有 Amazon deals 生成正确的 affiliate_link
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { DatabaseManager } from '../database';
import { AffiliateLinkService } from '../services/affiliate-link-service';
import { loadConfig } from '../config';

async function fixAmazonLinks() {
  const config = loadConfig();
  const db = new DatabaseManager(config.database);
  const affiliateService = new AffiliateLinkService();

  try {
    await db.connect();
    console.log('✅ 数据库连接成功');

    // 获取所有 Amazon deals（没有 affiliate_link 或 affiliate_link 是 forward 链接的）
    const deals = await db.query(`
      SELECT id, merchant, canonical_merchant_name, merchant_link, affiliate_link
      FROM deals
      WHERE (merchant LIKE '%Amazon%' OR canonical_merchant_name LIKE '%Amazon%')
        AND (
          affiliate_link IS NULL
          OR affiliate_link LIKE '%forward.sparhamster%'
          OR affiliate_link NOT LIKE '%tag=moreyu0a-21%'
        )
      ORDER BY created_at DESC
    `);
    console.log(`\n📊 找到 ${deals.length} 个需要修复的 Amazon deals\n`);

    if (deals.length === 0) {
      console.log('✅ 所有 Amazon deals 已经是最新的！');
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < deals.length; i++) {
      const deal = deals[i];
      console.log(`\n[${i + 1}/${deals.length}] 处理 Deal ${deal.id}`);
      console.log(`  商家: ${deal.merchant}`);
      console.log(`  merchant_link: ${deal.merchant_link?.substring(0, 80)}...`);

      if (!deal.merchant_link) {
        console.log(`  ⚠️  跳过：没有 merchant_link`);
        failCount++;
        continue;
      }

      try {
        // 使用 AffiliateLinkService 处理链接
        const result = await affiliateService.processAffiliateLink(
          deal.merchant,
          deal.canonical_merchant_name,
          deal.merchant_link
        );

        if (result.enabled && result.affiliateLink) {
          // 更新数据库
          await db.query(
            `UPDATE deals
             SET affiliate_link = $1,
                 affiliate_enabled = true,
                 affiliate_network = $2,
                 updated_at = NOW()
             WHERE id = $3`,
            [result.affiliateLink, result.network, deal.id]
          );

          console.log(`  ✅ 成功: ${result.affiliateLink}`);
          successCount++;
        } else {
          console.log(`  ⚠️  处理失败：无法生成联盟链接`);
          failCount++;
        }

        // 延迟，避免被限流
        if (i < deals.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.log(`  ❌ 错误: ${(error as Error).message}`);
        failCount++;
      }
    }

    console.log(`\n\n📊 处理完成:`);
    console.log(`  ✅ 成功: ${successCount}`);
    console.log(`  ❌ 失败: ${failCount}`);
    console.log(`  📊 总计: ${deals.length}`);

  } catch (error) {
    console.error('❌ 脚本执行失败:', error);
  } finally {
    await db.close();
  }
}

// 运行脚本
fixAmazonLinks().catch(console.error);
