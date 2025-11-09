/**
 * Moreyudeals 翻译系统核心类型定义
 * 支持多Provider架构 (DeepL/Microsoft/Google)
 */

// 支持的语言代码
export type LanguageCode = 'de' | 'zh' | 'en';

// 翻译Provider名称
export type ProviderName = 'deepl' | 'microsoft' | 'microsoft2' | 'google';

// 翻译优先级
export type TranslationPriority = 'high' | 'normal' | 'low';

/**
 * 翻译输入参数
 */
export interface TranslationInput {
  text: string;
  from: LanguageCode;
  to: LanguageCode;
  priority?: TranslationPriority;
  context?: string; // 上下文信息，用于提高翻译质量
}

/**
 * 翻译输出结果
 */
export interface TranslationOutput {
  translatedText: string;
  provider: ProviderName;
  confidence?: number; // 翻译置信度 0-1
  detectedLanguage?: LanguageCode; // 检测到的源语言
  cacheHit: boolean; // 是否从缓存获取
  translatedAt: Date;
}

/**
 * 翻译Provider接口
 * 每个翻译服务都需要实现此接口
 */
export interface TranslationProvider {
  name: ProviderName;
  isHealthy(): Promise<boolean>;
  translate(input: TranslationInput): Promise<TranslationOutput>;
  getUsage(): Promise<ProviderUsage>;
}

/**
 * Provider使用情况统计
 */
export interface ProviderUsage {
  requestsToday: number;
  quotaLimit?: number; // 每日配额限制
  quotaRemaining?: number; // 剩余配额
  costToday?: number; // 今日费用
}

/**
 * 翻译路由配置
 */
export interface TranslationRouteConfig {
  primary: ProviderName; // 主要Provider
  fallback: ProviderName[]; // 备用Provider列表
  maxRetries: number; // 最大重试次数
  cacheEnabled: boolean; // 是否启用缓存
  cacheTTL: number; // 缓存过期时间(秒)
}

/**
 * 翻译管理器接口
 */
export interface TranslationManager {
  translate(input: TranslationInput): Promise<TranslationOutput>;
  addProvider(provider: TranslationProvider): void;
  removeProvider(name: ProviderName): void;
  getProviderStatus(): Promise<ProviderStatus[]>;
  updateConfig(config: Partial<TranslationRouteConfig>): void;
}

/**
 * Provider状态信息
 */
export interface ProviderStatus {
  name: ProviderName;
  healthy: boolean;
  usage: ProviderUsage;
  lastError?: string;
  lastChecked: Date;
}

/**
 * 缓存键生成配置
 */
export interface CacheKeyConfig {
  text: string;
  from: LanguageCode;
  to: LanguageCode;
  provider?: ProviderName; // 可选，用于Provider特定缓存
}

/**
 * 翻译错误类型
 */
export class TranslationError extends Error {
  constructor(
    message: string,
    public provider: ProviderName,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'TranslationError';
  }
}

/**
 * 配额超限错误
 */
export class QuotaExceededError extends TranslationError {
  constructor(provider: ProviderName, quotaType: string) {
    super(`Quota exceeded for ${provider}: ${quotaType}`, provider);
    this.name = 'QuotaExceededError';
  }
}