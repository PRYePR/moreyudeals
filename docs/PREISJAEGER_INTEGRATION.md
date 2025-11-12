# Preisjaeger.at 接入文档

## 1. 项目概述

### 1.1 目标网站
- **网站**: https://www.preisjaeger.at/
- **类型**: 奥地利折扣信息聚合平台
- **目标**: 抓取最新折扣商品信息并集成到现有系统

### 1.2 当前状态
- ⚠️ **待讨论**: 具体抓取策略
- ⚠️ **待确认**: 数据字段映射方案
- ⚠️ **待测试**: Cloudflare保护规避方案

---

## 2. 技术方案（待完善）

### 2.1 抓取方式
- **列表页**: HTML解析方式抓取最新页面 (https://www.preisjaeger.at/neu)
- **详情页**: ⚠️ **待讨论与确认**

### 2.2 关于详情页的技术分析与建议

#### 2.2.1 详情页的必要性
**优势**:
- 完整的商品描述信息（列表页只有简述，被截断）
- 可能有更详细的规格参数
- 更完整的用户评论
- 更准确的过期时间等元数据

**列表页已提供的信息**:
- 商品标题 (title)
- 价格 (price / nextBestPrice)
- 商店名 (merchant)
- 分类 (mainGroup)
- 图片 (mainImage)
- 发布时间 (publishedAt)
- 评论数 (commentCount)
- 热度 (temperature)
- 简短描述（被截断）
- 优惠码 (voucherCode)
- 商品链接 (link)

#### 2.2.2 风险评估
1. **Cloudflare保护**:
   - ✅ 初步测试：简单的curl可以获取HTML（已验证）
   - ⚠️ 但大量请求可能触发JS验证或速率限制

2. **封禁风险**:
   - 详情页访问频率过高易被识别为爬虫
   - 建议：模拟真实用户行为

#### 2.2.3 建议方案 (优先级排序)

**方案A: 仅抓取列表页 (最安全)**
- ✅ 风险最低，不易被封
- ✅ 已包含核心商品信息
- ❌ 商品描述不完整（被截断）
- 适用场景：快速上线，降低风险

**方案B: 列表页 + 选择性详情页 (推荐)**
- ✅ 平衡风险与信息完整性
- 策略：
  - 所有商品先从列表页获取基本信息
  - 仅对高热度商品 (temperature > 某阈值) 访问详情页
  - 或定时批量补全详情（每天固定时段，低频次）
- 访问间隔：每个详情页间隔 5-15秒随机延迟
- User-Agent轮换
- 模拟真实浏览器行为（带Referer、Cookie等）

**方案C: 列表页 + 全量详情页 (高风险，不推荐初期使用)**
- ❌ 封禁风险高
- 需要更复杂的反爬策略（代理池、浏览器渲染等）
- 仅在业务强需求且有充分准备时使用

### 2.3 登录验证问题测试结果

#### 2.3.1 测试结果
✅ **已验证**: 详情页**不需要登录**即可访问

测试页面:
- ✅ https://www.preisjaeger.at/deals/tesafilm-standard-...354419
- ✅ https://www.preisjaeger.at/deals/ninja-luxe-cafe-premier-...352971

**结论**:
- 简单HTTP请求可直接获取详情页HTML
- 页面包含完整的 `window.__INITIAL_STATE__` JSON数据
- 无需登录，无需Cookie

#### 2.3.2 备用方案（如未来需要登录）

**方案A: 使用Cookie模拟登录会话（推荐）**

步骤:
1. **手动登录一次**，获取Cookie
2. **提取关键Cookie字段**（通常是 session_id、auth_token 等）
3. **在抓取时携带Cookie**

优势:
- ✅ 实现简单，无需自动化登录
- ✅ Cookie长期有效（通常数周甚至数月）
- ✅ 风险低，与正常用户行为一致

实现示例:
```typescript
const cookies = {
  'pepper_session': 'your_session_cookie_here',
  // 其他必要的cookie
};

// 在请求时携带
fetch(url, {
  headers: {
    'Cookie': Object.entries(cookies).map(([k,v]) => `${k}=${v}`).join('; ')
  }
});
```

Cookie获取方法:
1. 浏览器访问 preisjaeger.at 并登录
2. F12 打开开发者工具 → Application → Cookies
3. 复制所有 Cookie（尤其是包含 session/auth 的）
4. 配置到抓取脚本中

维护:
- Cookie过期后手动更新（可设置监控，检测到401/403时报警）
- 建议定期（如每月）更新一次

---

**方案B: Puppeteer/Playwright 自动登录（备选）**

适用场景: Cookie频繁过期或需要完全自动化

步骤:
1. 启动无头浏览器
2. 自动填写账号密码登录
3. 保存登录后的Cookie
4. 后续请求使用保存的Cookie

优势:
- ✅ 完全自动化，无需手动干预
- ✅ Cookie过期时自动重新登录

劣势:
- ❌ 资源消耗大（需要运行浏览器）
- ❌ 实现复杂度高
- ❌ 容易触发账号安全检测

---

**方案C: 创建专用抓取账号（配合方案A使用，推荐）**

建议:
1. 注册一个专用的 Preisjaeger 账号用于抓取
2. 使用真实邮箱注册（避免被标记为机器人）
3. 登录后提取Cookie，配合方案A使用

优势:
- ✅ 不影响个人账号
- ✅ 如被封禁可重新注册
- ✅ 便于管理和监控

---

**推荐组合方案**: **方案A + 方案C**
- 注册专用抓取账号
- 手动登录获取Cookie
- 配置到抓取脚本中
- 定期检查Cookie有效性

### 2.4 Cloudflare应对方案

#### 2.4.1 初步测试结果
- ✅ **已验证**: 简单HTTP请求可以获取HTML内容
- ℹ️ 当前未遇到JS Challenge或CAPTCHA
- ⚠️ **风险**: 高频请求可能触发更严格的验证

#### 2.4.2 建议策略
1. **请求频率控制**:
   - 列表页：每次抓取间隔 >= 5分钟
   - 详情页：每页间隔 5-15秒（随机）
   - **全量详情页策略**: 每小时新增几个，实际抓取压力不大

2. **请求头模拟**:
   ```
   User-Agent: 真实浏览器UA（轮换）
   Accept-Language: de-AT,de;q=0.9,en;q=0.8
   Referer: https://www.preisjaeger.at/
   Accept: text/html,application/xhtml+xml,application/xml
   Cookie: pepper_session=xxx; (登录Cookie)
   ```

3. **会话保持**:
   - 保存和使用Cookie（包括登录Cookie）
   - 维持合理的会话时长
   - 模拟真实用户的浏览模式（列表页→详情页）

4. **备选方案** (如遇到严格防护):
   - 使用无头浏览器（Puppeteer/Playwright）
   - 代理IP轮换（如有需要）

### 2.5 页面结构分析

#### 2.5.1 列表页数据加载
- **方式**: Vue3 + 服务端渲染（SSR）
- **数据位置**: `<div data-vue3='{"name":"ThreadMainListItemNormalizer","props":{...}}'>`
- **特点**: HTML中嵌入JSON，包含基本商品信息
- **优势**: 可直接解析JSON，无需复杂的DOM选择器

#### 2.5.2 详情页数据加载
✅ **推荐方式**: 解析 `window.__INITIAL_STATE__` 对象

**数据位置**:
```html
<script>
window.__INITIAL_STATE__ = {
  "threadDetail": {
    "threadDetails": {
      "preparedHtmlDescription": "完整的HTML描述",
      ...
    },
    "threadId": "352971",
    "title": "商品标题",
    "price": 382.69,
    "nextBestPrice": 449.99,
    ...
  }
}
</script>
```

**优势**:
- ✅ 包含**完整描述** (`preparedHtmlDescription`)
- ✅ 包含所有商品元数据
- ✅ 数据结构完整且规范
- ✅ 解析简单：提取script标签内容，JSON.parse即可

**解析策略**:
1. 列表页: 提取基本信息 + 详情页URL
2. 详情页: 提取 `window.__INITIAL_STATE__.threadDetail`
3. 合并数据: 以详情页为准，补全完整描述

---

## 3. 数据字段映射

### 3.1 系统 Deal 数据结构分析

基于 `packages/worker/src/types/deal.types.ts`，系统使用统一的 Deal 模型：

**核心字段**:
- `sourceSite`: 数据源标识（Sparhamster用'sparhamster'，Preisjaeger用'preisjaeger'）
- `sourcePostId`: 源站帖子ID（Preisjaeger的threadId）
- `guid`: 全局唯一标识（使用shareableLink）
- `contentHash`: 内容哈希，用于去重

**商家字段**:
- `merchant`: 原始商家名称
- `canonicalMerchantId`: 规范商家ID（通过映射表）
- `canonicalMerchantName`: 规范商家显示名称

**分类字段**:
- `categories`: 字符串数组，支持多分类

**货币**: ✅ 统一使用 `EUR`（已确认）

### 3.2 Preisjaeger → Deal 字段映射表

| Preisjaeger 字段 | Deal 字段 | 数据类型 | 转换规则 | 备注 |
|-----------------|---------|---------|----------|------|
| **基础信息** |
| `threadId` | `sourcePostId` | string | 直接映射 | |
| `titleSlug` | `slug` | string | 直接映射 | |
| `shareableLink` | `guid` | string | 直接映射 | ✅ 使用分享链接 |
| `url` | `link` | string | 直接映射 | Preisjaeger详情页链接 |
| **标题** |
| `title` | `titleDe` | string | 直接映射 | 德语标题 |
| `title` | `originalTitle` | string | 直接映射 | 原始标题 |
| - | `title` | string | 翻译后填充 | 中文标题（翻译服务） |
| **内容** |
| `preparedHtmlDescription` | `contentHtml` | string | 直接映射 | 从详情页获取 |
| `preparedHtmlDescription` | `contentText` | string | 提取纯文本 | 去除HTML标签 |
| - | `description` | string | 翻译后填充 | 描述翻译 |
| **商家** |
| `merchant.merchantName` | `merchant` | string | 直接映射 | 原始商家名 |
| `merchant.avatar.path` | `merchantLogo` | string | 拼接URL | https://static.preisjaeger.at/{path}/{name} |
| `linkHost` | - | string | 辅助字段 | 可用于确定商家 |
| - | `merchantLink` | string | 待确认 | 商品实际购买链接 |
| `merchant.merchantName` | `canonicalMerchantId` | string | **映射表转换** | 通过 merchant-mapping.ts |
| `merchant.merchantName` | `canonicalMerchantName` | string | **映射表转换** | 通过 merchant-mapping.ts |
| **价格** |
| `price` | `price` | number | 直接映射 | 当前价格 |
| `nextBestPrice` | `originalPrice` | number | 直接映射 | 原价 |
| `percentage` 或计算 | `discount` | number | 自动计算 | (originalPrice-price)/originalPrice*100 |
| - | `currency` | string | 固定'EUR' | ✅ 欧元 |
| `voucherCode` | `couponCode` | string | 直接映射 | 优惠码 |
| `shipping.isFree` | - | boolean | 存入rawPayload | 可选，暂不映射 |
| `shipping.price` | - | number | 存入rawPayload | 可选，暂不映射 |
| **分类** |
| `mainGroup.threadGroupName` | `categories[0]` | string | **映射表转换** | 主分类，需建映射 |
| `groups[].threadGroupName` | `categories` | string[] | **映射表转换** | 所有分类 |
| **图片** |
| `mainImage.path`+`uid` | `imageUrl` | string | 拼接URL | https://static.preisjaeger.at/{path}/{uid} |
| `galleryImages` | `images` | string[] | 拼接URL数组 | 所有图片 |
| **时间** |
| `publishedAt` | `publishedAt` | Date | Unix时间戳转Date | new Date(timestamp * 1000) |
| `endDate.timestamp` | `expiresAt` | Date | Unix时间戳转Date | 如果有 |
| `updatedAt` | `updatedAt` | Date | Unix时间戳转Date | |
| **其他元数据** |
| `temperature` | - | number | 存入rawPayload | 可选，热度值 |
| `temperatureLevel` | - | string | 存入rawPayload | Hot1/Hot2/Hot3 |
| `commentCount` | - | number | 存入rawPayload | 评论数 |
| `isExpired` | - | boolean | 存入rawPayload | 是否过期 |
| 整个JSON | `rawPayload` | object | 完整存储 | 便于调试 |
| **固定值** |
| - | `sourceSite` | string | 固定'preisjaeger' | |
| - | `language` | string | 固定'de' | |
| - | `translationStatus` | string | 固定'pending' | |
| - | `translationDetectedLanguage` | string | 固定'de' | |
| - | `isTranslated` | boolean | 固定false | |
| - | `affiliateEnabled` | boolean | 固定false | 初始值 |
| - | `duplicateCount` | number | 固定0 | |

### 3.2 图片URL拼接规则
⚠️ **待确认**: 从JSON提取的图片信息需要拼接成完整URL

示例数据:
```json
{
  "mainImage": {
    "path": "threads/raw/CjG87",
    "uid": "354419_1.jpg"
  }
}
```

可能的URL格式（**待验证**）:
- `https://static.preisjaeger.at/{path}/{uid}`
- 或从列表页图片标签中提取实际URL

### 3.3 商家映射（使用现有系统）

✅ **系统已有完善的商家映射机制**

**文件**: `packages/worker/src/config/merchant-mapping.ts`

**映射逻辑**:
```typescript
export interface MerchantMapping {
  canonicalId: string;        // 规范ID（如 'amazon-at'）
  canonicalName: string;      // 显示名称（如 'Amazon.at'）
  aliases: string[];          // 别名列表
  sites: string[];            // 出现的站点
  website?: string;           // 官网
}
```

**已配置的商家**（部分，sites已包含preisjaeger）:
- Amazon.at (`amazon-at`)
- MediaMarkt (`mediamarkt`)
- Saturn (`saturn`)
- Hofer (`hofer`)
- Billa (`billa`)
- Lidl (`lidl`)
- IKEA (`ikea`)
- 等18个主要商家...

**Preisjaeger商家处理策略**:
1. **调用现有API**: 使用 `normalizeMerchant(merchant.merchantName)`
2. **自动匹配**: 通过aliases自动匹配规范名称
3. **未匹配处理**: 自动生成canonicalId（转小写、去特殊字符）
4. **后续补充**: 记录未匹配商家，定期更新mapping配置

**示例代码**:
```typescript
import { normalizeMerchant } from '../utils/merchant-normalizer';

const merchant = threadDetail.merchant?.merchantName;
const normalized = normalizeMerchant(merchant);

deal.merchant = merchant;
deal.canonicalMerchantId = normalized.canonicalId;
deal.canonicalMerchantName = normalized.canonicalName;

if (!normalized.isMatched) {
  // 记录未匹配的商家，后续补充到配置中
  console.warn(`未匹配商家: ${merchant}`);
}
```

### 3.4 分类映射（需要新建）

✅ **采用双层分类方案**

**Preisjaeger分类示例**（从JSON提取）:
- Elektronik（电子产品）
- Home & Living（家居生活）
- Lebensmittel & Haushalt（食品与家居）
- Haushaltsgeräte（家用电器）
- Kaffeemaschinen（咖啡机）
- Küche & Kochen（厨房与烹饪）
- Sport & Fitness（运动健身）
- Mode & Accessoires（时尚配饰）

**待新建文件**: `packages/worker/src/config/category-mapping.ts`

**分类映射配置结构**:
```typescript
export interface CategoryMapping {
  canonicalId: string;          // 规范ID（如 'electronics'）
  canonicalName: string;        // 中文名称（如 '电子产品'）
  canonicalNameDe: string;      // 德语名称（如 'Elektronik'）
  aliases: {
    sparhamster: string[];      // Sparhamster可能的写法
    preisjaeger: string[];      // Preisjaeger可能的写法
  };
  parentId?: string;            // 父分类ID（支持层级）
}
```

**示例映射配置**:
```typescript
export const CATEGORY_MAPPINGS: CategoryMapping[] = [
  {
    canonicalId: 'electronics',
    canonicalName: '电子产品',
    canonicalNameDe: 'Elektronik',
    aliases: {
      sparhamster: ['elektronik', '电子', '电子产品'],
      preisjaeger: ['Elektronik']
    }
  },
  {
    canonicalId: 'home-living',
    canonicalName: '家居生活',
    canonicalNameDe: 'Home & Living',
    aliases: {
      sparhamster: ['haushalt', '家居'],
      preisjaeger: ['Home & Living', 'Haushaltsgeräte']
    }
  },
  {
    canonicalId: 'kitchen-appliances',
    canonicalName: '厨房电器',
    canonicalNameDe: 'Küchengeräte',
    aliases: {
      sparhamster: ['küche'],
      preisjaeger: ['Küche & Kochen', 'Kaffeemaschinen']
    },
    parentId: 'home-living'  // 子分类
  }
  // ... 更多分类
];
```

**数据存储方式**:
```typescript
// Deal 对象中的 categories 字段
deal.categories = [
  'electronics',           // 规范canonicalId
  'home-living',
  'kitchen-appliances'
];

// 原始分类保留在 rawPayload 中
deal.rawPayload = {
  originalCategories: {
    mainGroup: 'Elektronik',
    groups: ['Elektronik', 'Haushaltsgeräte', 'Kaffeemaschinen']
  }
};
```

**前端显示逻辑**:
- 通过 `canonicalId` 查找配置
- 中文界面显示 `canonicalName`
- 德语界面显示 `canonicalNameDe`
- 支持父子分类筛选

### 3.5 商品链接处理 ✅

**Preisjaeger 提供的链接类型**（从真实数据提取）:

1. **`cpcLink`**: ✅ **商家联盟链接**（最重要）
   - 示例: `https://www.amazon.de/dp/B000TK0OZC?tag=preisjaegeregc-21&ascsubtag={CUSTOM_ID}`
   - 说明: 带Preisjaeger联盟tag的商家直链
   - 用途: 作为 `merchantLink`，并清洗后替换为我们的联盟码

2. **`shareableLink`**: ✅ **分享链接**
   - 示例: `https://www.preisjaeger.at/share-deal/354419`
   - 用途: 作为 `guid`（全局唯一标识）

3. **`url`**: ✅ **详情页链接**
   - 示例: `https://www.preisjaeger.at/deals/tesafilm-standard-...-354419`
   - 用途: 作为 `link`（回到详情页）

4. **`linkHost`**: ✅ **商家域名**
   - 示例: `www.amazon.de`
   - 用途: 辅助判断商家

5. **`link`**: ❌ **通常为null**
   - 不可用

6. **`linkCloakedItemMainButton`**: ⚠️ **转发链接**
   - 示例: `https://www.preisjaeger.at/visit/threadmain/354419`
   - 用途: 可能302重定向到cpcLink

**最终映射方案**:

```typescript
import { AffiliateLinkService } from '../services/affiliate-link-service';
import { normalizeMerchant } from '../utils/merchant-normalizer';

// 1. 基础链接
deal.guid = threadDetail.shareableLink;           // 唯一标识
deal.link = threadDetail.url;                      // Preisjaeger详情页
deal.fallbackLink = threadDetail.shareableLink;    // 备用
deal.merchantLink = threadDetail.cpcLink;          // 原始商家链接

// 2. 商家信息
const merchant = threadDetail.merchant?.merchantName || threadDetail.linkHost;
const normalizedMerchant = normalizeMerchant(merchant);

deal.merchant = merchant;
deal.canonicalMerchantId = normalizedMerchant.canonicalId;
deal.canonicalMerchantName = normalizedMerchant.canonicalName;

// 3. 处理联盟链接（清洗+替换tag）
if (threadDetail.cpcLink) {
  const affiliateLinkService = new AffiliateLinkService();
  const affiliateResult = await affiliateLinkService.processAffiliateLink(
    merchant,
    normalizedMerchant.canonicalName,
    threadDetail.cpcLink  // Preisjaeger的联盟链接
  );

  if (affiliateResult.enabled && affiliateResult.affiliateLink) {
    // Amazon: 清洗后替换为我们的联盟码
    // 从: https://www.amazon.de/dp/B000TK0OZC?tag=preisjaegeregc-21
    // 到: https://www.amazon.de/dp/B000TK0OZC?tag=moreyu0a-21
    deal.affiliateLink = affiliateResult.affiliateLink;
    deal.affiliateEnabled = true;
    deal.affiliateNetwork = affiliateResult.network;  // 'amazon'
    console.log(`✅ 联盟链接已替换: ${deal.merchant}`);
  }
}

// 4. 原始数据
deal.rawPayload = {
  links: {
    cpc: threadDetail.cpcLink,
    shareable: threadDetail.shareableLink,
    detail: threadDetail.url,
    cloakedMain: threadDetail.linkCloakedItemMainButton,
    host: threadDetail.linkHost
  },
  merchant: threadDetail.merchant
};
```

**联盟链接清洗机制** (已有服务):
- ✅ **Amazon**: 完整支持，自动清洗并替换为我们的tag
- ⚠️ **其他商家**: 保持Preisjaeger原始cpcLink

详见: `docs/PREISJAEGER_LINKS_ANALYSIS.md`

### 3.6 登录与Cookie问题总结

**测试结果**:
- ✅ 列表页: 无需登录
- ✅ 详情页: 无需登录（已测试2个不同的deal）
- ✅ 数据获取: `window.__INITIAL_STATE__`中包含完整JSON

**您提到的登录问题可能原因**:
1. **会话Cookie**: 之前未登录时可能Cookie被标记，登录后获得新Cookie
2. **选择性限制**: 部分页面可能有限制（需要进一步测试更多链接）
3. **随机检测**: Cloudflare可能随机要求登录验证

**建议方案**（安全起见）:
1. **初期**: 不带Cookie测试，看是否稳定
2. **如遇问题**: 准备Cookie方案（手动登录获取）
3. **监控**: 记录403/401错误，触发时启用Cookie

### 3.7 字段映射总结表

| 功能模块 | Preisjaeger | Deal字段 | 转换方式 | 状态 |
|---------|------------|---------|----------|------|
| 唯一标识 | threadId | sourcePostId | 直接 | ✅ |
| | shareableLink | guid | 直接 | ✅ |
| 标题 | title | titleDe, originalTitle | 直接 | ✅ |
| 内容 | preparedHtmlDescription | contentHtml | 直接 | ✅ |
| 商家 | merchant.merchantName | merchant | 直接 | ✅ |
| | merchant.merchantName | canonical* | **映射表** | ✅ 已有 |
| 分类 | mainGroup/groups | categories | **映射表** | ⚠️ 待建 |
| 价格 | price/nextBestPrice | price/originalPrice | 直接 | ✅ |
| 货币 | - | currency | 固定EUR | ✅ |
| 优惠码 | voucherCode | couponCode | 直接 | ✅ |
| 图片 | mainImage | imageUrl | 拼接URL | ⚠️ 待验证 |
| 链接 | url/shareableLink | guid/link | 见3.5 | ⚠️ 待测试 |
| 时间 | publishedAt/endDate | publishedAt/expiresAt | Unix转Date | ✅ |

---

## 4. 抓取策略与频率控制

### 4.1 抓取频率建议

基于Preisjaeger更新频率（约几个/小时）和Sparhamster现有配置：

| 配置项 | 建议值 | 说明 | 参考 |
|--------|--------|------|------|
| **主抓取间隔** | 30分钟 | 与Sparhamster一致 | `FETCH_INTERVAL=30` |
| **列表页抓取** | 每次1页 | 足够获取最新商品 | 每页约20-30个 |
| **详情页延迟** | 5-15秒 | 随机延迟，模拟人类 | 避免被识别为机器人 |
| **每次详情页上限** | 10-20个 | 基于去重后的新商品数 | 可配置 |
| **最大页数** | 3页 | 如新商品过多时 | 降级保护 |

### 4.2 抓取流程设计

```typescript
// 推荐流程
async function fetchPreisjaeger() {
  // Step 1: 抓取列表页
  const listPageUrl = 'https://www.preisjaeger.at/neu';
  const threads = await fetchListPage(listPageUrl);  // 获取约20-30个thread

  // Step 2: 去重检查
  const existingPostIds = await getExistingPostIds('preisjaeger');
  const newThreads = threads.filter(t => !existingPostIds.has(t.threadId));

  console.log(`发现 ${newThreads.length} 个新商品`);

  // Step 3: 限制详情页数量
  const MAX_DETAIL_PAGES = parseInt(process.env.PREISJAEGER_MAX_DETAIL_PAGES || '20');
  const threadsToFetch = newThreads.slice(0, MAX_DETAIL_PAGES);

  if (newThreads.length > MAX_DETAIL_PAGES) {
    console.warn(`⚠️ 新商品过多 (${newThreads.length})，只抓取前 ${MAX_DETAIL_PAGES} 个`);
  }

  // Step 4: 抓取详情页（带延迟）
  for (let i = 0; i < threadsToFetch.length; i++) {
    const thread = threadsToFetch[i];

    // 随机延迟 5-15秒
    if (i > 0) {
      const delay = getRandomDelay(5000, 15000);
      console.log(`⏳ 延迟 ${(delay/1000).toFixed(1)} 秒...`);
      await sleep(delay);
    }

    // 抓取详情页
    const detail = await fetchDetailPage(thread.url);

    // 处理数据...
  }
}
```

### 4.3 配置参数

**新增环境变量**（`.env`）:

```bash
# ===== Preisjaeger 抓取配置 =====

# 抓取间隔（分钟）- 建议30分钟与Sparhamster一致
PREISJAEGER_FETCH_INTERVAL=30

# 每次最多抓取多少个详情页（去重后）
PREISJAEGER_MAX_DETAIL_PAGES=20

# 详情页延迟范围（毫秒）
PREISJAEGER_DETAIL_MIN_DELAY=5000   # 5秒
PREISJAEGER_DETAIL_MAX_DELAY=15000  # 15秒

# 列表页最多抓取页数（降级保护）
PREISJAEGER_MAX_LIST_PAGES=3

# 请求超时（毫秒）
PREISJAEGER_TIMEOUT=30000

# User-Agent（可选，默认使用Sparhamster的）
PREISJAEGER_USER_AGENT=Mozilla/5.0...

# Cookie（如需要登录）
# PREISJAEGER_COOKIE=pepper_session=xxx;...
```

### 4.4 智能抓取策略

**策略A: 固定数量（推荐）**
```typescript
// 每次固定抓取 N 个新商品的详情页
const MAX_DETAIL_PAGES = 20;
const threadsToFetch = newThreads.slice(0, MAX_DETAIL_PAGES);
```

**优点**:
- ✅ 可预测的抓取时间
- ✅ 风险可控
- ✅ 适合定时任务

**缺点**:
- ⚠️ 如果新商品过多，可能遗漏一些

---

**策略B: 动态判断（可选）**
```typescript
// 根据新商品数量动态决定
if (newThreads.length <= 5) {
  // 新商品少，全抓
  threadsToFetch = newThreads;
} else if (newThreads.length <= 20) {
  // 中等数量，全抓但监控时间
  threadsToFetch = newThreads;
} else {
  // 过多，只抓前20个，并记录警告
  threadsToFetch = newThreads.slice(0, 20);
  console.warn(`⚠️ 新商品过多 (${newThreads.length})，只抓取前20个`);
}
```

**优点**:
- ✅ 灵活，能适应不同情况
- ✅ 新商品少时效率高

**缺点**:
- ⚠️ 抓取时间不可预测
- ⚠️ 可能超时

---

**策略C: 分页抓取（备选）**
```typescript
// 如果一次抓不完，下次继续抓
let offset = 0;
const BATCH_SIZE = 20;

// 从数据库读取上次抓取的位置
const lastOffset = await getLastFetchOffset('preisjaeger');

const threadsToFetch = newThreads.slice(lastOffset, lastOffset + BATCH_SIZE);

// 保存下次的起始位置
await saveLastFetchOffset('preisjaeger', lastOffset + BATCH_SIZE);
```

### 4.5 推荐配置（基于分析）

基于以下因素：
1. Preisjaeger更新频率：约几个/小时
2. 30分钟抓取一次：每次约1-5个新商品
3. 偶尔可能有批量更新

**建议配置**:
```bash
PREISJAEGER_FETCH_INTERVAL=30          # 30分钟一次
PREISJAEGER_MAX_DETAIL_PAGES=20        # 足够应对偶尔的批量更新
PREISJAEGER_DETAIL_MIN_DELAY=5000      # 5秒
PREISJAEGER_DETAIL_MAX_DELAY=15000     # 15秒
PREISJAEGER_MAX_LIST_PAGES=1           # 通常1页够了
```

**预期表现**:
- 正常情况：1-5个新商品，抓取耗时 < 2分钟
- 批量更新：10-20个新商品，抓取耗时 < 5分钟
- 极端情况：20+个新商品，只抓前20个，避免超时

### 4.6 去重逻辑

```typescript
// 1. 获取已存在的 postId（Preisjaeger的threadId）
const existingPostIds = await database.query(`
  SELECT source_post_id
  FROM deals
  WHERE source_site = 'preisjaeger'
  LIMIT 1000
`);

// 2. 转为Set加速查询
const existingSet = new Set(existingPostIds.map(d => d.source_post_id));

// 3. 过滤新商品
const newThreads = threads.filter(t => !existingSet.has(t.threadId));

// 4. 限制数量
const threadsToFetch = newThreads.slice(0, MAX_DETAIL_PAGES);
```

### 4.7 监控指标

建议记录以下指标：
- 每次抓取发现的新商品数
- 实际抓取的详情页数
- 总耗时
- 失败数（403/超时等）
- 去重统计

```typescript
const metrics = {
  timestamp: new Date(),
  listPageCount: 1,
  threadsFound: threads.length,
  newThreadsCount: newThreads.length,
  detailPagesFetched: threadsToFetch.length,
  totalDuration: endTime - startTime,
  errors: errors.length,
  duplicates: duplicateCount
};

console.log('📊 抓取统计:', metrics);
```

### 4.8 风险评估

| 风险 | 可能性 | 影响 | 应对措施 |
|------|--------|------|----------|
| 详情页过多 | 中 | 中 | 限制MAX_DETAIL_PAGES=20 |
| 请求被限流 | 低 | 中 | 5-15秒随机延迟 |
| Cloudflare封禁 | 低 | 高 | Cookie备用方案 + 降低频率 |
| 详情页超时 | 低 | 低 | 30秒超时 + 重试 |
| 列表页结构变化 | 中 | 高 | 监控 + 降级到API |

---

## 5. 实施计划

### 5.1 开发阶段
- [ ] Phase 1: 创建分类映射配置 `category-mapping.ts`
- [ ] Phase 2: 开发 `preisjaeger-fetcher.ts`
- [ ] Phase 3: 开发 `preisjaeger-normalizer.ts`
- [ ] Phase 4: 集成测试（小批量）
- [ ] Phase 5: 配置环境变量
- [ ] Phase 6: 上线监控

### 5.2 测试计划
1. **单元测试**: 测试normalizer字段映射
2. **小批量测试**: 抓取1-5个商品验证
3. **压力测试**: 抓取20个商品验证延迟和去重
4. **长期监控**: 运行1周观察稳定性

---

## 5. 约束条件

### 5.1 网站范围
- 短期内仅支持以下两个网站:
  - Sparhamster (已接入)
  - Preisjaeger.at (开发中)

---

## 6. 关键决策清单

### 需要您确认的决策（按优先级）:

#### 🔴 高优先级（影响架构设计）
1. **详情页抓取策略** (见 2.2.3):
   - [ ] 方案A: 仅列表页（最安全）
   - [ ] 方案B: 列表页 + 选择性详情页
   - [x] **方案C: 全量详情页** ✅ 已确认
     - 理由: 更新频率低（约几个/小时），全量抓取可行

2. **商店名统一方案** (见 3.3.1):
   - [ ] 保持原样
   - [x] **映射表** ✅ 已确认
   - [ ] 智能匹配

3. **分类统一方案** (见 3.3.2):
   - [ ] 独立分类
   - [ ] 统一分类体系
   - [x] **双层分类** ✅ 已确认
     - 保留原始 Preisjaeger 分类 + 映射到统一分类

#### 🟡 中优先级（影响数据质量）
4. **商品链接选择** (见 3.3.4):
   - [ ] 使用 `shareableLink`（推荐）
   - [ ] 使用 `link`
   - [ ] 两者都存

5. **货币处理方式** (见 3.3.3):
   - [ ] 仅存储欧元
   - [ ] 存储 + 货币字段
   - [ ] 实时汇率转换

#### 🟢 低优先级（可后续优化）
6. **图片URL拼接规则** (见 3.2): 需要验证实际格式
7. **抓取频率**: 列表页建议 5分钟/次，您的期望？
8. **是否需要翻译**: Preisjaeger是德语，是否需要翻译标题/描述？

---

## 7. 下一步行动

### 立即可做（无需讨论）:
✅ HTML已抓取并保存: `docs/preisjaeger_neu_page.html`
✅ 示例JSON已提取: `docs/preisjaeger_sample_thread.json`
✅ 技术方案已分析并给出建议

### 等待您的决策:
1. 确认上述 6 个关键决策
2. 补充 Sparhamster 的分类和商店名列表（用于对比统一）
3. 确认系统数据库字段结构（确保映射正确）

### 决策后可开始:
- 编写数据解析脚本
- 实现字段映射逻辑
- 建立商店名/分类映射表
- 集成到现有抓取系统

---

## 8. 附件

### 8.1 已完成
- ✅ 示例HTML: `docs/preisjaeger_neu_page.html` (282KB)
- ✅ 示例JSON: `docs/preisjaeger_sample_thread.json`

### 8.2 待添加（可选）
- 页面截图和字段标注（如需要可视化说明）
- 详情页HTML示例（如决定抓取详情页）

---

## 9. 技术亮点总结

### 好消息 ✅
1. **无需登录**: 详情页可直接访问，无需Cookie（已验证）
2. **Cloudflare未严格封锁**: 简单HTTP请求即可获取HTML
3. **数据结构清晰**: Vue3 SSR，JSON数据完整且易解析
4. **完整描述可获取**: 详情页包含 `preparedHtmlDescription` 字段
5. **更新频率低**: 约几个/小时，全量抓取详情页可行

### 需要注意 ⚠️
1. **需要字段统一**: 商店名、分类需要建立映射规则（已确认使用映射表+双层分类）
2. **图片URL处理**: 需要拼接或从DOM提取完整URL
3. **翻译需求**: 如需要中文显示，德语内容需要翻译
4. **频率控制**: 虽然更新慢，仍需控制抓取频率避免被封

### 已确认的技术决策 ✅
1. ✅ **抓取策略**: 全量详情页（列表页 + 所有详情页）
2. ✅ **商店名**: 使用映射表统一
3. ✅ **分类**: 双层分类（原始分类 + 统一分类）
4. ✅ **无需登录**: 经测试验证，直接HTTP请求即可

---

**文档状态**: ✅ 技术分析完成，核心决策已确认
**最后更新**: 2025-11-11
**下次更新**: 开始实施时补充代码示例和映射表
