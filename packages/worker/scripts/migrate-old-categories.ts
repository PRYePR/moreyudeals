/**
 * 分类数据迁移脚本
 *
 * 将旧的14分类系统迁移到新的11分类系统
 *
 * 使用方法（生产环境）:
 * DATABASE_URL="your_production_db_url" npx ts-node scripts/migrate-old-categories.ts
 */

import { Pool } from 'pg';

// 旧分类 -> 新分类的映射关系（11个标准分类）
const CATEGORY_MIGRATION_MAP: Record<string, string> = {
  // 新分类ID（保持不变）
  'electronics': 'electronics',           // 数码电子
  'appliances': 'appliances',             // 家用电器
  'fashion': 'fashion',                   // 时尚服饰
  'beauty': 'beauty',                     // 美妆个护
  'food': 'food',                         // 食品饮料
  'sports': 'sports',                     // 运动户外
  'family-kids': 'family-kids',           // 母婴玩具
  'home': 'home',                         // 家居生活
  'auto': 'auto',                         // 汽车用品
  'entertainment': 'entertainment',       // 休闲娱乐
  'other': 'other',                       // 其他

  // 旧分类ID -> 新分类ID的映射
  'home-appliances': 'appliances',        // 旧: 家用电器 -> 新: appliances
  'fashion-accessories': 'fashion',       // 旧: 时尚服饰 -> 新: fashion
  'beauty-health': 'beauty',              // 旧: 美妆个护 -> 新: beauty
  'food-beverages': 'food',               // 旧: 食品饮料 -> 新: food
  'sports-outdoors': 'sports',            // 旧: 运动户外 -> 新: sports
  'toys-games': 'family-kids',            // 旧: 玩具游戏 -> 新: family-kids
  'books-media': 'entertainment',         // 旧: 图书影音 -> 新: entertainment
  'home-garden': 'home',                  // 旧: 家居园艺 -> 新: home
  'home-living': 'home',                  // 旧: 家居生活 -> 新: home
  'automotive': 'auto',                   // 旧: 汽车用品 -> 新: auto
  'pets': 'other',                        // 旧: 宠物用品 -> 新: other
  'pet': 'other',                         // 旧: 宠物用品 -> 新: other
  'mother-baby': 'family-kids',           // 旧: 母婴用品 -> 新: family-kids
  'baby': 'family-kids',                  // 旧: 母婴用品 -> 新: family-kids
  'office': 'home',                       // 旧: 办公用品 -> 新: home
  'travel-services': 'other',             // 旧: 旅游服务 -> 新: other
  'services': 'other',                    // 旧: 服务类 -> 新: other

  // 其他可能的旧分类
  'health': 'beauty',                     // 健康 -> beauty
  'gaming': 'entertainment',              // 游戏 -> entertainment
  'toys': 'family-kids',                  // 玩具 -> family-kids
  'books': 'entertainment',               // 图书 -> entertainment
  'travel': 'other',                      // 旅游 -> other
};

async function migrateCategories() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('❌ 错误: 未设置 DATABASE_URL 环境变量');
    console.log('\n使用方法:');
    console.log('DATABASE_URL="postgresql://user:pass@host:5432/dbname" npx ts-node scripts/migrate-old-categories.ts');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl: connectionString.includes('sslmode=require') ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔄 开始迁移分类数据...\n');

    // 1. 查询所有需要迁移的记录
    const query = `
      SELECT id, categories
      FROM deals
      WHERE categories IS NOT NULL
    `;

    const result = await pool.query(query);
    console.log(`📊 找到 ${result.rows.length} 条记录\n`);

    let migratedCount = 0;
    let unchangedCount = 0;
    let errorCount = 0;

    // 2. 遍历每条记录，更新分类
    for (const row of result.rows) {
      try {
        const oldCategories = row.categories; // JSONB array

        if (!Array.isArray(oldCategories) || oldCategories.length === 0) {
          unchangedCount++;
          continue;
        }

        // 映射到新分类
        const newCategories = oldCategories.map(oldCat => {
          return CATEGORY_MIGRATION_MAP[oldCat] || oldCat; // 如果没有映射，保持原样
        });

        // 去重
        const uniqueNewCategories = [...new Set(newCategories)];

        // 如果分类没有变化，跳过
        if (JSON.stringify(oldCategories.sort()) === JSON.stringify(uniqueNewCategories.sort())) {
          unchangedCount++;
          continue;
        }

        // 更新数据库
        await pool.query(
          'UPDATE deals SET categories = $1 WHERE id = $2',
          [JSON.stringify(uniqueNewCategories), row.id]
        );

        migratedCount++;

        if (migratedCount <= 10) {
          console.log(`✅ 迁移: ${JSON.stringify(oldCategories)} -> ${JSON.stringify(uniqueNewCategories)}`);
        }

      } catch (error) {
        errorCount++;
        console.error(`❌ 错误 (ID: ${row.id}):`, error);
      }
    }

    console.log('\n📊 迁移统计:');
    console.log(`   ✅ 已迁移: ${migratedCount}`);
    console.log(`   ⏭️  未改变: ${unchangedCount}`);
    console.log(`   ❌ 错误: ${errorCount}`);
    console.log(`   📝 总计: ${result.rows.length}`);

    // 3. 显示迁移后的分类分布
    const statsQuery = `
      SELECT
        category,
        COUNT(*) as count
      FROM deals,
           jsonb_array_elements_text(categories) as category
      WHERE categories IS NOT NULL
      GROUP BY category
      ORDER BY count DESC
    `;

    const stats = await pool.query(statsQuery);

    console.log('\n📊 迁移后的分类分布:');
    stats.rows.forEach(row => {
      console.log(`   ${row.category.padEnd(30)} ${row.count}`);
    });

    console.log('\n✅ 迁移完成!');

  } catch (error) {
    console.error('❌ 迁移失败:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrateCategories();
