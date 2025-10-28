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

      // 商家（无 /shop/ 链接时为 undefined）
      expect(deal.merchant).toBeUndefined();

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

    it('应正确解析德语千位分隔符价格格式', async () => {
      const post = createMockPost({
        title: 'Dreame Matrix10 Ultra Saug-/Wischroboter inkl. Absaug-/Reinigungsstation weiß um 1.108,24 € statt 1.519,89 €',
        content: `
          <div class="uk-font-bold has-blue-color">1.108,24 €</div>
          <span class="line-through has-gray-color">1.519,89 €</span>
        `,
      });

      const deal = await normalizer.normalize(post);

      // 应正确解析带千位分隔符的价格
      // 1.108,24 € -> 1108.24
      // 1.519,89 € -> 1519.89
      expect(deal.price).toBe(1108.24);
      expect(deal.originalPrice).toBe(1519.89);

      // 应计算正确的折扣百分比
      const expectedDiscount = Math.round(((1519.89 - 1108.24) / 1519.89) * 100);
      expect(deal.discount).toBe(expectedDiscount); // 约 27%

      // 标题应该被清理掉价格后缀
      expect(deal.title).toBe('Dreame Matrix10 Ultra Saug-/Wischroboter inkl. Absaug-/Reinigungsstation weiß');
    });

    it('应忽略运费价格 (Versandkosten 2,99 €)', async () => {
      const post = createMockPost({
        title: 'Product Deal',
        content: '<p>Preis: 12,99 €</p><p>Versandkosten 2,99 €</p>',
      });

      const deal = await normalizer.normalize(post);

      expect(deal.price).toBe(12.99);
      // 不应提取运费作为价格
      expect(deal.price).not.toBe(2.99);
    });

    it('应忽略物流费用 (Speditionskosten bis zu 69 €)', async () => {
      const post = createMockPost({
        title: 'MediaMarkt Deal',
        content: '<p>Ihr spart euch so die 2,99 € Versandkosten sowie auch bis zu 69 € Speditionskosten.</p>',
      });

      const deal = await normalizer.normalize(post);

      // 免运费优惠不应提取任何价格
      expect(deal.price).toBeUndefined();
      expect(deal.originalPrice).toBeUndefined();
    });

    it('应忽略 Versandpauschale 和 Lieferkosten', async () => {
      const post = createMockPost({
        title: 'Product um 19,97 €',
        content: '<p>Versandpauschale: 3,50 €</p><p>Lieferkosten: 2,99 €</p>',
      });

      const deal = await normalizer.normalize(post);

      expect(deal.price).toBe(19.97);
      expect(deal.price).not.toBe(3.50);
      expect(deal.price).not.toBe(2.99);
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

    it('应只从 /shop/ 链接提取商家，不使用标签', async () => {
      const post = createMockPost({
        content: '<p>普通内容，无 /shop/ 链接</p>',
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

      // 即使标签中有 MediaMarkt，也不应提取为商家（需要 /shop/ 链接）
      expect(deal.merchant).toBeUndefined();
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

    it('应正确解码 HTML 实体的 forward 链接', async () => {
      const post = createMockPost({
        content: '<a href="https://forward.sparhamster.at/out.php?hash=test&amp;name=SH">Zum Angebot</a>',
      });

      const deal = await normalizer.normalize(post);

      // 链接中的 &amp; 应被解码为 &
      expect(deal.merchantLink).toBe('https://forward.sparhamster.at/out.php?hash=test&name=SH');
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

    it('没有特色图片时应提取内容中的图片（wp-content）', async () => {
      const post = createMockPost({
        content: '<p>Text</p><img src="https://www.sparhamster.at/wp-content/uploads/2025/10/product.jpg">',
        _embedded: {},
      });

      const deal = await normalizer.normalize(post);

      expect(deal.imageUrl).toBe('https://www.sparhamster.at/wp-content/uploads/2025/10/product.jpg');
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

    /**
     * 基于人工标注数据的测试用例
     * 商品：Gardena RollUp M Wand-Schlauchbox 20m + gratis Brause
     */
    it('应正确提取 Gardena 商品的所有字段（基于标注数据）', async () => {
      const post = createMockPost({
        id: 338859,
        date: '2025-10-15T09:52:40+02:00',
        link: 'https://www.sparhamster.at/gardena-rollup-m-wand-schlauchbox-20m/',
        title: 'Gardena RollUp M Wand-Schlauchbox 20m + gratis Brause',
        content: `
          <div class="uk-overflow-hidden uk-margin-top">
            <div class="uk-flex uk-flex-column uk-flex-center uk-flex-middle">
              <div class="uk-flex uk-flex-row uk-flex-middle uk-flex-center uk-width-1-1 uk-width-5-6@s">
                <div class="uk-flex uk-flex-column uk-width-1-1">
                  <div class="uk-margin-xs-bottom">
                    <a href="/shop/amazon-de/" title="Amazon Gutscheine & Angebote">
                      <img width="150" height="100" style="height: 50px; width: auto"
                           src="https://www.sparhamster.at/wp-content/uploads/images/shops/1.png"
                           alt="Amazon Gutscheine & Angebote">
                    </a>
                  </div>
                  <div class="uk-text-center uk-width-1-1@s">
                    <div class="max-height-300">
                      <a href="https://forward.sparhamster.at/out.php?hash=Qr9O9h1eijhleUvThJfI4KXMAvofM56MpDQUtTLkAlZxwxE%3D&name=SH&token=0ccb1264cd81ad8e20f27dd146dfa37d">
                        <img width="300px" height="300px" property="url"
                             alt="Gardena RollUp M Wand-Schlauchbox 20m + gratis Brause um 88,84 € statt 115,97 €"
                             src="https://www.sparhamster.at/wp-content/uploads/2025/10/gardena-rollup-m-wand-schlauchbox-20m-grau-weiss-18612-20-um-9680-e-statt-11597-e.jpg">
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              <div class="uk-flex uk-flex-column uk-flex-center uk-width-1-1 uk-width-7-10@s">
                <div>
                  <h1 property="headline" class="uk-margin-top@s uk-margin-remove-bottom">
                    Gardena RollUp M Wand-Schlauchbox 20m + gratis Brause
                  </h1>
                </div>

                <div class="uk-flex uk-flex-column uk-flex-right">
                  <div class="uk-flex uk-flex-row uk-flex-center uk-margin-small-bottom">
                    <span class="has-blue-color">23% Ersparnis</span>
                    <span class="uk-margin-left uk-text-italic has-gray-color line-through">115,97 €</span>
                  </div>

                  <div class="uk-flex uk-flex-row uk-flex-center uk-flex-right@s text-xl uk-font-bold has-blue-color">
                    88,84 €
                  </div>
                </div>

                <div class="uk-width-1-1">
                  <div class="uk-flex uk-flex-row uk-flex-middle uk-flex-center uk-flex-right@s uk-margin-top">
                    <div class="uk-text-right">
                      <a class="uk-button uk-button-primary uk-text-bold"
                         href="https://forward.sparhamster.at/out.php?hash=Qr9O9h1eijhleUvThJfI4KXMAvofM56MpDQUtTLkAlZxwxE%3D&amp;name=SH&amp;token=0ccb1264cd81ad8e20f27dd146dfa37d">
                        Zum Angebot
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="uk-width-1-1 uk-margin-small-bottom" id="content">
              <hr>
              <div class="box-info">Der Preis fällt auf <strong>88,84 €</strong> <del>93,64 €</del>!</div>
              <p>Die<strong> Gardena Wand-Schlauchbox RollUp M 20 m </strong> gibt es bei Amazon zum Preis von <strong>96,80 €</strong>.</p>
              <p>Der nächste Vergleichspreis liegt bei 115,97 €.</p>
            </div>

            <div class="uk-margin-small-top">
              <div class="uk-badge uk-padding-small">
                <a href="https://www.sparhamster.at/amazon-prime-day/" rel="category tag">Amazon Prime Day 2025</a>
              </div>
              <div class="uk-badge uk-padding-small">
                <a href="https://www.sparhamster.at/werkzeug-baumarkt/" rel="category tag">Werkzeug & Baumarkt</a>
              </div>
              <div class="uk-badge uk-padding-small has-white-background-color has-blue-color">
                <a class="has-blue-color" href="/shop/amazon-de">Amazon Gutscheine & Angebote</a>
              </div>
              <p class="uk-article-meta">
                Deal von <a href="https://www.sparhamster.at/author/joker/">joker</a> am
                <time datetime="2025-10-15T09:52:40+02:00">Mittwoch, 15. Oktober 2025</time> um 09:52 Uhr.
              </p>
            </div>
          </div>
        `,
      });

      const deal = await normalizer.normalize(post);

      // 标题
      expect(deal.title).toBe('Gardena RollUp M Wand-Schlauchbox 20m + gratis Brause');

      // 价格信息（从 hero 区块提取）
      expect(deal.price).toBe(88.84);
      expect(deal.originalPrice).toBe(115.97);
      expect(deal.discount).toBe(23);

      // 商品图片（只取 wp-content 直链）
      expect(deal.imageUrl).toBe(
        'https://www.sparhamster.at/wp-content/uploads/2025/10/gardena-rollup-m-wand-schlauchbox-20m-grau-weiss-18612-20-um-9680-e-statt-11597-e.jpg'
      );

      // 商家信息（从 hero 区块提取 - 优先使用 title 中的商家名）
      expect(deal.merchant).toBe('Amazon'); // 从 "Amazon Gutscheine & Angebote" 提取
      expect(deal.merchantLogo).toBe('https://www.sparhamster.at/wp-content/uploads/images/shops/1.png');

      // 联盟链接（保留 forward URL）
      expect(deal.merchantLink).toContain('forward.sparhamster.at');
      expect(deal.merchantLink).toContain('token=0ccb1264cd81ad8e20f27dd146dfa37d');
      expect(deal.affiliateEnabled).toBe(true);
      expect(deal.affiliateNetwork).toBe('amazon');

      // 分类（只保留 rel="category tag"）
      expect(deal.categories).toContain('Amazon Prime Day 2025');
      expect(deal.categories).toContain('Werkzeug & Baumarkt');
      expect(deal.categories).not.toContain('Amazon Gutscheine & Angebote'); // 这是商家徽章

      // 发布时间（ISO 格式）
      expect(deal.publishedAt?.toISOString()).toBe('2025-10-15T07:52:40.000Z');
    });

    it('应正确提取 .box-info 中的价格更新信息', async () => {
      const post = createMockPost({
        content: `
          <div class="box-info">Der Preis fällt auf <strong>88,84 €</strong> <del>93,64 €</del>!</div>
          <p>Product description</p>
        `,
      });

      const deal = await normalizer.normalize(post);

      // .box-info 的价格应该被识别
      expect(deal.price).toBe(88.84);
    });

    it('应优先使用 hero 区块的价格而不是 .box-info', async () => {
      const post = createMockPost({
        content: `
          <div class="uk-flex uk-flex-row uk-flex-center uk-flex-right@s text-xl uk-font-bold has-blue-color">
            88,84 €
          </div>
          <span class="uk-margin-left uk-text-italic has-gray-color line-through">115,97 €</span>

          <div class="box-info">Der Preis fällt auf <strong>99,99 €</strong> <del>93,64 €</del>!</div>
        `,
      });

      const deal = await normalizer.normalize(post);

      // 应该使用 hero 区块的价格（88.84），而不是 .box-info 的价格（99.99）
      expect(deal.price).toBe(88.84);
      expect(deal.originalPrice).toBe(115.97);
    });

    it('应只提取 wp-content 图片链接，忽略 forward 链接', async () => {
      const post = createMockPost({
        content: `
          <a href="https://forward.sparhamster.at/out.php?hash=xxx">
            <img src="https://www.sparhamster.at/wp-content/uploads/2025/10/product.jpg" alt="Product">
          </a>
        `,
      });

      const deal = await normalizer.normalize(post);

      // 应该提取 wp-content 图片，而不是 forward 链接
      expect(deal.imageUrl).toBe('https://www.sparhamster.at/wp-content/uploads/2025/10/product.jpg');
    });

    it('应从 title 中提取商家名称（优先于 slug）', async () => {
      const post = createMockPost({
        content: `
          <a href="/shop/mediamarkt-at/" title="MediaMarkt Gutscheine & Angebote">
            <img src="https://www.sparhamster.at/wp-content/uploads/images/shops/2.png" alt="MediaMarkt">
          </a>
        `,
      });

      const deal = await normalizer.normalize(post);

      // 应提取 "MediaMarkt"（title 中关键词前的内容），而不是 "mediamarkt.at"（slug 转换）
      expect(deal.merchant).toBe('MediaMarkt');
      expect(deal.merchantLogo).toBe('https://www.sparhamster.at/wp-content/uploads/images/shops/2.png');
    });

    it('应正确提取各种 title 格式中的商家名称', async () => {
      const testCases = [
        { title: 'we-are.travel Gutscheine & Angebote', expected: 'we-are.travel' },
        { title: 'MediaMarkt Gutscheine & Angebote', expected: 'MediaMarkt' },
        { title: 'Amazon Deals', expected: 'Amazon' },
        { title: 'Saturn Sale 2025', expected: 'Saturn' },
        { title: 'IKEA Shop', expected: 'IKEA' },
        { title: 'Notebooksbilliger Angebote', expected: 'Notebooksbilliger' },
      ];

      for (const { title, expected } of testCases) {
        const post = createMockPost({
          content: `<a href="/shop/test-shop/" title="${title}"><img src="https://www.sparhamster.at/wp-content/uploads/images/shops/test.png"></a>`,
        });

        const deal = await normalizer.normalize(post);
        expect(deal.merchant).toBe(expected);
      }
    });

    it('title 无关键词时应 fallback 到 slug 转换（只转换最后一个 -）', async () => {
      const testCases = [
        { slug: 'amazon-de', title: '', expected: 'amazon.de' },
        { slug: 'mediamarkt-at', title: 'Just a title', expected: 'mediamarkt.at' },
        { slug: 'we-are-travel', title: '', expected: 'we-are.travel' },
        { slug: 'blue-tomato', title: '', expected: 'blue.tomato' },
        { slug: 'tink', title: '', expected: 'tink' }, // 无 - 时保留原值
      ];

      for (const { slug, title, expected } of testCases) {
        const post = createMockPost({
          content: `<a href="/shop/${slug}/" title="${title}"><img src="https://www.sparhamster.at/wp-content/uploads/images/shops/test.png"></a>`,
        });

        const deal = await normalizer.normalize(post);
        expect(deal.merchant).toBe(expected);
      }
    });

    it('title 为空且 slug 有多个 - 时应只转换最后一个 -', async () => {
      const post = createMockPost({
        content: `<a href="/shop/we-are-travel/" title=""><img src="https://www.sparhamster.at/wp-content/uploads/images/shops/test.png"></a>`,
      });

      const deal = await normalizer.normalize(post);

      // we-are-travel → we-are.travel（保留前面的 -，只转换最后一个）
      expect(deal.merchant).toBe('we-are.travel');
    });

    it('应跳过 sparhamster 内部链接，选择真实商家', async () => {
      const post = createMockPost({
        content: `
          <!-- 第一个链接是 sparhamster 内部链接，应被跳过 -->
          <a href="/shop/sparhamster-at/" title="Sparhamster.at Deals">
            <img src="https://www.sparhamster.at/wp-content/uploads/images/shops/sparhamster.png">
          </a>

          <!-- 第二个链接是真实商家 tink -->
          <a href="/shop/tink/" title="tink Gutscheine & Angebote">
            <img src="https://www.sparhamster.at/wp-content/uploads/images/shops/tink.png">
          </a>
        `,
      });

      const deal = await normalizer.normalize(post);

      // 应该识别为 tink，而不是 Sparhamster.at
      expect(deal.merchant).toBe('tink');
    });

    it('应跳过 sparhamster 链接并从 title 提取真实商家名称', async () => {
      const post = createMockPost({
        content: `
          <!-- sparhamster 内部链接 -->
          <a href="/shop/sparhamster/" title="Sparhamster Shop">
            <img src="https://www.sparhamster.at/wp-content/uploads/images/shops/sh.png">
          </a>

          <!-- mömax 商家链接 -->
          <a href="/shop/moemax-at/" title="mömax Gutscheine & Angebote">
            <img src="https://www.sparhamster.at/wp-content/uploads/images/shops/89.png">
          </a>
        `,
      });

      const deal = await normalizer.normalize(post);

      // 应该从 title 提取 mömax，而不是 Sparhamster
      expect(deal.merchant).toBe('mömax');
    });

    it('只考虑带有商家 logo 的 /shop/ 链接', async () => {
      const post = createMockPost({
        content: `
          <!-- 没有 logo 的链接应被忽略 -->
          <a href="/shop/some-shop/" title="Some Shop">Text Link</a>

          <!-- 有 logo 但不是 /images/shops/ 路径的也被忽略 -->
          <a href="/shop/another-shop/" title="Another Shop">
            <img src="https://example.com/logo.png">
          </a>

          <!-- 有正确 logo 路径的链接 -->
          <a href="/shop/amazon-de/" title="Amazon Gutscheine">
            <img src="https://www.sparhamster.at/wp-content/uploads/images/shops/1.png">
          </a>
        `,
      });

      const deal = await normalizer.normalize(post);

      // 应该识别为 Amazon
      expect(deal.merchant).toBe('Amazon');
    });

    it('应优先使用 fullHtml 而不是 content.rendered 提取商家', async () => {
      const post = createMockPost({
        content: `
          <!-- content.rendered 中没有 /shop/ 链接 -->
          <p>普通内容，没有商家链接</p>
        `,
      });

      const fullHtml = `
        <!-- fullHtml 中包含商家链接 -->
        <a href="/shop/moemax-at/" title="mömax Gutscheine & Angebote">
          <img src="https://www.sparhamster.at/wp-content/uploads/images/shops/89.png" alt="mömax">
        </a>
      `;

      const deal = await normalizer.normalize(post, { fullHtml });

      // 应该从 fullHtml 提取 mömax
      expect(deal.merchant).toBe('mömax');
    });

    it('fullHtml 中先出现 sparhamster，后出现真实商家时应正确跳过', async () => {
      const post = createMockPost({
        content: '<p>No shop links in content</p>',
      });

      const fullHtml = `
        <!-- 第一个是 sparhamster 内部链接 -->
        <a href="/shop/sparhamster-at/" title="Sparhamster Deals">
          <img src="https://www.sparhamster.at/wp-content/uploads/images/shops/sh.png">
        </a>

        <!-- 第二个是真实商家 tink -->
        <a href="/shop/tink/" title="tink Gutscheine & Angebote">
          <img src="https://www.sparhamster.at/wp-content/uploads/images/shops/tink.png">
        </a>
      `;

      const deal = await normalizer.normalize(post, { fullHtml });

      // 应该跳过 sparhamster，提取 tink
      expect(deal.merchant).toBe('tink');
    });

    it('fullHtml 为 null 时应退回到 content.rendered', async () => {
      const post = createMockPost({
        content: `
          <a href="/shop/amazon-de/" title="Amazon Gutscheine">
            <img src="https://www.sparhamster.at/wp-content/uploads/images/shops/1.png">
          </a>
        `,
      });

      const deal = await normalizer.normalize(post, { fullHtml: null });

      // 应该从 content.rendered 提取
      expect(deal.merchant).toBe('Amazon');
    });

    it('fullHtml 和 content.rendered 都没有 /shop/ 链接时应返回 undefined', async () => {
      const post = createMockPost({
        content: '<p>普通内容，无商家链接</p>',
      });

      const fullHtml = '<p>完整HTML，也无商家链接</p>';

      const deal = await normalizer.normalize(post, { fullHtml });

      expect(deal.merchant).toBeUndefined();
    });

    it('无 /shop/ 链接时商家应为 undefined', async () => {
      const post = createMockPost({
        content: `
          <p>这是一个没有商家链接的优惠</p>
          <a href="https://example.com">外部链接</a>
        `,
        _embedded: {
          'wp:term': [
            [],
            [
              { id: 1, name: 'SomeTag', slug: 'sometag', taxonomy: 'post_tag', link: '' },
            ],
          ],
        },
      });

      const deal = await normalizer.normalize(post);

      expect(deal.merchant).toBeUndefined();
    });

    it('应过滤黑名单商家（geizhals）', async () => {
      const post = createMockPost({
        content: `
          <!-- geizhals 黑名单链接应被跳过 -->
          <a href="/shop/geizhals-at/" title="Geizhals Preisvergleich">
            <img src="https://www.sparhamster.at/wp-content/uploads/images/shops/gh.png">
          </a>

          <!-- Amazon 真实商家 -->
          <a href="/shop/amazon-de/" title="Amazon Angebote">
            <img src="https://www.sparhamster.at/wp-content/uploads/images/shops/1.png">
          </a>
        `,
      });

      const deal = await normalizer.normalize(post);

      // 应跳过 geizhals，选择 Amazon
      expect(deal.merchant).toBe('Amazon');
    });

    it('应过滤黑名单商家（idealo）', async () => {
      const post = createMockPost({
        content: `
          <!-- idealo 黑名单链接 -->
          <a href="/shop/idealo-de/" title="idealo Deals">
            <img src="https://www.sparhamster.at/wp-content/uploads/images/shops/idealo.png">
          </a>

          <!-- tink 真实商家 -->
          <a href="/shop/tink/" title="tink Gutscheine">
            <img src="https://www.sparhamster.at/wp-content/uploads/images/shops/404.png">
          </a>
        `,
      });

      const deal = await normalizer.normalize(post);

      expect(deal.merchant).toBe('tink');
    });

    it('title 包含黑名单关键词时应跳过，使用 slug', async () => {
      const post = createMockPost({
        content: `
          <a href="/shop/mediamarkt-at/" title="Geizhals Vergleich MediaMarkt">
            <img src="https://www.sparhamster.at/wp-content/uploads/images/shops/mm.png">
          </a>
        `,
      });

      const deal = await normalizer.normalize(post);

      // title 包含 "Geizhals"，被过滤，应使用 slug 转换
      expect(deal.merchant).toBe('mediamarkt.at');
    });

    it('title 和 slug 都无效时应 fallback 到图片 alt', async () => {
      const post = createMockPost({
        content: `
          <a href="/shop/sparhamster-special/" title="Sparhamster Deals">
            <img
              src="https://www.sparhamster.at/wp-content/uploads/images/shops/mm.png"
              alt="MediaMarkt Angebote"
            >
          </a>
        `,
      });

      const deal = await normalizer.normalize(post);

      // title 包含 sparhamster 被过滤，slug 也包含 sparhamster，最后用 alt
      expect(deal.merchant).toBe('MediaMarkt');
    });

    it('应支持懒加载图片（data-lazy-src）提取 alt', async () => {
      const post = createMockPost({
        content: `
          <a href="/shop/geizhals/" title="Geizhals Shop">
            <img
              data-lazy-src="https://www.sparhamster.at/wp-content/uploads/images/shops/404.png"
              alt="tink Smart Home Angebote"
            >
          </a>
        `,
      });

      const deal = await normalizer.normalize(post);

      // title/slug 都是 geizhals 黑名单，应使用 alt (截取 "Angebote" 前的内容)
      expect(deal.merchant).toBe('tink Smart Home');
    });

    it('应正确检测 Amazon 联盟链接', async () => {
      const post = createMockPost({
        content: `
          <a href="https://forward.sparhamster.at/out.php?hash=xxx&name=SH&token=abc123">Zum Angebot</a>
        `,
      });

      const deal = await normalizer.normalize(post);

      expect(deal.affiliateEnabled).toBe(true);
      expect(deal.affiliateLink).toContain('forward.sparhamster.at');
      expect(deal.merchantLink).toContain('token=abc123');
    });

    it('应从 <time datetime> 提取 ISO 时间', async () => {
      const post = createMockPost({
        date: '2025-10-13T10:00:00',
        content: `
          <time datetime="2025-10-15T09:52:40+02:00">Mittwoch, 15. Oktober 2025</time>
        `,
      });

      const deal = await normalizer.normalize(post);

      // 应该使用 HTML 中的 <time datetime>，而不是 post.date
      expect(deal.publishedAt?.toISOString()).toBe('2025-10-15T07:52:40.000Z');
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

  describe('cleanPriceSuffix - 德语价格清理', () => {
    it('应清除 "um X € statt Y €" 格式的价格尾巴', async () => {
      const post = createMockPost({
        title: 'SodaStream Sirupe 440ml (23 versch. Sorten) um 3,49 € statt 5,03 €',
        content: '<p>Test content</p>',
      });
      const deal = await normalizer.normalize(post);
      expect(deal.title).toBe('SodaStream Sirupe 440ml (23 versch. Sorten)');
      expect(deal.originalTitle).toBe('SodaStream Sirupe 440ml (23 versch. Sorten) um 3,49 € statt 5,03 €');
    });

    it('应清除 "für X € statt Y €" 格式的价格尾巴', async () => {
      const post = createMockPost({
        title: 'Logitech Maus für 19,99 € statt 39,99 €',
        content: '<p>Test content</p>',
      });
      const deal = await normalizer.normalize(post);
      expect(deal.title).toBe('Logitech Maus');
      expect(deal.originalTitle).toBe('Logitech Maus für 19,99 € statt 39,99 €');
    });

    it('应清除 "reduziert auf X € statt Y €" 格式的价格尾巴', async () => {
      const post = createMockPost({
        title: 'Philips Zahnbürste reduziert auf 79,99 € statt 159,99 €',
        content: '<p>Test content</p>',
      });
      const deal = await normalizer.normalize(post);
      expect(deal.title).toBe('Philips Zahnbürste');
      expect(deal.originalTitle).toBe('Philips Zahnbürste reduziert auf 79,99 € statt 159,99 €');
    });

    it('应清除 "nur X € statt Y €" 格式的价格尾巴', async () => {
      const post = createMockPost({
        title: 'Gaming Headset nur 29,99 € statt 59,99 €',
        content: '<p>Test content</p>',
      });
      const deal = await normalizer.normalize(post);
      expect(deal.title).toBe('Gaming Headset');
      expect(deal.originalTitle).toBe('Gaming Headset nur 29,99 € statt 59,99 €');
    });

    it('应支持 EUR 货币符号', async () => {
      const post = createMockPost({
        title: 'Sony Kopfhörer um 49,99 EUR statt 99,99 EUR',
        content: '<p>Test content</p>',
      });
      const deal = await normalizer.normalize(post);
      expect(deal.title).toBe('Sony Kopfhörer');
    });

    it('应支持不含小数点的价格', async () => {
      const post = createMockPost({
        title: 'Notebook Tasche für 25 € statt 50 €',
        content: '<p>Test content</p>',
      });
      const deal = await normalizer.normalize(post);
      expect(deal.title).toBe('Notebook Tasche');
    });

    it('不应清除中间出现的价格信息', async () => {
      const post = createMockPost({
        title: 'Special um 10€ Bundle mit Zubehör',
        content: '<p>Test content</p>',
      });
      const deal = await normalizer.normalize(post);
      // 中间的价格不应该被清除，因为没有完整的 "um X statt Y" 模式
      expect(deal.title).toBe('Special um 10€ Bundle mit Zubehör');
    });

    it('应支持德语千位分隔符价格', async () => {
      const post = createMockPost({
        title: 'Dreame Matrix10 Ultra Saug-/Wischroboter inkl. Absaug-/Reinigungsstation weiß um 1.108,24 € statt 1.519,89 €',
        content: '<p>Test content</p>',
      });
      const deal = await normalizer.normalize(post);
      // 应清除带千位分隔符的价格后缀
      expect(deal.title).toBe('Dreame Matrix10 Ultra Saug-/Wischroboter inkl. Absaug-/Reinigungsstation weiß');
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
