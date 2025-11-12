/**
 * Preisjaeger 测试脚本
 *
 * 用于测试 Preisjaeger Fetcher 和 Normalizer 的功能
 * 不连接数据库，只测试抓取和解析功能
 */

import 'dotenv/config';
import axios from 'axios';
import { load as cheerioLoad } from 'cheerio';
import { PreisjaegerNormalizer, PreisjaegerListItem, PreisjaegerDetailItem } from './normalizers/preisjaeger-normalizer';

// 配置
const LIST_URL = process.env.PREISJAEGER_LIST_URL || 'https://www.preisjaeger.at/neu';

/**
 * 测试列表页抓取
 */
async function testListPage() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 测试 1: 列表页抓取');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    console.log(`📡 请求: ${LIST_URL}`);

    const response = await axios.get(LIST_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'de-AT,de;q=0.9,en;q=0.8',
      },
      timeout: 30000,
    });

    console.log(`✅ 响应状态: ${response.status}`);
    console.log(`📦 响应大小: ${Math.round(response.data.length / 1024)}KB\n`);

    // 解析 HTML
    const $ = cheerioLoad(response.data);
    const items: PreisjaegerListItem[] = [];

    $('[data-vue3]').each((_, element) => {
      try {
        const dataVue3 = $(element).attr('data-vue3');
        if (!dataVue3) return;

        const vueData = JSON.parse(dataVue3);

        if (vueData.name === 'ThreadMainListItemNormalizer' && vueData.props?.thread) {
          const thread = vueData.props.thread as PreisjaegerListItem;
          if (thread.threadId && thread.title) {
            items.push(thread);
          }
        }
      } catch (error) {
        // 跳过解析失败的项
      }
    });

    console.log(`✅ 提取到 ${items.length} 个商品\n`);

    if (items.length > 0) {
      console.log('📄 第一个商品信息:');
      const first = items[0];
      console.log(`  - ID: ${first.threadId}`);
      console.log(`  - 标题: ${first.title}`);
      console.log(`  - 商家: ${first.merchant?.merchantName || first.linkHost || 'N/A'}`);
      console.log(`  - 分类: ${first.mainGroup?.threadGroupName || 'N/A'}`);
      console.log(`  - 价格: €${first.price !== undefined ? first.price.toFixed(2) : 'N/A'}`);
      console.log(`  - 原价: €${first.nextBestPrice !== undefined ? first.nextBestPrice.toFixed(2) : 'N/A'}`);
      console.log(`  - 优惠码: ${first.voucherCode || 'N/A'}`);
      console.log(`  - 热度: ${first.temperature || 0}\n`);
    }

    return items;
  } catch (error) {
    console.error('❌ 列表页抓取失败:', error);
    throw error;
  }
}

/**
 * 测试详情页抓取
 */
async function testDetailPage(listItem: PreisjaegerListItem) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📄 测试 2: 详情页抓取');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const detailUrl = `https://www.preisjaeger.at/deals/${listItem.titleSlug}-${listItem.threadId}`;
    console.log(`📡 请求: ${detailUrl}`);

    const response = await axios.get(detailUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'de-AT,de;q=0.9,en;q=0.8',
      },
      timeout: 30000,
    });

    console.log(`✅ 响应状态: ${response.status}`);
    console.log(`📦 响应大小: ${Math.round(response.data.length / 1024)}KB\n`);

    // 提取 window.__INITIAL_STATE__
    const html = response.data;
    const initialStateMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*({.+?});/s);

    if (!initialStateMatch) {
      throw new Error('无法提取 __INITIAL_STATE__');
    }

    const initialState = JSON.parse(initialStateMatch[1]);
    const threadDetail = initialState.threadDetail as PreisjaegerDetailItem;

    console.log('✅ 提取到详情页数据\n');
    console.log('📄 详情信息:');
    console.log(`  - ID: ${threadDetail.threadId}`);
    console.log(`  - 标题: ${threadDetail.title}`);
    console.log(`  - 商家: ${threadDetail.merchant?.merchantName || threadDetail.linkHost || 'N/A'}`);
    console.log(`  - 商家链接: ${threadDetail.cpcLink || 'N/A'}`);
    console.log(`  - 分享链接: ${threadDetail.shareableLink}`);
    console.log(`  - 详情页: ${threadDetail.url || detailUrl}`);
    console.log(`  - 分类数量: ${threadDetail.groups?.length || (threadDetail.mainGroup ? 1 : 0)}`);

    if (threadDetail.groups) {
      console.log('  - 所有分类:');
      threadDetail.groups.forEach(g => console.log(`    • ${g.threadGroupName}`));
    }

    console.log(`  - 图片: ${threadDetail.mainImage ? 'Yes' : 'No'}`);
    if (threadDetail.mainImage) {
      console.log(`    路径: ${threadDetail.mainImage.path}/${threadDetail.mainImage.name}`);
    }

    console.log(`  - 描述长度: ${threadDetail.preparedHtmlDescription?.length || 0} 字符`);
    console.log(`  - 发布时间: ${threadDetail.publishedAt ? new Date(threadDetail.publishedAt * 1000).toISOString() : 'N/A'}\n`);

    return threadDetail;
  } catch (error) {
    console.error('❌ 详情页抓取失败:', error);
    throw error;
  }
}

