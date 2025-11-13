/**
 * 分类迁移脚本
 *
 * 功能：
 * 1. 读取数据库中所有 deals 的旧分类
 * 2. 使用新的分类映射系统规范化分类
 * 3. 更新数据库为新的标准分类ID
 *
 * 使用方法：
 * npx ts-node src/scripts/migrate-categories.ts
 */

import { Pool } from 'pg';
import { normalizeCategory } from '../utils/category-normalizer';
import dotenv from 'dotenv';
import path from 'path';

// 加载环境变量
dotenv.config({ path: path.resolve(__dirname, '../../.env.local'), override: true });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

interface Deal {
  id: string;
  source_site: string;
  categories: string[];
  title_de?: string;
}

/**
 * 迁移统计
 */
interface MigrationStats {
  totalDeals: number;
  updatedDeals: number;
  skippedDeals: number;
  errors: number;
  oldCategoriesCount: Map<string, number>; // 旧分类 -> 出现次数
  newCategoriesCount: Map<string, number>; // 新分类 -> 出现次数
  unmappedCategories: Set<string>; // 未映射的分类
}

/**
 * 迁移单个 Deal 的分类
 */
function migrateDealCategories(deal: Deal): {
  newCategories: string[];
  changed: boolean;
  unmapped: string[];
} {
  const oldCategories = deal.categories || [];
  const normalizedResults = oldCategories.map(cat =>
    normalizeCategory(cat, deal.source_site)
  );

  // 只保留已映射的分类
  const mappedCategories = normalizedResults.filter(c => c.isMatched);

  // 记录未映射的分类
  const unmapped = normalizedResults
    .filter(c => !c.isMatched)
    .map(c => c.originalName);

  // 如果没有任何已映射的分类，使用"其他"作为兜底
  const newCategories = mappedCategories.length > 0
    ? mappedCategories.map(c => c.canonicalId)
    : ['other'];

  // 去重
  const uniqueNewCategories = Array.from(new Set(newCategories));

  // 检查是否有变化
  const changed = JSON.stringify(oldCategories.sort()) !== JSON.stringify(uniqueNewCategories.sort());

  return {
    newCategories: uniqueNewCategories,
    changed,
    unmapped
  };
}

/**
 * 主迁移函数
 */
async function migrateCategories() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'moreyudeals_dev',
    user: process.env.DB_USER || 'prye',
    password: process.env.DB_PASSWORD || '',
  });

  console.log('🚀 开始分类迁移...\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const stats: MigrationStats = {
    totalDeals: 0,
    updatedDeals: 0,
    skippedDeals: 0,
    errors: 0,
    oldCategoriesCount: new Map(),
    newCategoriesCount: new Map(),
    unmappedCategories: new Set(),
  };

  try {
    // 1. 获取所有 deals
    console.log('📊 Step 1: 读取数据库中的所有优惠...');
    const { rows: deals } = await pool.query<Deal>(`
      SELECT id, source_site, categories, title_de
      FROM deals
      ORDER BY id
    `);

    stats.totalDeals = deals.length;
    console.log(`   ✓ 共找到 ${deals.length} 条优惠记录\n`);

    // 2. 统计旧分类
    console.log('📊 Step 2: 统计旧分类分布...');
    for (const deal of deals) {
      for (const category of deal.categories || []) {
        stats.oldCategoriesCount.set(
          category,
          (stats.oldCategoriesCount.get(category) || 0) + 1
        );
      }
    }
    console.log(`   ✓ 共有 ${stats.oldCategoriesCount.size} 个不同的旧分类\n`);

    // 显示旧分类 Top 10
    const topOldCategories = Array.from(stats.oldCategoriesCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    console.log('   📋 旧分类 Top 10:');
    topOldCategories.forEach(([cat, count], index) => {
      console.log(`      ${index + 1}. ${cat.padEnd(30)} (${count} 条)`);
    });
    console.log('');

    // 3. 迁移每条记录
    console.log('🔄 Step 3: 开始迁移分类...\n');

    for (let i = 0; i < deals.length; i++) {
      const deal = deals[i];

      try {
        const result = migrateDealCategories(deal);

        // 记录未映射的分类
        result.unmapped.forEach(cat => stats.unmappedCategories.add(cat));

        if (result.changed) {
          // 更新数据库
          await pool.query(
            `UPDATE deals SET categories = $1, updated_at = NOW() WHERE id = $2`,
            [JSON.stringify(result.newCategories), deal.id]
          );

          stats.updatedDeals++;

          // 统计新分类
          for (const category of result.newCategories) {
            stats.newCategoriesCount.set(
              category,
              (stats.newCategoriesCount.get(category) || 0) + 1
            );
          }

          // 每10条显示一次进度
          if (stats.updatedDeals % 10 === 0) {
            const progress = ((i + 1) / deals.length * 100).toFixed(1);
            console.log(`   ⏳ 进度: ${progress}% (已更新 ${stats.updatedDeals} 条)`);
          }
        } else {
          stats.skippedDeals++;
        }
      } catch (error) {
        stats.errors++;
        console.error(`   ❌ 迁移失败 (ID: ${deal.id}):`, (error as Error).message);
      }
    }

    console.log(`\n   ✓ 迁移完成！\n`);

    // 4. 显示迁移结果
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📊 迁移统计:\n');
    console.log(`   总记录数:     ${stats.totalDeals}`);
    console.log(`   已更新:       ${stats.updatedDeals}`);
    console.log(`   跳过(未变):   ${stats.skippedDeals}`);
    console.log(`   错误:         ${stats.errors}\n`);

    // 显示新分类分布
    console.log('📋 新分类分布:\n');
    const sortedNewCategories = Array.from(stats.newCategoriesCount.entries())
      .sort((a, b) => b[1] - a[1]);

    sortedNewCategories.forEach(([cat, count], index) => {
      const percentage = (count / stats.totalDeals * 100).toFixed(1);
      console.log(`   ${index + 1}. ${cat.padEnd(20)} ${count.toString().padStart(4)} 条 (${percentage}%)`);
    });
    console.log('');

    // 显示未映射的分类
    if (stats.unmappedCategories.size > 0) {
      console.log('⚠️  未映射的分类:\n');
      Array.from(stats.unmappedCategories).forEach((cat, index) => {
        console.log(`   ${index + 1}. ${cat}`);
      });
      console.log('\n   💡 提示: 这些分类已被归入 "other" 类别\n');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('✅ 分类迁移完成！\n');

  } catch (error) {
    console.error('❌ 迁移失败:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// 执行迁移
if (require.main === module) {
  migrateCategories()
    .then(() => {
      console.log('🎉 迁移脚本执行成功！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 迁移脚本执行失败:', error);
      process.exit(1);
    });
}

export { migrateCategories };
