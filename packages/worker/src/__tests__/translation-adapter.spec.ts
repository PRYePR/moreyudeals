/**
 * Translation Adapter 单元测试
 */

import { TranslationAdapter, TranslationService } from '../translation/translation-adapter';
import { DatabaseManager } from '../database';
import { Deal, ContentBlock } from '../types/deal.types';

// Mock 依赖
jest.mock('../database');

describe('TranslationAdapter', () => {
  let adapter: TranslationAdapter;
  let mockDatabase: jest.Mocked<DatabaseManager>;
  let mockTranslationService: jest.Mocked<TranslationService>;

  // 测试用 Deal
  const createMockDeal = (overrides: Partial<Deal> = {}): Deal => ({
    id: 'test-deal-1',
    sourceSite: 'sparhamster',
    sourcePostId: '12345',
    guid: 'https://example.com/deal',
    link: 'https://merchant.com/product',
    title: 'Original Title',
    originalTitle: 'Original Title',
    description: 'Original Description',
    originalDescription: 'Original Description',
    currency: 'EUR',
    language: 'de',
    translationStatus: 'pending',
    isTranslated: false,
    affiliateEnabled: false,
    duplicateCount: 0,
    firstSeenAt: new Date(),
    lastSeenAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    // 创建 mock 实例
    mockDatabase = new DatabaseManager({} as any) as jest.Mocked<DatabaseManager>;
    mockTranslationService = {
      translate: jest.fn(),
    };

    adapter = new TranslationAdapter(mockDatabase, mockTranslationService);

    // 默认 mock 行为
    mockDatabase.getUntranslatedDeals = jest.fn();
    mockDatabase.updateDealTranslation = jest.fn();
    mockDatabase.updateDeal = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processTranslations', () => {
    it('成功翻译标题和描述', async () => {
      const deal = createMockDeal({
        originalTitle: 'Original Title',
        originalDescription: 'Original Description',
      });

      mockDatabase.getUntranslatedDeals.mockResolvedValue([deal]);
      mockTranslationService.translate
        .mockResolvedValueOnce('翻译后的标题')
        .mockResolvedValueOnce('翻译后的描述');
      mockDatabase.updateDealTranslation.mockResolvedValue(undefined);

      const result = await adapter.processTranslations();

      expect(result.processed).toBe(1);
      expect(result.succeeded).toBe(1);
      expect(result.failed).toBe(0);

      expect(mockTranslationService.translate).toHaveBeenCalledTimes(2);
      expect(mockTranslationService.translate).toHaveBeenCalledWith('Original Title', 'de', 'zh');
      expect(mockTranslationService.translate).toHaveBeenCalledWith('Original Description', 'de', 'zh');

      expect(mockDatabase.updateDealTranslation).toHaveBeenCalledWith(
        'test-deal-1',
        {
          title: '翻译后的标题',
          description: '翻译后的描述',
          contentBlocks: undefined,
        },
        {
          provider: 'deepl',
          language: 'zh',
          detectedLanguage: 'de',
        }
      );
    });

    it('处理空列表时返回零计数', async () => {
      mockDatabase.getUntranslatedDeals.mockResolvedValue([]);

      const result = await adapter.processTranslations();

      expect(result.processed).toBe(0);
      expect(result.succeeded).toBe(0);
      expect(result.failed).toBe(0);

      expect(mockTranslationService.translate).not.toHaveBeenCalled();
      expect(mockDatabase.updateDealTranslation).not.toHaveBeenCalled();
    });

    it('翻译 content_blocks 中的文本', async () => {
      const contentBlocks: ContentBlock[] = [
        { type: 'heading', content: 'Heading Text' },
        { type: 'text', content: 'Paragraph Text' },
        { type: 'image', content: 'https://example.com/image.jpg' },
      ];

      const deal = createMockDeal({
        originalTitle: 'Title',
        originalDescription: 'Description',
        contentBlocks,
      });

      mockDatabase.getUntranslatedDeals.mockResolvedValue([deal]);
      mockTranslationService.translate
        .mockResolvedValueOnce('翻译后的标题')
        .mockResolvedValueOnce('翻译后的描述')
        .mockResolvedValueOnce('翻译后的标题文本')
        .mockResolvedValueOnce('翻译后的段落');
      mockDatabase.updateDealTranslation.mockResolvedValue(undefined);

      const result = await adapter.processTranslations();

      expect(result.succeeded).toBe(1);
      expect(mockTranslationService.translate).toHaveBeenCalledTimes(4);

      // 验证 updateDealTranslation 被调用时的 contentBlocks
      const updateCall = mockDatabase.updateDealTranslation.mock.calls[0];
      const translatedBlocks = updateCall[1].contentBlocks;

      expect(translatedBlocks).toBeDefined();
      expect(translatedBlocks).toHaveLength(3);
      expect(translatedBlocks![0]).toEqual({
        type: 'heading',
        content: '翻译后的标题文本',
      });
      expect(translatedBlocks![1]).toEqual({
        type: 'text',
        content: '翻译后的段落',
      });
      expect(translatedBlocks![2]).toEqual({
        type: 'image',
        content: 'https://example.com/image.jpg', // 图片不翻译
      });
    });

    it('翻译失败时标记为 failed', async () => {
      const deal = createMockDeal({
        originalTitle: 'Title',
      });

      mockDatabase.getUntranslatedDeals.mockResolvedValue([deal]);
      mockTranslationService.translate.mockRejectedValue(new Error('Translation API error'));
      mockDatabase.updateDeal.mockResolvedValue(undefined);

      const result = await adapter.processTranslations();

      expect(result.processed).toBe(1);
      expect(result.succeeded).toBe(0);
      expect(result.failed).toBe(1);

      expect(mockDatabase.updateDeal).toHaveBeenCalledWith('test-deal-1', {
        translationStatus: 'failed',
      });
      expect(mockDatabase.updateDealTranslation).not.toHaveBeenCalled();
    });

    it('批量处理多个 deals', async () => {
      const deals = [
        createMockDeal({ id: 'deal-1', originalTitle: 'Title 1' }),
        createMockDeal({ id: 'deal-2', originalTitle: 'Title 2' }),
        createMockDeal({ id: 'deal-3', originalTitle: 'Title 3' }),
      ];

      mockDatabase.getUntranslatedDeals.mockResolvedValue(deals);
      mockTranslationService.translate.mockResolvedValue('翻译后的文本');
      mockDatabase.updateDealTranslation.mockResolvedValue(undefined);

      const result = await adapter.processTranslations();

      expect(result.processed).toBe(3);
      expect(result.succeeded).toBe(3);
      expect(result.failed).toBe(0);

      expect(mockDatabase.updateDealTranslation).toHaveBeenCalledTimes(3);
    });

    it('部分成功部分失败', async () => {
      const deals = [
        createMockDeal({ id: 'deal-1', originalTitle: 'Title 1' }),
        createMockDeal({ id: 'deal-2', originalTitle: 'Title 2' }),
        createMockDeal({ id: 'deal-3', originalTitle: 'Title 3' }),
      ];

      mockDatabase.getUntranslatedDeals.mockResolvedValue(deals);

      // 第二个翻译失败
      mockTranslationService.translate
        .mockResolvedValueOnce('翻译1')
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce('翻译3');

      mockDatabase.updateDealTranslation.mockResolvedValue(undefined);
      mockDatabase.updateDeal.mockResolvedValue(undefined);

      const result = await adapter.processTranslations();

      expect(result.processed).toBe(3);
      expect(result.succeeded).toBe(2);
      expect(result.failed).toBe(1);

      expect(mockDatabase.updateDealTranslation).toHaveBeenCalledTimes(2);
      expect(mockDatabase.updateDeal).toHaveBeenCalledTimes(1);
    });

    it('处理没有 originalTitle 的 deal', async () => {
      const deal = createMockDeal({
        originalTitle: undefined,
        originalDescription: 'Description',
      });

      mockDatabase.getUntranslatedDeals.mockResolvedValue([deal]);
      mockTranslationService.translate.mockResolvedValue('翻译后的描述');
      mockDatabase.updateDealTranslation.mockResolvedValue(undefined);

      const result = await adapter.processTranslations();

      expect(result.succeeded).toBe(1);
      expect(mockTranslationService.translate).toHaveBeenCalledTimes(1);
      expect(mockTranslationService.translate).toHaveBeenCalledWith('Description', 'de', 'zh');

      const updateCall = mockDatabase.updateDealTranslation.mock.calls[0];
      expect(updateCall[1]).toEqual({
        title: undefined,
        description: '翻译后的描述',
        contentBlocks: undefined,
      });
    });

    it('使用自定义配置', async () => {
      const customAdapter = new TranslationAdapter(mockDatabase, mockTranslationService, {
        batchSize: 5,
        targetLanguage: 'en',
        sourceLanguage: 'de',
      });

      const deals = [createMockDeal({ originalTitle: 'Title' })];

      mockDatabase.getUntranslatedDeals.mockResolvedValue(deals);
      mockTranslationService.translate.mockResolvedValue('Translated');
      mockDatabase.updateDealTranslation.mockResolvedValue(undefined);

      await customAdapter.processTranslations();

      expect(mockDatabase.getUntranslatedDeals).toHaveBeenCalledWith(5);
      expect(mockTranslationService.translate).toHaveBeenCalledWith('Title', 'de', 'en');

      const updateCall = mockDatabase.updateDealTranslation.mock.calls[0];
      expect(updateCall[2]).toEqual({
        provider: 'deepl',
        language: 'en',
        detectedLanguage: 'de',
      });
    });
  });

  describe('translateContentBlocks', () => {
    it('不翻译非文本类型的 blocks', async () => {
      const contentBlocks: ContentBlock[] = [
        { type: 'image', content: 'https://example.com/image.jpg' },
        { type: 'code', content: 'const x = 1;' },
        { type: 'quote', content: 'Quote text' },
      ];

      const deal = createMockDeal({
        originalTitle: undefined,
        originalDescription: undefined,
        contentBlocks,
      });

      mockDatabase.getUntranslatedDeals.mockResolvedValue([deal]);
      mockTranslationService.translate.mockResolvedValue('翻译');
      mockDatabase.updateDealTranslation.mockResolvedValue(undefined);

      await adapter.processTranslations();

      // 不应该调用翻译服务 (因为没有 title/description,也没有 text/heading 类型的 block)
      expect(mockTranslationService.translate).not.toHaveBeenCalled();

      const updateCall = mockDatabase.updateDealTranslation.mock.calls[0];
      const translatedBlocks = updateCall[1].contentBlocks;

      // 内容应该保持不变
      expect(translatedBlocks).toEqual(contentBlocks);
    });

    it('content block 翻译失败时保留原文', async () => {
      const contentBlocks: ContentBlock[] = [
        { type: 'text', content: 'Text 1' },
        { type: 'text', content: 'Text 2' },
      ];

      const deal = createMockDeal({
        originalTitle: undefined,
        originalDescription: undefined,
        contentBlocks,
      });

      mockDatabase.getUntranslatedDeals.mockResolvedValue([deal]);
      mockTranslationService.translate
        .mockResolvedValueOnce('翻译1')
        .mockRejectedValueOnce(new Error('Failed'));
      mockDatabase.updateDealTranslation.mockResolvedValue(undefined);

      await adapter.processTranslations();

      const updateCall = mockDatabase.updateDealTranslation.mock.calls[0];
      const translatedBlocks = updateCall[1].contentBlocks;

      expect(translatedBlocks).toBeDefined();
      expect(translatedBlocks![0].content).toBe('翻译1');
      expect(translatedBlocks![1].content).toBe('Text 2'); // 保留原文
    });

    it('处理空 contentBlocks', async () => {
      const deal = createMockDeal({
        originalTitle: 'Title',
        contentBlocks: [],
      });

      mockDatabase.getUntranslatedDeals.mockResolvedValue([deal]);
      mockTranslationService.translate.mockResolvedValue('翻译');
      mockDatabase.updateDealTranslation.mockResolvedValue(undefined);

      await adapter.processTranslations();

      const updateCall = mockDatabase.updateDealTranslation.mock.calls[0];
      expect(updateCall[1].contentBlocks).toBeUndefined();
    });
  });

  describe('边界情况', () => {
    it('数据库查询失败应抛出错误', async () => {
      mockDatabase.getUntranslatedDeals.mockRejectedValue(new Error('DB error'));

      await expect(adapter.processTranslations()).rejects.toThrow('DB error');
    });

    it('updateDealTranslation 失败应被捕获', async () => {
      const deal = createMockDeal({ originalTitle: 'Title' });

      mockDatabase.getUntranslatedDeals.mockResolvedValue([deal]);
      mockTranslationService.translate.mockResolvedValue('翻译');
      mockDatabase.updateDealTranslation.mockRejectedValue(new Error('Update failed'));
      mockDatabase.updateDeal.mockResolvedValue(undefined);

      const result = await adapter.processTranslations();

      expect(result.failed).toBe(1);
      expect(mockDatabase.updateDeal).toHaveBeenCalledWith('test-deal-1', {
        translationStatus: 'failed',
      });
    });

    it('标记失败状态时出错不应阻止流程', async () => {
      const deal = createMockDeal({ originalTitle: 'Title' });

      mockDatabase.getUntranslatedDeals.mockResolvedValue([deal]);
      mockTranslationService.translate.mockRejectedValue(new Error('Translation failed'));
      mockDatabase.updateDeal.mockRejectedValue(new Error('Update failed'));

      const result = await adapter.processTranslations();

      expect(result.failed).toBe(1);
      // 不应抛出错误,应该继续处理
    });
  });

  describe('日志输出', () => {
    it('应输出翻译进度日志', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const deal = createMockDeal({ originalTitle: 'Title' });

      mockDatabase.getUntranslatedDeals.mockResolvedValue([deal]);
      mockTranslationService.translate.mockResolvedValue('翻译');
      mockDatabase.updateDealTranslation.mockResolvedValue(undefined);

      await adapter.processTranslations();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('开始翻译'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('翻译完成'));

      consoleSpy.mockRestore();
    });

    it('错误应输出到 console.error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const deal = createMockDeal({ originalTitle: 'Title' });

      mockDatabase.getUntranslatedDeals.mockResolvedValue([deal]);
      mockTranslationService.translate.mockRejectedValue(new Error('Failed'));
      mockDatabase.updateDeal.mockResolvedValue(undefined);

      await adapter.processTranslations();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('翻译失败'),
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });
});
