/**
 * 翻译Worker
 */

import { CoreTranslationManager, createTranslationManager } from '@moreyudeals/translation';
import { DatabaseManager } from './database';
import { TranslationJob, TranslationResult, RSSItem } from './types';

export class TranslationWorker {
  private translationManager: CoreTranslationManager;
  private database: DatabaseManager;
  private isProcessing = false;

  constructor(database: DatabaseManager, translationConfig: any) {
    this.database = database;
    this.translationManager = createTranslationManager(translationConfig);
  }

  async start(): Promise<void> {
    console.log('🔄 翻译Worker启动');

    // 每30秒检查一次待翻译的任务
    setInterval(async () => {
      if (!this.isProcessing) {
        await this.processTranslationJobs();
      }
    }, 30000);

    // 立即执行一次
    await this.processTranslationJobs();
  }

  async processTranslationJobs(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      // 获取待翻译的条目
      const untranslatedItems = await this.database.getUntranslatedItems(10);

      if (untranslatedItems.length === 0) {
        return;
      }

      console.log(`📝 发现 ${untranslatedItems.length} 个待翻译条目`);

      // 为每个条目创建翻译任务
      for (const item of untranslatedItems) {
        await this.createTranslationJobsForItem(item);
      }

      // 处理翻译任务
      await this.processTranslationQueue();

    } catch (error) {
      console.error('❌ 处理翻译任务失败:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async createTranslationJobsForItem(item: RSSItem): Promise<void> {
    // 更新条目状态为处理中
    await this.database.updateRSSItem(item.id, {
      translationStatus: 'processing'
    });

    // 创建标题翻译任务
    if (item.originalTitle) {
      await this.database.createTranslationJob({
        itemId: item.id,
        type: 'title',
        originalText: item.originalTitle,
        sourceLanguage: 'de', // 假设源语言是德语
        targetLanguage: 'zh', // 目标语言是中文
        status: 'pending',
        retryCount: 0
      });
    }

    // 创建描述翻译任务
    if (item.originalDescription) {
      await this.database.createTranslationJob({
        itemId: item.id,
        type: 'description',
        originalText: item.originalDescription,
        sourceLanguage: 'de',
        targetLanguage: 'zh',
        status: 'pending',
        retryCount: 0
      });
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
    const itemResults = new Map<string, TranslationResult[]>();

    for (const result of results) {
      if (!itemResults.has(result.itemId)) {
        itemResults.set(result.itemId, []);
      }
      itemResults.get(result.itemId)!.push(result);
    }

    // 更新每个条目的状态
    for (const [itemId, itemResults] of itemResults) {
      const allSuccess = itemResults.every(r => r.success);
      const hasFailure = itemResults.some(r => !r.success);

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