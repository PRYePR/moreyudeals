# Preisjaeger.at 接入方案总结

## ✅ 已确认的技术决策

### 1. 抓取策略
- **方式**: 列表页 + 限量详情页
- **频率**: 30分钟一次（与Sparhamster一致）
- **详情页上限**: 20个/次（去重后）
- **延迟控制**: 5-15秒随机延迟
- **无需登录**: ✅ 已验证，详情页可直接访问

### 1.1 详细配置
```bash
PREISJAEGER_FETCH_INTERVAL=30          # 30分钟
PREISJAEGER_MAX_DETAIL_PAGES=20        # 每次最多20个详情页
PREISJAEGER_DETAIL_MIN_DELAY=5000      # 5秒
PREISJAEGER_DETAIL_MAX_DELAY=15000     # 15秒
PREISJAEGER_MAX_LIST_PAGES=1           # 列表页1页
```

### 1.2 预期表现
- **正常**: 1-5个新商品，耗时 < 2分钟
- **批量更新**: 10-20个新商品，耗时 < 5分钟
- **极端**: 20+个新商品，只抓前20个

### 2. 数据获取
- **列表页**: 解析 `data-vue3` 属性中的JSON
- **详情页**: 解析 `window.__INITIAL_STATE__.threadDetail`
- **优势**: 数据完整、结构化、易解析

### 3. 商家映射
- ✅ **使用现有系统**: `merchant-mapping.ts`
- ✅ **已配置18个主要商家**
- ✅ **自动匹配**: 通过aliases自动匹配规范名称
- ✅ **无需额外开发**: 直接调用 `normalizeMerchant()`

### 4. 分类映射
- ⚠️ **需要新建**: `category-mapping.ts`
- ✅ **方案确定**: 双层分类（原始分类 + 统一分类）
- 📋 **待实施**: 建立Preisjaeger分类映射表

### 5. 联盟链接处理
- ✅ **Amazon**: 完整支持清洗并替换为我们的tag
  - 从: `https://www.amazon.de/dp/XXX?tag=preisjaegeregc-21`
  - 到: `https://www.amazon.de/dp/XXX?tag=moreyu0a-21`
- ✅ **使用现有服务**: `AffiliateLinkService` + `AmazonLinkResolver`
- ⚠️ **其他商家**: 保持Preisjaeger原始链接

### 6. 其他确认事项
- ✅ **货币**: 统一使用 EUR（欧元）
- ✅ **数据模型**: 使用现有 Deal 类型
- ✅ **去重机制**: 使用现有 DeduplicationService

---

## 📋 字段映射速查表

| 功能 | Preisjaeger字段 | Deal字段 | 处理方式 |
|------|----------------|---------|----------|
| 唯一ID | threadId | sourcePostId | 直接 |
| GUID | shareableLink | guid | 直接 |
| 标题 | title | titleDe, originalTitle | 直接 |
| 内容 | preparedHtmlDescription | contentHtml | 直接 |
| 商家 | merchant.merchantName | merchant | 直接 |
| 规范商家 | merchant.merchantName | canonical* | **映射表** |
| 分类 | mainGroup, groups | categories | **映射表** |
| 价格 | price, nextBestPrice | price, originalPrice | 直接 |
| 优惠码 | voucherCode | couponCode | 直接 |
| 商家链接 | cpcLink | merchantLink | 直接 |
| 联盟链接 | cpcLink | affiliateLink | **清洗+替换** |
| 图片 | mainImage | imageUrl | 拼接URL |
| 时间 | publishedAt | publishedAt | Unix转Date |

---

## 🔧 待实施任务

### 高优先级
1. ✅ 创建 `category-mapping.ts` 分类映射配置
2. ✅ 创建 `preisjaeger-fetcher.ts`
3. ✅ 创建 `preisjaeger-normalizer.ts`
4. ✅ 图片URL拼接规则验证

### 中优先级
5. ✅ 测试链接持续访问稳定性
6. ✅ 测试批量抓取频率限制
7. ✅ 实现抓取失败重试机制

### 低优先级
8. ⚠️ 其他商家联盟链接清洗（可选）
9. ⚠️ 分类层级关系建立（可选）

---

## 📝 关键代码示例

### 1. 商家处理（已有，直接使用）
```typescript
import { normalizeMerchant } from '../utils/merchant-normalizer';

const merchant = threadDetail.merchant?.merchantName;
const normalized = normalizeMerchant(merchant);

deal.merchant = merchant;
deal.canonicalMerchantId = normalized.canonicalId;
deal.canonicalMerchantName = normalized.canonicalName;
```

### 2. 联盟链接处理（已有，直接使用）
```typescript
import { AffiliateLinkService } from '../services/affiliate-link-service';

const affiliateLinkService = new AffiliateLinkService();
const affiliateResult = await affiliateLinkService.processAffiliateLink(
  merchant,
  normalized.canonicalName,
  threadDetail.cpcLink  // Preisjaeger的联盟链接
);

if (affiliateResult.enabled && affiliateResult.affiliateLink) {
  deal.affiliateLink = affiliateResult.affiliateLink;  // 清洗后的链接
  deal.affiliateEnabled = true;
  deal.affiliateNetwork = 'amazon';
}
```

### 3. 分类处理（待实施）
```typescript
import { normalizeCategory } from '../utils/category-normalizer';  // 待创建

const categories = threadDetail.groups?.map(g => g.threadGroupName) || [];
const normalizedCategories = categories.map(cat =>
  normalizeCategory(cat, 'preisjaeger')  // 使用Preisjaeger的别名
);

deal.categories = normalizedCategories.map(c => c.canonicalId);
```

---

## 🔍 技术亮点

1. **现有基础设施完善**
   - 商家映射已完成
   - 联盟链接清洗已实现
   - 去重机制已有
   - 只需新增fetcher和normalizer

2. **数据质量高**
   - Vue3 SSR提供完整JSON
   - 无需登录即可访问
   - 数据结构清晰规范

3. **风险可控**
   - Cloudflare未严格封锁
   - 更新频率低，抓取压力小
   - 可从列表页或详情页获取数据

---

## 📚 相关文档

1. **PREISJAEGER_INTEGRATION.md** - 完整技术方案（26KB）
2. **PREISJAEGER_LINKS_ANALYSIS.md** - 链接类型详细分析
3. **preisjaeger_neu_page.html** - 真实页面HTML（282KB）
4. **preisjaeger_sample_thread.json** - 示例JSON数据

---

## ⚠️ 注意事项

1. **登录问题**
   - 初期测试显示无需登录
   - 建议监控403/401错误
   - 如遇问题准备Cookie方案

2. **频率控制**
   - 列表页：建议 >= 5分钟/次
   - 详情页：建议 5-15秒/页（随机）
   - 虽然更新慢，仍需控制频率

3. **图片URL**
   - 需要验证拼接规则
   - 格式：`https://static.preisjaeger.at/{path}/{uid}`

4. **分类映射**
   - 需要与Sparhamster对齐
   - 建议支持父子层级
   - 德语/中文双语支持

---

**文档状态**: ✅ 技术方案完成，可开始实施
**最后更新**: 2025-11-11
