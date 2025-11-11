/**
 * API Health Monitor (API 健康检测服务)
 *
 * 功能：
 * 1. 检测 API 连续失败次数
 * 2. 达到阈值时自动切换到降级模式
 * 3. 24小时后自动恢复尝试 API
 * 4. 记录失败历史和恢复时间
 *
 * 降级策略：
 * - 连续失败 < 3次：仅报警，继续使用 API
 * - 连续失败 ≥ 3次：切换降级模式（24小时）
 * - 24小时后：自动恢复尝试 API
 */

/**
 * 健康状态
 */
export type HealthStatus = 'healthy' | 'degraded';

/**
 * 失败记录
 */
export interface FailureRecord {
  timestamp: Date;
  error: string;
}

/**
 * API 健康监控器配置
 */
interface MonitorConfig {
  failureThreshold: number;     // 失败阈值（默认3次）
  degradedDuration: number;      // 降级持续时间（毫秒，默认24小时）
  maxFailureHistory: number;     // 最大失败历史记录数
}

/**
 * API Health Monitor
 */
export class ApiHealthMonitor {
  private consecutiveFailures: number = 0;
  private failureHistory: FailureRecord[] = [];
  private lastFailureTime?: Date;
  private degradedMode: boolean = false;
  private degradedUntil?: Date;
  private readonly config: MonitorConfig;

  constructor(config?: Partial<MonitorConfig>) {
    this.config = {
      failureThreshold: config?.failureThreshold || 3,
      degradedDuration: config?.degradedDuration || 24 * 60 * 60 * 1000, // 24小时
      maxFailureHistory: config?.maxFailureHistory || 50,
    };
  }

  /**
   * 检查当前健康状态
   */
  checkHealth(): HealthStatus {
    // 如果在降级期间，检查是否到期
    if (this.degradedMode && this.degradedUntil) {
      if (Date.now() >= this.degradedUntil.getTime()) {
        console.log('✅ 降级模式到期，尝试恢复 API');
        this.degradedMode = false;
        this.degradedUntil = undefined;
        this.consecutiveFailures = 0; // 重置失败计数
        return 'healthy';
      }

      const remainingHours = Math.ceil(
        (this.degradedUntil.getTime() - Date.now()) / (60 * 60 * 1000)
      );
      console.log(`⏸️  当前处于降级模式，剩余 ${remainingHours} 小时`);
      return 'degraded';
    }

    // 检查是否需要进入降级模式
    if (this.consecutiveFailures >= this.config.failureThreshold) {
      this.enterDegradedMode();
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * 记录成功（重置失败计数）
   */
  recordSuccess(): void {
    if (this.consecutiveFailures > 0) {
      console.log(`✅ API 恢复正常，重置失败计数（之前失败 ${this.consecutiveFailures} 次）`);
    }

    this.consecutiveFailures = 0;
    this.lastFailureTime = undefined;

    // 如果之前在降级模式，标记恢复成功
    if (this.degradedMode) {
      console.log('🎉 API 恢复成功，退出降级模式');
      this.degradedMode = false;
      this.degradedUntil = undefined;
    }
  }

  /**
   * 记录失败
   */
  recordFailure(error: string): void {
    this.consecutiveFailures++;
    this.lastFailureTime = new Date();

    // 添加到失败历史
    this.failureHistory.push({
      timestamp: new Date(),
      error,
    });

    // 限制历史记录数量
    if (this.failureHistory.length > this.config.maxFailureHistory) {
      this.failureHistory.shift();
    }

    // 日志输出
    if (this.consecutiveFailures < this.config.failureThreshold) {
      console.warn(
        `⚠️  API 失败 (${this.consecutiveFailures}/${this.config.failureThreshold}): ${error}`
      );
    } else if (this.consecutiveFailures === this.config.failureThreshold) {
      console.error(
        `❌ API 连续失败 ${this.consecutiveFailures} 次，即将切换到降级模式`
      );
    } else {
      console.error(
        `❌ API 连续失败 ${this.consecutiveFailures} 次: ${error}`
      );
    }
  }

  /**
   * 进入降级模式
   */
  private enterDegradedMode(): void {
    if (!this.degradedMode) {
      this.degradedMode = true;
      this.degradedUntil = new Date(Date.now() + this.config.degradedDuration);

      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('⚠️  切换到降级模式');
      console.error(`   原因: API 连续失败 ${this.consecutiveFailures} 次`);
      console.error(`   持续时间: ${this.config.degradedDuration / (60 * 60 * 1000)} 小时`);
      console.error(`   恢复时间: ${this.degradedUntil.toLocaleString()}`);
      console.error('   策略: 使用纯 HTML 抓取模式');
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }
  }

  /**
   * 手动重置（用于测试或紧急恢复）
   */
  reset(): void {
    console.log('🔄 手动重置健康监控器');
    this.consecutiveFailures = 0;
    this.lastFailureTime = undefined;
    this.degradedMode = false;
    this.degradedUntil = undefined;
    this.failureHistory = [];
  }

  /**
   * 获取当前状态摘要
   */
  getStatus(): {
    status: HealthStatus;
    consecutiveFailures: number;
    lastFailureTime?: Date;
    degradedUntil?: Date;
    recentFailures: FailureRecord[];
  } {
    const status = this.checkHealth();

    return {
      status,
      consecutiveFailures: this.consecutiveFailures,
      lastFailureTime: this.lastFailureTime,
      degradedUntil: this.degradedUntil,
      recentFailures: this.failureHistory.slice(-10), // 最近10次失败
    };
  }

  /**
   * 是否处于降级模式
   */
  isDegraded(): boolean {
    return this.checkHealth() === 'degraded';
  }

  /**
   * 获取失败历史
   */
  getFailureHistory(): FailureRecord[] {
    return [...this.failureHistory];
  }

  /**
   * 获取失败率（最近N次请求）
   */
  getFailureRate(lastN: number = 10): number {
    const recentFailures = this.failureHistory.slice(-lastN);
    if (recentFailures.length === 0) return 0;

    // 简化版：假设每次记录的失败都是一次请求
    // 实际应该根据成功/失败总数计算，但这里只记录失败
    return recentFailures.length / lastN;
  }
}
