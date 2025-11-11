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
  providers?: string[]; // Provider优先级列表 (如: ['microsoft', 'deepl'])
  deepl?: {
    apiKey: string;
    endpoint?: string;
  };
  microsoft?: {
    apiKey: string;
    region?: string;
    endpoint?: string;
  };
  microsoft2?: {
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
  // 确定 Provider 优先级
  // 如果配置了 providers 数组，使用它；否则默认使用 microsoft, microsoft2, deepl
  const providerOrder = config.providers || ['microsoft', 'microsoft2', 'deepl'];
  const primary = providerOrder[0] || 'microsoft';
  const fallback = providerOrder.slice(1);

  // 创建翻译管理器，传入路由配置
  const routingConfig = {
    ...config.routing,
    primary: primary as any,
    fallback: fallback as any,
  };

  const manager = new CoreTranslationManager(
    routingConfig,
    config.redis?.url
  );

  console.log(`🔧 翻译 Provider 优先级: ${providerOrder.join(' > ')}`);

  // 按照 providerOrder 的顺序添加 Provider
  for (const providerName of providerOrder) {
    if (providerName === 'deepl' && config.deepl?.apiKey) {
      const deeplProvider = new DeepLProvider({
        apiKey: config.deepl.apiKey,
        endpoint: config.deepl.endpoint
      });
      manager.addProvider(deeplProvider);
    } else if (providerName === 'microsoft' && config.microsoft?.apiKey) {
      const microsoftProvider = new MicrosoftProvider({
        apiKey: config.microsoft.apiKey,
        region: config.microsoft.region,
        endpoint: config.microsoft.endpoint,
        name: 'microsoft'
      });
      manager.addProvider(microsoftProvider);
    } else if (providerName === 'microsoft2' && config.microsoft2?.apiKey) {
      const microsoftProvider2 = new MicrosoftProvider({
        apiKey: config.microsoft2.apiKey,
        region: config.microsoft2.region,
        endpoint: config.microsoft2.endpoint,
        name: 'microsoft2'
      });
      manager.addProvider(microsoftProvider2);
    }
  }

  return manager;
}