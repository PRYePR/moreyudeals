/**
 * Worker 主程序
 * 负责定时抓取 Sparhamster 优惠并入库
 *
 * 架构：
 * - SparhamsterFetcher: 抓取和标准化数据
 * - DatabaseManager: 数据库操作
 * - RandomScheduler: 随机间隔调度任务（防爬虫检测）
 */

import dotenv from 'dotenv';
import path from 'path';

// 加载环境变量：先加载 .env（基础配置），再加载 .env.local（本地覆盖）
// 使用 override: true 让 .env.local 覆盖 .env 中的同名变量
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });
import { DatabaseManager } from './database';
import { SparhamsterFetcher } from './fetchers/sparhamster-fetcher';
import { PreisjaegerFetcher } from './fetchers/preisjaeger-fetcher';
import { RandomScheduler } from './scheduler/random-scheduler';
import { TranslationWorker } from './translation-worker';
import { loadConfig, WorkerConfig } from './config';

class WorkerService {
  private config: WorkerConfig;
  private database: DatabaseManager;
  private translationDatabase: DatabaseManager;
  private sparhamsterFetcher?: SparhamsterFetcher;
  private preisjaegerFetcher?: PreisjaegerFetcher;
  private translationWorker?: TranslationWorker;
  private sparhamsterScheduler?: RandomScheduler;
  private preisjaegerScheduler?: RandomScheduler;
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

    // 初始化 Sparhamster Fetcher (如果启用)
    const sparhamsterEnabled = process.env.SPARHAMSTER_ENABLED !== 'false'; // 默认启用
    if (sparhamsterEnabled) {
      this.sparhamsterFetcher = new SparhamsterFetcher(this.database);
    }

    // 初始化 Preisjaeger Fetcher (如果启用)
    const preisjaegerEnabled = process.env.PREISJAEGER_ENABLED === 'true';
    if (preisjaegerEnabled) {
      this.preisjaegerFetcher = new PreisjaegerFetcher(this.database);
    }

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
    console.log(`  - Sparhamster: ${this.sparhamsterFetcher ? '启用' : '禁用'}`);
    console.log(`  - Preisjaeger: ${this.preisjaegerFetcher ? '启用' : '禁用'}`);
    console.log(`  - 翻译: ${this.config.translation.enabled ? '启用' : '禁用'}`);

    try {
      // 1. 连接数据库
      await this.database.connect();

      if (this.config.translation.enabled && this.translationWorker) {
        await this.translationDatabase.connect();
      }

      // 2. 设置 Sparhamster 随机调度器（如果启用）
      if (this.sparhamsterFetcher) {
        const minIntervalSeconds = this.config.fetch.interval * 60;
        const maxIntervalSeconds =
          this.config.fetch.interval * 60 +
          this.config.fetch.randomDelayMax * 60;

        this.sparhamsterScheduler = new RandomScheduler(
          {
            taskName: 'Sparhamster 抓取任务',
            minIntervalSeconds,
            maxIntervalSeconds,
          },
          async () => {
            await this.fetchSparhamster();
          }
        );

        // 3. 启动 Sparhamster 调度器
        this.sparhamsterScheduler.start();
        console.log('✅ Sparhamster 调度器启动成功');
      }

      // 4. 设置 Preisjaeger 调度器（如果启用）
      if (this.preisjaegerFetcher) {
        const preisjaegerInterval = Number(process.env.PREISJAEGER_FETCH_INTERVAL || '30') * 60;
        this.preisjaegerScheduler = new RandomScheduler(
          {
            taskName: 'Preisjaeger 抓取任务',
            minIntervalSeconds: preisjaegerInterval,
            maxIntervalSeconds: preisjaegerInterval + 300, // +5分钟随机延迟
          },
          async () => {
            await this.fetchPreisjaeger();
          }
        );
        this.preisjaegerScheduler.start();
        console.log('✅ Preisjaeger 调度器启动成功');
      }

      // 5. 启动翻译 Worker (如果启用)
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

      // 6. 立即执行一次抓取
      if (this.sparhamsterFetcher) {
        console.log('🔄 执行首次 Sparhamster 抓取...');
        await this.fetchSparhamster();
      }

      // 执行首次 Preisjaeger 抓取（如果启用）
      if (this.preisjaegerFetcher) {
        console.log('🔄 执行首次 Preisjaeger 抓取...');
        await this.fetchPreisjaeger();
      }

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
   * 抓取 Sparhamster 数据
   */
  private async fetchSparhamster(): Promise<void> {
    if (!this.sparhamsterFetcher) {
      return;
    }

    const startTime = Date.now();

    try {
      console.log('\n🔄 开始抓取 Sparhamster 优惠...');

      const result = await this.sparhamsterFetcher.fetchLatest();

      const duration = Date.now() - startTime;

      console.log('\n📊 Sparhamster 抓取任务完成:');
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

      // 抓取完成后，立即检查并翻译待翻译的内容
      if (this.translationWorker) {
        console.log('\n🌐 抓取完成，检查待翻译内容...');
        await this.translationWorker.processTranslationJobs();
      }
    } catch (error) {
      console.error('❌ Sparhamster 抓取任务失败:', error);
    }
  }

  /**
   * 抓取 Preisjaeger 数据
   */
  private async fetchPreisjaeger(): Promise<void> {
    if (!this.preisjaegerFetcher) {
      return;
    }

    const startTime = Date.now();

    try {
      console.log('\n🔄 开始抓取 Preisjaeger 优惠...');

      const result = await this.preisjaegerFetcher.fetchLatest();

      const duration = Date.now() - startTime;

      console.log('\n📊 Preisjaeger 抓取任务完成:');
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

      // 抓取完成后，立即检查并翻译待翻译的内容
      if (this.translationWorker) {
        console.log('\n🌐 抓取完成，检查待翻译内容...');
        await this.translationWorker.processTranslationJobs();
      }
    } catch (error) {
      console.error('❌ Preisjaeger 抓取任务失败:', error);
    }
  }

  /**
   * 优雅关闭
   */
  private async shutdown(): Promise<void> {
    console.log('\n🛑 开始关闭 Worker 服务...');

    try {
      // 停止所有调度器，等待当前任务完成
      const stopPromises: Promise<void>[] = [];

      if (this.sparhamsterScheduler) {
        stopPromises.push(this.sparhamsterScheduler.stop());
      }

      if (this.preisjaegerScheduler) {
        stopPromises.push(this.preisjaegerScheduler.stop());
      }

      if (this.translationScheduler) {
        stopPromises.push(this.translationScheduler.stop());
      }

      // 等待所有调度器停止（包括当前任务完成）
      await Promise.all(stopPromises);
      console.log('⏰ 所有调度器已停止');

      // 关闭数据库连接
      await this.database.close();
      console.log('🗄️ 主数据库连接已关闭');

      if (this.translationDatabase && this.config.translation.enabled) {
        await this.translationDatabase.close();
        console.log('🗄️ 翻译数据库连接已关闭');
      }

      console.log('✅ Worker 服务已完全关闭');
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
      status: {
        sparhamster: this.sparhamsterScheduler?.getIsRunning() ? 'running' : 'stopped',
        preisjaeger: this.preisjaegerScheduler?.getIsRunning() ? 'running' : 'stopped',
        translation: this.translationScheduler?.getIsRunning() ? 'running' : 'stopped',
      },
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      config: {
        fetchInterval: this.config.fetch.interval,
        translationEnabled: this.config.translation.enabled,
        sparhamsterEnabled: !!this.sparhamsterFetcher,
        preisjaegerEnabled: !!this.preisjaegerFetcher,
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
