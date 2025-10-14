/**
 * Random Scheduler
 * 随机间隔调度器,避免固定时间模式被识别为爬虫
 *
 * 功能:
 * - 在配置的最小/最大间隔范围内随机调度任务
 * - 任务执行完成后自动调度下一次
 * - 支持优雅启动/停止
 * - 任务失败不影响后续调度
 */

/**
 * 调度器配置
 */
export interface SchedulerConfig {
  /** 最小间隔 (秒) */
  minIntervalSeconds: number;
  /** 最大间隔 (秒) */
  maxIntervalSeconds: number;
  /** 任务名称 (用于日志) */
  taskName: string;
}

/**
 * 随机调度器
 * 在指定的时间范围内随机调度任务执行
 */
export class RandomScheduler {
  private timeoutId?: NodeJS.Timeout;
  private isRunning: boolean = false;

  constructor(
    private readonly config: SchedulerConfig,
    private readonly task: () => Promise<void>
  ) {
    this.validateConfig();
  }

  /**
   * 验证配置参数
   */
  private validateConfig(): void {
    const { minIntervalSeconds, maxIntervalSeconds } = this.config;

    if (minIntervalSeconds <= 0) {
      throw new Error('minIntervalSeconds 必须大于 0');
    }

    if (maxIntervalSeconds < minIntervalSeconds) {
      throw new Error('maxIntervalSeconds 必须大于或等于 minIntervalSeconds');
    }
  }

  /**
   * 启动调度器
   */
  start(): void {
    if (this.isRunning) {
      console.warn(`⚠️ 调度器 ${this.config.taskName} 已经在运行`);
      return;
    }

    this.isRunning = true;
    console.log(`🚀 启动随机调度器: ${this.config.taskName}`);
    console.log(`   间隔范围: ${this.config.minIntervalSeconds}-${this.config.maxIntervalSeconds} 秒`);

    this.scheduleNext();
  }

  /**
   * 停止调度器
   */
  stop(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = undefined;
    }

    this.isRunning = false;
    console.log(`🛑 停止调度器: ${this.config.taskName}`);
  }

  /**
   * 调度器是否正在运行
   */
  getIsRunning(): boolean {
    return this.isRunning;
  }

  /**
   * 调度下一次任务执行
   */
  private scheduleNext(): void {
    if (!this.isRunning) return;

    const intervalSeconds = this.getRandomInterval();
    const nextRunAt = new Date(Date.now() + intervalSeconds * 1000);

    console.log(
      `⏰ 下次执行 ${this.config.taskName}: ${nextRunAt.toLocaleString()} (${intervalSeconds} 秒后)`
    );

    this.timeoutId = setTimeout(async () => {
      await this.executeTask();
      this.scheduleNext(); // 递归调度下一次
    }, intervalSeconds * 1000);
  }

  /**
   * 执行任务
   */
  private async executeTask(): Promise<void> {
    const startTime = Date.now();
    console.log(`🔄 开始执行任务: ${this.config.taskName}`);

    try {
      await this.task();
      const duration = Date.now() - startTime;
      console.log(`✅ 任务完成: ${this.config.taskName} (耗时 ${duration}ms)`);
    } catch (error) {
      console.error(`❌ 任务失败: ${this.config.taskName}`, error);
      // 注意: 任务失败不影响下次调度,会在 scheduleNext() 中继续
    }
  }

  /**
   * 生成随机间隔时间 (秒)
   */
  private getRandomInterval(): number {
    const { minIntervalSeconds, maxIntervalSeconds } = this.config;
    return Math.floor(
      Math.random() * (maxIntervalSeconds - minIntervalSeconds + 1) + minIntervalSeconds
    );
  }
}
