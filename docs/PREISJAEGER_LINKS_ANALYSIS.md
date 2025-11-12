# Preisjaeger 链接类型分析

## 从真实数据提取的链接字段

### 示例：Deal 354419 (Tesa胶带)

```json
{
  "link": null,                                    // ❌ 通常为空
  "linkHost": "www.amazon.de",                    // ✅ 商家域名
  "cpcLink": "https://www.amazon.de/dp/B000TK0OZC?smid=A3JWKAKR8XB7XF&tag=preisjaegeregc-21&ascsubtag={CUSTOM_ID}",  // ✅ 联盟链接
  "shareableLink": "https://www.preisjaeger.at/share-deal/354419",  // ✅ 分享链接
  "url": "https://www.preisjaeger.at/deals/tesafilm-standard-...-354419",  // ✅ 详情页
  "linkCloakedItemMainButton": "https://www.preisjaeger.at/visit/threadmain/354419",  // ⚠️ 转发链接
  "linkCloakedItemFollowButton": "https://www.preisjaeger.at/visit/threadfollow/354419",
  "linkCloakedItemImageButton": "https://www.preisjaeger.at/visit/threadimg/354419",
  "linkCloakedItemBelowDescButton": "https://www.preisjaeger.at/visit/threadbeldesc/354419"
}
```

## 链接类型说明

| 字段 | 类型 | 说明 | 用途 |
|------|------|------|------|
| `cpcLink` | 商家联盟链接 | Amazon带追踪参数的直链 | ✅ **主要购买链接** |
| `linkHost` | 域名 | 商家域名（如 www.amazon.de） | 辅助信息 |
| `shareableLink` | Preisjaeger分享链接 | 短链接，用于分享 | GUID唯一标识 |
| `url` | Preisjaeger详情页 | 完整详情页URL | 回到详情页 |
| `linkCloakedItem*` | 转发链接 | Preisjaeger的点击追踪链接 | 可能302重定向到cpcLink |
| `link` | 原始链接 | 通常为null | ❌ 不可用 |

## 推荐映射方案

```typescript
// Deal 对象映射
deal.guid = threadDetail.shareableLink;                    // 唯一标识
deal.link = threadDetail.url;                              // Preisjaeger详情页
deal.merchantLink = threadDetail.cpcLink;                  // 商家购买链接（带联盟）
deal.fallbackLink = threadDetail.shareableLink;            // 备用

// 商家信息
deal.merchant = threadDetail.merchant?.merchantName || threadDetail.linkHost;

// 原始数据
deal.rawPayload = {
  links: {
    cpc: threadDetail.cpcLink,
    shareable: threadDetail.shareableLink,
    detail: threadDetail.url,
    cloakedMain: threadDetail.linkCloakedItemMainButton,
    host: threadDetail.linkHost
  }
};
```

## 联盟链接处理 ✅

Preisjaeger已经提供了带联盟追踪的链接(`cpcLink`)，包含：
- **tag参数**: `tag=preisjaegeregc-21`（Preisjaeger的联盟ID）
- **ascsubtag参数**: `{CUSTOM_ID}`（自定义追踪）

### 推荐方案：使用现有的清洗机制

**系统已有完善的联盟链接清洗服务**:
- 文件: `packages/worker/src/services/affiliate-link-service.ts`
- 文件: `packages/worker/src/services/amazon-link-resolver.ts`

**清洗流程**:
```typescript
// 1. 检测是否为Amazon
if (isAmazon(merchant, canonicalMerchantName)) {

  // 2. 清洗Preisjaeger的联盟链接
  // 从: https://www.amazon.de/dp/B000TK0OZC?tag=preisjaegeregc-21&ascsubtag={CUSTOM_ID}
  // 到: https://www.amazon.de/dp/B000TK0OZC
  const cleanUrl = cleanAmazonUrl(cpcLink);

  // 3. 添加我们的联盟标识
  // 到: https://www.amazon.de/dp/B000TK0OZC?tag=moreyu0a-21
  const affiliateLink = appendAmazonTag(cleanUrl, 'moreyu0a-21');

  // 4. 保存到Deal对象
  deal.affiliateLink = affiliateLink;
  deal.affiliateEnabled = true;
  deal.affiliateNetwork = 'amazon';
}
```

**实现代码示例**:
```typescript
// 在 preisjaeger-normalizer.ts 中
import { AffiliateLinkService } from '../services/affiliate-link-service';

const affiliateLinkService = new AffiliateLinkService();

// 处理商家链接（Preisjaeger的cpcLink）
if (threadDetail.cpcLink) {
  const affiliateResult = await affiliateLinkService.processAffiliateLink(
    threadDetail.merchant?.merchantName,
    normalizedMerchant.canonicalName,
    threadDetail.cpcLink  // Preisjaeger的联盟链接
  );

  if (affiliateResult.enabled && affiliateResult.affiliateLink) {
    deal.affiliateLink = affiliateResult.affiliateLink;  // 清洗后+我们的tag
    deal.affiliateEnabled = true;
    deal.affiliateNetwork = affiliateResult.network;  // 'amazon'
    console.log(`✅ 联盟链接已替换: ${deal.merchant}`);
  }
}

// 原始链接保存到merchantLink（作为备选）
deal.merchantLink = threadDetail.cpcLink;
```

**清洗功能详解**:

`cleanAmazonUrl()` 方法会：
1. ✅ 提取ASIN（Amazon商品唯一码）
2. ✅ 移除所有查询参数（包括Preisjaeger的tag）
3. ✅ 构建纯净链接：`https://www.amazon.de/dp/{ASIN}`

`appendAmazonTag()` 方法会：
1. ✅ 添加我们的联盟标识：`tag=moreyu0a-21`（环境变量配置）
2. ✅ 如果已有tag参数，自动替换

### 其他商家的联盟链接

**当前支持**:
- ✅ Amazon（完整实现）

**预留接口**（可扩展）:
```typescript
// affiliate-link-service.ts 已预留
// - processEbayLink()
// - processOtherPartnerLink()
```

**处理策略**:
- 非Amazon商家：保持Preisjaeger原始cpcLink
- 未来可逐步添加其他商家的清洗规则

### 配置

在 `.env` 中配置联盟标识：
```bash
# Amazon联盟标识（已配置）
AMAZON_AFFILIATE_TAG=moreyu0a-21

# 未来可添加其他联盟
# EBAY_CAMPAIGN_ID=...
# AWIN_PUBLISHER_ID=...
```

### 总结

| 商家 | Preisjaeger链接 | 清洗 | 替换tag | 最终链接 |
|------|----------------|------|---------|----------|
| Amazon | ✅ 有cpcLink | ✅ 支持 | ✅ 支持 | 我们的联盟链接 |
| 其他 | ✅ 有cpcLink | ❌ 暂不支持 | ❌ 暂不支持 | Preisjaeger的链接 |

**结论**: ✅ **非常方便**，Amazon链接可以自动清洗并替换为我们的联盟码，其他商家保持Preisjaeger原链接

## 链接验证测试

### 测试项目
- [ ] cpcLink 是否可直接访问
- [ ] 点击后是否直达商品页
- [ ] linkCloakedItemMainButton 重定向到哪里
- [ ] 是否需要Cookie才能访问
- [ ] 联盟追踪是否正常工作

### 测试命令
```bash
# 测试CPC链接（需要URL编码处理）
curl -I "https://www.amazon.de/dp/B000TK0OZC?smid=A3JWKAKR8XB7XF&tag=preisjaegeregc-21"

# 测试转发链接
curl -I -L "https://www.preisjaeger.at/visit/threadmain/354419"
```
