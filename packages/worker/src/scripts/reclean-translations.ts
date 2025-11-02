/**
 * 重新清理已翻译的HTML内容
 * 使用改进后的清理规则批量处理所有已翻译的 description 字段
 */

import { Pool } from 'pg';
import { cleanTranslatedHtml } from '../utils/html-cleaner';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'moreyudeals_dev',
  user: process.env.DB_USER || process.env.USER,
  password: process.env.DB_PASSWORD,
});

interface Deal {
  id: string;
  description: string;
  title: string;
}

async function recleanTranslations() {
  console.log('🧹 开始重新清理已翻译的HTML内容...\n');

  try {
    // 1. 统计需要清理的记录
    const countResult = await pool.query(
      `SELECT COUNT(*) as total
       FROM deals
       WHERE translation_status = 'completed'
       AND description IS NOT NULL`
    );
    const total = parseInt(countResult.rows[0].total);
    console.log(`📊 找到 ${total} 条已翻译的记录\n`);

    if (total === 0) {
      console.log('✅ 没有需要清理的记录');
      return;
    }

    // 2. 获取所有已翻译的记录
    const result = await pool.query<Deal>(
      `SELECT id, description, title
       FROM deals
       WHERE translation_status = 'completed'
       AND description IS NOT NULL
       ORDER BY updated_at DESC`
    );

    console.log(`🔄 开始处理 ${result.rows.length} 条记录...\n`);

    let updatedCount = 0;
    let unchangedCount = 0;
    const samples: Array<{
      id: string;
      title: string;
      before: string;
      after: string;
    }> = [];

    // 3. 批量处理
    for (const deal of result.rows) {
      const oldDescription = deal.description;
      const newDescription = cleanTranslatedHtml(oldDescription);

      // 检查是否有变化
      if (oldDescription !== newDescription) {
        // 更新数据库
        await pool.query(
          `UPDATE deals
           SET description = $1, updated_at = NOW()
           WHERE id = $2`,
          [newDescription, deal.id]
        );

        updatedCount++;

        // 收集前5个样本用于展示
        if (samples.length < 5) {
          samples.push({
            id: deal.id,
            title: deal.title?.substring(0, 50) || '(无标题)',
            before: oldDescription.substring(0, 200),
            after: newDescription.substring(0, 200),
          });
        }

        // 每100条显示一次进度
        if (updatedCount % 100 === 0) {
          console.log(`  ✅ 已处理 ${updatedCount} 条记录...`);
        }
      } else {
        unchangedCount++;
      }
    }

    // 4. 显示结果
    console.log('\n' + '='.repeat(80));
    console.log('📈 清理完成统计:');
    console.log('='.repeat(80));
    console.log(`总记录数: ${total}`);
    console.log(`已更新: ${updatedCount} 条`);
    console.log(`未变化: ${unchangedCount} 条`);
    console.log('='.repeat(80));

    // 5. 显示样本对比
    if (samples.length > 0) {
      console.log('\n\n' + '='.repeat(80));
      console.log('📋 清理效果样本（前5条有变化的记录）:');
      console.log('='.repeat(80));

      samples.forEach((sample, index) => {
        console.log(`\n样本 ${index + 1}:`);
        console.log(`标题: ${sample.title}`);
        console.log(`ID: ${sample.id}`);
        console.log('\n清理前:');
        console.log(JSON.stringify(sample.before));
        console.log('\n清理后:');
        console.log(JSON.stringify(sample.after));
        console.log('-'.repeat(80));
      });
    }

    console.log('\n✅ 重新清理完成！');
  } catch (error) {
    console.error('❌ 清理失败:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// 执行
recleanTranslations().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
