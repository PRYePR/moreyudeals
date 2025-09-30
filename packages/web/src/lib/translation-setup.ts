// 翻译服务设置
import { CoreTranslationManager } from './translation/translation-manager'
import { DeepLProvider } from './translation/providers/deepl'
import type { TranslationRouteConfig } from './translation/types'

interface TranslationConfig {
  deepl?: {
    apiKey: string
    endpoint?: string
  }
  redis?: {
    url: string
  }
  routing?: Partial<TranslationRouteConfig>
}

export function createTranslationManager(config: TranslationConfig): CoreTranslationManager {
  // 创建翻译管理器
  const manager = new CoreTranslationManager(
    config.routing,
    config.redis?.url
  )

  // 添加DeepL Provider
  if (config.deepl?.apiKey) {
    const deeplProvider = new DeepLProvider({
      apiKey: config.deepl.apiKey,
      endpoint: config.deepl.endpoint
    })
    manager.addProvider(deeplProvider)
  }

  return manager
}