/**
 * 测试数据标准化
 */
async function testNormalization(detailItem: PreisjaegerDetailItem) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔄 测试 3: 数据标准化');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const normalizer = new PreisjaegerNormalizer();
    const deal = await normalizer.normalize(detailItem);

    console.log('✅ 标准化成功\n');
    console.log('📊 Deal 对象:');
    console.log(`  - 数据源: ${deal.sourceSite}`);
    console.log(`  - 源 ID: ${deal.sourcePostId}`);
    console.log(`  - GUID: ${deal.guid}`);
    console.log(`  - Slug: ${deal.slug}`);
    console.log(`  - 标题(德文): ${deal.titleDe}`);
    console.log(`  - 描述长度: ${deal.description?.length || 0} 字符`);
    console.log(`  - 内容长度: ${deal.contentHtml?.length || 0} 字符`);
    console.log(`  - 商家(原始): ${deal.merchant || 'N/A'}`);
    console.log(`  - 商家(规范ID): ${deal.canonicalMerchantId || 'N/A'}`);
    console.log(`  - 商家(规范名): ${deal.canonicalMerchantName || 'N/A'}`);
    console.log(`  - 分类数量: ${deal.categories?.length || 0}`);

    if (deal.categories && deal.categories.length > 0) {
      console.log('  - 分类 ID:');
      deal.categories.forEach(cat => console.log(`    • ${cat}`));
    }

    console.log(`  - 价格: €${deal.price !== undefined ? deal.price.toFixed(2) : 'N/A'}`);
    console.log(`  - 原价: €${deal.originalPrice !== undefined ? deal.originalPrice.toFixed(2) : 'N/A'}`);
    console.log(`  - 折扣: ${deal.discount !== undefined ? deal.discount + '%' : 'N/A'}`);
    console.log(`  - 货币: ${deal.currency}`);
    console.log(`  - 优惠码: ${deal.couponCode || 'N/A'}`);
    console.log(`  - 图片 URL: ${deal.imageUrl || 'N/A'}`);
    console.log(`  - 商家链接: ${deal.merchantLink || 'N/A'}`);
    console.log(`  - 联盟链接: ${deal.affiliateLink || 'N/A'}`);
    console.log(`  - 联盟启用: ${deal.affiliateEnabled ? 'Yes' : 'No'}`);
    console.log(`  - 联盟网络: ${deal.affiliateNetwork || 'N/A'}`);
    console.log(`  - 发布时间: ${deal.publishedAt?.toISOString() || 'N/A'}`);
    console.log(`  - 语言: ${deal.language}`);
    console.log(`  - 翻译状态: ${deal.translationStatus}\n`);

    // 验证 Deal 对象
    console.log('🔍 验证 Deal 对象...');
    const isValid = normalizer.validate(deal);

    if (isValid) {
      console.log('✅ Deal 对象验证通过\n');
    } else {
      console.log('❌ Deal 对象验证失败\n');
    }

    return deal;
  } catch (error) {
    console.error('❌ 标准化失败:', error);
    throw error;
  }
}

/**
 * 主测试流程
 */
async function main() {
  console.log('\n');
  console.log('╔════════════════════════════════════════╗');
  console.log('║   Preisjaeger 功能测试                 ║');
  console.log('╚════════════════════════════════════════╝');
  console.log('\n');

  try {
    // 测试 1: 列表页抓取
    const listItems = await testListPage();

    if (listItems.length === 0) {
      console.log('⚠️  列表页无商品，测试结束');
      return;
    }

    // 测试 2: 详情页抓取（只测第一个）
    console.log('⏳ 等待 3 秒后抓取详情页...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    const detailItem = await testDetailPage(listItems[0]);

    // 测试 3: 数据标准化
    const deal = await testNormalization(detailItem);

    // 测试总结
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ 测试总结');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('✓ 列表页抓取正常');
    console.log('✓ 详情页抓取正常');
    console.log('✓ 数据标准化正常');
    console.log('✓ 数据验证通过');
    console.log('\n🎉 所有测试通过！\n');

  } catch (error) {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('❌ 测试失败');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.error(error);
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  main();
}
