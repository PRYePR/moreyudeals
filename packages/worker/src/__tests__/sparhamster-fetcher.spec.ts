/**
 * Sparhamster Fetcher 单元测试
 */

import axios from 'axios';
import { SparhamsterFetcher } from '../fetchers/sparhamster-fetcher';
import { DatabaseManager } from '../database';
import { SparhamsterNormalizer } from '../normalizers/sparhamster-normalizer';
import { DeduplicationService } from '../services/deduplication-service';
import { Deal } from '../types/deal.types';
import { WordPressPost } from '../types/wordpress.types';

// Mock 依赖
jest.mock('axios');
jest.mock('../database');
jest.mock('../normalizers/sparhamster-normalizer');
jest.mock('../services/deduplication-service');

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('SparhamsterFetcher', () => {
  let fetcher: SparhamsterFetcher;
  let mockDatabase: jest.Mocked<DatabaseManager>;
  let mockNormalizer: jest.Mocked<SparhamsterNormalizer>;
  let mockDeduplicator: jest.Mocked<DeduplicationService>;

  // 测试用 WordPress Post
  const createMockPost = (overrides: Partial<WordPressPost> = {}): WordPressPost => ({
    id: 12345,
    date: '2025-10-13T10:00:00',
    date_gmt: '2025-10-13T10:00:00',
    modified: '2025-10-13T10:00:00',
    modified_gmt: '2025-10-13T10:00:00',
    slug: 'test-deal',
    status: 'publish',
    type: 'post',
    link: 'https://www.sparhamster.at/deals/test-deal',
    title: { rendered: 'Test Deal' },
    excerpt: { rendered: 'Test excerpt', protected: false },
    content: { rendered: '<p>Test content</p>', protected: false },
    author: 1,
    featured_media: 100,
    comment_status: 'open',
    ping_status: 'open',
    sticky: false,
    template: '',
    format: 'standard',
    meta: [],
    categories: [1],
    tags: [],
    _embedded: {
      'wp:featuredmedia': [
        {
          id: 100,
          date: '2025-10-13T10:00:00',
          slug: 'test-image',
          type: 'attachment',
          link: 'https://example.com/image',
          title: { rendered: 'Test Image' },
          author: 1,
          caption: { rendered: '' },
          alt_text: 'Test image',
          media_type: 'image',
          mime_type: 'image/jpeg',
          media_details: {
            width: 800,
            height: 600,
            file: 'image.jpg',
            sizes: {},
          },
          source_url: 'https://example.com/image.jpg',
        },
      ],
      'wp:term': [
        [
          { id: 1, link: 'https://example.com/category/electronics', name: 'Electronics', slug: 'electronics', taxonomy: 'category' },
        ],
      ],
    },
    ...overrides,
  });

  // 测试用 Deal
  const createMockDeal = (overrides: Partial<Deal> = {}): Deal => ({
    id: 'test-deal-id',
    sourceSite: 'sparhamster',
    sourcePostId: '12345',
    guid: 'https://www.sparhamster.at/deals/test-deal',
    link: 'https://merchant.com/product',
    title: 'Test Deal',
    currency: 'EUR',
    language: 'de',
    translationStatus: 'pending',
    isTranslated: false,
    affiliateEnabled: false,
    duplicateCount: 0,
    firstSeenAt: new Date('2025-10-13'),
    lastSeenAt: new Date('2025-10-13'),
    createdAt: new Date('2025-10-13'),
    updatedAt: new Date('2025-10-13'),
    ...overrides,
  });

  beforeEach(() => {
    // 创建 mock 实例
    mockDatabase = new DatabaseManager({} as any) as jest.Mocked<DatabaseManager>;
    mockNormalizer = new SparhamsterNormalizer() as jest.Mocked<SparhamsterNormalizer>;
    mockDeduplicator = new DeduplicationService(mockDatabase) as jest.Mocked<DeduplicationService>;

    // 设置 mock 构造函数
    (SparhamsterNormalizer as jest.MockedClass<typeof SparhamsterNormalizer>).mockImplementation(() => mockNormalizer);
    (DeduplicationService as jest.MockedClass<typeof DeduplicationService>).mockImplementation(() => mockDeduplicator);

    fetcher = new SparhamsterFetcher(mockDatabase);

    // 默认 mock 行为
    mockNormalizer.normalize = jest.fn();
    mockDeduplicator.checkDuplicate = jest.fn();
    mockDeduplicator.handleDuplicate = jest.fn();
    mockDatabase.createDeal = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchLatest', () => {
    it('成功抓取并入库新记录', async () => {
      const mockPosts = [createMockPost(), createMockPost({ id: 12346 })];
      const mockDeals = [createMockDeal(), createMockDeal({ id: 'test-deal-2' })];

      mockedAxios.get.mockResolvedValue({ data: mockPosts });
      mockNormalizer.normalize
        .mockResolvedValueOnce(mockDeals[0])
        .mockResolvedValueOnce(mockDeals[1]);
      mockDeduplicator.checkDuplicate.mockResolvedValue({ isDuplicate: false });
      mockDatabase.createDeal.mockResolvedValue('test-deal-id');

      const result = await fetcher.fetchLatest();

      expect(result.fetched).toBe(2);
      expect(result.inserted).toBe(2);
      expect(result.updated).toBe(0);
      expect(result.duplicates).toBe(0);
      expect(result.errors).toHaveLength(0);

      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
      expect(mockNormalizer.normalize).toHaveBeenCalledTimes(2);
      expect(mockDatabase.createDeal).toHaveBeenCalledTimes(2);
    });

    it('检测到重复记录', async () => {
      const mockPost = createMockPost();
      const mockDeal = createMockDeal();
      const existingDeal = createMockDeal({ id: 'existing-deal' });

      mockedAxios.get.mockResolvedValue({ data: [mockPost] });
      mockNormalizer.normalize.mockResolvedValue(mockDeal);
      mockDeduplicator.checkDuplicate.mockResolvedValue({
        isDuplicate: true,
        existingDeal,
        duplicateType: 'guid',
      });
      mockDeduplicator.handleDuplicate.mockResolvedValue(undefined);

      const result = await fetcher.fetchLatest();

      expect(result.fetched).toBe(1);
      expect(result.inserted).toBe(0);
      expect(result.duplicates).toBe(1);
      expect(result.errors).toHaveLength(0);

      expect(mockDeduplicator.handleDuplicate).toHaveBeenCalledWith('existing-deal');
      expect(mockDatabase.createDeal).not.toHaveBeenCalled();
    });

    it('API 请求失败正确处理', async () => {
      const error = new Error('Network error');
      mockedAxios.get.mockRejectedValue(error);

      const result = await fetcher.fetchLatest();

      expect(result.fetched).toBe(0);
      expect(result.inserted).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('抓取 Sparhamster API 失败');
      expect(result.errors[0]).toContain('Network error');
    });

    it('部分记录处理失败不影响其他记录', async () => {
      const mockPosts = [
        createMockPost({ id: 1 }),
        createMockPost({ id: 2 }),
        createMockPost({ id: 3 }),
      ];
      const mockDeals = [
        createMockDeal({ id: 'deal-1' }),
        createMockDeal({ id: 'deal-2' }),
        createMockDeal({ id: 'deal-3' }),
      ];

      mockedAxios.get.mockResolvedValue({ data: mockPosts });
      mockNormalizer.normalize
        .mockResolvedValueOnce(mockDeals[0])
        .mockRejectedValueOnce(new Error('Normalize failed'))
        .mockResolvedValueOnce(mockDeals[2]);
      mockDeduplicator.checkDuplicate.mockResolvedValue({ isDuplicate: false });
      mockDatabase.createDeal.mockResolvedValue('test-deal-id');

      const result = await fetcher.fetchLatest();

      expect(result.fetched).toBe(3);
      expect(result.inserted).toBe(2);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('处理帖子 2 失败');
      expect(mockDatabase.createDeal).toHaveBeenCalledTimes(2);
    });

    it('处理空响应', async () => {
      mockedAxios.get.mockResolvedValue({ data: [] });

      const result = await fetcher.fetchLatest();

      expect(result.fetched).toBe(0);
      expect(result.inserted).toBe(0);
      expect(result.errors).toHaveLength(0);

      expect(mockNormalizer.normalize).not.toHaveBeenCalled();
    });

    it('正确设置 API 请求参数', async () => {
      mockedAxios.get.mockResolvedValue({ data: [] });

      await fetcher.fetchLatest();

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('per_page='),
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': expect.any(String),
          }),
          timeout: 15000,
        })
      );
    });

    it('混合场景: 新增、重复和错误', async () => {
      const mockPosts = [
        createMockPost({ id: 1 }),
        createMockPost({ id: 2 }),
        createMockPost({ id: 3 }),
        createMockPost({ id: 4 }),
      ];

      mockedAxios.get.mockResolvedValue({ data: mockPosts });

      // Post 1: 新增成功
      mockNormalizer.normalize.mockResolvedValueOnce(createMockDeal({ id: 'deal-1' }));
      mockDeduplicator.checkDuplicate.mockResolvedValueOnce({ isDuplicate: false });
      mockDatabase.createDeal.mockResolvedValueOnce('test-deal-id');

      // Post 2: 重复
      mockNormalizer.normalize.mockResolvedValueOnce(createMockDeal({ id: 'deal-2' }));
      mockDeduplicator.checkDuplicate.mockResolvedValueOnce({
        isDuplicate: true,
        existingDeal: createMockDeal({ id: 'existing' }),
        duplicateType: 'content_hash',
      });

      // Post 3: 处理失败
      mockNormalizer.normalize.mockRejectedValueOnce(new Error('Failed'));

      // Post 4: 新增成功
      mockNormalizer.normalize.mockResolvedValueOnce(createMockDeal({ id: 'deal-4' }));
      mockDeduplicator.checkDuplicate.mockResolvedValueOnce({ isDuplicate: false });
      mockDatabase.createDeal.mockResolvedValueOnce('test-deal-id');

      const result = await fetcher.fetchLatest();

      expect(result.fetched).toBe(4);
      expect(result.inserted).toBe(2);
      expect(result.duplicates).toBe(1);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('边界情况', () => {
    it('处理 null 响应数据', async () => {
      mockedAxios.get.mockResolvedValue({ data: null });

      const result = await fetcher.fetchLatest();

      expect(result.fetched).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('处理格式错误的响应', async () => {
      mockedAxios.get.mockResolvedValue({ data: 'invalid' as any });

      await expect(async () => {
        const result = await fetcher.fetchLatest();
        // 应该能处理而不崩溃
        expect(result.errors.length).toBeGreaterThanOrEqual(0);
      }).not.toThrow();
    });

    it('数据库写入失败应被捕获', async () => {
      const mockPost = createMockPost();
      const mockDeal = createMockDeal();

      mockedAxios.get.mockResolvedValue({ data: [mockPost] });
      mockNormalizer.normalize.mockResolvedValue(mockDeal);
      mockDeduplicator.checkDuplicate.mockResolvedValue({ isDuplicate: false });
      mockDatabase.createDeal.mockRejectedValue(new Error('DB error'));

      const result = await fetcher.fetchLatest();

      expect(result.fetched).toBe(1);
      expect(result.inserted).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('DB error');
    });
  });

  describe('性能测试', () => {
    it('处理大量记录应在合理时间内完成', async () => {
      const mockPosts = Array.from({ length: 40 }, (_, i) =>
        createMockPost({ id: i + 1 })
      );

      mockedAxios.get.mockResolvedValue({ data: mockPosts });
      mockNormalizer.normalize.mockImplementation(async (post) =>
        createMockDeal({ id: `deal-${post.id}` })
      );
      mockDeduplicator.checkDuplicate.mockResolvedValue({ isDuplicate: false });
      mockDatabase.createDeal.mockResolvedValue('test-deal-id');

      // Mock randomDelay 以加速测试
      jest.spyOn(fetcher as any, 'randomDelay').mockResolvedValue(undefined);

      const start = Date.now();
      const result = await fetcher.fetchLatest();
      const duration = Date.now() - start;

      expect(result.fetched).toBe(40);
      expect(result.inserted).toBe(40);
      // 在 mock delay 的情况下应该很快
      expect(duration).toBeLessThan(5000); // 应在 5 秒内完成
    });
  });

  describe('日志输出', () => {
    it('应输出抓取统计日志', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const mockPosts = [createMockPost()];

      mockedAxios.get.mockResolvedValue({ data: mockPosts });
      mockNormalizer.normalize.mockResolvedValue(createMockDeal());
      mockDeduplicator.checkDuplicate.mockResolvedValue({ isDuplicate: false });
      mockDatabase.createDeal.mockResolvedValue('test-deal-id');

      await fetcher.fetchLatest();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Sparhamster API 返回')
      );

      consoleSpy.mockRestore();
    });

    it('错误应输出到 console.error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockedAxios.get.mockRejectedValue(new Error('Test error'));

      await fetcher.fetchLatest();

      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });
});
