/**
 * Environment Variables Validator
 * 在启动时检查所有必需的环境变量
 */

export interface ValidatedConfig {
  // 数据库配置
  database: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
  };

  // Sparhamster API 抓取配置
  sparhamster: {
    minIntervalSeconds: number;
    maxIntervalSeconds: number;
  };

  // 翻译配置
  translation: {
    enabled: boolean;
    minIntervalSeconds: number;
    maxIntervalSeconds: number;
    batchSize: number;
    targetLanguages: string[];
    providers: string[];
    deepl: {
      apiKey: string;
      endpoint: string;
    };
  };

  // Worker 配置
  worker: {
    maxRetries: number;
  };

  // Redis 配置
  redis: {
    url: string;
  };

  // 日志配置
  log: {
    level: string;
  };
}

export class EnvValidator {
  /**
   * 验证环境变量并返回类型安全的配置对象
   * @throws Error 如果验证失败
   */
  static validate(): ValidatedConfig {
    const errors: string[] = [];

    // 验证数据库配置
    const dbHost = process.env.DB_HOST;
    const dbPort = this.validateNumber('DB_PORT', process.env.DB_PORT, errors);
    const dbName = process.env.DB_NAME;
    const dbUser = process.env.DB_USER;
    const dbPassword = process.env.DB_PASSWORD;

    if (!dbHost) errors.push('DB_HOST is required');
    if (!dbName) errors.push('DB_NAME is required');
    if (!dbUser) errors.push('DB_USER is required');
    // DB_PASSWORD 可以为空（本地开发）

    // 验证 Sparhamster 抓取配置
    const sparhamsterMinInterval = this.validateNumber(
      'SPARHAMSTER_FETCH_INTERVAL_MIN',
      process.env.SPARHAMSTER_FETCH_INTERVAL_MIN,
      errors,
      60 // 最小 60 秒
    );
    const sparhamsterMaxInterval = this.validateNumber(
      'SPARHAMSTER_FETCH_INTERVAL_MAX',
      process.env.SPARHAMSTER_FETCH_INTERVAL_MAX,
      errors,
      60 // 最小 60 秒
    );

    // 验证间隔范围
    if (
      sparhamsterMinInterval !== undefined &&
      sparhamsterMaxInterval !== undefined &&
      sparhamsterMinInterval >= sparhamsterMaxInterval
    ) {
      errors.push('SPARHAMSTER_FETCH_INTERVAL_MIN must be less than SPARHAMSTER_FETCH_INTERVAL_MAX');
    }

    // 验证翻译配置
    const translationEnabled = process.env.TRANSLATION_ENABLED !== 'false';
    const translationMinInterval = this.validateNumber(
      'TRANSLATION_INTERVAL_MIN',
      process.env.TRANSLATION_INTERVAL_MIN,
      errors,
      60 // 最小 60 秒
    );
    const translationMaxInterval = this.validateNumber(
      'TRANSLATION_INTERVAL_MAX',
      process.env.TRANSLATION_INTERVAL_MAX,
      errors,
      60 // 最小 60 秒
    );
    const translationBatchSize = this.validateNumber(
      'TRANSLATION_BATCH_SIZE',
      process.env.TRANSLATION_BATCH_SIZE,
      errors,
      1 // 最小 1
    );

    // 验证翻译间隔范围
    if (
      translationMinInterval !== undefined &&
      translationMaxInterval !== undefined &&
      translationMinInterval >= translationMaxInterval
    ) {
      errors.push('TRANSLATION_INTERVAL_MIN must be less than TRANSLATION_INTERVAL_MAX');
    }

    const targetLanguages = (process.env.TRANSLATION_TARGET_LANGUAGES || 'zh,en')
      .split(',')
      .map((l) => l.trim());
    const providers = (process.env.TRANSLATION_PROVIDERS || 'deepl')
      .split(',')
      .map((p) => p.trim());

    // 如果启用翻译且使用 DeepL，验证 API Key
    const deeplApiKey = process.env.DEEPL_API_KEY || '';
    const deeplEndpoint = process.env.DEEPL_ENDPOINT || 'https://api-free.deepl.com/v2';

    if (translationEnabled && providers.includes('deepl') && !deeplApiKey) {
      errors.push('DEEPL_API_KEY is required when translation is enabled with deepl provider');
    }

    // 验证 Worker 配置
    const maxRetries = this.validateNumber('MAX_RETRIES', process.env.MAX_RETRIES, errors, 1);

    // 验证 Redis 配置
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) errors.push('REDIS_URL is required');

    // 验证日志级别
    const logLevel = process.env.LOG_LEVEL || 'info';
    const validLogLevels = ['error', 'warn', 'info', 'debug'];
    if (!validLogLevels.includes(logLevel)) {
      errors.push(`LOG_LEVEL must be one of: ${validLogLevels.join(', ')}`);
    }

    // 如果有错误，抛出异常
    if (errors.length > 0) {
      throw new Error(`Environment validation failed:\n${errors.map((e) => `  - ${e}`).join('\n')}`);
    }

    // 返回验证后的配置
    return {
      database: {
        host: dbHost!,
        port: dbPort!,
        database: dbName!,
        username: dbUser!,
        password: dbPassword || '',
      },
      sparhamster: {
        minIntervalSeconds: sparhamsterMinInterval || 300,
        maxIntervalSeconds: sparhamsterMaxInterval || 900,
      },
      translation: {
        enabled: translationEnabled,
        minIntervalSeconds: translationMinInterval || 120,
        maxIntervalSeconds: translationMaxInterval || 300,
        batchSize: translationBatchSize || 10,
        targetLanguages,
        providers,
        deepl: {
          apiKey: deeplApiKey,
          endpoint: deeplEndpoint,
        },
      },
      worker: {
        maxRetries: maxRetries || 3,
      },
      redis: {
        url: redisUrl!,
      },
      log: {
        level: logLevel,
      },
    };
  }

  /**
   * 验证数字类型的环境变量
   */
  private static validateNumber(
    name: string,
    value: string | undefined,
    errors: string[],
    min?: number
  ): number | undefined {
    if (!value) {
      return undefined;
    }

    const num = parseInt(value, 10);
    if (isNaN(num)) {
      errors.push(`${name} must be a valid number`);
      return undefined;
    }

    if (min !== undefined && num < min) {
      errors.push(`${name} must be at least ${min}`);
      return undefined;
    }

    return num;
  }
}
