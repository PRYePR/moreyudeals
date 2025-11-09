/**
 * Microsoft Translator 翻译服务提供商实现
 * 支持 Azure Cognitive Services Translator API
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

interface MicrosoftConfig {
  apiKey: string;
  region?: string; // 可选，如果使用全球端点可以不提供
  endpoint?: string;
  timeout?: number;
}

interface MicrosoftTranslateResponse {
  translations: Array<{
    text: string;
    to: string;
  }>;
  detectedLanguage?: {
    language: string;
    score: number;
  };
}

export class MicrosoftProvider implements TranslationProvider {
  public readonly name = 'microsoft' as const;
  private client: AxiosInstance;
  private config: MicrosoftConfig;
  private dailyUsage = 0;
  private lastResetDate = new Date().toDateString();

  constructor(config: MicrosoftConfig) {
    this.config = {
      endpoint: 'https://api.cognitive.microsofttranslator.com',
      timeout: 10000,
      ...config
    };

    const headers: Record<string, string> = {
      'Ocp-Apim-Subscription-Key': this.config.apiKey,
      'Content-Type': 'application/json'
    };

    // 如果提供了区域，添加区域头
    if (this.config.region) {
      headers['Ocp-Apim-Subscription-Region'] = this.config.region;
    }

    this.client = axios.create({
      baseURL: this.config.endpoint,
      timeout: this.config.timeout,
      headers
    });
  }

  /**
   * 检查服务健康状态
   */
  async isHealthy(): Promise<boolean> {
    try {
      // 使用 languages 端点检查 API 状态
      const response = await this.client.get('/languages?api-version=3.0');
      return response.status === 200;
    } catch (error) {
      console.error('Microsoft Translator 健康检查失败:', error);
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

      // 构建请求体
      const body = [{ text: input.text }];

      // 构建 URL 参数
      const params = new URLSearchParams({
        'api-version': '3.0',
        'from': sourceLanguage,
        'to': targetLanguage,
        'textType': 'html' // 支持 HTML 内容
      });

      // 发送翻译请求
      const response = await this.client.post<MicrosoftTranslateResponse[]>(
        `/translate?${params.toString()}`,
        body
      );

      if (!response.data || response.data.length === 0 || !response.data[0].translations) {
        throw new TranslationError('Microsoft Translator 返回空翻译结果', 'microsoft');
      }

      const result = response.data[0];
      const translation = result.translations[0];

      // 更新使用统计
      this.updateDailyUsage(input.text.length);

      return {
        translatedText: translation.text,
        provider: 'microsoft',
        confidence: result.detectedLanguage?.score || 0.9,
        detectedLanguage: result.detectedLanguage
          ? this.mapMicrosoftLanguage(result.detectedLanguage.language)
          : input.from,
        cacheHit: false,
        translatedAt: new Date()
      };

    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const errorCode = error.response?.data?.error?.code;
        const message = error.response?.data?.error?.message || error.message;

        // 处理配额超限 (403 Forbidden with specific error)
        if (status === 403 && (errorCode === '403000' || message.includes('quota'))) {
          throw new QuotaExceededError('microsoft', 'character limit or rate limit');
        }

        // 处理认证错误
        if (status === 401 || status === 403) {
          throw new TranslationError('Microsoft Translator API 密钥无效或未授权', 'microsoft', error);
        }

        // 处理其他 HTTP 错误
        throw new TranslationError(
          `Microsoft Translator API 错误 (${status}): ${message}`,
          'microsoft',
          error
        );
      }

      // 处理其他错误
      throw new TranslationError(
        `Microsoft Translator 翻译失败: ${(error as Error).message}`,
        'microsoft',
        error as Error
      );
    }
  }

  /**
   * 获取使用情况统计
   */
  async getUsage(): Promise<ProviderUsage> {
    // Microsoft Translator 不提供实时配额查询 API
    // 返回本地统计
    return {
      requestsToday: this.dailyUsage,
      quotaLimit: 2000000, // 免费版每月 2M 字符
      quotaRemaining: undefined
    };
  }

  /**
   * 映射内部语言代码到 Microsoft 格式
   */
  private mapLanguageCode(language: LanguageCode): string {
    const mapping: Record<LanguageCode, string> = {
      'de': 'de',
      'zh': 'zh-Hans', // 简体中文
      'en': 'en'
    };

    return mapping[language] || language;
  }

  /**
   * 映射 Microsoft 语言代码到内部格式
   */
  private mapMicrosoftLanguage(msLang: string): LanguageCode {
    const mapping: Record<string, LanguageCode> = {
      'de': 'de',
      'zh-Hans': 'zh',
      'zh-Hant': 'zh',
      'zh': 'zh',
      'en': 'en'
    };

    return mapping[msLang] || 'de';
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
}
