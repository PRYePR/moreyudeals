/**
 * 分类数据迁移脚本
 *
 * 将旧的14分类系统迁移到新的11分类系统
 *
 * 使用方法（生产环境）:
 * DATABASE_URL="your_production_db_url" npx ts-node scripts/migrate-old-categories.ts
 */

import { Pool } from 'pg';

// 旧分类 -> 新分类的映射关系
const CATEGORY_MIGRATION_MAP: Record<string, string> = {
  // 旧分类 -> 新分类
  'electronics': 'electronics',           // 数码电子 -> 数码电子
  'home-appliances': 'home-living',       // 家用电器 -> 家居生活
  'fashion': 'fashion-accessories',        // 时尚服饰 -> 时尚服饰
  'beauty': 'beauty-health',              // 美妆个护 -> 美容健康
  'food': 'food-beverages',               // 食品饮料 -> 食品饮料
  'sports': 'sports-outdoors',            // 运动户外 -> 运动户外
  'toys': 'toys-games',                   // 玩具游戏 -> 玩具游戏
  'books': 'books-media',                 // 图书影音 -> 图书影音
  'home-garden': 'home-living',           // 家居园艺 -> 家居生活
  'automotive': 'automotive',             // 汽车用品 -> 汽车用品
  'pet': 'pets',                          // 宠物用品 -> 宠物用品
  'baby': 'mother-baby',                  // 母婴用品 -> 母婴用品
  'office': 'home-living',                // 办公用品 -> 家居生活
  'services': 'travel-services',          // 服务类 -> 旅游服务

  // 其他可能的旧分类
  'health': 'beauty-health',              // 健康 -> 美容健康
  'gaming': 'toys-games',                 // 游戏 -> 玩具游戏
  'travel': 'travel-services',            // 旅游 -> 旅游服务
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
