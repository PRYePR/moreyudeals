/**
 * 翻译Worker
 */

import { CoreTranslationManager, createTranslationManager } from '@moreyudeals/translation';
import { DatabaseManager } from './database';
import { TranslationJob, TranslationResult, RSSItem } from './types';
import { prepareForTranslation, cleanTranslatedHtml } from './utils/html-cleaner';

export class TranslationWorker {
  private translationManager: CoreTranslationManager;
  private database: DatabaseManager;
  private isProcessing = false;
  private intervalId?: NodeJS.Timeout; // 保存 setInterval 返回值

  constructor(database: DatabaseManager, translationConfig: any) {
    this.database = database;
    this.translationManager = createTranslationManager(translationConfig);
  }

  async start(): Promise<void> {
    console.log('🔄 翻译Worker启动');

    // 每30秒检查一次待翻译的任务
    this.intervalId = setInterval(async () => {
      if (!this.isProcessing) {
        await this.processTranslationJobs();
      }
    }, 30000);

    // 立即执行一次
    await this.processTranslationJobs();
  }

  /**
   * 停止翻译Worker
   */
  async stop(): Promise<void> {
    console.log('🛑 停止翻译Worker...');

    // 清理定时器
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    // 等待当前正在处理的任务完成
    while (this.isProcessing) {
      console.log('⏳ 等待当前翻译任务完成...');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('✅ 翻译Worker已停止');
  }

  async processTranslationJobs(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      // 获取待翻译的 Deal（使用新方法）
      const untranslatedDeals = await this.database.getUntranslatedDeals(10);

      if (untranslatedDeals.length === 0) {
        console.log('ℹ️  没有待翻译的记录');
        return;
      }

      console.log(`📝 发现 ${untranslatedDeals.length} 个待翻译的优惠`);

      // 直接翻译每个 Deal
      for (const deal of untranslatedDeals) {
        try {
          await this.translateDeal(deal);
        } catch (error) {
          console.error(`❌ 翻译 Deal ${deal.id} 失败:`, error);
        }
      }

    } catch (error) {
      console.error('❌ 处理翻译任务失败:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 翻译单个 Deal
   */
  private async translateDeal(deal: any): Promise<void> {
    // 如果 titleDe 为空，说明标题本身为空，跳过翻译
    if (!deal.titleDe) {
      console.log(`⚠️  跳过翻译（titleDe为空）: ${deal.originalTitle?.substring(0, 50)}...`);
      await this.database.updateDeal(deal.id, {
        translationStatus: 'failed'
      });
      return;
    }

    const cleanTitle = deal.titleDe;
    console.log(`🌐 开始翻译: ${cleanTitle?.substring(0, 50)}...`);

    try {
      // 更新状态为处理中
      await this.database.updateDeal(deal.id, {
        translationStatus: 'processing'
      });

      const translations: any = {};

      // 翻译标题（使用清理后的 title，不含价格信息）
      if (cleanTitle) {
        const titleResult = await this.translationManager.translate({
          text: cleanTitle,
          from: 'de' as any,
          to: 'zh' as any
        });
        translations.title = titleResult.translatedText;
        console.log(`  ✅ 标题: ${titleResult.translatedText.substring(0, 40)}...`);
      }

      // 翻译HTML内容 (content_html -> description)
      if (deal.contentHtml) {
        // 1. 预处理：保护换行符（DeepL 会删除纯文本的换行）
        const preparedHtml = prepareForTranslation(deal.contentHtml);

        // 2. 翻译
        const htmlResult = await this.translationManager.translate({
          text: preparedHtml,
          from: 'de' as any,
          to: 'zh' as any
        });

        // 3. 清理翻译后的HTML，修复DeepL产生的格式问题
        const cleanedHtml = cleanTranslatedHtml(htmlResult.translatedText);
        translations.description = cleanedHtml;
        console.log(`  ✅ HTML内容已翻译并清理 (${deal.contentHtml.length} -> ${cleanedHtml.length} 字符)`);
      }

      // 更新数据库
      await this.database.updateDealTranslation(
        deal.id,
        translations,
        {
          provider: 'deepl',
          language: 'zh',
          detectedLanguage: 'de'
        }
      );

      console.log(`✅ 翻译完成: ${deal.id}`);
    } catch (error) {
      console.error(`❌ 翻译失败: ${deal.id}`, error);

      // 标记为失败
      await this.database.updateDeal(deal.id, {
        translationStatus: 'failed'
      });

      throw error;
    }
  }

  private async processTranslationQueue(): Promise<void> {
    const jobs = await this.database.getPendingTranslationJobs(5);

    if (jobs.length === 0) {
      return;
    }

    console.log(`🌐 开始处理 ${jobs.length} 个翻译任务`);

    const results: TranslationResult[] = [];

    for (const job of jobs) {
      try {
        const result = await this.translateJob(job);
        results.push(result);
      } catch (error) {
        console.error(`❌ 翻译任务失败: ${job.id}`, error);
        results.push({
          itemId: job.itemId,
          success: false,
          error: (error as Error).message
        });
      }
    }

    // 更新条目的翻译状态
    await this.updateItemTranslationStatus(results);
  }

  private async translateJob(job: TranslationJob): Promise<TranslationResult> {
    console.log(`🔄 翻译 ${job.type}: ${job.originalText.substring(0, 50)}...`);

    try {
      // 更新任务状态为处理中
      await this.database.updateTranslationJob(job.id, {
        status: 'processing'
      });

      // 执行翻译
      const translationResult = await this.translationManager.translate({
        text: job.originalText,
        from: job.sourceLanguage as any,
        to: job.targetLanguage as any
      });

      // 更新翻译任务
      await this.database.updateTranslationJob(job.id, {
        status: 'completed',
        translatedText: translationResult.translatedText,
        provider: translationResult.provider
      });

      // 更新RSS条目的翻译内容
      const updateData: Partial<RSSItem> = {};
      if (job.type === 'title') {
        updateData.title = translationResult.translatedText;
      } else if (job.type === 'description') {
        updateData.description = translationResult.translatedText;
      }

      await this.database.updateRSSItem(job.itemId, updateData);

      console.log(`✅ 翻译完成: ${translationResult.translatedText.substring(0, 50)}...`);

      return {
        itemId: job.itemId,
        success: true
      };

    } catch (error) {
      // 增加重试次数
      const newRetryCount = job.retryCount + 1;
      const maxRetries = 3;

      if (newRetryCount >= maxRetries) {
        // 达到最大重试次数，标记为失败
        await this.database.updateTranslationJob(job.id, {
          status: 'failed',
          retryCount: newRetryCount,
          errorMessage: (error as Error).message
        });
      } else {
        // 重新排队
        await this.database.updateTranslationJob(job.id, {
          status: 'pending',
          retryCount: newRetryCount,
          errorMessage: (error as Error).message
        });
      }

      throw error;
    }
  }

  private async updateItemTranslationStatus(results: TranslationResult[]): Promise<void> {
    // 按条目ID分组结果
    const itemResultsMap = new Map<string, TranslationResult[]>();

    for (const result of results) {
      if (!itemResultsMap.has(result.itemId)) {
        itemResultsMap.set(result.itemId, []);
      }
      itemResultsMap.get(result.itemId)!.push(result);
    }

    // 更新每个条目的状态
    for (const [itemId, itemResults] of itemResultsMap) {
      const allSuccess = itemResults.every((r: TranslationResult) => r.success);
      const hasFailure = itemResults.some((r: TranslationResult) => !r.success);

      let status: 'completed' | 'failed' | 'processing' = 'processing';

      if (allSuccess) {
        status = 'completed';

        // 检查是否所有翻译任务都完成了
        const pendingJobs = await this.database.getPendingTranslationJobs(100);
        const hasPendingForItem = pendingJobs.some(job => job.itemId === itemId);

        if (!hasPendingForItem) {
          await this.database.updateRSSItem(itemId, {
            translationStatus: 'completed',
            isTranslated: true
          });
        }
      } else if (hasFailure) {
        status = 'failed';
        await this.database.updateRSSItem(itemId, {
          translationStatus: 'failed'
        });
      }
    }
  }

  async getTranslationStats(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  }> {
    // 这里可以添加统计查询
    return {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0
    };
  }
}