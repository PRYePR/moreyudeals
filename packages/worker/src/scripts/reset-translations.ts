/**
 * 重置已翻译的记录
 * 让它们使用新的翻译流程（保护换行符）重新翻译
 */

import { DatabaseManager } from '../database';
import { loadConfig } from '../config';

async function resetTranslations() {
  console.log('🔄 开始重置翻译状态...\n');

  const config = loadConfig();
  const db = new DatabaseManager(config.database);
  await db.connect();

  try {
    // 1. 显示当前状态
    console.log('📊 当前翻译状态:');
    const currentStatus = await db.query(`
      SELECT translation_status, COUNT(*) as count
      FROM deals
      GROUP BY translation_status
      ORDER BY translation_status
    `);
    console.table(currentStatus.rows);

    // 2. 重置已翻译的记录
    console.log('\n🔄 重置翻译状态...');
    const resetResult = await db.query(`
      UPDATE deals
      SET
        translation_status = 'pending',
        title = original_title,  -- 恢复原始标题
        description = NULL       -- 清空翻译描述
      WHERE translation_status = 'completed'
      RETURNING id
    `);

    console.log(`✅ 已重置 ${resetResult.rowCount} 条记录\n`);

    // 3. 显示重置后的状态
    console.log('📊 重置后状态:');
    const newStatus = await db.query(`
      SELECT translation_status, COUNT(*) as count
      FROM deals
      GROUP BY translation_status
      ORDER BY translation_status
    `);
    console.table(newStatus.rows);

    console.log('\n✅ 重置完成！');
    console.log('💡 提示: 启动翻译 worker 会自动开始重新翻译这些记录');

  } catch (error) {
    console.error('❌ 重置失败:', error);
    throw error;
  } finally {
    await db.disconnect();
  }
}

// 运行重置
resetTranslations().catch(console.error);
