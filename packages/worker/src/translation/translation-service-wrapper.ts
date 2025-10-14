/**
 * Translation Service Wrapper
 * 将 CoreTranslationManager 包装为 TranslationService 接口
 */

import { CoreTranslationManager } from '@moreyudeals/translation';
import { TranslationService } from './translation-adapter';

/**
 * Translation Service Wrapper
 * 适配 CoreTranslationManager 到 TranslationService 接口
 */
export class TranslationServiceWrapper implements TranslationService {
  constructor(private readonly manager: CoreTranslationManager) {}

  async translate(text: string, from: string, to: string): Promise<string> {
    const result = await this.manager.translate({
      text,
      from: from as any,
      to: to as any,
    });

    return result.translatedText;
  }
}
