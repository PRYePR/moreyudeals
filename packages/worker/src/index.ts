/**
 * RSS抓取和翻译Worker主程序
 */

import 'dotenv/config';
import { CronJob } from 'cron';
import { DatabaseManager } from './database';
import { RSSFetcher } from './rss-fetcher';
import { TranslationWorker } from './translation-worker';
import { WorkerConfig } from './types';

class WorkerService {
  private database: DatabaseManager;
  private rssFetcher: RSSFetcher;
  private translationWorker: TranslationWorker;
  private config: WorkerConfig;
  private fetchJob?: CronJob;

  constructor() {
    this.config = this.loadConfig();
    this.database = new DatabaseManager(this.config.database);
    this.rssFetcher = new RSSFetcher(this.database);
    this.translationWorker = new TranslationWorker(this.database, this.config.translation);
  }

  private loadConfig(): WorkerConfig {
    return {
      rssFeeds: [], // 将从数据库加载
      fetchInterval: parseInt(process.env.FETCH_INTERVAL || '30'), // 30分钟
      translationBatchSize: parseInt(process.env.TRANSLATION_BATCH_SIZE || '10'),
      maxRetries: parseInt(process.env.MAX_RETRIES || '3'),
      database: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'moreyudeals_dev',
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || ''
      },
      translation: {
        enabled: process.env.TRANSLATION_ENABLED !== 'false',
        targetLanguages: (process.env.TRANSLATION_TARGET_LANGUAGES || 'zh,en').split(','),
        providers: (process.env.TRANSLATION_PROVIDERS || 'deepl').split(','),
        deepl: {
          apiKey: process.env.DEEPL_API_KEY || '',
          endpoint: process.env.DEEPL_ENDPOINT || 'https://api-free.deepl.com/v2'
        },
        redis: {
          url: process.env.REDIS_URL || 'redis://localhost:6379'
        }
      }
    };
  }

  async start(): Promise<void> {
    console.log('🚀 启动RSS抓取和翻译Worker服务');

    try {
      // 连接数据库
      await this.database.connect();

      // 启动翻译Worker
      if (this.config.translation.enabled) {
        console.log('🌐 启动翻译Worker');
        await this.translationWorker.start();
      }

      // 设置RSS抓取定时任务
      this.setupRSSFetchJob();

      // 立即执行一次RSS抓取
      await this.fetchAllRSSFeeds();

      console.log('✅ Worker服务启动完成');

      // 设置优雅关闭
      this.setupGracefulShutdown();

    } catch (error) {
      console.error('❌ Worker服务启动失败:', error);
      process.exit(1);
    }
  }

  private setupRSSFetchJob(): void {
    const cronPattern = `0 */${this.config.fetchInterval} * * * *`; // 每N分钟执行一次

    this.fetchJob = new CronJob(cronPattern, async () => {
      console.log('⏰ 定时RSS抓取任务开始');
      await this.fetchAllRSSFeeds();
    });

    this.fetchJob.start();
    console.log(`⏰ RSS抓取定时任务已设置: 每${this.config.fetchInterval}分钟执行一次`);
  }

  private async fetchAllRSSFeeds(): Promise<void> {
    try {
      console.log('🔄 开始RSS抓取任务');
      const startTime = Date.now();

      const results = await this.rssFetcher.fetchAllFeeds();

      const totalNew = results.reduce((sum, r) => sum + r.newItems, 0);
      const totalUpdated = results.reduce((sum, r) => sum + r.updatedItems, 0);
      const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);

      const duration = Date.now() - startTime;

      console.log('📊 RSS抓取任务完成:');
      console.log(`  - 新增条目: ${totalNew}`);
      console.log(`  - 更新条目: ${totalUpdated}`);
      console.log(`  - 错误数量: ${totalErrors}`);
      console.log(`  - 耗时: ${duration}ms`);

      if (totalErrors > 0) {
        console.warn('⚠️ RSS抓取过程中发生错误:');
        results.forEach(result => {
          if (result.errors.length > 0) {
            console.warn(`  Feed ${result.feedId}: ${result.errors.join(', ')}`);
          }
        });
      }

    } catch (error) {
      console.error('❌ RSS抓取任务失败:', error);
    }
  }

  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      console.log(`\n🛑 收到${signal}信号，开始优雅关闭...`);

      try {
        if (this.fetchJob) {
          this.fetchJob.stop();
          console.log('⏰ RSS抓取定时任务已停止');
        }

        await this.database.close();
        console.log('✅ Worker服务已关闭');

        process.exit(0);
      } catch (error) {
        console.error('❌ 关闭过程中发生错误:', error);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  }

  async getStatus(): Promise<any> {
    const translationStats = await this.translationWorker.getTranslationStats();

    return {
      service: 'RSS Worker',
      status: 'running',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      config: {
        fetchInterval: this.config.fetchInterval,
        translationEnabled: this.config.translation.enabled,
        maxRetries: this.config.maxRetries
      },
      translation: translationStats,
      lastFetch: new Date().toISOString()
    };
  }
}

// 启动服务
const worker = new WorkerService();

// 处理未捕获的错误
process.on('uncaughtException', (error) => {
  console.error('❌ 未捕获的异常:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未处理的Promise拒绝:', reason);
  process.exit(1);
});

// 启动Worker
if (require.main === module) {
  worker.start().catch((error) => {
    console.error('❌ Worker启动失败:', error);
    process.exit(1);
  });
}

export { WorkerService };