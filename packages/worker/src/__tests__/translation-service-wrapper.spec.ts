/**
 * Translation Service Wrapper 单元测试
 */

import { TranslationServiceWrapper } from '../translation/translation-service-wrapper';
import { CoreTranslationManager } from '@moreyudeals/translation';

// Mock CoreTranslationManager
jest.mock('@moreyudeals/translation');

describe('TranslationServiceWrapper', () => {
  let wrapper: TranslationServiceWrapper;
  let mockManager: jest.Mocked<CoreTranslationManager>;

  beforeEach(() => {
    mockManager = {
      translate: jest.fn(),
    } as any;

    wrapper = new TranslationServiceWrapper(mockManager);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('translate', () => {
    it('应调用 CoreTranslationManager.translate 并返回翻译文本', async () => {
      mockManager.translate.mockResolvedValue({
        translatedText: '翻译后的文本',
        detectedLanguage: 'de',
        provider: 'deepl',
      } as any);

      const result = await wrapper.translate('Test text', 'de', 'zh');

      expect(result).toBe('翻译后的文本');
      expect(mockManager.translate).toHaveBeenCalledWith({
        text: 'Test text',
        from: 'de',
        to: 'zh',
      });
    });

    it('应正确传递源语言和目标语言', async () => {
      mockManager.translate.mockResolvedValue({
        translatedText: 'Translated',
        detectedLanguage: 'zh',
        provider: 'deepl',
      } as any);

      await wrapper.translate('中文文本', 'zh', 'en');

      expect(mockManager.translate).toHaveBeenCalledWith({
        text: '中文文本',
        from: 'zh',
        to: 'en',
      });
    });

    it('应传播翻译错误', async () => {
      const error = new Error('Translation API error');
      mockManager.translate.mockRejectedValue(error);

      await expect(wrapper.translate('Test', 'de', 'zh')).rejects.toThrow('Translation API error');
    });

    it('应处理空字符串', async () => {
      mockManager.translate.mockResolvedValue({
        translatedText: '',
        detectedLanguage: 'de',
        provider: 'deepl',
      } as any);

      const result = await wrapper.translate('', 'de', 'zh');

      expect(result).toBe('');
      expect(mockManager.translate).toHaveBeenCalledWith({
        text: '',
        from: 'de',
        to: 'zh',
      });
    });

    it('应处理长文本', async () => {
      const longText = 'Lorem ipsum dolor sit amet'.repeat(100);
      mockManager.translate.mockResolvedValue({
        translatedText: '翻译' + longText,
        detectedLanguage: 'en',
        provider: 'deepl',
      } as any);

      const result = await wrapper.translate(longText, 'en', 'zh');

      expect(result).toContain('翻译');
      expect(mockManager.translate).toHaveBeenCalledWith({
        text: longText,
        from: 'en',
        to: 'zh',
      });
    });

    it('应处理特殊字符', async () => {
      const specialText = 'Price: €19.99 (50% off!)';
      mockManager.translate.mockResolvedValue({
        translatedText: '价格：€19.99（50% 折扣！）',
        detectedLanguage: 'en',
        provider: 'deepl',
      } as any);

      const result = await wrapper.translate(specialText, 'en', 'zh');

      expect(result).toBe('价格：€19.99（50% 折扣！）');
    });
  });
});
