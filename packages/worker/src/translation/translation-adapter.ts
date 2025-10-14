/**
 * Translation Adapter
 * 适配器用于处理 Deals 表的翻译流程
 * 集成 translation-worker 和 database
 */

import { DatabaseManager } from '../database';
import { ContentBlock } from '../types/deal.types';

/**
 * 翻译服务接口
 * 抽象翻译功能,便于测试和替换翻译提供商
 */
export interface TranslationService {
  translate(text: string, from: string, to: string): Promise<string>;
}

/**
 * Translation Adapter
 * 负责将 Deal 对象通过翻译服务进行翻译并更新数据库
 */
export class TranslationAdapter {
  constructor(
    private readonly database: DatabaseManager,
    private readonly translationService: TranslationService,
    private readonly config: {
      batchSize?: number;
      targetLanguage?: string;
      sourceLanguage?: string;
    } = {}
  ) {}

  /**
   * 处理待翻译的 Deals
   * 获取待翻译记录 → 翻译 → 更新数据库
   */
  async processTranslations(): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
  }> {
    const batchSize = this.config.batchSize || 10;
    const targetLang = this.config.targetLanguage || 'zh';
    const sourceLang = this.config.sourceLanguage || 'de';

    const deals = await this.database.getUntranslatedDeals(batchSize);

    if (deals.length === 0) {
      return { processed: 0, succeeded: 0, failed: 0 };
    }

    console.log(`🌐 开始翻译 ${deals.length} 条 deals`);

    let succeeded = 0;
    let failed = 0;

    for (const deal of deals) {
      try {
        // 翻译标题
        const translatedTitle = deal.originalTitle
          ? await this.translationService.translate(deal.originalTitle, sourceLang, targetLang)
          : undefined;

        // 翻译描述
        const translatedDescription = deal.originalDescription
          ? await this.translationService.translate(deal.originalDescription, sourceLang, targetLang)
          : undefined;

        // 翻译 content_blocks (仅文本类型)
        const translatedBlocks = await this.translateContentBlocks(
          deal.contentBlocks,
          sourceLang,
          targetLang
        );

        // 更新数据库
        await this.database.updateDealTranslation(
          deal.id,
          {
            title: translatedTitle,
            description: translatedDescription,
            contentBlocks: translatedBlocks,
          },
          {
            provider: 'deepl',
            language: targetLang,
            detectedLanguage: sourceLang,
          }
        );

        console.log(`✅ 翻译完成: ${deal.id} - ${deal.title?.substring(0, 30)}...`);
        succeeded++;
      } catch (error) {
        console.error(`❌ 翻译失败: ${deal.id}`, error);
        failed++;

        // 标记为失败
        try {
          await this.database.updateDeal(deal.id, {
            translationStatus: 'failed',
          });
        } catch (updateError) {
          console.error(`❌ 更新失败状态失败: ${deal.id}`, updateError);
        }
      }
    }

    console.log(`📊 翻译完成: 成功 ${succeeded}, 失败 ${failed}`);

    return {
      processed: deals.length,
      succeeded,
      failed,
    };
  }

  /**
   * 翻译 content_blocks
   * 只翻译 text 和 heading 类型的 block
   */
  private async translateContentBlocks(
    blocks: ContentBlock[] | undefined,
    sourceLang: string,
    targetLang: string
  ): Promise<ContentBlock[] | undefined> {
    if (!blocks || blocks.length === 0) {
      return undefined;
    }

    const translated: ContentBlock[] = [];

    for (const block of blocks) {
      // 只翻译文本和标题类型
      if (block.type === 'text' || block.type === 'heading') {
        try {
          const translatedContent = await this.translationService.translate(
            block.content,
            sourceLang,
            targetLang
          );
          translated.push({
            ...block,
            content: translatedContent,
          });
        } catch (error) {
          console.error(`❌ 翻译 content block 失败:`, error);
          // 翻译失败时保留原文
          translated.push(block);
        }
      } else {
        // 图片、列表、代码等不翻译,直接保留
        translated.push(block);
      }
    }

    return translated;
  }
}
