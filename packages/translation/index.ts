/**
 * Moreyudeals 翻译系统主导出文件
 * 多Provider翻译架构的统一入口
 */

// 导出核心类型
export * from './types';

// 导出翻译管理器
export { CoreTranslationManager } from './translation-manager';

// 导出Provider实现
export { DeepLProvider } from './providers/deepl';
export { MicrosoftProvider } from './providers/microsoft';

/**
 * 快速创建翻译管理器的工厂函数
 */
import { CoreTranslationManager } from './translation-manager';
import { DeepLProvider } from './providers/deepl';
import { MicrosoftProvider } from './providers/microsoft';
import { TranslationRouteConfig } from './types';

interface TranslationConfig {
  deepl?: {
    apiKey: string;
    endpoint?: string;
  };
  microsoft?: {
    apiKey: string;
    region?: string;
    endpoint?: string;
  };
  redis?: {
    url: string;
  };
  routing?: Partial<TranslationRouteConfig>;
}

export function createTranslationManager(config: TranslationConfig): CoreTranslationManager {
  // 创建翻译管理器
  const manager = new CoreTranslationManager(
    config.routing,
    config.redis?.url
  );

  // 添加DeepL Provider
  if (config.deepl?.apiKey) {
    const deeplProvider = new DeepLProvider({
      apiKey: config.deepl.apiKey,
      endpoint: config.deepl.endpoint
    });
    manager.addProvider(deeplProvider);
  }

  // 添加Microsoft Provider
  if (config.microsoft?.apiKey) {
    const microsoftProvider = new MicrosoftProvider({
      apiKey: config.microsoft.apiKey,
      region: config.microsoft.region,
      endpoint: config.microsoft.endpoint
    });
    manager.addProvider(microsoftProvider);
  }

  return manager;
}