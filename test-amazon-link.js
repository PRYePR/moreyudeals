/**
 * 测试 Amazon 链接解析流程
 */

const { AmazonLinkResolver } = require('./packages/worker/src/services/amazon-link-resolver.ts');

async function test() {
  const resolver = new AmazonLinkResolver();

  // 测试数据
  const testCases = [
    {
      merchant: 'Amazon',
      canonicalMerchantName: 'Amazon',
      merchantLink: 'https://forward.sparhamster.at/out.php?hash=Qr9O9h1eijhleUvThJfI4KXMAvofM52MpAZWngKlM2pmuXPLNNIiUXOESA%3D%3D&name=SH&token=0ccb1264cd81ad8e20f27dd146dfa37d'
    },
    {
      merchant: 'MediaMarkt',
      canonicalMerchantName: 'MediaMarkt',
      merchantLink: 'https://forward.sparhamster.at/out.php?hash=xyz&name=SH&token=123'
    }
  ];

  for (const testCase of testCases) {
    console.log('\n=== 测试案例 ===');
    console.log('商家:', testCase.merchant);
    console.log('Forward 链接:', testCase.merchantLink);

    // 1. 判断是否为 Amazon
    const isAmazon = resolver.isAmazonMerchant(testCase.merchant, testCase.canonicalMerchantName);
    console.log('是否为 Amazon:', isAmazon);

    if (isAmazon) {
      // 2. 解析真实链接
      console.log('正在解析真实 Amazon 链接...');
      try {
        const realLink = await resolver.resolveRealAmazonLink(testCase.merchantLink);
        console.log('真实链接:', realLink);

        if (realLink) {
          // 3. 添加我们的联盟码
          const finalLink = realLink.includes('?')
            ? `${realLink}&tag=moreyu0a-21`
            : `${realLink}?tag=moreyu0a-21`;
          console.log('最终链接（含联盟码）:', finalLink);
        }
      } catch (error) {
        console.error('解析失败:', error.message);
      }
    } else {
      console.log('非 Amazon 商家，直接使用 forward 链接');
    }
  }
}

test().catch(console.error);
