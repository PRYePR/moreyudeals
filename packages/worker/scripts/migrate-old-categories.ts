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
  // === 新分类ID（保持不变）===
  'electronics': 'electronics',
  'appliances': 'appliances',
  'fashion': 'fashion',
  'beauty': 'beauty',
  'food': 'food',
  'sports': 'sports',
  'family-kids': 'family-kids',
  'home': 'home',
  'auto': 'auto',
  'entertainment': 'entertainment',
  'other': 'other',

  // === 旧英文ID -> 新ID ===
  'home-appliances': 'appliances',
  'fashion-accessories': 'fashion',
  'beauty-health': 'beauty',
  'food-beverages': 'food',
  'sports-outdoors': 'sports',
  'toys-games': 'family-kids',
  'books-media': 'entertainment',
  'home-garden': 'home',
  'home-living': 'home',
  'automotive': 'auto',
  'pets': 'other',
  'pet': 'other',
  'mother-baby': 'family-kids',
  'baby': 'family-kids',
  'office': 'home',
  'travel-services': 'other',
  'services': 'other',
  'health': 'beauty',
  'gaming': 'entertainment',
  'toys': 'family-kids',
  'books': 'entertainment',
  'travel': 'other',

  // === Sparhamster德语分类 -> 新ID ===
  // 数码电子
  'elektronik': 'electronics',
  'Elektronik': 'electronics',
  'computer': 'electronics',
  'Computer': 'electronics',

  // 家用电器 & 家居生活
  'haushalt': 'home',
  'Haushalt': 'home',
  'werkzeug-baumarkt': 'home',
  'Werkzeug & Baumarkt': 'home',
  'Werkzeug &amp; Baumarkt': 'home',

  // 时尚服饰
  'Fashion & Beauty': 'fashion',
  'Fashion &amp; Beauty': 'fashion',

  // 食品饮料
  'lebensmittel': 'food',
  'Lebensmittel': 'food',
  'essen-und-trinken': 'food',

  // 休闲娱乐
  'freizeit': 'entertainment',
  'Freizeit': 'entertainment',
  'Entertainment': 'entertainment',
  'spielzeug': 'family-kids',
  'Spielzeug': 'family-kids',

  // 旅游
  'reisen': 'other',
  'Reisen': 'other',

  // 其他/杂项
  'sonstiges': 'other',
  'Sonstiges': 'other',
  'Schnäppchen': 'other',
  'schnäppchen': 'other',

  // 商家名称（误当作分类）-> other
  'Amazon': 'other',
  'amazon': 'other',
  'MediaMarkt': 'other',
  'Marktguru': 'other',
  'Sparhamsterin': 'other',
  'sparhamsterin': 'other',
  'iBOOD': 'other',
  'Möbelix': 'other',
  'Interspar': 'other',
  'Pagro': 'other',
  'Gastroback': 'other',
  'Barilla': 'other',
  'Magenta': 'other',
  'BILLA': 'other',
  'Mueller': 'other',
  'Hunkemöller': 'other',
  'LEGO': 'other',
  'Ikea': 'other',
  'Sportscheck': 'other',
  'Bergzeit': 'other',
  'bonprix': 'other',
  'alza': 'other',
  'babywalz': 'other',
  'NKD': 'other',
  'XXXLutz': 'other',
  'Eduscho': 'other',
  'EMP': 'other',

  // 活动/专题 -> other
  'Singles Day 2025': 'other',
  'singles-day-angebote': 'other',
  'Amazon Prime Day 2025': 'other',
  'amazon-prime-day': 'other',
  'Black Friday 2025': 'other',
  'Gratisproben Österreich': 'other',
  'Urlaubshamster': 'other',
  'hamster-woche': 'other',

  // 其他杂项
  'erotik': 'other',
  'Erotik': 'other',
  'Nintendo Switch': 'electronics',
  'tink': 'other',
  'we-are.travel': 'other',
  'Milka': 'other',
  'Coca Cola': 'other',
  'Almdudler': 'other',
  'audible': 'entertainment',
  'Eis.at': 'other',
  'Red Bull': 'other',
  '0815': 'other',
  'Readly': 'entertainment',
  'Lottoland': 'other',
  'zalando-lounge': 'fashion',
  'Stiegl': 'other',
  'Lidl Connect': 'other',
  'Seidensticker': 'fashion',
  'Tom-Tailor': 'fashion',
  'Schwechater Bier': 'other',
  'yesss': 'other',
  'Drei': 'other',
  'Peek und Cloppenburg': 'fashion',
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
