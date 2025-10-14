/**
 * Sparhamster Normalizer 单元测试
 */

import { SparhamsterNormalizer } from '../normalizers/sparhamster-normalizer';
import { WordPressPost } from '../types/wordpress.types';
import { Deal } from '../types/deal.types';

describe('SparhamsterNormalizer', () => {
  let normalizer: SparhamsterNormalizer;

  beforeEach(() => {
    normalizer = new SparhamsterNormalizer();
  });

  describe('normalize', () => {
    it('应正确转换完整的 WordPress Post', async () => {
      const post: WordPressPost = {
        id: 12345,
        date: '2025-10-13T10:00:00',
        date_gmt: '2025-10-13T08:00:00',
        modified: '2025-10-13T10:00:00',
        modified_gmt: '2025-10-13T08:00:00',
        slug: 'test-deal',
        status: 'publish',
        type: 'post',
        link: 'https://www.sparhamster.at/deals/test-deal',
        title: { rendered: 'Test Deal Title' },
        excerpt: { rendered: '<p>Test excerpt</p>', protected: false },
        content: {
          rendered: '<p>Price: <strong>19.99€</strong> (Original: 29.99€)</p><p>Get 33% discount!</p>',
          protected: false,
        },
        author: 1,
        featured_media: 100,
        comment_status: 'open',
        ping_status: 'open',
        sticky: false,
        template: '',
        format: 'standard',
        meta: [],
        categories: [1],
        tags: [2],
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
              alt_text: 'Test Alt',
              media_type: 'image',
              mime_type: 'image/jpeg',
              media_details: {
                width: 800,
                height: 600,
                file: 'test.jpg',
                sizes: {},
              },
              source_url: 'https://example.com/image.jpg',
            },
          ],
          'wp:term': [
            [{ id: 1, link: '', name: 'Electronics', slug: 'electronics', taxonomy: 'category' }],
            [{ id: 2, link: '', name: 'Amazon', slug: 'amazon', taxonomy: 'post_tag' }],
          ],
        },
      };

      const deal = await normalizer.normalize(post);

      // 基础字段
      expect(deal.sourceSite).toBe('sparhamster');
      expect(deal.sourcePostId).toBe('12345');
      expect(deal.guid).toBe(post.link);
      expect(deal.slug).toBe('test-deal');

      // 标题和描述
      expect(deal.title).toBe('Test Deal Title');
      expect(deal.originalTitle).toBe('Test Deal Title');
      expect(deal.description).toBe('Test excerpt');
      expect(deal.originalDescription).toBe('Test excerpt');

      // 价格信息
      expect(deal.price).toBe(19.99);
      expect(deal.originalPrice).toBe(29.99);
      expect(deal.discount).toBe(33);
      expect(deal.currency).toBe('EUR');

      // 图片
      expect(deal.imageUrl).toBe('https://example.com/image.jpg');
      expect(deal.images).toEqual(['https://example.com/image.jpg']);

      // 分类
      expect(deal.categories).toContain('Electronics');
      expect(deal.categories).toContain('Amazon');

      // 商家
      expect(deal.merchant).toBe('Amazon');

      // 翻译状态
      expect(deal.language).toBe('de');
      expect(deal.translationStatus).toBe('pending');
      expect(deal.isTranslated).toBe(false);

      // 联盟链接 (默认值)
      expect(deal.affiliateEnabled).toBe(false);

      // 元数据
      expect(deal.duplicateCount).toBe(0);
      expect(deal.contentHash).toBeDefined();
      expect(deal.contentHash?.length).toBe(16);
    });

    it('应正确提取价格信息 (单个价格)', async () => {
      const post = createMockPost({
        title: 'Deal for 49.99€',
        content: '<p>Great offer!</p>',
      });

      const deal = await normalizer.normalize(post);

      expect(deal.price).toBe(49.99);
      expect(deal.originalPrice).toBeUndefined();
    });

    it('应正确提取价格信息 (多个价格)', async () => {
      const post = createMockPost({
        title: 'Deal',
        content: '<p>Was 99.99€, now only 59.99€!</p>',
      });

      const deal = await normalizer.normalize(post);

      expect(deal.price).toBe(59.99); // 最小价格
      expect(deal.originalPrice).toBe(99.99); // 最大价格
    });

    it('应正确提取价格信息 (Mammut 示例: 忽略运费和比较价)', async () => {
      const post = createMockPost({
        title: 'Mammut Ducan Spine 28-35 Wanderrucksack um 84,99€ statt 123,59€',
        content: `
          <p>Der Mammut Ducan Spine 28-35 Wanderrucksack ist bei Gigasport für 84,99€ erhältlich.</p>
          <p>Original Price: 123,59€</p>
          <p>Versandkosten: 4,95 €</p>
          <p>Vergleichspreis bei anderen Händlern: 134,51 €</p>
        `,
      });

      const deal = await normalizer.normalize(post);

      // 应正确识别 "statt" 模式中的价格对
      expect(deal.price).toBe(84.99);
      expect(deal.originalPrice).toBe(123.59);

      // 应计算折扣百分比
      expect(deal.discount).toBe(31); // Math.round((123.59 - 84.99) / 123.59 * 100) = 31

      // 不应该被运费 (4.95€) 或比较价 (134.51€) 干扰
      expect(deal.price).not.toBe(4.95);
      expect(deal.originalPrice).not.toBe(134.51);
    });

    it('应正确清理标题末尾的完整价格对', async () => {
      const testCases = [
        {
          input: '产品名称原价 167,99 欧元，现价 64,99 欧元',
          expectedTitle: '产品名称',
          expectedOriginalTitle: '产品名称原价 167,99 欧元，现价 64,99 欧元',
          description: '原价...现价 完整价格对（无逗号分隔）',
        },
        {
          input: '产品名称，原价 167.99 欧元，现价 64.99 欧元',
          expectedTitle: '产品名称',
          expectedOriginalTitle: '产品名称，原价 167.99 欧元，现价 64.99 欧元',
          description: '原价...现价 完整价格对（带逗号分隔）',
        },
        {
          input: '产品名称现价 64,99 欧元，原价 167,99 欧元',
          expectedTitle: '产品名称',
          expectedOriginalTitle: '产品名称现价 64,99 欧元，原价 167,99 欧元',
          description: '现价...原价 完整价格对（顺序相反）',
        },
      ];

      for (const { input, expectedTitle, expectedOriginalTitle, description } of testCases) {
        const post = createMockPost({ title: input });
        const deal = await normalizer.normalize(post);
        expect(deal.title).toBe(expectedTitle);
        expect(deal.originalTitle).toBe(expectedOriginalTitle);
      }
    });

    it('单独的价格标签（非完整价格对）应保留', async () => {
      const testCases = [
        {
          input: '产品名称，原价 167,99 欧元',
          expected: '产品名称，原价 167,99 欧元',
          description: '仅原价，无现价配对',
        },
        {
          input: '产品名称，现价 64,99 欧元',
          expected: '产品名称，现价 64,99 欧元',
          description: '仅现价，无原价配对',
        },
        {
          input: '产品名称，价格：64,99 欧元',
          expected: '产品名称，价格：64,99 欧元',
          description: '仅价格标签',
        },
      ];

      for (const { input, expected, description } of testCases) {
        const post = createMockPost({ title: input });
        const deal = await normalizer.normalize(post);
        expect(deal.title).toBe(expected);
      }
    });

    it('标题中间的价格描述不应被清理', async () => {
      const testCases = [
        {
          input: '产品 原价 100 欧元 something现价 50 欧元',
          expected: '产品 原价 100 欧元 something现价 50 欧元',
        },
        {
          input: '原价 100 的产品名称',
          expected: '原价 100 的产品名称',
        },
        {
          input: '现价优惠的产品',
          expected: '现价优惠的产品',
        },
      ];

      for (const { input, expected } of testCases) {
        const post = createMockPost({ title: input });
        const deal = await normalizer.normalize(post);
        expect(deal.title).toBe(expected);
      }
    });

    it('应正确提取折扣百分比', async () => {
      const post = createMockPost({
        content: '<p>Save 50% on this deal!</p>',
      });

      const deal = await normalizer.normalize(post);

      expect(deal.discount).toBe(50);
    });

    it('应同时保留单个价格和折扣百分比', async () => {
      const post = createMockPost({
        title: 'Special Deal',
        content: '<p>仅 39,99 € (-20%)</p>',
      });

      const deal = await normalizer.normalize(post);

      expect(deal.price).toBe(39.99);
      expect(deal.discount).toBe(20);
      expect(deal.originalPrice).toBeUndefined();
    });

    it('应正确计算 content_hash', async () => {
      const post1 = createMockPost({
        id: 1,
        title: 'Same Title',
        excerpt: 'Same Description',
        content: 'Price: 10€',
      });

      const post2 = createMockPost({
        id: 9999, // ID 不同
        date: '2025-10-14T00:00:00', // 日期不同
        title: 'Same Title',
        excerpt: 'Same Description',
        content: 'Price: 10€',
      });

      const deal1 = await normalizer.normalize(post1);
      const deal2 = await normalizer.normalize(post2);

      // 相同内容应生成相同 hash
      expect(deal1.contentHash).toBe(deal2.contentHash);
    });

    it('应正确生成 content_blocks', async () => {
      const post = createMockPost({
        content: `
          <h2>Heading</h2>
          <p>Paragraph text</p>
          <ul><li>Item 1</li><li>Item 2</li></ul>
          <blockquote>Quote text</blockquote>
        `,
      });

      const deal = await normalizer.normalize(post);

      expect(deal.contentBlocks).toHaveLength(4);
      expect(deal.contentBlocks![0]).toMatchObject({
        type: 'heading',
        content: 'Heading',
        metadata: { level: 'h2' },
      });
      expect(deal.contentBlocks![1]).toMatchObject({
        type: 'text',
        content: 'Paragraph text',
      });
      expect(deal.contentBlocks![2]).toMatchObject({
        type: 'list',
        metadata: { ordered: false },
      });
      expect(deal.contentBlocks![3]).toMatchObject({
        type: 'quote',
        content: 'Quote text',
      });
    });

    it.skip('应正确提取优惠码 (功能待实现)', async () => {
      const post = createMockPost({
        content: '<p>Use code: <strong>SAVE20</strong> at checkout</p>',
      });

      const deal = await normalizer.normalize(post);

      expect(deal.couponCode).toBe('SAVE20');
    });

    it('没有优惠码时应返回 undefined', async () => {
      const post = createMockPost({
        content: '<p>No coupon here</p>',
      });

      const deal = await normalizer.normalize(post);

      expect(deal.couponCode).toBeUndefined();
    });

    it('应正确提取商家名称 (来自标签)', async () => {
      const post = createMockPost({
        _embedded: {
          'wp:term': [
            [],
            [
              { id: 1, name: 'MediaMarkt', slug: 'mediamarkt', taxonomy: 'post_tag', link: '' },
            ],
          ],
        },
      });

      const deal = await normalizer.normalize(post);

      expect(deal.merchant).toBe('MediaMarkt');
    });

    it('应正确提取商家链接 (forward 链接)', async () => {
      const post = createMockPost({
        content: '<a href="https://forward.sparhamster.at/go/12345">Zum Angebot</a>',
      });

      const deal = await normalizer.normalize(post);

      expect(deal.merchantLink).toBe('https://forward.sparhamster.at/go/12345');
      expect(deal.link).toBe('https://forward.sparhamster.at/go/12345');
    });

    it('应正确提取商家链接 (优惠按钮)', async () => {
      const post = createMockPost({
        content: '<a href="https://example.com/product">Zum Angebot</a>',
      });

      const deal = await normalizer.normalize(post);

      expect(deal.merchantLink).toBe('https://example.com/product');
    });

    it('应正确提取商家链接 (亚马逊)', async () => {
      const post = createMockPost({
        content: '<a href="https://www.amazon.de/product/123?tag=affiliate">Buy on Amazon</a>',
      });

      const deal = await normalizer.normalize(post);

      expect(deal.merchantLink).toContain('amazon.de');
    });

    it('没有商家链接时应使用 post.link', async () => {
      const post = createMockPost({
        link: 'https://www.sparhamster.at/deals/test',
        content: '<p>No external links</p>',
      });

      const deal = await normalizer.normalize(post);

      expect(deal.link).toBe('https://www.sparhamster.at/deals/test');
      expect(deal.merchantLink).toBeUndefined();
    });

    it('应正确提取特色图片', async () => {
      const post = createMockPost({
        _embedded: {
          'wp:featuredmedia': [
            {
              id: 100,
              source_url: 'https://example.com/featured.jpg',
              alt_text: 'Featured',
              date: '',
              slug: '',
              type: '',
              link: '',
              title: { rendered: '' },
              author: 1,
              caption: { rendered: '' },
              media_type: '',
              mime_type: '',
              media_details: { width: 0, height: 0, file: '', sizes: {} },
            },
          ],
        },
      });

      const deal = await normalizer.normalize(post);

      expect(deal.imageUrl).toBe('https://example.com/featured.jpg');
    });

    it('没有特色图片时应提取内容中的图片', async () => {
      const post = createMockPost({
        content: '<p>Text</p><img src="https://example.com/content-image.jpg">',
        _embedded: {},
      });

      const deal = await normalizer.normalize(post);

      expect(deal.imageUrl).toBe('https://example.com/content-image.jpg');
    });

    it('应正确计算过期时间 (30天后)', async () => {
      const publishDate = new Date('2025-10-13T10:00:00');
      const post = createMockPost({
        date: publishDate.toISOString(),
      });

      const deal = await normalizer.normalize(post);

      const expectedExpiry = new Date(publishDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      expect(deal.expiresAt?.getTime()).toBe(expectedExpiry.getTime());
    });
  });

  describe('validate', () => {
    it('应验证完整的 Deal 对象', async () => {
      const post = createMockPost();
      const deal = await normalizer.normalize(post);

      expect(normalizer.validate(deal)).toBe(true);
    });

    it('应拒绝缺少必需字段的 Deal', () => {
      const incompleteDeal = {
        sourceSite: 'sparhamster',
        // 缺少 guid, link 等必需字段
      } as any;

      expect(normalizer.validate(incompleteDeal)).toBe(false);
    });
  });
});

