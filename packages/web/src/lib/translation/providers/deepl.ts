/**
 * DeepL 翻译服务提供商实现
 * 支持免费版和专业版API
 */

import axios, { AxiosInstance } from 'axios';
import {
  TranslationProvider,
  TranslationInput,
  TranslationOutput,
  ProviderUsage,
  LanguageCode,
  TranslationError,
  QuotaExceededError
} from '../types';
import { createModuleLogger } from '../../logger';

const logger = createModuleLogger('translation:deepl');

interface DeepLConfig {
  apiKey: string;
  endpoint?: string; // 默认使用免费版端点
  timeout?: number;
}

interface DeepLResponse {
  translations: Array<{
    detected_source_language: string;
    text: string;
  }>;
}

interface DeepLUsageResponse {
  character_count: number;
  character_limit: number;
}

export class DeepLProvider implements TranslationProvider {
  public readonly name = 'deepl' as const;
  private client: AxiosInstance;
  private config: DeepLConfig;
  private dailyUsage = 0;
  private lastResetDate = new Date().toDateString();

  constructor(config: DeepLConfig) {
    this.config = {
      endpoint: 'https://api-free.deepl.com/v2', // 免费版默认端点
      timeout: 10000,
      ...config
    };

    this.client = axios.create({
      baseURL: this.config.endpoint,
      timeout: this.config.timeout,
      headers: {
        'Authorization': `DeepL-Auth-Key ${this.config.apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
  }

  /**
   * 检查服务健康状态
   */
  async isHealthy(): Promise<boolean> {
    try {
      // 使用usage端点检查API状态
      const response = await this.client.get('/usage');
      return response.status === 200;
    } catch (error) {
      logger.error('DeepL健康检查失败', error as Error);
      return false;
    }
  }

  /**
   * 执行翻译
   */
  async translate(input: TranslationInput): Promise<TranslationOutput> {
    const startTime = Date.now();

    try {
      // 映射语言代码
      const sourceLanguage = this.mapLanguageCode(input.from);
      const targetLanguage = this.mapLanguageCode(input.to);

      // 构建请求参数
      const params = new URLSearchParams({
        text: input.text,
        source_lang: sourceLanguage,
        target_lang: targetLanguage,
        preserve_formatting: '1'
      });

      // 发送翻译请求
      const response = await this.client.post<DeepLResponse>('/translate', params);

      if (!response.data.translations || response.data.translations.length === 0) {
        throw new TranslationError('DeepL返回空翻译结果', 'deepl');
      }

      const translation = response.data.translations[0];

      // 更新使用统计
      this.updateDailyUsage(input.text.length);

      return {
        translatedText: translation.text,
        provider: 'deepl',
        confidence: 0.95, // DeepL通常有很高的准确度
        detectedLanguage: this.mapDeepLLanguage(translation.detected_source_language),
        cacheHit: false,
        translatedAt: new Date()
      };

    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const message = error.response?.data?.message || error.message;

        // 处理配额超限
        if (status === 456) {
          throw new QuotaExceededError('deepl', 'character limit');
        }

        // 处理认证错误
        if (status === 403) {
          throw new TranslationError('DeepL API密钥无效', 'deepl', error);
        }

        // 处理其他HTTP错误
        throw new TranslationError(
          `DeepL API错误 (${status}): ${message}`,
          'deepl',
          error
        );
      }

      // 处理其他错误
      throw new TranslationError(
        `DeepL翻译失败: ${(error as Error).message}`,
        'deepl',
        error as Error
      );
    }
  }

  /**
   * 获取使用情况统计
   */
  async getUsage(): Promise<ProviderUsage> {
    try {
      const response = await this.client.get<DeepLUsageResponse>('/usage');
      const usage = response.data;

      return {
        requestsToday: this.dailyUsage,
        quotaLimit: usage.character_limit,
        quotaRemaining: usage.character_limit - usage.character_count,
        costToday: this.calculateCost(usage.character_count)
      };
    } catch (error) {
      logger.warn('获取DeepL使用统计失败', { error });
      return {
        requestsToday: this.dailyUsage,
        quotaLimit: 500000, // 免费版默认限制
        quotaRemaining: undefined
      };
    }
  }

  /**
   * 映射内部语言代码到DeepL格式
   */
  private mapLanguageCode(language: LanguageCode): string {
    const mapping: Record<LanguageCode, string> = {
      'de': 'DE',
      'zh': 'ZH',
      'en': 'EN'
    };

    return mapping[language] || language.toUpperCase();
  }

  /**
   * 映射DeepL语言代码到内部格式
   */
  private mapDeepLLanguage(deeplLang: string): LanguageCode {
    const mapping: Record<string, LanguageCode> = {
      'DE': 'de',
      'ZH': 'zh',
      'EN': 'en'
    };

    return mapping[deeplLang] || 'de';
  }

  /**
   * 更新每日使用统计
   */
  private updateDailyUsage(characters: number): void {
    const today = new Date().toDateString();

    if (this.lastResetDate !== today) {
      this.dailyUsage = 0;
      this.lastResetDate = today;
    }

    this.dailyUsage += characters;
  }

  /**
   * 计算费用估算 (免费版为0)
   */
  private calculateCost(characters: number): number {
    // 免费版不收费
    if (this.config.endpoint?.includes('api-free')) {
      return 0;
    }

    // 专业版按字符收费，约€20/百万字符
    const ratePerMillion = 20;
    return (characters / 1000000) * ratePerMillion;
  }
}