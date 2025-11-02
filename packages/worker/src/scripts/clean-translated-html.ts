/**
 * 清理数据库中已翻译的HTML内容
 * 修复DeepL翻译导致的格式问题
 */

import { DatabaseManager } from '../database';
import { cleanTranslatedHtml, hasHtmlFormatIssues } from '../utils/html-cleaner';
import { loadConfig } from '../config';

async function cleanAllTranslatedHtml() {
  console.log('🧹 开始清理数据库中的翻译HTML...\n');

  const config = loadConfig();
  const db = new DatabaseManager(config.database);
  await db.connect();

  try {
    // 1. 获取所有已翻译的记录
    const query = `
      SELECT id, description
      FROM deals
      WHERE translation_status = 'completed'
        AND description IS NOT NULL
        AND description != ''
    `;

    const result = await db.query(query);
    const deals = result.rows;

    console.log(`📊 找到 ${deals.length} 条已翻译的记录\n`);

    let cleanedCount = 0;
    let issueCount = 0;

    // 2. 遍历并清理每条记录
    for (const deal of deals) {
      const originalHtml = deal.description;

      // 检测是否有格式问题
      if (hasHtmlFormatIssues(originalHtml)) {
        issueCount++;

        // 清理HTML
        const cleanedHtml = cleanTranslatedHtml(originalHtml);

        // 更新数据库
        await db.query(
          'UPDATE deals SET description = $1 WHERE id = $2',
          [cleanedHtml, deal.id]
        );

        cleanedCount++;

        if (cleanedCount <= 5) {
          console.log(`✅ 清理 ${deal.id}`);
          console.log(`   原始长度: ${originalHtml.length}`);
          console.log(`   清理后: ${cleanedHtml.length}`);
          console.log('');
        }
      }
    }

    console.log('\n📊 清理完成统计:');
    console.log(`   - 总记录数: ${deals.length}`);
    console.log(`   - 发现问题: ${issueCount}`);
    console.log(`   - 已清理: ${cleanedCount}`);
    console.log(`   - 无问题: ${deals.length - issueCount}`);

  } catch (error) {
    console.error('❌ 清理失败:', error);
  } finally {
    await db.disconnect();
  }
}

// 运行清理
cleanAllTranslatedHtml();
