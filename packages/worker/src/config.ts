/**
 * Worker 配置
 * 统一管理所有配置项，从环境变量加载
 */

export interface WorkerConfig {
  // 数据库配置
  database: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
  };

  // 抓取配置
  fetch: {
    interval: number; // 抓取间隔（分钟）
    randomDelayMin: number; // 随机延迟最小值（分钟）
    randomDelayMax: number; // 随机延迟最大值（分钟）
  };

  // Sparhamster API 配置
  sparhamster: {
    apiUrl: string;
    limit: number;
    userAgent: string;
  };

  // 翻译配置
  translation: {
    enabled: boolean;
    interval: number; // 翻译间隔（分钟）
    batchSize: number;
    targetLanguages: string[];
    deepl?: {
      apiKey: string;
      endpoint: string;
    };
    redis?: {
      url: string;
    };
  };

  // 日志配置
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
  };
}

/**
 * 从环境变量加载配置
 */
export function loadConfig(): WorkerConfig {
  return {
    database: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'moreyudeals_dev',
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
    },

    fetch: {
      interval: parseInt(process.env.FETCH_INTERVAL || '30'), // 默认 30 分钟
      randomDelayMin: parseInt(process.env.FETCH_RANDOM_DELAY_MIN || '0'), // 默认 0 分钟
      randomDelayMax: parseInt(process.env.FETCH_RANDOM_DELAY_MAX || '5'), // 默认 5 分钟
    },

    sparhamster: {
      apiUrl:
        process.env.SPARHAMSTER_API_URL ||
        'https://www.sparhamster.at/wp-json/wp/v2/posts',
      limit: parseInt(process.env.SPARHAMSTER_API_LIMIT || '40'),
      userAgent:
        process.env.SPARHAMSTER_USER_AGENT ||
        'Mozilla/5.0 (compatible; MoreYuDeals/1.0)',
    },

    translation: {
      enabled: process.env.TRANSLATION_ENABLED !== 'false',
      interval: parseInt(process.env.TRANSLATION_INTERVAL || '5'), // 默认 5 分钟
      batchSize: parseInt(process.env.TRANSLATION_BATCH_SIZE || '10'),
      targetLanguages: (process.env.TRANSLATION_TARGET_LANGUAGES || 'zh,en').split(','),
      deepl: process.env.DEEPL_API_KEY
        ? {
            apiKey: process.env.DEEPL_API_KEY,
            endpoint:
              process.env.DEEPL_ENDPOINT || 'https://api-free.deepl.com/v2',
          }
        : undefined,
      redis: process.env.REDIS_URL
        ? {
            url: process.env.REDIS_URL,
          }
        : undefined,
    },

    logging: {
      level: (process.env.LOG_LEVEL as any) || 'info',
    },
  };
}
