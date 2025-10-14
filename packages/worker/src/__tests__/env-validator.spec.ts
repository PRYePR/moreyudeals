/**
 * Environment Validator 单元测试
 */

import { EnvValidator, ValidatedConfig } from '../config/env-validator';

describe('EnvValidator', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // 重置环境变量
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  /**
   * 创建有效的环境变量配置
   */
  const setValidEnv = () => {
    process.env.DB_HOST = 'localhost';
    process.env.DB_PORT = '5432';
    process.env.DB_NAME = 'test_db';
    process.env.DB_USER = 'test_user';
    process.env.DB_PASSWORD = 'test_password';
    process.env.SPARHAMSTER_FETCH_INTERVAL_MIN = '300';
    process.env.SPARHAMSTER_FETCH_INTERVAL_MAX = '900';
    process.env.TRANSLATION_ENABLED = 'true';
    process.env.TRANSLATION_INTERVAL_MIN = '120';
    process.env.TRANSLATION_INTERVAL_MAX = '300';
    process.env.TRANSLATION_BATCH_SIZE = '10';
    process.env.TRANSLATION_TARGET_LANGUAGES = 'zh,en';
    process.env.TRANSLATION_PROVIDERS = 'deepl';
    process.env.DEEPL_API_KEY = 'test_api_key';
    process.env.DEEPL_ENDPOINT = 'https://api-free.deepl.com/v2';
    process.env.MAX_RETRIES = '3';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.LOG_LEVEL = 'info';
  };

  describe('成功场景', () => {
    it('应成功验证所有有效的环境变量', () => {
      setValidEnv();

      const config = EnvValidator.validate();

      expect(config).toMatchObject({
        database: {
          host: 'localhost',
          port: 5432,
          database: 'test_db',
          username: 'test_user',
          password: 'test_password',
        },
        sparhamster: {
          minIntervalSeconds: 300,
          maxIntervalSeconds: 900,
        },
        translation: {
          enabled: true,
          minIntervalSeconds: 120,
          maxIntervalSeconds: 300,
          batchSize: 10,
          targetLanguages: ['zh', 'en'],
          providers: ['deepl'],
          deepl: {
            apiKey: 'test_api_key',
            endpoint: 'https://api-free.deepl.com/v2',
          },
        },
        worker: {
          maxRetries: 3,
        },
        redis: {
          url: 'redis://localhost:6379',
        },
        log: {
          level: 'info',
        },
      });
    });

    it('应使用默认值填充未提供的可选变量', () => {
      setValidEnv();

      // 移除可选变量
      delete process.env.SPARHAMSTER_FETCH_INTERVAL_MIN;
      delete process.env.SPARHAMSTER_FETCH_INTERVAL_MAX;
      delete process.env.TRANSLATION_INTERVAL_MIN;
      delete process.env.TRANSLATION_INTERVAL_MAX;
      delete process.env.TRANSLATION_BATCH_SIZE;
      delete process.env.MAX_RETRIES;

      const config = EnvValidator.validate();

      expect(config.sparhamster.minIntervalSeconds).toBe(300);
      expect(config.sparhamster.maxIntervalSeconds).toBe(900);
      expect(config.translation.minIntervalSeconds).toBe(120);
      expect(config.translation.maxIntervalSeconds).toBe(300);
      expect(config.translation.batchSize).toBe(10);
      expect(config.worker.maxRetries).toBe(3);
    });

    it('DB_PASSWORD 可以为空', () => {
      setValidEnv();
      process.env.DB_PASSWORD = '';

      const config = EnvValidator.validate();

      expect(config.database.password).toBe('');
    });

    it('TRANSLATION_ENABLED=false 时不验证 DEEPL_API_KEY', () => {
      setValidEnv();
      process.env.TRANSLATION_ENABLED = 'false';
      delete process.env.DEEPL_API_KEY;

      expect(() => EnvValidator.validate()).not.toThrow();
    });

    it('使用非 deepl 提供商时不验证 DEEPL_API_KEY', () => {
      setValidEnv();
      process.env.TRANSLATION_PROVIDERS = 'google';
      delete process.env.DEEPL_API_KEY;

      expect(() => EnvValidator.validate()).not.toThrow();
    });

    it('应正确解析多个目标语言', () => {
      setValidEnv();
      process.env.TRANSLATION_TARGET_LANGUAGES = 'zh,en,ja,ko';

      const config = EnvValidator.validate();

      expect(config.translation.targetLanguages).toEqual(['zh', 'en', 'ja', 'ko']);
    });

    it('应正确解析多个翻译提供商', () => {
      setValidEnv();
      process.env.TRANSLATION_PROVIDERS = 'deepl,google';

      const config = EnvValidator.validate();

      expect(config.translation.providers).toEqual(['deepl', 'google']);
    });

    it('应接受所有有效的日志级别', () => {
      setValidEnv();

      const validLevels = ['error', 'warn', 'info', 'debug'];

      validLevels.forEach((level) => {
        process.env.LOG_LEVEL = level;
        const config = EnvValidator.validate();
        expect(config.log.level).toBe(level);
      });
    });
  });

  describe('数据库配置验证', () => {
    it('DB_HOST 缺失时应抛出错误', () => {
      setValidEnv();
      delete process.env.DB_HOST;

      expect(() => EnvValidator.validate()).toThrow(/DB_HOST is required/);
    });

    it('DB_PORT 无效时应抛出错误', () => {
      setValidEnv();
      process.env.DB_PORT = 'invalid';

      expect(() => EnvValidator.validate()).toThrow(/DB_PORT must be a valid number/);
    });

    it('DB_NAME 缺失时应抛出错误', () => {
      setValidEnv();
      delete process.env.DB_NAME;

      expect(() => EnvValidator.validate()).toThrow(/DB_NAME is required/);
    });

    it('DB_USER 缺失时应抛出错误', () => {
      setValidEnv();
      delete process.env.DB_USER;

      expect(() => EnvValidator.validate()).toThrow(/DB_USER is required/);
    });
  });

  describe('Sparhamster 配置验证', () => {
    it('SPARHAMSTER_FETCH_INTERVAL_MIN 小于 60 时应抛出错误', () => {
      setValidEnv();
      process.env.SPARHAMSTER_FETCH_INTERVAL_MIN = '59';

      expect(() => EnvValidator.validate()).toThrow(
        /SPARHAMSTER_FETCH_INTERVAL_MIN must be at least 60/
      );
    });

    it('SPARHAMSTER_FETCH_INTERVAL_MAX 小于 60 时应抛出错误', () => {
      setValidEnv();
      process.env.SPARHAMSTER_FETCH_INTERVAL_MAX = '59';

      expect(() => EnvValidator.validate()).toThrow(
        /SPARHAMSTER_FETCH_INTERVAL_MAX must be at least 60/
      );
    });

    it('最小间隔大于等于最大间隔时应抛出错误', () => {
      setValidEnv();
      process.env.SPARHAMSTER_FETCH_INTERVAL_MIN = '900';
      process.env.SPARHAMSTER_FETCH_INTERVAL_MAX = '900';

      expect(() => EnvValidator.validate()).toThrow(
        /SPARHAMSTER_FETCH_INTERVAL_MIN must be less than SPARHAMSTER_FETCH_INTERVAL_MAX/
      );
    });

    it('SPARHAMSTER_FETCH_INTERVAL_MIN 不是数字时应抛出错误', () => {
      setValidEnv();
      process.env.SPARHAMSTER_FETCH_INTERVAL_MIN = 'not_a_number';

      expect(() => EnvValidator.validate()).toThrow(
        /SPARHAMSTER_FETCH_INTERVAL_MIN must be a valid number/
      );
    });
  });

  describe('翻译配置验证', () => {
    it('TRANSLATION_INTERVAL_MIN 小于 60 时应抛出错误', () => {
      setValidEnv();
      process.env.TRANSLATION_INTERVAL_MIN = '59';

      expect(() => EnvValidator.validate()).toThrow(/TRANSLATION_INTERVAL_MIN must be at least 60/);
    });

    it('TRANSLATION_INTERVAL_MAX 小于 60 时应抛出错误', () => {
      setValidEnv();
      process.env.TRANSLATION_INTERVAL_MAX = '59';

      expect(() => EnvValidator.validate()).toThrow(/TRANSLATION_INTERVAL_MAX must be at least 60/);
    });

    it('翻译最小间隔大于等于最大间隔时应抛出错误', () => {
      setValidEnv();
      process.env.TRANSLATION_INTERVAL_MIN = '300';
      process.env.TRANSLATION_INTERVAL_MAX = '300';

      expect(() => EnvValidator.validate()).toThrow(
        /TRANSLATION_INTERVAL_MIN must be less than TRANSLATION_INTERVAL_MAX/
      );
    });

    it('TRANSLATION_BATCH_SIZE 小于 1 时应抛出错误', () => {
      setValidEnv();
      process.env.TRANSLATION_BATCH_SIZE = '0';

      expect(() => EnvValidator.validate()).toThrow(/TRANSLATION_BATCH_SIZE must be at least 1/);
    });

    it('启用翻译且使用 deepl 时 DEEPL_API_KEY 缺失应抛出错误', () => {
      setValidEnv();
      process.env.TRANSLATION_ENABLED = 'true';
      process.env.TRANSLATION_PROVIDERS = 'deepl';
      delete process.env.DEEPL_API_KEY;

      expect(() => EnvValidator.validate()).toThrow(
        /DEEPL_API_KEY is required when translation is enabled with deepl provider/
      );
    });

    it('TRANSLATION_INTERVAL_MIN 不是数字时应抛出错误', () => {
      setValidEnv();
      process.env.TRANSLATION_INTERVAL_MIN = 'invalid';

      expect(() => EnvValidator.validate()).toThrow(
        /TRANSLATION_INTERVAL_MIN must be a valid number/
      );
    });
  });

  describe('Worker 配置验证', () => {
    it('MAX_RETRIES 小于 1 时应抛出错误', () => {
      setValidEnv();
      process.env.MAX_RETRIES = '0';

      expect(() => EnvValidator.validate()).toThrow(/MAX_RETRIES must be at least 1/);
    });

    it('MAX_RETRIES 不是数字时应抛出错误', () => {
      setValidEnv();
      process.env.MAX_RETRIES = 'invalid';

      expect(() => EnvValidator.validate()).toThrow(/MAX_RETRIES must be a valid number/);
    });
  });

  describe('Redis 配置验证', () => {
    it('REDIS_URL 缺失时应抛出错误', () => {
      setValidEnv();
      delete process.env.REDIS_URL;

      expect(() => EnvValidator.validate()).toThrow(/REDIS_URL is required/);
    });
  });

  describe('日志配置验证', () => {
    it('LOG_LEVEL 无效时应抛出错误', () => {
      setValidEnv();
      process.env.LOG_LEVEL = 'invalid';

      expect(() => EnvValidator.validate()).toThrow(/LOG_LEVEL must be one of: error, warn, info, debug/);
    });

    it('LOG_LEVEL 缺失时应使用默认值 info', () => {
      setValidEnv();
      delete process.env.LOG_LEVEL;

      const config = EnvValidator.validate();

      expect(config.log.level).toBe('info');
    });
  });

  describe('多个错误场景', () => {
    it('应列出所有验证错误', () => {
      process.env = { ...originalEnv };

      try {
        EnvValidator.validate();
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('DB_HOST is required');
        expect(error.message).toContain('DB_NAME is required');
        expect(error.message).toContain('DB_USER is required');
        expect(error.message).toContain('REDIS_URL is required');
      }
    });

    it('应在一次调用中捕获多个数值错误', () => {
      setValidEnv();
      process.env.SPARHAMSTER_FETCH_INTERVAL_MIN = 'invalid1';
      process.env.TRANSLATION_BATCH_SIZE = 'invalid2';
      process.env.MAX_RETRIES = 'invalid3';

      try {
        EnvValidator.validate();
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('SPARHAMSTER_FETCH_INTERVAL_MIN must be a valid number');
        expect(error.message).toContain('TRANSLATION_BATCH_SIZE must be a valid number');
        expect(error.message).toContain('MAX_RETRIES must be a valid number');
      }
    });

    it('应同时捕获间隔范围错误', () => {
      setValidEnv();
      process.env.SPARHAMSTER_FETCH_INTERVAL_MIN = '900';
      process.env.SPARHAMSTER_FETCH_INTERVAL_MAX = '300';
      process.env.TRANSLATION_INTERVAL_MIN = '500';
      process.env.TRANSLATION_INTERVAL_MAX = '200';

      try {
        EnvValidator.validate();
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain(
          'SPARHAMSTER_FETCH_INTERVAL_MIN must be less than SPARHAMSTER_FETCH_INTERVAL_MAX'
        );
        expect(error.message).toContain(
          'TRANSLATION_INTERVAL_MIN must be less than TRANSLATION_INTERVAL_MAX'
        );
      }
    });
  });

  describe('边界值测试', () => {
    it('应接受最小有效值', () => {
      setValidEnv();
      process.env.SPARHAMSTER_FETCH_INTERVAL_MIN = '60';
      process.env.SPARHAMSTER_FETCH_INTERVAL_MAX = '61';
      process.env.TRANSLATION_INTERVAL_MIN = '60';
      process.env.TRANSLATION_INTERVAL_MAX = '61';
      process.env.TRANSLATION_BATCH_SIZE = '1';
      process.env.MAX_RETRIES = '1';

      const config = EnvValidator.validate();

      expect(config.sparhamster.minIntervalSeconds).toBe(60);
      expect(config.sparhamster.maxIntervalSeconds).toBe(61);
      expect(config.translation.minIntervalSeconds).toBe(60);
      expect(config.translation.maxIntervalSeconds).toBe(61);
      expect(config.translation.batchSize).toBe(1);
      expect(config.worker.maxRetries).toBe(1);
    });

    it('应接受非常大的数值', () => {
      setValidEnv();
      process.env.SPARHAMSTER_FETCH_INTERVAL_MIN = '3600';
      process.env.SPARHAMSTER_FETCH_INTERVAL_MAX = '86400';
      process.env.TRANSLATION_BATCH_SIZE = '1000';

      const config = EnvValidator.validate();

      expect(config.sparhamster.minIntervalSeconds).toBe(3600);
      expect(config.sparhamster.maxIntervalSeconds).toBe(86400);
      expect(config.translation.batchSize).toBe(1000);
    });
  });

  describe('类型安全', () => {
    it('返回的配置应具有正确的类型', () => {
      setValidEnv();

      const config: ValidatedConfig = EnvValidator.validate();

      // 类型检查 - 如果类型不匹配，TypeScript 会报错
      expect(typeof config.database.host).toBe('string');
      expect(typeof config.database.port).toBe('number');
      expect(typeof config.sparhamster.minIntervalSeconds).toBe('number');
      expect(typeof config.translation.enabled).toBe('boolean');
      expect(Array.isArray(config.translation.targetLanguages)).toBe(true);
      expect(typeof config.worker.maxRetries).toBe('number');
    });
  });
});