/**
 * Mock Post 参数类型 - 允许字符串简写
 */
type MockPostOverrides = Partial<Omit<WordPressPost, 'title' | 'content' | 'excerpt'>> & {
  title?: string | { rendered: string };
  content?: string | { rendered: string; protected: boolean };
  excerpt?: string | { rendered: string; protected: boolean };
};

/**
 * 创建 Mock WordPress Post 对象
 * 提供默认值,可通过参数覆盖
 */
function createMockPost(overrides: MockPostOverrides = {}): WordPressPost {
  const defaults: WordPressPost = {
    id: 12345,
    date: '2025-10-13T10:00:00',
    date_gmt: '2025-10-13T08:00:00',
    modified: '2025-10-13T10:00:00',
    modified_gmt: '2025-10-13T08:00:00',
    slug: 'test-deal',
    status: 'publish',
    type: 'post',
    link: 'https://www.sparhamster.at/deals/test-deal',
    title: { rendered: 'Test Deal' },
    excerpt: { rendered: '<p>Test excerpt</p>', protected: false },
    content: { rendered: '<p>Test content</p>', protected: false },
    author: 1,
    featured_media: 0,
    comment_status: 'open',
    ping_status: 'open',
    sticky: false,
    template: '',
    format: 'standard',
    meta: [],
    categories: [],
    tags: [],
    _embedded: {},
  };

  // 深度合并 _embedded
  if (overrides._embedded) {
    defaults._embedded = {
      ...defaults._embedded,
      ...overrides._embedded,
    };
    delete overrides._embedded;
  }

  // 合并其他字段 - 需要处理 title, content, excerpt 的字符串简写
  const merged = {
    ...defaults,
    ...overrides,
  };

  // 如果 title 是字符串,转换为对象
  if (typeof (overrides as any).title === 'string') {
    merged.title = { rendered: (overrides as any).title };
  }

  // 如果 content 是字符串,转换为对象
  if (typeof (overrides as any).content === 'string') {
    merged.content = { rendered: (overrides as any).content, protected: false };
  }

  // 如果 excerpt 是字符串,转换为对象
  if (typeof (overrides as any).excerpt === 'string') {
    merged.excerpt = { rendered: (overrides as any).excerpt, protected: false };
  }

  return merged as WordPressPost;
}
