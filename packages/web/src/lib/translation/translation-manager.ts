/**
 * 翻译管理器核心实现
 * 管理多个Provider，实现智能路由和故障转移
 */

import { createHash } from 'crypto';
import { createClient, RedisClientType } from 'redis';
import {
  TranslationManager,
  TranslationProvider,
  TranslationInput,
  TranslationOutput,
  TranslationRouteConfig,
  ProviderStatus,
  ProviderName,
  CacheKeyConfig,
  TranslationError,
  QuotaExceededError
} from './types';
import { createModuleLogger } from '../logger';

const logger = createModuleLogger('translation');

export class CoreTranslationManager implements TranslationManager {
  private providers = new Map<ProviderName, TranslationProvider>();
  private redisClient: RedisClientType | null = null;
  private config: TranslationRouteConfig;

  constructor(
    config: Partial<TranslationRouteConfig> = {},
    redisUrl?: string
  ) {
    // 默认配置
    this.config = {
      primary: 'deepl',
      fallback: ['microsoft', 'google'],
      maxRetries: 3,
      cacheEnabled: true,
      cacheTTL: 3600 * 24, // 24小时
      ...config
    };

    // 初始化Redis连接
    if (redisUrl && this.config.cacheEnabled) {
      this.initRedis(redisUrl);
    }
  }

  /**
   * 初始化Redis客户端
   */
  private async initRedis(redisUrl: string): Promise<void> {
    try {
      this.redisClient = createClient({ url: redisUrl });
      await this.redisClient.connect();
      logger.info('Redis连接成功');
    } catch (error) {
      logger.warn('Redis连接失败，禁用缓存功能', { error });
      this.redisClient = null;
    }
  }

  /**
   * 添加翻译Provider
   */
  addProvider(provider: TranslationProvider): void {
    this.providers.set(provider.name, provider);
    logger.info('添加翻译Provider', { provider: provider.name });
  }

  /**
   * 移除翻译Provider
   */
  removeProvider(name: ProviderName): void {
    if (this.providers.delete(name)) {
      logger.info('移除翻译Provider', { provider: name });
    }
  }

  /**
   * 核心翻译方法
   */
  async translate(input: TranslationInput): Promise<TranslationOutput> {
    const startTime = Date.now();

    // 1. 检查缓存
    if (this.config.cacheEnabled) {
      const cached = await this.getFromCache(input);
      if (cached) {
        logger.debug('缓存命中', { textPreview: input.text.substring(0, 50) });
        return cached;
      }
    }

    // 2. 选择Provider进行翻译
    const providers = this.getProviderSequence();
    let lastError: Error | null = null;

    for (const providerName of providers) {
      const provider = this.providers.get(providerName);
      if (!provider) continue;

      try {
        // 检查Provider健康状态
        const isHealthy = await provider.isHealthy();
        if (!isHealthy) {
          logger.warn('Provider不健康，跳过', { provider: providerName });
          continue;
        }

        // 执行翻译
        logger.debug('使用Provider翻译', {
          provider: providerName,
          textPreview: input.text.substring(0, 50)
        });
        const result = await provider.translate(input);

        // 记录翻译时间
        const duration = Date.now() - startTime;
        logger.info('翻译完成', { provider: providerName, duration });

        // 缓存结果
        if (this.config.cacheEnabled) {
          await this.saveToCache(input, result);
        }

        return result;

      } catch (error) {
        lastError = error as Error;
        logger.error('Provider翻译失败', error as Error, { provider: providerName });

        // 如果是配额错误，记录但继续尝试其他Provider
        if (error instanceof QuotaExceededError) {
          logger.warn('Provider配额超限，尝试备用Provider', { provider: providerName });
          continue;
        }

        // 其他错误也继续尝试
        continue;
      }
    }

    // 所有Provider都失败
    throw new TranslationError(
      `所有翻译Provider都失败了。最后错误: ${lastError?.message}`,
      'deepl', // 默认provider
      lastError || undefined
    );
  }

  /**
   * 获取Provider执行序列
   */
  private getProviderSequence(): ProviderName[] {
    const sequence: ProviderName[] = [];

    // 主Provider
    if (this.providers.has(this.config.primary)) {
      sequence.push(this.config.primary);
    }

    // 备用Providers
    for (const fallback of this.config.fallback) {
      if (this.providers.has(fallback) && !sequence.includes(fallback)) {
        sequence.push(fallback);
      }
    }

    return sequence;
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(config: CacheKeyConfig): string {
    const text = `${config.text}:${config.from}:${config.to}`;
    return `translation:${createHash('md5').update(text).digest('hex')}`;
  }

  /**
   * 从缓存获取翻译结果
   */
  private async getFromCache(input: TranslationInput): Promise<TranslationOutput | null> {
    if (!this.redisClient) return null;

    try {
      const key = this.generateCacheKey(input);
      const cached = await this.redisClient.get(key);

      if (cached) {
        const result: TranslationOutput = JSON.parse(cached);
        result.cacheHit = true;
        return result;
      }
    } catch (error) {
      logger.warn('缓存读取失败', { error });
    }

    return null;
  }

  /**
   * 保存翻译结果到缓存
   */
  private async saveToCache(input: TranslationInput, output: TranslationOutput): Promise<void> {
    if (!this.redisClient) return;

    try {
      const key = this.generateCacheKey(input);
      const cacheData = { ...output, cacheHit: false };

      await this.redisClient.setEx(
        key,
        this.config.cacheTTL,
        JSON.stringify(cacheData)
      );
    } catch (error) {
      logger.warn('缓存保存失败', { error });
    }
  }

  /**
   * 获取所有Provider状态
   */
  async getProviderStatus(): Promise<ProviderStatus[]> {
    const statuses: ProviderStatus[] = [];

    for (const [name, provider] of this.providers) {
      try {
        const [healthy, usage] = await Promise.all([
          provider.isHealthy(),
          provider.getUsage()
        ]);

        statuses.push({
          name,
          healthy,
          usage,
          lastChecked: new Date()
        });
      } catch (error) {
        statuses.push({
          name,
          healthy: false,
          usage: { requestsToday: 0 },
          lastError: (error as Error).message,
          lastChecked: new Date()
        });
      }
    }

    return statuses;
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<TranslationRouteConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('翻译配置已更新', { config: this.config });
  }

  /**
   * 关闭连接
   */
  async close(): Promise<void> {
    if (this.redisClient) {
      await this.redisClient.quit();
      logger.info('Redis连接已关闭');
    }
  }
}