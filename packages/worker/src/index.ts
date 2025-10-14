/**
 * Worker 主程序
 * 负责定时抓取 Sparhamster 优惠并入库
 *
 * 架构：
 * - SparhamsterFetcher: 抓取和标准化数据
 * - DatabaseManager: 数据库操作
 * - RandomScheduler: 随机间隔调度任务（防爬虫检测）
 */

import 'dotenv/config';
import { DatabaseManager } from './database';
import { SparhamsterFetcher } from './fetchers/sparhamster-fetcher';
import { RandomScheduler } from './scheduler/random-scheduler';
import { TranslationWorker } from './translation-worker';
import { loadConfig, WorkerConfig } from './config';

class WorkerService {
  private config: WorkerConfig;
  private database: DatabaseManager;
  private translationDatabase: DatabaseManager;
  private fetcher: SparhamsterFetcher;
  private translationWorker?: TranslationWorker;
  private scheduler?: RandomScheduler;
  private translationScheduler?: RandomScheduler;

  constructor() {
    this.config = loadConfig();

    // 初始化数据库
    this.database = new DatabaseManager({
      host: this.config.database.host,
      port: this.config.database.port,
      database: this.config.database.database,
      user: this.config.database.username,
      password: this.config.database.password,
    });

    // 初始化翻译数据库连接（可以是同一个数据库）
    this.translationDatabase = new DatabaseManager({
      host: this.config.database.host,
      port: this.config.database.port,
      database: this.config.database.database,
      user: this.config.database.username,
      password: this.config.database.password,
    });

    // 初始化 Fetcher
    this.fetcher = new SparhamsterFetcher(this.database);

    // 初始化 TranslationWorker (如果启用)
    if (this.config.translation.enabled) {
      this.translationWorker = new TranslationWorker(
        this.translationDatabase,
        this.config.translation
      );
    }
  }

  /**
   * 启动 Worker 服务
   */
  async start(): Promise<void> {
    console.log('🚀 启动 Moreyudeals Worker 服务');
    console.log('📦 配置信息:');
    console.log(`  - 数据库: ${this.config.database.host}:${this.config.database.port}/${this.config.database.database}`);
    console.log(`  - 抓取间隔: ${this.config.fetch.interval} 分钟`);
    console.log(`  - 随机延迟: ${this.config.fetch.randomDelayMin}-${this.config.fetch.randomDelayMax} 分钟`);
    console.log(`  - Sparhamster API: ${this.config.sparhamster.apiUrl}`);
    console.log(`  - 翻译: ${this.config.translation.enabled ? '启用' : '禁用'}`);

    try {
      // 1. 连接数据库
      await this.database.connect();

      if (this.config.translation.enabled && this.translationWorker) {
        await this.translationDatabase.connect();
      }

      // 2. 设置随机调度器
      const minIntervalSeconds = this.config.fetch.interval * 60;
      const maxIntervalSeconds =
        this.config.fetch.interval * 60 +
        this.config.fetch.randomDelayMax * 60;

      this.scheduler = new RandomScheduler(
        {
          taskName: 'Sparhamster 抓取任务',
          minIntervalSeconds,
          maxIntervalSeconds,
        },
        async () => {
          await this.fetchAndProcess();
        }
      );

      // 3. 启动调度器
      this.scheduler.start();
      console.log('✅ 调度器启动成功');

      // 4. 启动翻译 Worker (如果启用)
      if (this.config.translation.enabled && this.translationWorker) {
        this.translationScheduler = new RandomScheduler(
          {
            taskName: '翻译任务',
            minIntervalSeconds: this.config.translation.interval * 60,
            maxIntervalSeconds: this.config.translation.interval * 60 + 300, // +5分钟随机延迟
          },
          async () => {
            await this.translationWorker!.processTranslationJobs();
          }
        );
        this.translationScheduler.start();
        console.log('✅ 翻译调度器启动成功');
      }

      // 5. 立即执行一次抓取
      console.log('🔄 执行首次抓取...');
      await this.fetchAndProcess();

      console.log('✅ Worker 服务启动完成');

      // 6. 设置优雅关闭
      this.setupGracefulShutdown();
    } catch (error) {
      console.error('❌ Worker 服务启动失败:', error);
      await this.shutdown();
      process.exit(1);
    }
  }

  /**
   * 抓取并处理数据
   */
  private async fetchAndProcess(): Promise<void> {
    const startTime = Date.now();

    try {
      console.log('\n🔄 开始抓取 Sparhamster 优惠...');

      const result = await this.fetcher.fetchLatest();

      const duration = Date.now() - startTime;

      console.log('\n📊 抓取任务完成:');
      console.log(`  - 获取记录: ${result.fetched}`);
      console.log(`  - 新增记录: ${result.inserted}`);
      console.log(`  - 更新记录: ${result.updated}`);
      console.log(`  - 重复记录: ${result.duplicates}`);
      console.log(`  - 错误数量: ${result.errors.length}`);
      console.log(`  - 耗时: ${duration}ms`);

      if (result.errors.length > 0) {
        console.warn('\n⚠️ 抓取过程中发生错误:');
        result.errors.forEach((err) => console.warn(`  - ${err}`));
      }
    } catch (error) {
      console.error('❌ 抓取任务失败:', error);
    }
  }

  /**
   * 优雅关闭
   */
  private async shutdown(): Promise<void> {
    console.log('\n🛑 开始关闭 Worker 服务...');

    try {
      // 停止调度器
      if (this.scheduler) {
        this.scheduler.stop();
        console.log('⏰ 调度器已停止');
      }

      // 停止翻译调度器
      if (this.translationScheduler) {
        this.translationScheduler.stop();
        console.log('⏰ 翻译调度器已停止');
      }

      // 关闭数据库连接
      await this.database.close();

      if (this.translationDatabase && this.config.translation.enabled) {
        await this.translationDatabase.close();
      }

      console.log('✅ Worker 服务已关闭');
    } catch (error) {
      console.error('❌ 关闭过程中发生错误:', error);
    }
  }

  /**
   * 设置优雅关闭信号处理
   */
  private setupGracefulShutdown(): void {
    const handleShutdown = async (signal: string) => {
      console.log(`\n收到 ${signal} 信号`);
      await this.shutdown();
      process.exit(0);
    };

    process.on('SIGINT', () => handleShutdown('SIGINT'));
    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  }

  /**
   * 获取服务状态
   */
  async getStatus(): Promise<any> {
    return {
      service: 'Moreyudeals Worker',
      status: this.scheduler?.getIsRunning() ? 'running' : 'stopped',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      config: {
        fetchInterval: this.config.fetch.interval,
        translationEnabled: this.config.translation.enabled,
        database: `${this.config.database.host}:${this.config.database.port}/${this.config.database.database}`,
      },
    };
  }
}

// 全局错误处理
process.on('uncaughtException', (error) => {
  console.error('❌ 未捕获的异常:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未处理的 Promise 拒绝:', reason);
  process.exit(1);
});

// 启动服务
if (require.main === module) {
  const worker = new WorkerService();

  worker.start().catch((error) => {
    console.error('❌ Worker 启动失败:', error);
    process.exit(1);
  });
}

export { WorkerService };
