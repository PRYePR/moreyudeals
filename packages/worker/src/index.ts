/**
 * RSS抓取和翻译Worker主程序
 */

import 'dotenv/config';
import { CronJob } from 'cron';
import { DatabaseManager } from './database';
import { TranslationWorker } from './translation-worker';
import { SparhamsterApiFetcher } from './sparhamster-api-fetcher';
import { WorkerConfig } from './types';

class WorkerService {
  private database: DatabaseManager;
  private apiFetcher: SparhamsterApiFetcher;
  private translationWorker: TranslationWorker;
  private config: WorkerConfig;
  private fetchJob?: CronJob;

  constructor() {
    this.config = this.loadConfig();
    this.database = new DatabaseManager(this.config.database);
    this.apiFetcher = new SparhamsterApiFetcher(this.database);
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
    console.log('🚀 启动API抓取与翻译Worker服务');

    try {
      // 连接数据库
      await this.database.connect();

      // 启动翻译Worker
      if (this.config.translation.enabled) {
        console.log('🌐 启动翻译Worker');
        await this.translationWorker.start();
      }

      // 设置 API 抓取定时任务
      this.setupApiFetchJob();

      // 立即执行一次抓取
      await this.fetchLatestDeals();

      console.log('✅ Worker服务启动完成');

      // 设置优雅关闭
      this.setupGracefulShutdown();

    } catch (error) {
      console.error('❌ Worker服务启动失败:', error);
      process.exit(1);
    }
  }

  private setupApiFetchJob(): void {
    const cronPattern = `0 */${this.config.fetchInterval} * * * *`; // 每N分钟执行一次

    this.fetchJob = new CronJob(cronPattern, async () => {
      // 添加随机延迟 0-5分钟，避免被识别为爬虫
      const randomDelay = Math.floor(Math.random() * 5 * 60 * 1000); // 0-5分钟的毫秒数
      const delayMinutes = Math.floor(randomDelay / 60000);
      const delaySeconds = Math.floor((randomDelay % 60000) / 1000);

      console.log(`⏰ 定时API抓取任务触发，随机延迟 ${delayMinutes}分${delaySeconds}秒后开始...`);

      await new Promise(resolve => setTimeout(resolve, randomDelay));

      console.log('🔄 开始执行抓取任务');
      await this.fetchLatestDeals();
    });

    this.fetchJob.start();
    console.log(`⏰ API抓取定时任务已设置: 每${this.config.fetchInterval}分钟执行一次 (含0-5分钟随机延迟)`);
  }

  private async fetchLatestDeals(): Promise<void> {
    try {
      console.log('🔄 开始通过官方API抓取最新优惠');
      const startTime = Date.now();

      const result = await this.apiFetcher.fetchLatest();

      const duration = Date.now() - startTime;

      console.log('📊 API抓取任务完成:');
      console.log(`  - 新增条目: ${result.inserted}`);
      console.log(`  - 更新条目: ${result.updated}`);
      console.log(`  - 错误数量: ${result.errors.length}`);
      console.log(`  - 耗时: ${duration}ms`);

      if (result.errors.length > 0) {
        console.warn('⚠️ API抓取过程中发生错误:');
        result.errors.forEach((err) => console.warn(`  - ${err}`));
      }

    } catch (error) {
      console.error('❌ API抓取任务失败:', error);
    }
  }

  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      console.log(`\n🛑 收到${signal}信号，开始优雅关闭...`);

      try {
        if (this.fetchJob) {
          this.fetchJob.stop();
          console.log('⏰ 抓取定时任务已停止');
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
      service: 'Deals Worker',
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
